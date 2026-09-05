# Pasha Baby audit hardening baseline

Applied 2026-09-06 to the dedicated Pasha Baby retail deployment.

Permanent safeguards checked before every Pages deployment:

- Pasha Baby retail identity and domain are intact.
- Browser-delivered files contain no Supabase secret/service-role key.
- JavaScript parses successfully and local assets referenced by HTML/CSS/PWA exist.
- Admin UI stays locked until the signed-in account passes `can_access_admin()`.
- Admin role verification is deferred outside `onAuthStateChange` async callback work.
- Offline menu snapshots expire after 24 hours.
- Excel bulk imports use the transactional `apply_menu_excel_updates` RPC.
- Category navigation uses category UUIDs rather than translated names.
- WhatsApp order IDs include a random nonce.
- Restaurant-only dine-in/takeaway/discount dead code is excluded from the Pasha retail build.
- Service-worker cache namespace and hardening layer are validated before deploy.
- GitHub Pages actions are pinned to exact commit SHAs.

Database hardening is recorded in `supabase/migrations/20260905223000_pasha_audit_hardening.sql`.
