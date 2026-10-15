# Ekmivo Platform Admin v2 — implementation handoff (2026-10-16)

Status: SOURCE IMPLEMENTATION ONLY. Not production accepted, tested, or merged.
Branch: codex/platform-admin-console-v2

## Routes built

- /[locale]/admin — focused authenticated Overview, with genuine recent workspace count and recent audit activity; unknown financial and system metrics are dashes.
- /[locale]/admin/sign-in — standalone focused card using existing login action and admin-specific post-login redirect.
- /[locale]/admin/verify and /[locale]/admin/mfa — standalone MFA card, authenticator setup/verification/recovery wired to existing server actions.
- /[locale]/admin/security — current recovery and authenticator lifecycle controls within the new shell.
- /[locale]/admin/workspaces, /users, /audit, /staff — real, super_admin-only PostgreSQL read views, with server-side filters; workspaces and users use 25-row UUID cursor pagination.
- /[locale]/admin/workspaces/[id], /users/[id] — authorized read-only detail summaries.
- /[locale]/admin/payments, /billing, /credits, /plans, /gateway/providers, /gateway/devices, /gateway/webhooks, /ai, /api, /health, /settings — separate pages and section tabs, with representative operator table columns and disabled actions for unsupported capabilities.
- /[locale]/admin/settings/authentication-email — retains existing super_admin-only email verification server action, surfaced in modal.
- /[locale]/admin/staff — retains existing role-management server action, surfaced in modal.
- /[locale]/admin/api/sandbox — masked existing public test key and configuration read. Sensitive controls disabled.

## Visual changes

- 57px sticky header, 232px grouped sidebar, mobile navigation, keyboard Ctrl/Cmd+K route-only command palette, basic accent navigation progress, modal and copy control.
- Ekmivo dashboard-matched palette: light canvas #fafafa, dark canvas #0a0b0e, Geist and Hind Siliguri. Status is text plus dot; no decorative module cards. Production amber top rule.
- MFA is no longer nested cards; first-time password confirmation, setup key, six-digit code and recovery are visually consolidated. Existing server-side authenticator verification and throttling retained.
- Existing merchant and financial backend contracts are not changed.

## Not connected / unsupported

- Cross-workspace payment transaction detail, receipt exceptions, disputes, refunds, reconciliation.
- Ekmivo subscription billing, invoice issuing, revenue, coupons and past-due alerts.
- Credit balances, ledger, packs, price and metering rules.
- Plan authoring/versioning/migrations; per-workspace custom plan overrides.
- Cross-workspace providers, Android receipt device fleet, webhook delivery/job queue, incidents and health metrics.
- Platform-wide API key inventory, key revocation/rotation, rate-limit editing and API version publishing.
- AI Bot operations, model usage, handover and conversations.
- Authenticated all-entity command search, real admin notifications, audit exports, user session revocation, workspace suspension, impersonation and personal-data exports.
- Financial dashboard stats: verified volume, success rate, MRR, credit usage and top-volume workspaces.

All disconnected areas use dashes, explicit Not connected text, disabled writes and no fabricated provider/financial data.

## TODO and incomplete acceptance criteria

1. Build/TypeScript/lint/production compile and signed-in browser regression were not run. No CI success, screenshot audit, Neon DB migration, live transaction test or deployed preview is claimed.
2. Sensitive changes still use existing super_admin + session MFA. NEW SPEC'S fresh under-10-minute step-up, reason >=10 chars, before/after audit diff, IP, request ID and role-action controls are NOT implemented and require backend and database design before production use.
3. Enrollment currently shows a manually copyable one-time setup key, not the requested authenticator QR. Enrollment does not automatically show 10 recovery codes with copy/download and required saved acknowledgment. The existing recovery rotation now generates 10 codes when manually invoked on My security.
4. Existing server 15-minute throttling is preserved, but the inline live countdown, idle-timeout warning and full session policy controls are not built.
5. Existing staff roles are super_admin, admin, support and analyst; permission-matrix review/editor, owner approval, additional permission semantics and user MFA-gated invites need design. Existing role changes have not been upgraded to the requested reason + fresh code workflow.
6. Tables need true sortable columns, custom 25/50/100 page-size choice, saved views, server-side filters covering every route, loading skeletons, retry states, detail drawers for all entities, audited CSV scoped to filters.
7. Shell command palette currently jumps to routes ONLY, not workspaces/users/payments/devices. Notification center, keyboard roving table focus and guaranteed focus trap/restoration verification remain open.
8. Light/dark and EN/BN are wired for shell and some labels but not every table/header/action. Bangla number/date QA and admin-language default policy remain open.
9. Need implement server-backed plan, credits, billing, providers, device and webhook admin APIs in dependency order with audit before enabling writes. Do not fabricate a data source.
10. Audit screen is a read-only 25-row list and not a full searchable/exportable before-after diff viewer.
11. Product-level active workspace statuses are not asserted without a source; the Overview new-workspace count is real, active-workspace KPI is Not connected.
12. Admin entry point default English must be reconciled with existing locale routing.
13. Confirm exact owner-approved reference HTML availability (ekmivo-dashboard-v2.html, ekmivo-workspaces.html, ekmivo-dashboard-pages.html); implementation used existing dashboard-v2 CSS tokens in repo. Full pixel-perfect parity is not verified.
14. Run from apps/web: npx tsc --noEmit; npm run lint; npm run build. Run authorized real account + permissions and 360/768/1024 desktop browser tests, then review before merge.

## Owner questions

- Define an API credit independently for Payment gateway and AI Bot; what consumes one and what pricing and expiry model applies?
- Should roles beyond the existing four be created, or is a custom permission matrix desired?
- Does the current schema support plan-version subscriber pinning and per-workspace custom plan limits?
- Should 15-minute, audited, read-only impersonation be permitted?
- Is a distinct point-of-sale cashier terminal wanted beyond this admin console?

## Guardrails

No backend financial or receipt verification code altered. No database migrations or secrets written. No claim of successful deploy or payment verification. No raw public sandbox test key shown in the new console. Unconnected actions remain disabled until server-side permission, fresh MFA and audit behavior exist.
