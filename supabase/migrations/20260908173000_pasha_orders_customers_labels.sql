-- Pasha Baby customers, persisted orders, and 100x150 label foundation.
-- Additive migration: keeps storefront browser roles read-only for customer/order data.

set lock_timeout = '5s';
set statement_timeout = '30s';

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  name text not null,
  default_address text,
  default_location_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
  drop constraint if exists customers_phone_e164_check;
alter table public.customers
  add constraint customers_phone_e164_check
  check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

-- Existing RESTBR installations already have orders/order_items. These guards
-- make this migration safe if the feature is applied to an older Pasha copy.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  order_type text not null check (order_type in ('delivery', 'pickup')),
  address text,
  location_url text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled')),
  subtotal numeric not null default 0 check (subtotal >= 0),
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  total numeric not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  option_id uuid references public.product_options(id) on delete set null,
  product_name text not null,
  option_name text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.orders
  add column if not exists client_token uuid;
alter table public.orders
  add column if not exists source text not null default 'web';

create unique index if not exists orders_client_token_unique_idx
  on public.orders(client_token) where client_token is not null;
create index if not exists customers_created_at_idx on public.customers(created_at desc);
create index if not exists customers_phone_e164_idx on public.customers(phone_e164);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Reuse the project's existing updated_at helper when available.
do $$
begin
  if to_regprocedure('private.set_updated_at()') is not null then
    execute 'drop trigger if exists customers_updated_at on public.customers';
    execute 'create trigger customers_updated_at before update on public.customers for each row execute function private.set_updated_at()';
  end if;
end;
$$;

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Customer records are private to authenticated dashboard users who can view
-- reports. Public storefront users never receive direct SELECT/INSERT rights.
drop policy if exists pasha_customers_read on public.customers;
create policy pasha_customers_read
on public.customers for select to authenticated
using ((select private.can_view_reports()));

drop policy if exists pasha_customers_update on public.customers;
create policy pasha_customers_update
on public.customers for update to authenticated
using ((select private.can_manage_orders()))
with check ((select private.can_manage_orders()));

-- Recreate the existing order policies idempotently so older copies inherit
-- the same dashboard access model.
drop policy if exists restbr_orders_read on public.orders;
create policy restbr_orders_read
on public.orders for select to authenticated
using ((select private.can_view_reports()));

drop policy if exists restbr_orders_update on public.orders;
create policy restbr_orders_update
on public.orders for update to authenticated
using ((select private.can_manage_orders()))
with check ((select private.can_manage_orders()));

drop policy if exists restbr_order_items_read on public.order_items;
create policy restbr_order_items_read
on public.order_items for select to authenticated
using ((select private.can_view_reports()));

grant usage on schema public to authenticated;
grant select, update on public.customers to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- Explicit server-side rights. No service-role key is ever shipped to the browser.
grant select on public.categories, public.products, public.product_options, public.discounts to service_role;
grant select, insert, update on public.customers to service_role;
grant select, insert on public.orders, public.order_items to service_role;

-- Transactional server-only RPC. The Edge Function validates catalog state and
-- prices, then this function atomically upserts the customer + order + items.
create or replace function public.create_pasha_order(
  p_customer jsonb,
  p_order jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric := 0;
  v_existing record;
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

  select o.id, o.order_number, o.total, o.customer_id
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

    insert into public.order_items(
      order_id, product_id, option_id, product_name, option_name,
      quantity, unit_price, line_total, created_at
    ) values (
      v_order_id,
      nullif(v_item->>'product_id','')::uuid,
      nullif(v_item->>'option_id','')::uuid,
      left(trim(coalesce(v_item->>'product_name','')), 200),
      nullif(left(trim(coalesce(v_item->>'option_name','')), 200), ''),
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

revoke all on function public.create_pasha_order(jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_pasha_order(jsonb,jsonb,jsonb) to service_role;

-- Dashboard summary: phone remains the visible business identifier while UUID
-- stays internal and stable if the phone is ever corrected later.
create or replace view public.customer_order_summary
with (security_invoker = true)
as
select
  c.id,
  c.phone_e164,
  c.name,
  c.default_address,
  c.default_location_url,
  c.created_at,
  c.updated_at,
  count(o.id) filter (where o.status <> 'cancelled')::bigint as order_count,
  coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::numeric as total_spent,
  min(o.created_at) filter (where o.status <> 'cancelled') as first_order_at,
  max(o.created_at) filter (where o.status <> 'cancelled') as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

revoke all on public.customer_order_summary from public, anon;
grant select on public.customer_order_summary to authenticated;
