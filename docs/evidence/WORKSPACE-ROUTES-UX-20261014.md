# Dashboard Workspace routes — UX/backend contract review (2026-10-14)

## Scope
The **Workspace** sidebar group has exactly four routes: `team`, `billing`, `settings`, `help`. This change is intentionally focused on that group for **Payments and AI**; it does not claim every AI/Commerce module's unfinished backend is ready. User specifically requests removing the redundant sidebar search, leaving the header's Ctrl/⌘K global search.

## Implementation
- Shared Workspace visual workbench: compact header/action, usable 320px/375px through desktop layouts, semantic light/dark theme tokens, bilingual EN/BN, keyboard focus, real API-state errors, working refresh, honest empty/unavailable state.
- Sidebar: removed the duplicate Find-a-page search and filtering state; preserved header keyboard search (including authorized business/record search), business-switcher search, grouped menus, mobile dialog and unsaved-change protection.
- **Team**: server-backed `GET /v1/workspaces/:id/workspace-tools/team`; account-specific member/invitation list, member filter, explicit staged role edits, password confirmation before sensitive mutations, server-grant overrides, owner-only ownership transfer confirmation and session refresh, invite/revoke/renew with privately displayed capability link. Viewer cannot perform mutation. No email delivery claimed.
- **Settings**: real `GET/POST /workspace-tools/settings`; grouped business identity, checkout branding, support contacts, default locale/timezone. Draft preservation, optimistic `expected_version`, HTTPS/email bounds validation, conflict/error states, save/discard, updated server workspace name refresh, owner-only privacy tools. New workspace with empty display name may still save support settings; backend only renames workspace when name has 2+ characters. Next API proxy workspace-settings POST body matches Go's 8192-byte bounded decoder.
- **Help**: real `GET/POST /workspace-tools/help`, typed support tickets with server-stored replies and timestamps, required subject/body validation, no fake bot response, no secret input solicited.
- **Billing**: real `GET/POST /billing` and `POST /billing/:id/reconcile`; plan cards, current subscription, payment history, correct empty/error states. Plan issuance retains one idempotency key per plan while retrying lost confirmation; no claim that invoice creation activates subscription; payment requires verified platform receipt. Viewer/editor cannot see mutation controls. **Go server also enforces owner/admin and existing granular workspace-settings denial on both billing POST paths**, including verified-payment reconciliation, closing a privilege gap where GET membership previously sufficed to attempt reconciliation.
- **AI product**: team/settings/help reuse the shared authorized workspace backend (it is independent of enabled Payments access). AI billing has no ready product-specific backend, so it explicitly shows unavailable, NOT payment billing figures, fake AI plans or zero usage.
- No database migration, platform payment matching change, Android change, fake sample data, or financial status mutation outside the authorized billing API.

## Source-backed contract verification performed
- Confirmed Go `HandleWorkspaceTools` GET resources team/settings/help and POST commands invite, resend-invite, revoke-invite, remove-member, change-role, grants, transfer-owner, settings, help, including current_password reauthentication and original server grants.
- Confirmed `pg13_workspace_read` outputs `members`, `invitations`, `body`/`version`, and `items`; confirmed `pg13_workspace_write` optimistic version logic accepts initial 0, timezones and URL/email policies.
- Confirmed `HandleBilling` GET includes `plans`, `invoices` and `subscription`, and that new invoice creation is idempotent and resolves to a checkout capability; confirmed server reconciliation checks independently verified exact platform payment first.
- Confirmed Next `/api/go/[...path]` allowlist already includes Workspace Tools and Billing routes; settings proxy size adjusted to backend decoder.
- Source-only consistency checks for Sidebar search removal, scope routing, API mapping, role controls, conditions and false-zero protection. **This is NOT an authenticated end-to-end pass**.

## Release checks not yet passed
- [ ] Local checkout TypeScript/Next build, ESLint, Go unit tests or CI. Private repository source is available by GitHub connector, but there is no authenticated local code checkout in this runtime. Keep unrun tests clearly distinguished from passed checks.
- [ ] Owner/admin/editor/viewer real browser navigation to all four Workspace routes in Payments and AI, including role grant denial and cross-workspace isolation.
- [ ] Settings save/rename after refresh, optimistic concurrency conflicts, invalid HTTPS/email/timezone, unsaved-draft leave/reload, 401/403/503, 8192-byte proxy boundary.
- [ ] Invite generated link, renew/revoke, recipient verified email acceptance, sensitive-role password rejection, grants and actual ownership transfer.
- [ ] Real billing issuance, lost-response idempotency retry, exact checkout token, verified platform payment reconciliation, and viewer/editor POST rejection. Never simulate a payment as real.
- [ ] Help submit/reply authorization and accurate ticket history, 100-record limit, offline/timeouts.
- [ ] 320/375/768/1024/1440, light/dark/system and EN/BN, keyboard/zoom/mobile dialog/header search accessibility.
- [ ] Single post-commit Vercel build; once READY, signed-in authenticated browser smoke and Render backend deployment result must be checked. Do not assert production readiness if these are pending.

## Deployment discipline
Per user: **one source commit and one branch push only**, after staged review. No intermediate source commits/previews. Stage changes as unreferenced GitHub Git blobs, then create one tree/commit/branch at the end. Preview build (if triggered) is only after final branch creation. GitHub Actions quota is exhausted; do not rerun repeatedly.
