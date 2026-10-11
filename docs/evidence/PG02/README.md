# PG02 — context-aware business/product/environment UX acceptance

**Status: IN PROGRESS, NOT ACCEPTED.** Product owner (2026-10-11) allowed PG02 UI implementation while PG01's security verification runs separately. No PG01 acceptance was implied, and PG03 must not start until PG01 and PG02 acceptance gates are closed.

## Canonical requirement mapping

Read `docs/PRODUCT-UX-SPEC.bn.md` sections **1 (placement and switching)**, **2 (merchant routes)**, **3 (all list/form states)**, **4 (payment overview/setup)** and **8–9** if relevant. Design source: `docs/DESIGN-SYSTEM.md` §§2–7 and `docs/design/tokens.css`.

| UI / state | Implemented source behavior | Evidence status |
| --- | --- | --- |
| Business selector | Current authorized `workspacesFor` list, role, search, selected state, create/manage link; target service remains enabled or falls back | Source, browser pending |
| Product switch | Payment/AI cards with availability reasons and last valid page, current click no navigation | Source, browser pending |
| Payment environment | Query `?env=sandbox/live`, server `requireWorkspace` and membership-revalidated `workspace_environments`; suspend/invalid/duplicate query denied; different business env remembered separately; explicit live setup-unavailable banner | Source, isolated SQL test pending final CI |
| Global search | Ctrl/⌘K, Escape, arrow/Enter, scoped **navigation-only** results; real record search not invented | Source, keyboard/focus QA pending |
| EN/BN + appearance | Language change retains query/env/hash; theme System/Light/Dark immediate cookie and cross-tab localStorage sync; source uses Ink & Bone/Hind Siliguri | Source, rendered four-combination/OS QA pending |
| Mobile UI | Drawer and two-row compact controls; CSS breakpoints at 1150, 800, 520, 355; 320px acceptance not yet rendered | Source, device QA pending |
| Loading/error/forbidden | Dynamic loading skeleton; actual server error with retry; unauthorized/invalid environment message with safe workspace fallback | Source, browser pending |
| Success/empty | Real selected business/product/env shown in header and context; absent business query shows empty; unavailable backend has **no fabricated zero records or financial actions** | Source, real integration pending |
| Notifications, payment records | No fake unread, mark-paid, payment-created or webhook-sent states; event/record backend not built, explicitly unavailable | **Not implemented; later PG owner screen contracts** |
| Unsaved forms | Account-scoped browser draft Save/Restore/Discard and guarded link navigation in workspace onboarding; shared Save/Discard/Stay registration for dashboard form transitions | Source + isolated draft tests; browser QA pending |

## Automated validation
- `node apps/web/scripts/pg02-navigation-smoke.mjs`: pure actual TypeScript navigation contract transpilation and assertions.
- `node apps/web/scripts/pg02-tenant-context-smoke.mjs`: disposable loopback PostgreSQL 17, 2 workspaces, membership revocation, environment suspension, user disabling and intentional rollback. No production fixture writes.
- `.github/workflows/ci.yml` requires both along with full Next lint, TypeScript, production build, Go/Postgres security tests and unchanged native Kotlin tests.

## PG02 remaining acceptance and manual checklist
- [ ] Verify all three CI jobs green on latest combined commit and record exact run ID.
- [ ] Authenticate as real workspace owner in production; use business search, switch selected/unselected product, confirm denied product is not reachable via deep link.
- [ ] Toggle Sandbox and Live, verify one per-business preference and no record/query leakage, reload/back/forward; suspended environment and forged membership browser denial.
- [ ] Test navigation search Ctrl/⌘K, arrow/Enter, Escape, semantic focus return, keyboard-only and screen reader.
- [ ] Test EN/BN + Light/Dark/System combinations at 320, 375, 768, 1024, 1440px, 200% zoom, OS color changes and two tabs. Check overflow, Bengali conjunct clipping, no flashing, no reset on theme/language switch.
- [ ] Implement and test unsaved draft Save/Discard/Stay, when the first relevant editable PG02 form is present.
- [ ] Verify loading skeleton, real network/server error and retry, unavailable context/forbidden, business no-match, success current context, service unavailable without showing 0 fake financial rows.
- [ ] Document what is deferred to later numbered PG screen scopes (PG03 keys, PG05 requests, PG09 financial record lists, PG13 notifications) without describing it as PG02 complete.

PG06 signer/validation and AN03 Kotlin application source stay **partial and unaccepted**. Do not claim true payment auto-confirmation, original receipt collection or signed merchant webhook delivery from this dashboard foundation.

## PG02 implementation checkpoint — 2026-10-11 (supersedes planning-only rows)

**Source/integration implemented for PG02 shell, business/AI/Payments availability, account security and local-draft flows. Owner browser QA OPEN. No payment provider/checkout/key/verified transaction implemented by PG02.**

- `infra/migrations/0005_pg02_product_access.sql` applied transactionally to production Neon after isolated PostgreSQL tests. Two product rows seeded for each existing/new workspace; 1 current business yielded 2 product rows with the pre-existing selected configuration. `workspace_product_access` has FORCE RLS and one least-privileged runtime policy; runtime has column-scoped SELECT only, no UPDATE or audit privileges. `workspace_product_access_audit` stores actor/time/before/after for real workspace-admin updates. No paid subscriptions or live payments were turned on.
- `apps/web/src/lib/server/auth.ts` derives effective `ai/commerce/both/off` mode from product access rows. Both-off returns a real authorized disabled-state page. `apps/web/src/actions/workspace-products.ts` locks current membership and product row, owner/admin only, audit + update atomically, idempotent no-op. `apps/web/src/components/workspace-product-controls.tsx` adds real EN/BN administrative toggles in `/workspaces`. Role and route checks remain server-side. Go `internal/authz` checks payments enabled under transaction-local FORCE RLS, not legacy `service_mode` alone.
- `apps/web/src/app/[locale]/account` is an authenticated data-backed account security page: profile fields, MFA metadata, actual active sessions, safe current-session preservation, revoke-other-sessions and name update with server-confirmed action feedback. No invented device/IP information. Error/loading states and responsive Ink & Bone are present.
- Account-scoped local business-onboarding draft Save/Restore/Discard and unsaved navigation protection; additional cross-context draft registry for dashboard editors. No local draft claims server persistence.
- Unconnected modules now say “data source unavailable,” not `0 records`; no fake webhook, payment success, export or live notification count.

**Automated evidence:** [GitHub CI run 38122484845](https://github.com/masharzy/ekmivo/actions/runs/38122484845) commit `61105edf`: all 3 jobs SUCCESS. Isolated PostgreSQL 17 passed 0001–0005 migrations, 3-tenant PG01 RLS, 2-business environment isolation/revocation/suspension, new product AI-only/both/off/FORCE RLS/audit/rollback, Go disabled-payment-product negative case, profile name/current-vs-other-session and idempotent revoke; Next.js lint/TypeScript/build, navigation/draft/TOTP scripts, Go tests, Kotlin debug build/tests. [Render Go deployment](https://dashboard.render.com/web/srv-db5j532d0e5s73fli4h0) `61105edf` LIVE; fresh production log still confirms least-privileged role/no-context RLS startup PASS. Neon 0005 was independently inspected: exact 2 product rows for existing business, 1 FORCE RLS table, 1 policy, no elevation or unintended access to audit/metadata.

**Remaining manual:** product toggle as owner/admin and denied editor/viewer, both-off fallback, active session revoke from another browser, display-name persistence, drafts Save/Discard/Stay via browser, EN/BN × Light/Dark/System × 320/768/1440 accessibility, Ctrl/⌘K focus/keyboard/back/deep link. Vercel latest-source deployment parity was not independently confirmed in this checkpoint. All manual actions in [single ledger](../../MANUAL-VERIFICATION.md).

**Implementation/acceptance distinction:** PG02 infrastructure/source scope implemented with CI success; **PG02 manual acceptance not yet signed off**. Record search, payment records, notification streams, product/payment full forms, API keys, checkout and other linked actual business operations depend on PG03–PG13; their UI routes remain explicitly unavailable and **are not PG02 operational completion**. The owner requested sequential implementation to continue after substantial automated coverage even when manual verification is pending; this does not authorize financial success claims.
