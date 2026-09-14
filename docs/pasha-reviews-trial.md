# Pasha Baby checkout reviews

After a successful order save, an optional review dialog appears before WhatsApp. Sending a rating or skipping continues to WhatsApp. Disabled/unavailable reviews preserve the normal handoff. A failed review shows retry and skip; it never resubmits the order.

The server matches the saved order ID and its private client token, checks the order is less than 24 hours old and not cancelled, and permits one review per order. The first name comes from the saved order. Checkout reviews display “Verified order”; legacy completed-purchase reviews retain their original badge.

Star-only ratings at every score publish immediately. Comments keep the entire review pending, excluded from the public average until approved. Only insertion applies this rule; subsequent moderation remains an explicit admin decision with audit reason. No existing rejected reviews are automatically republished.

Home quick actions and Customers each have a summary card with the approved average/count and pending comment count. Manual invitation controls were removed from the dashboard. Existing invitation links still work. Google review links are available independently of the star score.

Validation: disposable PostgreSQL tests cover ownership, publication, moderation, duplicate submissions, cancellation, expiry and counts. Chromium mobile tests run the actual order handler through skip, stars, comments, failed review and disabled states, verifying exactly one WhatsApp handoff and one order save. Dashboard cards are tested in both hosts.

Apply 20260914180000_checkout_reviews_v2.sql before deploying the UI. Keep the existing feature settings and Google URL. All checkout simulations use mocks or rolled-back transactions; do not publish test reviews. Disable the feature in the dashboard for immediate fallback to ordinary checkout.
