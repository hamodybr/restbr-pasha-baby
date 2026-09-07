# Pasha Baby — Final Delivery Audit

Date: 2026-09-07

Production: `https://pashababy.restbr.com`
Repository: `hamodybr/restbr-pasha-baby`
Supabase: `wlollfpmjzenhkjwxrqo`

## Result

Software / infrastructure readiness: **PASS with non-blocking follow-up items**.

## Verified

### Isolation and identity
- Dedicated Pasha Baby repository.
- Dedicated Supabase project.
- Runtime `businessType: retail`.
- Dining modes disabled.
- Arabic-only customer policy active.
- Correct production domain and Pasha identity.

### CI / deployment
- Every push runs pre-deploy and retail commerce audits.
- Deployment and live smoke are restricted to `main`.
- GitHub Actions used by the workflow are SHA-pinned.
- Live smoke verifies the production domain after deploy.

### Database / permissions
- RLS is enabled on all application tables.
- Anonymous users receive read-only access only to public catalog/settings data allowed by policy.
- Menu/settings/discount writes are role gated.
- Mutating RPCs require authenticated menu-management permission.
- Storage write/delete permissions are role gated.
- One active `super_admin` account exists.
- No orphan product/option/color rows were found.
- No negative prices or blank Arabic product/category names were found.
- No product/category timed availability is currently active.
- No `is_hot` retail products are active.

### Delivery data cleanup
- Visible `قسم تجريبي / تيست` data was disabled and hidden, not destructively deleted.
- The later `جوارب / جوارب` test record with test pricing was disabled and hidden, not destructively deleted.
- Visible test categories after cleanup: 0.
- Visible test products after cleanup: 0.
- WhatsApp legacy and primary fields now point to the same real number.
- Customer language switch is disabled at data level and Arabic remains the only enabled language.
- Address/footer location are consistent: `دهوك — بروشكي`.
- Incorrect TikTok/Snapchat links are disabled until real links are supplied.
- Old temporary closed-order text was replaced with a neutral customer message.

### Offline / PWA
- Bundled `data/menu.json` fallback now contains the real Pasha contact/location/logo and Arabic-only display state instead of blank contact placeholders.
- Service Worker cache namespace bumped to `restbr-pasha-baby-v26` so old fallback cache is replaced.
- Admin navigation/assets use network-first/no-store behavior.

### Storefront / commerce
- Two-column mobile retail cards and responsive desktop grid.
- Product descriptions/details sheet.
- Colors and product options.
- Fixed-IQD discount path; percent discount UI is disabled for Pasha.
- Cart and WhatsApp order flow protected by retail commerce audit.
- Safe URL/media guards and cart stale-item guard are loaded.

### Documentation
- README rewritten for Pasha Baby Retail / Arabic-only production.
- SETUP replaced by Pasha operations and handoff instructions.

## Data snapshot after cleanup

- Visible categories: 8
- Visible products: 16
- Product options: integrity OK
- Active discounts: 0
- Visible test categories/products: 0
- Products with no dedicated image: 11
- Orders currently stored: 0

## Remaining non-blocking follow-up items

1. **Product content/images** — 11 of 16 visible products currently have no dedicated product image. The storefront safely uses the Pasha placeholder; actual product photography should be supplied by the store before a content-complete commercial launch.
2. **Catalog copy** — most current products are starter/sample catalog content. Owner should confirm final real inventory, names and prices before customer launch.
3. **Supabase Auth leaked-password protection** — Supabase Security Advisor reports this feature disabled. Enable it in Auth settings when available for stronger password hygiene. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
4. **Admin CDN supply-chain hardening** — storefront Supabase JS is version-pinned with SRI. `admin.html` still loads Supabase with `@2` and loads exact-version SortableJS/XLSX from jsDelivr without SRI. Pinning Supabase to the exact tested version and adding SRI hashes to all admin CDN scripts is recommended before a higher-security deployment.
5. **Repository branch hygiene** — multiple backup/preview/temporary branches remain. They do not affect production, but optional cleanup can be done after handoff once recovery branches are no longer needed.
6. **Unused DB indexes** — Supabase Performance Advisor reports several indexes as unused. They are intentionally left in place because this database is new/low-traffic; removing them now could be premature.

## Safety backup

Pre-audit code state preserved on branch:
`backup/pre-handoff-audit-2026-09-07`

No test catalog rows were deleted; they can be restored from the dashboard/database if required.
