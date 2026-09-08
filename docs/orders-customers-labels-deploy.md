# Pasha Baby Orders + Customers + 100x150 Labels

Production remains on `main` until the two Supabase steps below are complete and tested.

## 1. Apply database migration

Run this file in Supabase SQL Editor against project `wlollfpmjzenhkjwxrqo`:

`supabase/migrations/20260908173000_pasha_orders_customers_labels.sql`

The migration is additive and creates/updates:
- `public.customers`
- order/customer linkage on `public.orders`
- private RLS-protected customer reporting
- server-only `create_pasha_order` RPC
- server-only order submission rate limiting
- duplicate-submit concurrency locking

Do not grant anonymous browser roles direct access to customers/orders.

## 2. Deploy Edge Function

Deploy:

`supabase/functions/pasha-orders/index.ts`

Function name: `pasha-orders`

JWT verification: **OFF**

Reason: checkout is public/anonymous. The function is the server boundary and performs its own origin, payload, store-state, catalog, availability, pricing, discount, idempotency and rate-limit validation before a service-role-only transactional RPC. No service-role credential is present in the browser.

Allowed storefront origins are limited in function code.

## 3. Production activation

Only after migration + function deployment succeed:
1. Test one delivery checkout and one pickup checkout from the feature version or immediately after controlled merge.
2. Confirm the order appears under Admin > الطلبات.
3. Confirm the customer appears under Admin > الزبائن using normalized phone number.
4. Print the order with `PDF / طباعة 100×150` and verify page size.
5. Confirm WhatsApp contains the same order number and totals.
6. Merge PR #15 to `main` and monitor GitHub Pages validation/deploy/live-smoke.

## Safety points

Pre-feature production snapshot:
- `backup/pre-orders-customers-labels-main-2026-09-08`
- commit `bd129dee717b2cd01d389c55fa1ebee8d34477ff`

Validated feature snapshots also exist under `backup/orders-feature-*`.
