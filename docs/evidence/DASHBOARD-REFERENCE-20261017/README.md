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
