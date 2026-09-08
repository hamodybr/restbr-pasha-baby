# Pasha Baby — Handoff Checklist

Date: 2026-09-08

## Production rollout gates

- [x] Final database integrity audit passed.
- [x] Training category/product hidden from customer catalog.
- [x] Visible categories = 8.
- [x] Visible products = 16.
- [x] No visible test/demo catalog rows.
- [x] No orphan options/colors.
- [x] No duplicate visible sort positions.
- [x] No active legacy hot/timed-availability state.
- [x] B2 gateway hard stop remains before 9 GB.
- [x] B2 production CORS restricted to pashababy.restbr.com.
- [x] Offline fallback synchronized with the final visible catalog.
- [x] Service Worker bumped to v26 for clean cache rollover.
- [x] Audit branch Validate + Retail Commerce checks passed.

## Required after merge to main

- [ ] Main Validate passes.
- [ ] GitHub Pages Deploy passes.
- [ ] Live Smoke passes.
- [ ] Live Commerce passes.
- [ ] `https://pashababy.restbr.com` opens correctly.
- [ ] `https://pashababy.restbr.com/admin` opens correctly.
- [ ] Create final recovery branch from the deployed main SHA.

## Non-blocking business content

- 11 visible products still use the Pasha placeholder until the store supplies dedicated photography.
- Final inventory/prices/descriptions remain editable from the dashboard without code deployment.
