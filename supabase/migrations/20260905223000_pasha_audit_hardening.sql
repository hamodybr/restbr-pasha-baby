-- Pasha Baby audit hardening (applied to production 2026-09-06).
-- Keeps this repository reproducible with the live Supabase project.

set lock_timeout = '5s';
set statement_timeout = '30s';

-- Single-store deployments must have exactly one settings row.
create unique index if not exists restaurant_settings_singleton_idx
  on public.restaurant_settings ((1));

-- Privacy-light analytics rate bucket: no IP/device/user identifier is stored.
create table if not exists private.menu_analytics_minute_rate (
  minute_bucket timestamptz not null,
  event_type text not null,
  ref_id text not null default '',
  language text not null default '',
  accepted_count integer not null default 1 check (accepted_count between 1 and 60),
  primary key (minute_bucket, event_type, ref_id, language)
);

revoke all on table private.menu_analytics_minute_rate from public, anon, authenticated;

create or replace function private.track_menu_event(
  p_event_type text,
  p_ref_id text default '',
  p_language text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_type text := lower(left(coalesce(p_event_type, ''), 40));
  v_ref text := lower(left(coalesce(p_ref_id, ''), 100));
  v_language text := lower(left(coalesce(p_language, ''), 5));
  v_date date := (now() at time zone 'Asia/Baghdad')::date;
  v_bucket timestamptz := date_trunc('minute', now());
  v_rate integer;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  if v_type not in ('menu_view','category_view','product_interest','search_use','share_product','share_category','language_change') then
    raise exception 'Unsupported analytics event';
  end if;

  if v_language not in ('','ar','ku','en') then
    v_language := '';
  end if;

  if v_type in ('category_view','share_category') then
    if v_ref !~ v_uuid_pattern or not exists (
      select 1 from public.categories c
      where c.id = v_ref::uuid and c.is_active = true and c.is_visible = true
    ) then
      raise exception 'Invalid analytics category reference';
    end if;
  elsif v_type in ('product_interest','share_product') then
    if v_ref !~ v_uuid_pattern or not exists (
      select 1
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.id = v_ref::uuid
        and p.is_active = true and p.is_visible = true
        and c.is_active = true and c.is_visible = true
    ) then
      raise exception 'Invalid analytics product reference';
    end if;
  else
    v_ref := '';
  end if;

  insert into private.menu_analytics_minute_rate(
    minute_bucket,event_type,ref_id,language,accepted_count
  ) values (
    v_bucket,v_type,v_ref,v_language,1
  )
  on conflict (minute_bucket,event_type,ref_id,language)
  do update set accepted_count = private.menu_analytics_minute_rate.accepted_count + 1
  where private.menu_analytics_minute_rate.accepted_count < 60
  returning accepted_count into v_rate;

  if not found then
    return;
  end if;

  insert into public.menu_analytics_daily(event_date,event_type,ref_id,language,count,updated_at)
  values (v_date,v_type,v_ref,v_language,1,now())
  on conflict (event_date,event_type,ref_id,language)
  do update set
    count = least(public.menu_analytics_daily.count + 1, 5000),
    updated_at = now();

  if random() < 0.01 then
    delete from private.menu_analytics_minute_rate
    where minute_bucket < now() - interval '2 days';
  end if;
end;
$function$;

-- One-RPC Excel import: PostgreSQL rolls back the entire import on any error.
create or replace function public.apply_menu_excel_updates(
  p_categories jsonb default '[]'::jsonb,
  p_products jsonb default '[]'::jsonb,
  p_options jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_patch jsonb;
  v_id uuid;
  v_rows integer;
  v_categories integer := 0;
  v_products integer := 0;
  v_options integer := 0;
begin
  if not private.can_manage_menu() then
    raise exception 'Not allowed' using errcode='42501';
  end if;

  if jsonb_typeof(coalesce(p_categories,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_products,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_options,'[]'::jsonb)) <> 'array' then
    raise exception 'Import payloads must be JSON arrays';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_categories,'[]'::jsonb)) loop
    v_id := (v_item->>'id')::uuid;
    v_patch := coalesce(v_item->'patch','{}'::jsonb);
    update public.categories c set
      name_ar = case when v_patch ? 'name_ar' then v_patch->>'name_ar' else c.name_ar end,
      name_ku = case when v_patch ? 'name_ku' then v_patch->>'name_ku' else c.name_ku end,
      name_en = case when v_patch ? 'name_en' then v_patch->>'name_en' else c.name_en end,
      is_active = case when v_patch ? 'is_active' then (v_patch->>'is_active')::boolean else c.is_active end,
      is_visible = case when v_patch ? 'is_visible' then (v_patch->>'is_visible')::boolean else c.is_visible end,
      sort_order = case when v_patch ? 'sort_order' then (v_patch->>'sort_order')::integer else c.sort_order end,
      availability_schedule_enabled = case when v_patch ? 'availability_schedule_enabled' then (v_patch->>'availability_schedule_enabled')::boolean else c.availability_schedule_enabled end,
      available_from = case when v_patch ? 'available_from' then nullif(v_patch->>'available_from','')::time else c.available_from end,
      available_to = case when v_patch ? 'available_to' then nullif(v_patch->>'available_to','')::time else c.available_to end,
      updated_at = now()
    where c.id = v_id;
    get diagnostics v_rows = row_count;
    v_categories := v_categories + v_rows;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_products,'[]'::jsonb)) loop
    v_id := (v_item->>'id')::uuid;
    v_patch := coalesce(v_item->'patch','{}'::jsonb);
    update public.products p set
      category_id = case when v_patch ? 'category_id' then nullif(v_patch->>'category_id','')::uuid else p.category_id end,
      name_ar = case when v_patch ? 'name_ar' then v_patch->>'name_ar' else p.name_ar end,
      name_ku = case when v_patch ? 'name_ku' then v_patch->>'name_ku' else p.name_ku end,
      name_en = case when v_patch ? 'name_en' then v_patch->>'name_en' else p.name_en end,
      base_price = case when v_patch ? 'base_price' then nullif(v_patch->>'base_price','')::numeric else p.base_price end,
      image_url = case when v_patch ? 'image_url' then nullif(v_patch->>'image_url','') else p.image_url end,
      is_active = case when v_patch ? 'is_active' then (v_patch->>'is_active')::boolean else p.is_active end,
      is_visible = case when v_patch ? 'is_visible' then (v_patch->>'is_visible')::boolean else p.is_visible end,
      is_available = case when v_patch ? 'is_available' then (v_patch->>'is_available')::boolean else p.is_available end,
      sort_order = case when v_patch ? 'sort_order' then (v_patch->>'sort_order')::integer else p.sort_order end,
      availability_schedule_enabled = case when v_patch ? 'availability_schedule_enabled' then (v_patch->>'availability_schedule_enabled')::boolean else p.availability_schedule_enabled end,
      available_from = case when v_patch ? 'available_from' then nullif(v_patch->>'available_from','')::time else p.available_from end,
      available_to = case when v_patch ? 'available_to' then nullif(v_patch->>'available_to','')::time else p.available_to end,
      updated_at = now()
    where p.id = v_id;
    get diagnostics v_rows = row_count;
    v_products := v_products + v_rows;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_options,'[]'::jsonb)) loop
    v_id := (v_item->>'id')::uuid;
    v_patch := coalesce(v_item->'patch','{}'::jsonb);
    update public.product_options po set
      product_id = case when v_patch ? 'product_id' then nullif(v_patch->>'product_id','')::uuid else po.product_id end,
      name_ar = case when v_patch ? 'name_ar' then v_patch->>'name_ar' else po.name_ar end,
      name_ku = case when v_patch ? 'name_ku' then v_patch->>'name_ku' else po.name_ku end,
      name_en = case when v_patch ? 'name_en' then v_patch->>'name_en' else po.name_en end,
      price = case when v_patch ? 'price' then nullif(v_patch->>'price','')::numeric else po.price end,
      sort_order = case when v_patch ? 'sort_order' then (v_patch->>'sort_order')::integer else po.sort_order end,
      updated_at = now()
    where po.id = v_id;
    get diagnostics v_rows = row_count;
    v_options := v_options + v_rows;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'categories_updated', v_categories,
    'products_updated', v_products,
    'options_updated', v_options
  );
end;
$function$;

revoke all on function public.apply_menu_excel_updates(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.apply_menu_excel_updates(jsonb,jsonb,jsonb) to authenticated;

-- Compatibility keys keep the current dashboard and older clients in sync.
create or replace function public.adjust_menu_prices_mode(
  p_category_id uuid,
  p_delta numeric,
  p_price_mode text default 'dinein'
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  v_mode text:=lower(coalesce(p_price_mode,'dinein'));
  v_products integer:=0;
  v_options integer:=0;
  v_takeaway integer:=0;
begin
  if not private.can_manage_menu() then raise exception 'Not allowed' using errcode='42501'; end if;
  if p_delta is null or p_delta<>trunc(p_delta) then raise exception 'Price change must be a whole number'; end if;
  if v_mode not in ('dinein','takeaway','both') then raise exception 'Unsupported price mode'; end if;

  if v_mode in ('takeaway','both') then
    if exists(
      select 1 from public.product_options po
      join public.products p on p.id=po.product_id
      where (p_category_id is null or p.category_id=p_category_id)
        and coalesce(po.takeaway_price,po.price)+p_delta<0
    ) then raise exception 'A takeaway price would become negative'; end if;
    update public.product_options po
      set takeaway_price=coalesce(po.takeaway_price,po.price)+p_delta
      from public.products p
      where p.id=po.product_id and (p_category_id is null or p.category_id=p_category_id);
    get diagnostics v_takeaway=row_count;
  end if;

  if v_mode in ('dinein','both') then
    if exists(
      select 1 from public.products p
      where (p_category_id is null or p.category_id=p_category_id)
        and p.base_price is not null and p.base_price+p_delta<0
    ) or exists(
      select 1 from public.product_options po
      join public.products p on p.id=po.product_id
      where (p_category_id is null or p.category_id=p_category_id)
        and po.price+p_delta<0
    ) then raise exception 'A dine-in price would become negative'; end if;
    update public.products p
      set base_price=base_price+p_delta
      where base_price is not null and (p_category_id is null or p.category_id=p_category_id);
    get diagnostics v_products=row_count;
    update public.product_options po
      set price=po.price+p_delta
      from public.products p
      where p.id=po.product_id and (p_category_id is null or p.category_id=p_category_id);
    get diagnostics v_options=row_count;
  end if;

  return jsonb_build_object(
    'ok',true,
    'mode',v_mode,
    'products',v_products,
    'options',v_options,
    'takeaway_options',v_takeaway,
    'products_updated',v_products,
    'options_updated',v_options,
    'takeaway_options_updated',v_takeaway
  );
end;
$function$;
