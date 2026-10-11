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
| Unsaved forms | Three-choice Save draft / Discard / Stay and focus/scroll restoration | **Not implemented; PG02 gate open** |

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
