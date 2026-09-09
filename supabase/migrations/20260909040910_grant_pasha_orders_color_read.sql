-- The public color table was created after the original service-role baseline.
-- The order Edge Function needs read-only access to validate a submitted color
-- against the authoritative catalog before persisting its display name.

grant select on table public.product_colors to service_role;
