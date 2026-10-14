# PG09 implementation evidence

## Current notice recovery / responsive follow-up — 2026-10-12

**Observed exact-source verification:** `9131284dbb908df3e36a3b188e93f8001f659a36`, [CI 38193033849](https://github.com/masharzy/ekmivo/actions/runs/38193033849), 4/4 PASS. Real SQL + Go HTTP operation tests PASS; **26 Chromium UI-only checks PASS** with mocked operations API, including notice recovery/viewer denial, 1024px and both locales' System/emulated OS change. No combined deployed browser/finance or physical OS acceptance is claimed.

Real Go scoped notice history/retry endpoints and Next proxies now support payment detail receipt recovery; owner/admin reason and duplicate-risk confirmation required, viewer read-only, source-unavailable/offline/loading/error states explicit. Browser harness adds owner/viewer interactions, 1024px and EN/BN System theme following emulated OS dark/light. [Current audit](../PG06-PG09-AUDIT.md) records exact observed CI outcomes. These browser tests mock operation responses; real Go/SQL assertions are a separate layer. They do not prove a deployed combined browser → Go → finance flow. Full physical OS/keyboard/offline/switching sweep remains in [the manual ledger](../../MANUAL-VERIFICATION.md). Overall production acceptance remains OPEN.

## New code checkpoint — 2026-10-11 (UNVERIFIED)

See [PG06–PG09 source checkpoint](../PG06-PG09-CODE-CHECKPOINT.md). Native collection, server matching, merchant delivery and operational screens are now implementation drafts on `codex/pg06-pg09-code`. These edits have **no build/CI/database/browser/real-device evidence yet** by the owner's explicit code-first instruction. Any older PASS above belongs only to its referenced older commit.

Acceptance: OPEN. New migration 0014 is not applied; no live verification or deployment claimed. Outstanding checks and prerequisites are recorded in [the consolidated manual ledger](../../MANUAL-VERIFICATION.md). Preserve the difference between a fictional parser fixture and approved real receipt samples.

## Current branch audit follow-up — 2026-10-11 (NOT ACCEPTED)

[Required PG06–PG09 audit](../PG06-PG09-AUDIT.md); [verification-only draft PR #9](https://github.com/masharzy/ekmivo/pull/9); [single manual ledger](../../MANUAL-VERIFICATION.md). Baseline 513ae04, code fixes up to 24cb641a; later evidence commits do not prove an untested test result.

Operational real API/UI source exists but has not been tested with logged-in browser, real isolated records, roles and EN/BN/theme responsive view. UUID-desc pagination is not chronological. Exports/refund/public receipt/full invoice depend on later PGs and must remain unavailable.

Automated verification: source-authored tests/CI invocation are not PASS until a completed exact-commit run is recorded in the audit. New migration 0014 is NOT APPLIED. Real handset/provider/merchant payment, notices and deployment are NOT TESTED. Acceptance: **OPEN**.

## PG06-focused CI source context — 2026-10-11

The exact-source CI 38158507367 at 8aaf240 passed Next build/lint/typecheck and 0014 isolated installation. This is NOT authenticated real-record/role/browser coverage of PG09 screens, actions, responsive EN/BN, theme or stable time cursors. PG09 acceptance OPEN; see ../PG06-PG09-AUDIT.md.

## PG09 implementation and exact-source verification — 2026-10-12

**Source SHA:** `0b7a4fd4b7d65eaa8d21169b00b427cf1a4064bf` on branch `codex/pg06-pg09-code`. [GitHub Actions CI #38186957573](https://github.com/masharzy/ekmivo/actions/runs/38186957573) is **4/4 PASS**: Go unit/race/vet, Android debug/unit, Docker API/worker/migrator, Next lint/OpenAPI/TS/build and disposable financial/PostgreSQL browser/HTTP tests. The combined SQL regression reports **493 assertions across PG04–PG09**, not 493 PG09-only cases. The migration 0014 was replayed in disposable independent Sandbox and Live financial databases; **not applied in production**.

### Implemented and verified by available automation

- API-backed Overview, Payments, Incoming receipts, Devices, Receiving Accounts, Webhooks, Events and their supported detail/actions; PG05 Requests flows remain integrated. Sources are real isolated SQL fixtures, never UI-generated fake payment records. Payment details expose immutable receipt provenance, original/sync/verified times, allocations and webhook delivery history. Incoming detail shows five-field comparison without human mark-paid.
- SQL `pg09_read` implements **server-side** bounded, literal search over the full tenant dataset; filtered by status, account, method and date as supported. A `(timestamp, UUID)` keyset cursor provides stable chronological paging and prevents older-page churn after new inserts. Foreign/invalid cursor rejected; no UUID-as-time ordering.
- Real Go HTTP tests with actual session auth: owner/viewer/editor read; owner-only endpoint create/disable; viewer/editor POST denied; unauthenticated GET denied; wrong workspace denied; live finance unavailable fails 503 rather than exposing sandbox; once-visible key returned only on create and never repeated via GET; server-side search and persisted mutations verified.
- SQL tests exercise device rename/revoke with retained receipt history; receiving-account disable/enable and status; webhook disable/enable, endpoint-scoped delivery history; incoming reprocess only returns eligible unmatched/ambiguous evidence to `pending` instead of bypassing matching; audit trail retained and reader direct mutation denied.
- Actual authorized Next shell + **mocked payment API fixture** browser tests exercise owner list, payment/incoming detail, overview, source outage 503, no mark-paid, viewer read-only, EN and BN with light/dark at **320/768/1440px** without horizontal overflow. These tests are UI-only mocks, not a single real browser→financial DB end-to-end run.
- This source additionally fixes physical financial realm checking in `pg06_scope`, protecting PG09 reads/actions in addition to workspace/environment session scope; stale/corrupted persisted datetime filters no longer crash operations; saved filters hydrate only for the matching user/business/realm and reset cleanly when absent. Operations remount on tenant/realm changes and prevent previous realm's once-visible signing secret, stale rows, draft or confirm dialog from appearing across contexts.

**Historical failed CI:** Earlier PG09 run #38170141886 failed a negative test assuming a read role could not SELECT authorized finance data; that assumption was corrected to deny unauthorized direct **mutation**. Later draft UI scope reset initially violated `react-hooks/set-state-in-effect`; replaced with scheduled cleanup. Exact run #38186957573 passed the corrected checks. No historical failed/cancelled run is counted as green.

### PG09 acceptance and dependencies still open

1. **MANUAL OWNER BROWSER:** A real deployed authenticated user, actual connected permitted financial source/account and permission matrix (owner/admin/editor/viewer), role removal/session revocation, deep links and refresh, browser back/forward, cross-tab switch, drafts, focus/keyboard/Escape, 320/768/1024/desktop, full EN/BN Light/Dark/System/OS mode. CI's UI browser uses mocked payment API data; actual Go HTTP and SQL were separately verified, not in the same session.
2. **LIVE SOURCE:** PG05 public payment issuance still sandbox-only (**SIMULATED — DO NOT SEND MONEY**), PG06 real handset/provider receipt parser and true provider identity/original transaction time still require owner approval. No live payments or production database changes.
3. **LATER OWNERS:** Real refund/refundability, receipt resend/consented notice, invoices/customers/import/export and broader reconciliation/settlement require PG08 notice and PG10–PG13 service owners. UI must not promise those operations already work; absent services remain dependency-unavailable, never fake “success”.
4. **OPERATOR GATE:** Real alerting, retention/key management, staging restore/crash, browser accessibility and owner-approved production sign-off. Cross-service genuine provider receipt→payment→merchant webhook not yet accepted.

**Disposition:** PG09 implemented source and available **isolated automated verification PASS**. **PG09 overall product acceptance OPEN**, because owner real-browser/live/provider and dependent service requirements above are untested/unavailable. Audit: [PG06–PG09](../PG06-PG09-AUDIT.md), owner-only tests: [MANUAL-VERIFICATION.md](../../MANUAL-VERIFICATION.md); draft [PR #9](https://github.com/masharzy/ekmivo/pull/9) remains open and unmerged. No production deployment/migration.

## Integration section UI — 2026-10-14

See [combined implementation/evidence](../INTEGRATIONS-EVENTS-20261014/README.md) for the redesigned developer/webhook/event/connection screens, local checks and rollback-only sandbox SQL. This does not close this PG's production acceptance. Permanent 0058 migration, deployment and real runtime/receiver tests remain in the consolidated manual ledger.