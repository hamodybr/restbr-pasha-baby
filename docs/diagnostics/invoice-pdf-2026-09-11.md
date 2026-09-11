# Invoice PDF iPhone diagnosis — 2026-09-11

Observed on real iPhone/Safari after PR #48: the print preview visibly renders, then remains indefinitely on `جاري إنشاء PDF بالخط المرفوع…` / `لا تغلق هذه النافذة` and never replaces the window with a PDF.

Conclusion: the `html2canvas-v3` path is not production-safe for this device. Do not treat a green static CI check as proof that the browser renderer completes on iOS. The next renderer must avoid html2canvas/CDN dependencies and include a hard completion timeout.
