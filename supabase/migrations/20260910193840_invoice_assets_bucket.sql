-- Public print assets; writes remain restricted to authorized dashboard users.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'invoice-assets',
  'invoice-assets',
  true,
  8388608,
  array[
    'image/jpeg','image/png','image/webp',
    'font/woff2','font/woff','font/ttf','font/otf',
    'application/font-woff','application/font-sfnt','application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists restbr_invoice_assets_insert on storage.objects;
create policy restbr_invoice_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'invoice-assets'
  and (select private.can_manage_restaurant_settings())
);

drop policy if exists restbr_invoice_assets_delete on storage.objects;
create policy restbr_invoice_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'invoice-assets'
  and (select private.can_manage_restaurant_settings())
);
