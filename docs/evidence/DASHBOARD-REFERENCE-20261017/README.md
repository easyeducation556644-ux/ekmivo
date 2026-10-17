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

### Reference reconciliation / API-key modal after source comparison

The attached `Ekmivo_Dashboard_Premium(2).html` source defines the Customers table as Customer, Phone, Payments, **Last payment**, and an unlabeled chevron action. The separate issue screenshot differs. Following the owner's explicit rule that HTML is source of truth, commit `5331328` restores the Last payment column and chevron, undoing the earlier screenshot-driven Status/Details column changes. This is a source comparison, not an end-to-end visual acceptance.

The HTML API-key create modal contains its own Sandbox/Live environment choice. Commits `7f320e1` / `fbf038e` / `1bc3423` implement the authorized realm selector, and `7a9be7c` / `909f3f1` switch to the created realm after the one-time secret is dismissed. The latter deployment reported Vercel success. Secret values remain generated server-side, never hardcoded. Real key creation/verification remains manual pending.

### Sandbox credentials UI follow-up

- `705dcc3`: create-form example and empty-state copy are selected-realm aware (no production-only wording on Sandbox).
- `010c1d0`: credential draft storage uses the selected **create** realm, not the current outer list realm. Switching the create modal from Live to Sandbox keeps saved drafts isolated.
- Newly created cross-realm secret is displayed once; after dismissal the list switches to the created realm. The backend remains authoritative about active realm, password and permissions. No actual key or secret was created during this audit.

### Localization and source-reference audit follow-up — 2026-10-17

- The attached Premium HTML, not the differing Customers screenshot, defines the precise table shape. The table was restored to the reference in `5331328` (Last payment, chevron).
- Checkout Themes localizes server load/save/conflict feedback and logo upload errors in `cc53c34`; preview control accessibility labels updated in `2732f2c`. No payment proof or backend theme schema behavior was modified.
- Source-only CSS rule comparison against all five dedicated HTML references found nearly all copied named selectors represented in the corresponding scoped CSS; deviations were chiefly root/body scoping, existing layout adapters and some overrides. This is **not** pixel-equivalent browser evidence or proof of interactive acceptance.
- Control database READ ONLY for the authenticated workspace shown in the connected Ekmivo browser confirmed its Live and Sandbox environments are both active and payment product access is enabled. Do not store key secrets, passwords or mutable workspace fixtures as evidence.


## Drawer, sidebar, requests, hosted invoice continuation — 2026-10-17

**Scope implemented in source:** Shared `RefModal` drawer now uses max 480px width, independent scroll body, pinned padded header/footer, responsive safe-area and long-ID wrapping. The common modal uses native `showModal()` focus containment, Escape, backdrop dismissal and original-trigger focus return; One-time Requests detail migrated from its independent dialog to this component. Payments/Customers/Invoices/Links/SMS devices/SMS Data/API keys already shared `RefModal`. Sidebar now splits fixed logo/workspace, a compact independently scrollable nav with thin hover scrollbar, and a fixed Billing footer on desktop/mobile. Active nav scrolls into view and Checkout Themes icon changed to palette. Payment Requests toolbar/table/tabs are a single card; actual create/cancel/copy/view and request APIs remain wired, with readable label while full original reference is copyable.

**Invoices:** UI primary Create Invoice creates then issues using two separately idempotent authorized writes; Save Draft remains possible and navigational draft saving does not issue. Backend assigns `INV-0001` etc atomically in an independent per-workspace, per-realm counter for blank-reference creates; optional reference override is under Advanced. Existing invoice-defined `fee_minor` is an additive seller-specified document fee included in `pg10_total`; **not a gateway processing charge**. Other tax/shipping/discount adjustments are preserved and a read-only subtotal/fee/total breakdown is shown. Existing `pg10_visit` is the associated public hosted checkout and allocation link; Payment Links shows invoice-linked capabilities in a separate collapsible section, without forging duplicate payment-link documents. Public `/invoice/[token]` now renders a bilingual, printable invoice with merchant branding, line items, dates, customer name and dynamic Draft/Due/Overdue/Paid/Void status; Pay routes to existing `/pay` only for issued unpaid invoices. Existing SMTP invoice worker now composes a mobile HTML alternative plus text fallback from server-priced data, and checks invoice status before sending; previous text-only notices remain untouched.

**Schema and migration verification:** New additive `0078_invoice_numbers.sql`: `pg10_invoice_sequences`, `pg10_invoice_auto_create`. New `0079_public_invoice_details.sql`: public invoice date/name/status metadata. New `0080_invoice_public_draft.sql`: capability-protected sanitized draft invoice preview (never payable until issued). All three installed in both production Live and Sandbox financial databases through Neon SQL transactions, with SHA-256 ledger entries:
- 0078: `ca7ac1eba7110c60ac941fb6b1127ceb4818ec75593fef139515aaff11930da8`
- 0079: `347ad43c36927747180364330c4bc731d1ee4b1a756494f7134bde1218de9652`
- 0080: `ee01427fd2178103da0ba9d569d8fa2a73f1cd161b444cbfdcde8a1fe14e7ac3`

**Actual isolated Neon Sandbox contract tests PASS (writes rolled back):** 0078 sequential numbers and same-key idempotent replay; 0079 Draft not public, Issued metadata and Cancelled accessible; 0080 Draft capability preview including private-notes redaction, then Issued/Cancelled states. Production ledger functions/SHAs verified read-only after application. No production payment/invoice fixture writes.

**Not yet accepted:** Connected browser cannot be driven for authenticated screenshot visual comparisons at 320/768/1024/1440, themes EN/BN, real invoice email delivery or Live payment E2E. GitHub Foundation CI runner failed before any test step; Vercel builds for later commits hit `build-rate-limit`. Do not mark lint, full build, Go unit tests or real payment acceptance PASS. There is currently no verified production backend deployment of these source changes. Do not claim the entire dashboard completed.


### Additional financial smoke and source checks — 2026-10-17

- Source correction `9eea1b1`: the New Payment Link button now executes authorized create then publish; if publishing fails, it retains an actual draft rather than presenting a usable live link.
- **PASS in isolated Neon Sandbox, rolled back:** a fresh payment link is private as Draft, becomes public and server-priced after `pg10_write(...'publish'...)`, and retains the correct amount. This tests the financial SQL contract, not browser checkout.
- **PASS in isolated Neon Sandbox, rolled back:** both Draft and Void invoice capabilities were rejected by `pg10_visit` (no checkout intents), while their public preview can be read after migration 0080; sanitization removes private_notes.
- Go source test `backend/internal/checkout/invoice_delivery_test.go` now checks escaping and Paid-vs-Pay in generated invoice email. It has **not been executed** because no Go CI runner was allocated.
- Migrations 0078, 0079, 0080 ledger checksum/readiness checked in both production Live and Sandbox financial DBs. All changed Go/Next code awaits fresh compile/build, not an acceptance pass. Vercel reported deployment failure due to subscription `build-rate-limit` rather than compiler output; GitHub Foundation jobs did not run.


### Follow-up continuation after canonical routing correction — 2026-10-17

Additional source fixes on `main`:
- `ff84733` fixes invoice email URL contract-test fixtures to the current language-neutral public routes; no `/en` or `/bn` path prefixes are used.
- `9681700` allows saved raster data URI logos in the hosted invoice (PNG/JPEG/WebP only).
- `3402a3d` preserves the existing ability to email a fully paid *issued* invoice; the HTML template displays verified confirmation, not a Pay CTA.
- `9dca7e3`, `b6c6a68`, `6497aa1` add persisted Checkout Theme merchant title/validated logo, issue date and recipient details to HTML invoice email while preserving text fallback; no database schema change.
- `ba41bac`, `76d866f` change Invoice Print to use the public invoice page, not the dashboard drawer, and invoke print after public invoice data loads.
- `7ec0d50` styles read-only invoice financial summary and separately grouped invoice payment capabilities using existing dashboard color and spacing tokens.

**Observed deploy/build evidence:** Connected Render service `ekmivo-go-api` auto-deploys from `main`. Deploy `dep-db9hdvv2d8hs73d7c8hg` at commit `6497aa1` reached **live** with a successful Go build log. This is Go binary compilation/deployment, **not** `go test` passing. The latest web commits remain blocked by Vercel `build-rate-limit` (not a compiler failure), and GitHub Foundation workflow jobs failed at runner setup before any test steps.

**Read-only production database evidence:** Live: 1 issued invoice, 1 linked invoice intent, 0 verified invoice allocations; Sandbox: 0 issued invoices and 0 verified allocations. Thus there is **no** real verified invoice receipt in these databases with which to demonstrate end-to-end Paid sync. The sandbox rollback database contract checks were successful in earlier sections, but they are not live receipt/checkout E2E tests. Live/Sandbox production ledger entries for `0078`–`0081` are present with matching SHA-256 values.

**Release blockers still open:** authenticated browser visual comparison and interactive behavior for all original pages, Next.js production build/lint/type-check, Go unit and integration tests, SMTP delivery to a real inbox and provider-verified invoice payment lifecycle. No 100% acceptance claim.


### Implementation follow-up — code defects fixed before release validation (2026-10-17)

- **Invoices:** `Save as draft` and primary Create/Issue now use the same browser-validated form submitter, avoiding direct-click bypass of required line-item fields. Hosted invoices use saved Checkout Theme store name, explicitly label merchant From, and defer print until images finish loading (bounded timeout).
- **Payment Links:** invoice-linked capabilities are retrieved using the actual cursor, with refresh, incremental Load more, loading, empty and error states. In-flight paginated responses are aborted upon workspace/realm change so old tenant data cannot appear in a new workspace. The no-results message is held until all pages are exhausted.
- **Billing:** paid-plan checkout redirect was corrected from obsolete `/${locale}/checkout/…` to canonical `/checkout/…` (same middleware routes as all other hosted payments). Added a Node contract-check script to fail on locale-prefixed `/invoice`, `/pay`, `/checkout` URLs in the affected frontend components.
- **Shared RefModal:** icon close buttons use EN/BN accessible labels on the seven requested surfaces; reopening clears stale closing-animation state. Checkout Theme preview-only step/wallet-placeholder labels translate without persisting preview state.
- **Migration correctness (important):** original financial migration coordinator only listed 0069–0077, despite production having 0078–0081. It now includes all 0078–0081 financial migrations on both Live and Sandbox using existing SHA-ledger checking, skipping already applied files. Disposable PostgreSQL financial smoke setup was updated to install the four additive invoice migration files and assert auto reference idempotency, sequential numbers, and public Draft/Issued/Void redaction/state.
- **Isolated Neon contract checks PASS and rolled back:** billing paid-plan scheduled Free downgrade retains benefits through term, Undo clears scheduled change, and Free activates at period end without payment. Invoice public projection uses an **existing already verified Sandbox allocation** associated inside a rollback subtransaction: paid_minor became 5,500, due_minor became 0, one verified receipt appeared, and private notes stayed excluded. An earlier attempt to manufacture a payment from mismatched attempt and receipt was correctly rejected by financial proof integrity constraints. This is **not** a real provider/browser payment test.
- **Limitations:** No fully authenticated interactive browser visual/UX verification at 320/768/1024/1440, no production receipt E2E, no actual SMTP inbox acceptance, and no fresh Next.js lint/typecheck/production build because the Vercel build-rate-limit and GitHub runner provisioning are still blocking. The new financial smoke cases are source changes, **not executed CI passes**. No production financial test writes and no Docker invoked in this continuation.

Do not claim 100% until full test and visual acceptance run.
