# Pasha Baby — Final Production Rollback

If the final production rollout ever needs to be reverted:

1. Use the recovery branch created after the successful deployment: `stable/pasha-baby-final-delivery-2026-09-08`.
2. Compare its SHA with current `main` before any rollback.
3. Restore code from that recovery SHA through a normal PR/merge; do not rewrite production history unless absolutely necessary.
4. Supabase catalog/settings data are separate from GitHub code. Restore data only from a verified backup/snapshot and only if the issue is data-related.
5. Backblaze B2 product-image credentials remain in Supabase Edge Function Secrets and must never be copied into GitHub/browser code.
