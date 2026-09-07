alter table public.discounts
  add column if not exists discount_amount numeric(12,2);

alter table public.discounts
  drop constraint if exists discounts_discount_percent_check;

alter table public.discounts
  add constraint discounts_discount_percent_check
  check (discount_percent >= 0 and discount_percent <= 100);

alter table public.discounts
  drop constraint if exists discounts_discount_amount_check;

alter table public.discounts
  add constraint discounts_discount_amount_check
  check (discount_amount is null or discount_amount > 0);

alter table public.discounts
  drop constraint if exists discounts_discount_value_check;

alter table public.discounts
  add constraint discounts_discount_value_check
  check (
    coalesce(discount_amount, 0) > 0
    or coalesce(discount_percent, 0) > 0
  );

-- Pasha Baby now uses fixed IQD discounts only in the admin UI.
-- Keep historical percentage rows for audit/history, but do not leave them active.
update public.discounts
set is_active = false,
    updated_at = now()
where is_active = true
  and coalesce(discount_amount, 0) <= 0
  and coalesce(discount_percent, 0) > 0;

create index if not exists discounts_active_amount_scope_idx
  on public.discounts (is_active, scope_type, target_id, discount_amount);
