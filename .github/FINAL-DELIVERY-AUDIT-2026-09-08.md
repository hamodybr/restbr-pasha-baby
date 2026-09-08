# Pasha Baby — Final Delivery Audit

Date: 2026-09-08

Production: `https://pashababy.restbr.com`
Repository: `hamodybr/restbr-pasha-baby`
Production branch: `main`
Audit branch: `audit/final-delivery-2026-09-08`
Supabase project: `wlollfpmjzenhkjwxrqo`

## Current result

Software / infrastructure readiness: **PASS, pending final catalog-content confirmation**.

No destructive catalog cleanup is performed by this audit without owner confirmation.

## Verified production state

### Identity / isolation
- Dedicated Pasha Baby repository and Supabase project.
- Retail-only runtime (`businessType: retail`).
- Dining modes disabled.
- Customer language is Arabic-only / RTL.
- Correct production domain and Pasha identity.
- No `Your Coffee`, `Shorash`, `raw.githack.com`, or takeaway storefront references found in the current default-branch code search.

### Deployment / CI
- Every push runs pre-deploy and retail-commerce audits.
- GitHub Pages deployment is restricted to `main`.
- Live Smoke and Live Commerce checks run after production deployment.
- Production SHA at audit start: `9514394cfa5670e94d78772206d2d701e99d34fb`.
- Its Validate, Deploy, Live Smoke and Live Commerce jobs all passed.

### Database integrity snapshot
- Categories: 9.
- Products: 17.
- Product options: 21.
- Products missing a category: 0.
- Orphan product options: 0.
- Duplicate category sort orders: 0.
- Duplicate product sort orders inside a category: 0.
- Active legacy hot flags: 0.
- Active category timed availability: 0.
- Active product timed availability: 0.
- RLS enabled on the audited application tables.

### Store settings
- Store name: `پاشا بيبي`.
- Phone: `07500200660`.
- WhatsApp normalized to `9647500200660` / `+9647500200660`.
- Address/footer location: `دهوك — بروشكي`.
- Location link is present in the active `location` field.
- Store open, orders enabled, delivery enabled and pickup enabled at audit time.
- Language switch disabled and enabled languages = Arabic only.

### Product image storage
- New product images use Backblaze B2 through the authenticated `b2-images` Edge Function.
- Current catalog image sources: 1 B2, 5 legacy Supabase Storage, 11 without dedicated image.
- B2 warning threshold: 8 GB.
- B2 upload hard stop: before 9 GB.
- Maximum optimized upload accepted by the gateway: 700 KB.
- `b2-images` and `b2-cleanup` require JWT and also verify menu-management permission.
- `b2-images` production CORS was tightened during this audit to allow `https://pashababy.restbr.com` only; temporary raw.githack preview access was removed.
- The repository source for the same CORS hardening is staged on the audit branch.

### Storefront / PWA cleanup staged on audit branch
- Retired category timed-availability presentation script removed from the storefront shell.
- Retired schedule asset removed from the Service Worker precache list.
- Service Worker namespace bumped from `restbr-pasha-baby-v25` to `restbr-pasha-baby-v26` so old cached assets are purged after production rollout.

## Security review

### PASS
- No Backblaze application key in GitHub/browser code.
- No Supabase `service_role` in public browser configuration.
- B2 write/delete gateway requires JWT and menu-manager authorization.
- RLS is enabled on audited application tables.
- Reorder RPCs are not executable by `anon`.

### Supabase advisor warnings reviewed
- `reorder_categories(uuid[])` and `reorder_products(uuid,uuid[])` are `SECURITY DEFINER` and executable by authenticated users, but both immediately enforce `public.can_access_admin()` and reject unauthorized callers. Kept as-is because the internal authorization check is intentional and changing execution context could break the controlled bulk reorder path.
- Supabase Auth leaked-password protection is disabled. Enabling it is recommended when available in the Auth dashboard.
- Unused-index notices are informational and intentionally left unchanged on this new/low-traffic database.

## Final catalog-content confirmation required

A remaining active/visible catalog record looks like recent test data and must be confirmed before final stable handoff:

- Category: `جوارب`
- Product: `جوارب`
- Base price: `45,000`
- Option: `احمر واوس`
- Five colors: black, white, blue, pink, yellow

This audit does **not** delete it automatically. If the owner confirms it is test data, remove it before final snapshot and rerun integrity checks.

## Content follow-up (non-blocking for software)

- 11 of 17 current products have no dedicated image and use the Pasha placeholder.
- 5 existing product images remain on legacy Supabase Storage; this is supported and safe. New images use B2.
- Final real inventory, names, descriptions and prices remain business-content responsibility and should be confirmed by the store owner.

## Remaining technical follow-up before final stable

1. Confirm whether the `جوارب` category/product above is real or test content.
2. After final catalog cleanup, regenerate/sync the bundled offline fallback `data/menu.json` so it reflects the final production catalog instead of the earlier starter snapshot.
3. Merge the validated audit branch to `main` and rerun Validate → Deploy → Live Smoke → Live Commerce.
4. Create final recovery branch `stable/pasha-baby-final-delivery-2026-09-08` from the final production SHA.

## Non-blocking future hardening

- `admin.html` still loads Supabase JS from the `@2` major alias and loads exact-version SortableJS/XLSX from jsDelivr without SRI. Storefront Supabase JS is already exact-version pinned with SRI. Pinning all admin CDN scripts and adding SRI is recommended for a higher-security deployment, but is not blocking the current handoff.
- Some legacy restaurant wording still exists in the static admin source and is normalized to retail wording by the Pasha admin copy layer at runtime. This does not affect the rendered dashboard, but source-level cleanup can be done later during a larger admin refactor.
