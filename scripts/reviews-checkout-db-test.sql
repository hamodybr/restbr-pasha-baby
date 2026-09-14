
\set ON_ERROR_STOP on
alter table public.orders add column client_token uuid,add column customer_name text default 'Sara Test',add column created_at timestamptz default now();
