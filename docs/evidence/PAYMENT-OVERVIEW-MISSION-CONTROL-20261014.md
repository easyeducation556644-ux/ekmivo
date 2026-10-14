# Payment Overview Mission Control implementation — 2026-10-14

Scope: Payment Gateway Overview page only; existing merchant billing, settings, financial operations, Android receipt and provider logic unchanged. Replaces old sprawling 7-day full-width overview with a compact Mission Control, approved by owner.

## Implemented
- NEW: compact setup-first Activation Hub, six clickable, numbered milestones, per-source pending/verified/unavailable states, server-driven percentage and task-specific links.
- Plan purchase and subscription pricing do not render inside Overview. "Go to Billing" navigates to the existing workspace billing page, whose server owns actual subscription invoice/confirmation.
- Six milestones from current authorized endpoints: active/grace subscription from control billing; nonblank name and support email from saved business settings; enabled receiving account via physical phone configuration or fallback authorized gateway list; claimed physical phone with heartbeat and SMS permission; published/active link or actual payment intent; verified payment from the financial read endpoint. No browser writes, fake completion, provider settlement claim, fabricated money, or customer identity lookup.
- Existing merchant with verified payments can see their financial history despite a later subscription/phone setup regression. Setup alert remains visible without pretending every step passed.
- OPERATIONAL: four compact transaction/exception/payment KPIs, a 96px 7-day bar chart confined to one of three desktop columns, refund/webhook attention center, phone/account/link connection status, four recent verified transactions and payment creation/report shortcuts.
- Source errors show unknown (em dash), not 0. Per-workspace and per-environment queries remain backend authorized; no sandbox/live selector reintroduced.
- 320px mobile: task cards, KPIs, chart, action panel and payment history reflow; no fake sample data. Honors semantic design tokens, Hind Siliguri, keyboard focus and reduced motion.

## Source and available verification
- Branch: codex/compact-overview-activation-hub, built from main 93cbee0cb1955c140db48b360a1cf4f00e579698.
- Existing Vercel preview builds after live route switch + styles reached READY (e.g. 2db6d366, ef8ecefe). Record final SHA and final preview completion after review. A READY Next production build verifies framework/type compilation, NOT actual authenticated source behavior.
- No financial, control, or phone SQL changed. Production 0056 migration was applied to Live/Sandbox earlier; this UI depends only on already-existing APIs.
- Cannot claim signed-in production browser or real SMS/provider payment verified from source/build alone.

## Remaining release verification (manual pending)
- [ ] Fresh authenticated workspace: no plan/no profile/no account shows first actionable plan task and Billing navigation. Billing confirmation (not invoice creation) checks off plan; verify expired/grace transitions.
- [ ] Complete settings, receiving-account setup, paired physical phone heartbeat with permission, active link/request, actual verified payment. Every step advances only after server-confirmed evidence; refresh, cross-tab, back and repeat navigation preserve truth.
- [ ] Existing merchant with verified payments, expired subscription/offline phone: financial metrics remain accessible and setup warning is visible.
- [ ] Owner/admin/editor/viewer permissions and cross-workspace isolation; 401/403/503/timeout/offline states; no inadvertent display of full receiving phone numbers; no false zeros or green checks.
- [ ] Overview metrics consistent with Transactions, Incoming, Refunds, Reports and device status; account list and link cursors are marked with "+" when truncated; chart bars use UTC daily buckets.
- [ ] Manual browser accessibility responsive matrix 320/375/768/1024/1440, 200% zoom, English/Bengali, Light/Dark/System, keyboard, screen reader and reduced motion; validation of compact one-screen desktop view.
- [ ] Verify exact production Vercel SHA and Go backend deploy SHA with real authenticated API calls.

**Status: implemented source; Next preview compilation verified on intermediate commits. Production-ready acceptance remains OPEN until runtime and manual release checks are recorded.**
