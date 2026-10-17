# Dashboard reference overhaul — implementation checkpoint

Status: **IN PROGRESS. Not accepted, not pushed, not production verified.**

The isolated checkout is based on remote main `2e3ea0288eddab6553b3e089e8f08d78ca01859b`. Its local snapshot commit is not a remote main ancestor and must not be pushed as replacement history. Preserve the owner's separate dirty checkout. No production database changes have been made.

## Owner decisions

- Invoice Edit uses the same fields as Add Invoice, prefilled from the authorized full record. Clicking Edit closes the details drawer.
- Keep invoice items and adjustments. Tax, fee, shipping and discount inputs are compact, not full width.
- Customer reference is generated automatically. Tags are optional under More options.
- Paid downgrade is scheduled now, payment is collected when the current paid term ends, and the next paid plan starts only after verified payment. No automatic debit. Free scheduled changes require no payment.

## Reference inventory and acceptance checklist

All six supplied HTML files are available under the upload directory. CSS was extracted separately for each owning reference. The embedded checkout preview is explicitly a demo; the customer checkout uses React components and actual server data. The following boxes remain open until personally verified in the browser against the original markup/CSS.

| Surface | Implementation to verify | Desktop/mobile, EN/BN, light/dark |
|---|---|---|
| Payments | Single toolbar/table card, original table unchanged; search, filters, pagination, details modal | [ ] |
| Customers | Persisted number toggle; generated reference; optional tags; add/edit/import; compact actions; one card | [ ] |
| Invoices | Shared add/edit form; filled fields; drawer closes; compact adjustments; table; issue/view/send/remind/cancel | [ ] |
| Payment Links | Full table/card; create/edit/duplicate/copy/publish/disable/archive/delete; expiry/custom fields; live checkout | [ ] |
| SMS devices | Real phone/account/receipt counts; pairing QR; rename/revoke/reconnect; details | [ ] |
| SMS Data | Incoming receipt table and details/recheck; **reference table conversion still pending** | [ ] |
| API Keys | Create/copy/rotate/revoke, password confirmation, expiry/scopes/drafts, automatic webhook secret | [ ] |
| Notifications | Own reference panel, tabs/date groups/unread counts, read one/all, actual destination links | [ ] |
| Account | Own reference profile/security/session layout; name/drafts; verification/password flow; revoke sessions | [ ] |
| Help & Feedback | Own reference form, topics, subject/message counts, saved tickets/replies/filters | [ ] |
| Billing & Usage | Own reference four tabs/dialogs; no prototype state controls; actual plans/subscription/usage; quotes/renew/schedule/undo; PDF/CSV | [ ] |
| Checkout Themes | Own reference editor/preview/dock; N/R placeholders; database save/versioning/logo; customer details; nine real checkout themes | [ ] |

For every applicable surface, also verify focus trapping/restoration, Escape/outside close, reduced motion, hover/focus/disabled states, save failure/retry, loading/unavailable/empty states, keyboard operation, roles, refresh and deep links. No box above is implied passed by a build or source review.

## Current checks and constraints

- Latest web build and lint passed after billing changes. Lint reports 0 errors and 35 warnings; this is not a zero-warning result. A separate final TypeScript check is also required before a push.
- Latest Go `go test ./...` passed after billing changes. Synthetic SQL billing contract checks passed on the isolated Neon branch: scheduled downgrade preserves current entitlement; undo; three-cycle renewal; invoice and verified-proof replay; prorated upgrade; stale quote rejection; tenant authorization; free period-end change applied once.
- Isolated Neon branch: `br-silent-breeze-b32znlqj` in project `sparkling-mountain-38618629`. A fresh test branch could not be created because the project branch limit was reached. No other branch was deleted.
- Control migrations 0067, 0069, 0073, 0074, 0076 were applied on that test branch. Financial 0068, 0070–0072, 0075 and 0077 were applied to both test financial databases, after applying existing 0064/0066 prerequisites where missing. Later amendments to 0076/0077 were applied as additive test-only deltas. Verify a clean full replay before rollout.
- Direct database connectivity from the execution runtime fails DNS lookup (`EAI_AGAIN`), confirmed twice. Connector SQL works. This prevents a real local Next/Go/browser/database end-to-end test; do not substitute mocked fetches and call it verified.

## Required follow-through

1. Finish SMS Data reference conversion, audit form preservation and new-link publish behavior, font aliases, scoped OS-theme selectors, exact checkout artwork/clock labels, historical billing invoice labels and PDF output.
2. Review new quote/usage logic, metrics recording semantics, data retention/privacy, least-privileged grants, exact quota boundaries, scheduled paid renewal and failure paths. Existing metrics are bounded observations, not a complete historical count of all retries.
3. Add migrations to the existing reviewed migration command; do not add a second deployment/startup runner.
4. Run meaningful SQL authorization, visibility persistence, support, theme/logo/version conflict, link-action and checkout-details tests on the isolated branch. Re-run full migrations from a clean schema snapshot when capacity permits.
5. Restore direct test-database connectivity and complete real browser/API/database flows plus side-by-side reference comparison at 320/768/1024/desktop, light/dark/system and EN/BN.
6. Run final build, lint, type-check, contract checks and all applicable tests. Record actual results. Check latest remote main for concurrent changes, then publish only reviewed changes with the actual remote parent; no force push.
7. Coordinate additive production migrations and deployment only after checks. The test branch is not production rollout evidence.

## Database/API inventory under implementation

Control: `dashboard_user_preferences`, `pg13_support.topic`, `checkout_theme_settings`, `checkout_theme_logos`, `dashboard_billing_quotes`; extra quote/renewal/receipt fields on `pg13_platform_invoices`; theme, preference, billing quote/change/issue/proof/read/effective functions.

Financial: link disable/delete writer support; phone account/receipt counts; notification read-all; `checkout_customer_details`; `dashboard_checkout_checks`, `dashboard_usage_tracking`, billing usage/check recording and platform receipt method metadata.

Web routes: `/api/workspaces/[id]/preferences`, `/api/workspaces/[id]/checkout-theme`, `/api/checkout-logos/[digest]`, `/api/workspaces/[id]/billing-invoices/[invoice]/pdf`. Go billing adds usage, quote, schedule and undo paths; documents support link disable/delete; notifications support read-all; public checkout accepts configured customer details. All remain subject to the existing authentication, authorization, origin and scoped database boundary.

## Post-push audit and corrective commits — 2026-10-17

This section supersedes the historical statement that the overhaul was not pushed. The implementation was pushed as `9f1279cdd594f5511b21ab410b35d2913f73fa25`; subsequent fixes on `main` include customer number privacy (`6f7fa77`), support form idempotency on topic edits (`d006698`), notification-read/navigation ordering (`6dab285`), accurate cross-document error labels (`464cabf`), SMS-number masking of raw receipts (`8158213`), and preservation of the SMS details drawer when recheck fails (`2aefdf9`). These are **source fixes**, not browser acceptance.

Production ledger check: nine migrations `0069` through `0077` are recorded in their designated control/Live databases and each recorded SHA-256 matched the corresponding current repository SQL file. The Sandbox and Live financial ledger checksums match each other for the financial migrations. Checks were read-only; no migration rerun or production test write.

**Verification not completed:** GitHub Foundation CI run [39001884566](https://github.com/masharzy/ekmivo/actions/runs/39001884566) failed during job setup (four jobs failed after ~2 seconds, no steps, no runners allocated; job logs unavailable as BlobNotFound). It provides no lint/build/type-check/test result for these commits. Connected Browser allows tab-content reads but not interactive side-by-side visual regression or authenticated end-to-end testing here. Vercel deployment inspection failed 403 for the linked scope. Do not mark the reference checklist accepted. No exact-reference visual dimensions, mobile breakpoint acceptance, or browser→API→DB→refresh success is claimed. Full scope remains **IN PROGRESS**.

### Continuation after `d9467aa` (2026-10-17)

- Customer listing now uses an explicit `View` action, as in the dedicated premium reference; row keyboard activation and existing invoice/link table actions remain intact. Commit `32fa429`.
- Checkout Themes editor accepts the actual dashboard `en`/`bn` locale and translates its main controls, descriptions, theme cards and preview control labels. Preview-only controls remain UI state, not saved config. Commits `c35d447`, `275cb86`, `da988d8`.
- API key one-time secret disclosure observes each new Server Action result, not just the previous key ID. This preserves disclosure after subsequent rotations. Commit `122fb95`.
- Vercel production deployments for `32fa429`, `275cb86`, `da988d8` and `122fb95` reported success. This is Next.js deployment/build evidence, **not** a passing full CI, real browser comparison, API→database→refresh test, key rotation test or paid payment proof.
- Read-only Neon function audit: control contains `dashboard_checkout_theme_read/write`, `dashboard_preferences` and billing quote/change/issue/verified; Live and Sandbox contain `dashboard_billing_usage`, `dashboard_record_checkout_check`, `pg10_customer_activity`, `pg10_write`, `pg13_notification_read_all`. No schema updates or financial test writes in this continuation.
- Remaining release gates: original surface-specific HTML visual comparison at 320/768/1024/1440, EN/BN and Light/Dark/System, authenticated interactions/persistence, payment and billing lifecycle, devices/API key authentication, full GitHub CI (runner setup failures). Do not interpret the correction commits as 100% acceptance.

### Isolated contract checks and billing correction (2026-10-17)

- **PASS**, isolated Neon branch `br-silent-breeze-b32znlqj`, control: an owner/admin preference write → readback true/false → rollback verified in a single transaction subblock. No persisted test changes.
- **PASS**, same isolated branch, control: checkout theme save → saved version increment → stale version conflict → rollback; original theme state unchanged after the test.
- **INCOMPLETE**, isolated Sandbox financial link create/publish/disable/reenable/delete SQL smoke: initial test was rejected with `scope denied` because the bare SQL client did not supply the transaction-scoped runtime context; a second scoped attempt was blocked by the tool safety layer. Do not claim link lifecycle passed based on this.
- **Source change:** `453b8c5` scopes the one-use billing checkout idempotency key to invoice creation, rather than unrelated schedule/undo operations. Vercel deployment returned `READY`; **not** real purchased-plan or verified-payment acceptance.
- Most recent evidence update and billing commits reached a successful Vercel production build. GitHub Foundation CI runner setup and authenticated browser comparisons remain open.

### Sandbox and Live API key availability — 2026-10-17

- Reported defect: API Keys UI could only create Live keys although the backend already supports separate authenticated Sandbox and Live issuance. `DeveloperConsole` fetched both data sets but rendered only the dashboard's current realm.
- Fix: `credential-environment-switcher.tsx` provides a dedicated Sandbox/Live selector, only renders one credential manager at a time to avoid duplicate form IDs, and keeps each realm's API keys and automatic webhook secret separate. The server passes the actual enabled workspace environments; inactive realms show an unavailable state. Commits `03aec0d`, `839ecf6`, `58514d4`.
- The Create API Key modal also lets the owner/admin choose an active environment, matching the Premium HTML reference. Form requests retain the chosen realm and the existing server action independently checks workspace membership, realm activation, current password, plan rules (Live only), scoped secret hashing and rate limits. Changes `7f320e1`, `fbf038e`, `1bc3423`.
- The table now displays expiry, matching reference (`da93d6a`). Customers listing also uses reference Status/Details headers and actual status data (`19eed79`).
- Production Neon READ ONLY: workspace environment census found four active Sandbox workspace entries, three active Live entries, and one suspended Live entry. No credentials created, rotated, revoked or revealed for testing.
- Vercel deploy for `1bc3423`: READY (Next.js build). **Not yet accepted:** use an authenticated owner to issue an actual Sandbox key; copy the one-time secret; call a sandbox-only request; refresh and verify the record; rotate and revoke; check simultaneous Live key separation and viewer forbidden state. A real browser→API→DB→refresh test is required before marking this complete. GitHub Foundation CI runner startup remains separately blocked.
