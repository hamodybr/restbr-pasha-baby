
create role anon;
create role authenticated;
create schema private;
create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function private.can_manage_orders() returns boolean language sql as $$select coalesce(current_setting('test.manager',true),'')='yes'$$;
create table public.orders(id uuid primary key default gen_random_uuid(),order_number text unique,status text);
insert into public.orders(order_number,status) values('PB-TEST-1','completed'),('PB-TEST-2','new'),('PB-TEST-3','completed');
