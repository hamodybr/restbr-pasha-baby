-- Pasha Baby admin deletion permissions for orders and customers.
-- Order item rows are removed by the existing ON DELETE CASCADE relation.
-- Deleting a customer preserves historical orders because orders.customer_id uses ON DELETE SET NULL.

set lock_timeout = '5s';
set statement_timeout = '30s';

alter table public.orders enable row level security;
alter table public.customers enable row level security;

drop policy if exists restbr_orders_delete on public.orders;
create policy restbr_orders_delete
on public.orders for delete to authenticated
using ((select private.can_manage_orders()));

drop policy if exists pasha_customers_delete on public.customers;
create policy pasha_customers_delete
on public.customers for delete to authenticated
using ((select private.can_manage_orders()));

grant delete on public.orders to authenticated;
grant delete on public.customers to authenticated;
