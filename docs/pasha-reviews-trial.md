# Pasha Baby reviews trial

Base: ff1a2728f05f3edf1e59a3411e720c6ccebb3586. Feature branch only; no production database migration or deployment performed.

## Try
Serve this branch over HTTP and open reviews.html?demo=1. Demo data is explicitly marked and submission writes nothing. Do not open invitation links in the demo. Live integration requires applying the migration to a test database with the existing order/role schema and setting runtime-config to that test project.

## Operation
Dashboard Home → تقييمات الزبائن. Enable reviews and optionally save a Google review link. Enter a completed order number to generate/copy its private 90-day invitation. Share only with that customer. This implementation does not send messages automatically. Invite issuance is repeatable until expiry; expiry rotates the token. Submission is one-time, idempotent, and checks completed status again. Avoid changing completed status until a status update is actually required.

Public reviews use approved rows only. Administrators can change moderation status with an audit reason, but cannot rewrite ratings/comments. Apply the same relevance/privacy/abuse criteria to every rating. Google link is shown independently of rating, before and after submission. No self-serving aggregateRating schema is added.

Invitation tokens are private bearer capabilities, not proof of the recipient's legal identity. They are removed from the address bar and are never saved to browser storage. If the page is reloaded, reopen the original invitation. The original number/phone/order/customer are never exposed by the public reviews RPC. A review's verified purchase badge survives deletion of the historical order.

## Validation / rollout
The Reviews trial checks workflow starts a disposable PostgreSQL 16 database, checks permissions/lifecycle, and runs Chromium mobile form/security tests with mocked Supabase requests. The existing Pages workflow checks the rest of the site and deploys only main. No automatic merge.

Before production release: review test results, apply the additive migration to the correct project, deploy the reviewed code, keep enabled=false until a real end-to-end test succeeds. No test reviews should be seeded into production. Google URL remains empty until the merchant supplies a verified review URL. An empty URL hides that button.

Disable from dashboard to hide reviews and stop submissions; original checkout is independent. Do not drop review tables for rollback. Apply migrations once through normal migration tracking.
