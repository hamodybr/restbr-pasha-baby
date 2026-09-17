# Product-color lag and mobile resource audit — 2026-09-17

## Confirmed defects fixed

Five independent observer feedback loops were reproduced against main
`fcb4bfbc5f227aa294d97606f8e39d14dfd3d3b0` using real DOM MutationObserver semantics
in JSDOM and a deterministic animation-frame scheduler:

| Source | Trigger | Fix |
| --- | --- | --- |
| Product descriptions | Reassigning identical More text triggers its menu observer every frame; each pass rebuilds the open gallery | Idempotent text writes and meaningful-content guard for sheet refresh |
| Card Details button | Identical button text triggers the same menu observer indefinitely | Compare before writing |
| Commerce color preview | Identical preview caption triggers its own subtree observer | Compare caption and raw image source before writing |
| Brand UI | Adding/removing an already-present/absent logo class still generates observed class mutations | Guard class changes and absent image source removal |
| Fixed discounts | Replacing identical discount text and option price HTML triggers menu observer indefinitely | Guard text and price markup writes |

Repeated selection of the same color no longer reassigns image source; fallback state
is retained until the requested slide changes. Unrelated menu changes no longer
destroy gallery thumbnails. Relevant description/price/color/language changes and
replacement cards still refresh the sheet. The selected color is preserved and
passed to the existing purchase action.

## Verification

- `PERF_SOURCE_REF=fcb4bfbc5f227aa294d97606f8e39d14dfd3d3b0 node scripts/mobile-idle-regression.mjs`:
  all five isolated cases and combined case fail to become idle within 20 frames.
- Fixed version: all six cases pass; callbacks stop after settling, repeated same-color
  clicks produce zero image source writes, thumbnail nodes survive unrelated changes,
  live content updates preserve selection, and cart handoff remains correct.
- Added regression to every Pages validation run before deployment.
- Existing syntax, retail, orders, invoice, numeric input, color preview, performance,
  server-order validation and service-worker checks pass locally.
- Cache generation v42 and versioned loaders ensure clients receive the correction.

This test measures unnecessary DOM/JavaScript work, not phone temperature or GPU
power. Safari/iPhone thermal behavior still needs a real-device comparison.

## Prepared follow-up work (not applied in this patch)

1. Profile moving news ticker behind an open sheet. `js/arabic-news-ticker.js`
   applies an infinite transform animation. Consider pausing it while obscured and
   respecting reduced-motion without changing its default appearance.
2. Profile full-screen blur: product backdrop uses 4px blur, gallery controls 8px,
   commerce image lightbox 14px. Consider a mobile solid/translucent fallback only
   if device profiling shows compositing pressure.
3. Audit actual color-image payload dimensions/bytes and use appropriately sized
   thumbnails. Current thumbnail and gallery may use the same original color URL;
   do not bulk recompress originals or migrate storage without a separate review.
4. Confirm remaining legacy card/logo/offer animations after the CSS cascade;
   source declarations alone do not prove they are active or cause overheating.

Acceptance on iPhone: open Car set, alternate all four colors, repeat selection,
swipe gallery, close/reopen, then remain idle for a minute. Compare responsiveness
and battery/temperature under the same brightness/network conditions. No real
order needs to be submitted for this check.
