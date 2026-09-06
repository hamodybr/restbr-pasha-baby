alter table public.discounts
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

alter table public.discounts
  drop constraint if exists discounts_time_window_check;

alter table public.discounts
  add constraint discounts_time_window_check
  check (starts_at is null or ends_at is null or ends_at > starts_at);

create index if not exists discounts_active_scope_idx
  on public.discounts (is_active, scope_type, target_id);

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_ar text not null,
  name_ku text,
  name_en text,
  color_hex text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_colors_hex_check check (
    color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create index if not exists product_colors_product_sort_idx
  on public.product_colors (product_id, sort_order, created_at);

alter table public.product_colors enable row level security;

revoke all on table public.product_colors from anon, authenticated;
grant select on table public.product_colors to anon;
grant select, insert, update, delete on table public.product_colors to authenticated;

drop policy if exists restbr_product_colors_public_read on public.product_colors;
create policy restbr_product_colors_public_read
  on public.product_colors
  for select
  to anon
  using (
    is_active = true
    and exists (
      select 1
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.id = product_colors.product_id
        and p.is_active = true
        and p.is_visible = true
        and c.is_active = true
        and c.is_visible = true
    )
  );

drop policy if exists restbr_product_colors_authenticated_read on public.product_colors;
create policy restbr_product_colors_authenticated_read
  on public.product_colors
  for select
  to authenticated
  using (
    (
      is_active = true
      and exists (
        select 1
        from public.products p
        join public.categories c on c.id = p.category_id
        where p.id = product_colors.product_id
          and p.is_active = true
          and p.is_visible = true
          and c.is_active = true
          and c.is_visible = true
      )
    )
    or (select private.can_access_admin())
  );

drop policy if exists restbr_product_colors_insert on public.product_colors;
create policy restbr_product_colors_insert
  on public.product_colors
  for insert
  to authenticated
  with check ((select private.can_manage_menu()));

drop policy if exists restbr_product_colors_update on public.product_colors;
create policy restbr_product_colors_update
  on public.product_colors
  for update
  to authenticated
  using ((select private.can_manage_menu()))
  with check ((select private.can_manage_menu()));

drop policy if exists restbr_product_colors_delete on public.product_colors;
create policy restbr_product_colors_delete
  on public.product_colors
  for delete
  to authenticated
  using ((select private.can_manage_menu()));
