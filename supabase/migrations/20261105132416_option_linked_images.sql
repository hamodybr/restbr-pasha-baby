-- Optional per-option gallery image. Existing prices, options and RLS stay intact.
alter table public.product_options add column if not exists image_url text;
comment on column public.product_options.image_url is 'Optional image displayed in the product gallery when this option is selected.';
notify pgrst, 'reload schema';
