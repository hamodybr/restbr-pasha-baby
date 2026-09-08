# Pasha Baby — Final Delivery Audit

Date: 2026-09-08

Production: `https://pashababy.restbr.com`
Repository: `hamodybr/restbr-pasha-baby`
Production branch: `main`
Audit branch: `audit/final-delivery-2026-09-08`
Supabase project: `wlollfpmjzenhkjwxrqo`

## Result

Software / infrastructure readiness: **PASS — ready for final production rollout**.

The owner confirmed that the extra `جوارب / جوارب` record was training data created while teaching the store owner how to use the dashboard. It was safely disabled/hidden rather than destructively deleted.

## Verified state

### Identity / isolation
- Dedicated Pasha Baby repository and Supabase project.
- Retail-only runtime (`businessType: retail`).
- Dining modes disabled.
- Customer language is Arabic-only / RTL.
- Correct production domain and Pasha identity.

### Deployment / CI
- Every push runs pre-deploy and retail-commerce audits.
- GitHub Pages deployment is restricted to `main`.
- Live Smoke and Live Commerce checks run after production deployment.
- Audit-branch validation passes before merge.

### Database integrity after cleanup
- Visible categories: 8.
- Visible products: 16.
- Visible test/training categories: 0.
- Visible test/training products: 0.
- Blank visible Arabic category names: 0.
- Blank visible Arabic product names: 0.
- Negative product prices: 0.
- Negative option prices: 0.
- Orphan product options: 0.
- Orphan product colors: 0.
- Duplicate visible category sort orders: 0.
- Duplicate visible product sort orders inside a category: 0.
- Active legacy hot flags: 0.
- Active category timed availability: 0.
- Active product timed availability: 0.
- RLS remains enabled on the audited application tables.

### Training-data cleanup
- Category `جوارب` was set `is_active=false` and `is_visible=false`.
- Product `جوارب` under that category was set `is_active=false`, `is_visible=false`, and `is_available=false`.
- Its historical option/color rows were retained with the hidden product so the training example remains recoverable and no destructive cleanup was required.

### Store settings
- Store name: `پاشا بيبي`.
- Phone: `07500200660`.
- WhatsApp normalized to `9647500200660` / `+9647500200660`.
- Address/footer location: `دهوك — بروشكي`.
- Active location link is present.
- Store open, orders enabled, delivery enabled and pickup enabled at audit time.
- Language switch disabled and enabled languages = Arabic only.

### Product image storage
- New product images use Backblaze B2 through the authenticated `b2-images` Edge Function.
- B2 warning threshold: 8 GB.
- B2 upload hard stop: before 9 GB.
- Maximum optimized upload accepted by the gateway: 700 KB.
- `b2-images` and `b2-cleanup` require JWT and also verify menu-management permission.
- Production `b2-images` CORS was tightened during this audit to allow only `https://pashababy.restbr.com`; temporary raw.githack preview access was removed.
- The matching source hardening is staged in the audit branch.

### Storefront / PWA cleanup
- Retired category timed-availability presentation script removed from the storefront shell.
- Retired schedule asset removed from Service Worker precache.
- Service Worker namespace bumped from `restbr-pasha-baby-v25` to `restbr-pasha-baby-v26`, so old cached assets are purged after rollout.
- Bundled offline fallback `data/menu.json` was regenerated from the final visible catalog structure using real production category/product/option IDs and the current B2 product-image URL.
- Offline fallback category order now matches the final dashboard order.

## Security review

### PASS
- No Backblaze application key in GitHub/browser code.
- No Supabase `service_role` in public browser configuration.
- B2 write/delete gateway requires JWT and menu-manager authorization.
- RLS is enabled on audited application tables.
- Reorder RPCs are not executable by `anon` and both perform an internal `public.can_access_admin()` authorization check.

### Reviewed non-blocking advisor items
- Supabase warns that the two reorder RPCs are `SECURITY DEFINER` and executable by `authenticated`; this is intentional because both functions immediately reject callers who fail `can_access_admin()`.
- Supabase Auth leaked-password protection is disabled. Enabling it from the Auth dashboard is recommended when available.
- Unused-index notices are informational on this new/low-traffic database and were intentionally left unchanged.

## Content follow-up — non-blocking for software handoff

- 11 of the 16 visible products currently have no dedicated product image and use the Pasha placeholder.
- Several older images remain on legacy Supabase Storage; this is supported. New uploads use B2.
- Final real inventory, descriptions and prices remain store-content responsibility and can be updated through the dashboard without code changes.

## Non-blocking future hardening

- `admin.html` still loads Supabase JS from the `@2` major alias and exact-version SortableJS/XLSX from jsDelivr without SRI. Storefront Supabase JS is already exact-version pinned with SRI. Pinning all admin CDN scripts and adding SRI is recommended for a higher-security deployment, but does not block this handoff.
- Some legacy restaurant wording remains in static admin source and is normalized to retail wording by the Pasha admin copy layer at runtime. It does not affect the rendered dashboard and can be source-refactored later.

## Final rollout procedure

1. Merge this validated audit branch to `main`.
2. Require production workflow success: Validate → Deploy → Live Smoke → Live Commerce.
3. Verify storefront and admin production URLs.
4. Create recovery branch `stable/pasha-baby-final-delivery-2026-09-08` from the final production SHA.
