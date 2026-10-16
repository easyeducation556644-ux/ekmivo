# Ekmivo Platform Admin — control-plane operations handoff (2026-10-16)

## Owner constraints

- Implement Ekmivo admin across two products: Payment gateway and AI Bot.
- **Pricing/plans route is independently owned by another agent.** No pricing/plan source files or plan schema were modified.
- Operate within existing self-hosted Next.js/Go/Neon architecture; preserve isolation across the control and financial stores; never fabricate money, AI credits, receipt results or deployments.
- No Docker and **no production database writes** executed by this implementation task.

## Implementation scope (source code)

### Navigation and admin UI

Reorganized grouped admin sidebar: Platform, Payment gateway, AI Bot, Commercial, Developers, System. EN/BN navigation labels and locale-aware paths. Existing mobile menu and keyboard navigation retained. Command palette now searches both routes and authenticated server-side workspace/user results; its search API is limited to verified super_admin, uses short bounded queries and no-store. User and workspace matches jump to real details.

### Server-backed reads and interactions

- **Overview:** true control-database counters: total/new workspaces, users, AI/Payment entitlement counts, open support tickets, suspended live environments, unpaid invoices older than seven days. No fabricated gateway payment volume, MRR or AI consumption.
- **Workspaces:** paged search, workspace overview with independent AI and Payment toggles, membership table, sandbox/live environment status, merchant API key inventory with no raw secrets, subscription and platform invoices, product access audit trail.
- **Users:** paged search, individual workspace memberships and session states, verified/disabled/admin role metadata.
- **Billing:** actual subscription and platform invoice rows, paid platform invoice revenue aggregate by plan (last 30 days). Not a revenue claim for merchant payments.
- **AI / Payments workspaces:** separate real control-plane entitlement inventories with links to workspaces. This is NOT full model usage, gateway transaction readout or AI metering.
- **API keys:** global and per-workspace key identifiers, names, scopes, environment, expiry/use state; no secret export.
- **Staff:** staff role inventory, platform role action, and active session rows.
- **Support:** workspace ticket list and thread; authenticated reply + status transition via already-deployed `pg13_support_reply`.
- **Privacy:** authoritative status/read-only inventory; no unsafe immediate deletion.
- **Audit:** action descriptions, before/after in supported writes, reason, bounded pagination, super_admin CSV export.
- **Health:** actual control-DB reachability and Go `/healthz` & `/readyz` observations, no mock uptime values.
- **Settings:** existing email verification configuration retained and its write controls hardened.
- **Downloads:** `/[locale]/admin/exports?kind=...` provides server-side authorized, audit-logged, size-capped, formula-escaped CSV exports of workspace/user/staff/audit information.

### Sensitive writes implemented

Existing super_admin authority, fresh 10-minute authenticator step-up (`?reauth=1`), typed confirmation, reason validation, in-transaction role checks and audit entries apply to:

1. Payment gateway and AI Bot workspace entitlement enable/disable
2. Live and sandbox environment suspend/resume
3. User session revocation
4. Ordinary (non-staff) user account enable/disable (disable also revokes sessions)
5. Merchant key revocation (does not display raw key)
6. Role assignment/removal and email verification configuration
7. Support reply with existing PostgreSQL business logic

**No operator action was executed on production data during coding or verification.**

## Actual checks

- Previous preview builds on this branch: `44af8260a313` READY; `0829b18333ca` READY.
- **Latest verified code SHA: `3f5121e3f3888bd1b0bc11cfa0d114a99becedae`**. Vercel Next.js build + TypeScript completed; preview state **READY** (`ekmivo-n5l43vs7f-masharzys-projects.vercel.app`).
- Nine read-only `EXPLAIN` queries against existing Neon production control database `ekmivo` compiled: product inventory, billing, keys, product audit, sessions, support, privacy, revenue, staff sessions. These validate SQL syntax/plans only, not production mutation behavior.
- No end-to-end signed-in browser run, payment/AI provider exercise, export download test, or real admin mutation test. No fake pass recorded.

## Important remaining production acceptance and API needs

| Route / operation | State and authoritative blocker |
| --- | --- |
| Pricing / plans | **Explicitly excluded, owned by another agent.** No changes. |
| Payments / exceptions / disputes / refunds / reconciliation | Control-plane product entitlements only. Cross-tenant financial data resides in isolated Go/Neon financial realm. Requires new least-privilege, audited platform API, DB runtime permission contract and staging tests before enabling. |
| Providers / receipt devices / webhooks and queues | Not available as platform-wide reads/writes in current Go contract; existing merchant-scoped endpoints cannot be impersonated with platform credentials. |
| AI models, conversations, usage, safety and handover | No authoritative operator data/management APIs implemented. Product enablement is independent and real; do not mistake it for AI operations completeness. |
| Credits / grants / ledger / metering | No complete dual-product accounting model or safe correction ledger. Must be implemented atomically with billing/usage rules. |
| Billing coupons and subscription corrections | Database-backed subscription/invoice viewing exists. Editing money/plan/coupon values would need versioned and auditable contracts. |
| API sandbox controls, platform API limits/version publishing | Read-only existing sandbox and platform key inventory only; platform-wide write contracts not yet implemented. |
| Feature flags and other settings | Existing email verification works. An audited feature flags/store with rollout semantics is not present. |
| Cross-entity command search | Workspace/user, and all route names; not payments/devices (financial realm), and no personal data for non-super-admin roles. |
| Tables | Real record lists are bounded (100/250/5,000 for exports) and some views lack cursor pagination, persisted filters, multicolumn sorting and keyboard acceptance. |
| UI coverage | EN/BN text coverage is partial for newer detailed operations. Light/dark, 320/768/1024 and desktop, keyboard focus, modal QA and screen-reader run remain pending. |
| Operational actions | Need MFA/authenticated live test with real operator account, role demotion race and revoked session, server-side rate limits and audit review. |

**Do not label these unavailable features production-ready or claim 100% functional acceptance.** A passing Vercel build is source/build evidence only. The additional platform-wide Go/Neon backend is independent code scope, not an on/off UI flag.

## Files (pricing excluded)

- `apps/web/src/actions/platform-admin-operations.ts`
- `apps/web/src/actions/platform-admin.ts`
- `apps/web/src/components/platform-admin-operations.tsx`
- `apps/web/src/components/platform-admin-inventory.tsx`
- `apps/web/src/components/platform-admin-console.tsx`
- `apps/web/src/components/platform-admin-shell.tsx`
- `apps/web/src/components/admin-controls.tsx`
- `apps/web/src/lib/server/platform-admin.ts`
- `apps/web/src/app/[locale]/admin/mfa/page.tsx`
- `apps/web/src/app/[locale]/admin/exports/route.ts`
- `apps/web/src/app/[locale]/admin/search/route.ts`
- `apps/web/src/app/admin-console.css`
