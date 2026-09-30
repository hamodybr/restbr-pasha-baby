-- Existing products start at 5,000 IQD by owner instruction; historic orders are untouched.
alter table public.products add column delivery_fee numeric not null default 5000
  constraint products_delivery_fee_valid check (delivery_fee between 0 and 1000000 and delivery_fee = trunc(delivery_fee));
-- Keep 5,000 as a compatibility default for old imports; the admin form requires explicit input.

CREATE OR REPLACE FUNCTION public.create_pasha_order(p_customer jsonb, p_order jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_client_token uuid;
  v_order_number text;
  v_phone text;
  v_name text;
  v_address text;
  v_location text;
  v_notes text;
  v_order_type text;
  v_item jsonb;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_selected_color text;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric := 0;
  v_existing record;
  v_catalog_fee numeric;
  v_product_id uuid;
begin
  if jsonb_typeof(coalesce(p_customer, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_order, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid order payload';
  end if;

  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Order must contain between 1 and 100 items';
  end if;

  v_phone := left(trim(coalesce(p_customer->>'phone_e164', '')), 20);
  v_name := left(trim(coalesce(p_customer->>'name', '')), 80);
  v_address := nullif(left(trim(coalesce(p_customer->>'address', '')), 300), '');
  v_location := nullif(left(trim(coalesce(p_customer->>'location_url', '')), 500), '');
  v_notes := nullif(left(trim(coalesce(p_order->>'notes', '')), 500), '');
  v_order_type := lower(trim(coalesce(p_order->>'order_type', '')));
  v_order_number := left(trim(coalesce(p_order->>'order_number', '')), 80);
  v_delivery_fee := greatest(0, coalesce(nullif(p_order->>'delivery_fee','')::numeric, 0));

  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid normalized phone';
  end if;
  if v_name = '' then
    raise exception 'Customer name is required';
  end if;
  if v_order_type not in ('delivery','pickup') then
    raise exception 'Invalid order type';
  end if;
  if v_order_type = 'delivery' and v_address is null then
    raise exception 'Delivery address is required';
  end if;

  begin
    v_client_token := nullif(p_order->>'client_token','')::uuid;
  exception when others then
    raise exception 'Invalid client token';
  end;
  if v_client_token is null then
    raise exception 'Client token is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_client_token::text, 0));

  select o.id, o.order_number, o.subtotal, o.delivery_fee, o.total, o.customer_id
  into v_existing
  from public.orders o
  where o.client_token = v_client_token
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'customer_id', v_existing.customer_id,
      'subtotal', v_existing.subtotal,
      'delivery_fee', v_existing.delivery_fee,
      'total', v_existing.total,
      'phone_e164', v_phone
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce(nullif(v_item->>'quantity','')::integer, 0);
    v_unit_price := coalesce(nullif(v_item->>'unit_price','')::numeric, -1);
    if v_qty < 1 or v_qty > 99 or v_unit_price < 0 then
      raise exception 'Invalid order item';
    end if;
    v_subtotal := v_subtotal + (v_qty * v_unit_price);
  end loop;

  -- Recalculate from the catalog, independent of browser/Edge fee inputs.
  -- Existing orders return above and keep their originally recorded fee.
  v_delivery_fee := 0;
  if v_order_type = 'delivery' then
    for v_item in select value from jsonb_array_elements(p_items) loop
      v_product_id := nullif(v_item->>'product_id','')::uuid;
      select p.delivery_fee into v_catalog_fee from public.products p where p.id = v_product_id;
      if not found or v_catalog_fee is null then raise exception 'Invalid delivery product'; end if;
      v_delivery_fee := greatest(v_delivery_fee, v_catalog_fee);
    end loop;
  end if;
  if v_order_type = 'delivery' and v_delivery_fee <> coalesce(nullif(p_order->>'expected_delivery_fee','')::numeric,-1) then
    raise exception 'Delivery fee changed';
  end if;
  v_total := v_subtotal + v_delivery_fee;
  if v_order_number = '' then
    v_order_number := 'PB-' || to_char(now() at time zone 'Asia/Baghdad','YYMMDD') || '-' || upper(substr(replace(v_client_token::text,'-',''),1,8));
  end if;

  insert into public.customers(
    phone_e164, name, default_address, default_location_url, created_at, updated_at
  ) values (
    v_phone, v_name, v_address, v_location, now(), now()
  )
  on conflict (phone_e164) do update set
    name = excluded.name,
    default_address = coalesce(excluded.default_address, public.customers.default_address),
    default_location_url = coalesce(excluded.default_location_url, public.customers.default_location_url),
    updated_at = now()
  returning id into v_customer_id;

  insert into public.orders(
    order_number, customer_id, client_token, customer_name, customer_phone,
    order_type, address, location_url, notes, status,
    subtotal, delivery_fee, total, source, created_at, updated_at
  ) values (
    v_order_number, v_customer_id, v_client_token, v_name, v_phone,
    v_order_type, v_address, v_location, v_notes, 'new',
    v_subtotal, v_delivery_fee, v_total, 'web', now(), now()
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := v_qty * v_unit_price;
    v_selected_color := nullif(left(trim(coalesce(v_item->>'selected_color','')), 80), '');

    insert into public.order_items(
      order_id, product_id, option_id, product_name, option_name, selected_color,
      quantity, unit_price, line_total, created_at
    ) values (
      v_order_id,
      nullif(v_item->>'product_id','')::uuid,
      nullif(v_item->>'option_id','')::uuid,
      left(trim(coalesce(v_item->>'product_name','')), 200),
      nullif(left(trim(coalesce(v_item->>'option_name','')), 200), ''),
      v_selected_color,
      v_qty, v_unit_price, v_line_total, now()
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'customer_id', v_customer_id,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'phone_e164', v_phone
  );
end;
$function$;

-- Preserve the existing service-only creation boundary.
revoke all on function public.create_pasha_order(jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_pasha_order(jsonb,jsonb,jsonb) to service_role;

