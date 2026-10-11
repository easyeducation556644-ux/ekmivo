# Agent handoff: implement payment-first

Updated 2026-10-11. Single canonical implementation plan: **[DUAL-SAAS-MVP-PLAN.bn.md](DUAL-SAAS-MVP-PLAN.bn.md)**. This file is the reading/execution entry, not another product plan.

## Read order

1. Root [AGENTS.md](../AGENTS.md) and applicable nested AGENTS.
2. [Master plan](DUAL-SAAS-MVP-PLAN.bn.md) — architecture and latest user correction.
3. [Feature inventory](MVP-FEATURE-SCOPE.md) — every S01–S46 remains required.
4. [Design system](DESIGN-SYSTEM.md) and [tokens](design/tokens.css) — Hind Siliguri, Ink & Bone, full theme/locale behavior.
5. [Backlog](IMPLEMENTATION-BACKLOG.md) — PG00–PG17 first, AN01–AN05 next, FM01–FM05 afterward.
6. [Payment architecture](PAYMENT-SYSTEM-DESIGN.bn.md), [screen UX](PRODUCT-UX-SPEC.bn.md), [API/sandbox/developer docs](PAYMENT-API-AND-SANDBOX.md).
7. [Actual status](IMPLEMENTATION-STATUS.md) and relevant research/checkpoint evidence; inspect code and git diff before edits.

## Start point and constraints

Current execution task: **PG01 (in progress, not accepted)**. PG00 CI baseline passed. Do not start PG02 until all PG01 gates pass. Existing foundation and local dashboard changes must be preserved. Inspect current source before treating any recorded check/deployment as current. Do not reset working tree, copy competitor source, or rebuild a parallel architecture.

Priority: fully running payment product with sandbox/testing/developer/API docs. Minimal receipt collection is part of the **same native Kotlin/Jetpack Compose Android application** in phase 1 for live phone auto-verification; full merchant Android/inbox UI follows in phase 2. No React Native, Flutter or separate receipt bridge app. Full AI/commerce/other client features remain full-MVP requirements in phase 3.

Verification auto: actual payer number + original transaction time + amount + receiving account + method → exactly one valid request → atomic verified/payment allocation/event/webhook. No customer TrxID, screenshot proof, routine approval, auto-accept opt-in, or second gateway approval for phone path. Receipt IDs internal only. Ambiguity/missing evidence is pending/exception, not arbitrary match.

Go owns money/state/matching. Next.js web/session proxy, Kotlin receipt collection and Compose merchant UI share one native Android app and reuse the Go API. Existing self-hosted auth/migration history preserved and hardened. Vercel web / persistent API-worker / Neon design; no duplicate serverless payment backend.

Separate business/product/environment selectors; separate AI/payment navigation; all promised payment route buttons real. Theme/locale must preserve drafts and context. Current OpenAPI is health-only; API design docs are proposed until implemented/tested.

## Working protocol

- Follow serial backlog dependencies; split large package into concrete endpoint/schema/screen changes. Do not start AI work to avoid an unfinished payment task.
- Before code: identify item/S-IDs, required evidence, current dependencies and applicable AGENTS. Use existing working tree; preserve applied SQL migrations, secrets and user changes.
- Implement and verify authorized work; don't stop at proposing code or creating placeholder pages.
- For each completed item, record docs/evidence/<ID>/README.md with changes/checks/staging/browser/provider/device evidence and unresolved inputs; update backlog/status.
- Simulation, provider sandbox, live device and live transaction are different evidence labels. Account input missing means affected release gate open, not fake success.
- Use approved server-side secret channel; no secrets/receipt PII in source/log/report. Provider/account/business decisions belong to owner. Continue independent work while resolving external input.
- Done means acceptance passed, docs and deployed behavior match, security/data/money tests relevant to change pass. Missing prerequisite isn't silently deferred outside full MVP.
- Finish phase-1 gate PG17 before AN01. Finish Android phase gate before remaining FM implementation. No complete dual-MVP claim until all S-IDs pass.

## Prompt to give the next GPT/agent

Copy this with repository access:

~~~text
Work in the current Ekmivo repository. Read AGENTS.md and the canonical
docs/DUAL-SAAS-MVP-PLAN.bn.md, then the feature scope, design guide/tokens,
IMPLEMENTATION-BACKLOG.md, PAYMENT-SYSTEM-DESIGN.bn.md,
PRODUCT-UX-SPEC.bn.md, PAYMENT-API-AND-SANDBOX.md and
IMPLEMENTATION-STATUS.md. Preserve existing working-tree changes.

Implement serially from PG00 through PG17: first make the payment gateway
completely running, including real five-field automatic phone verification,
the minimal receipt bridge, isolated sandbox, merchant API and signed
webhooks, functional payment screens, tested developer/API docs, recovery
and production evidence. Full Android app + inbox comes next, AN01–AN05.
Remaining full-MVP scope stays required afterward.

Do not create a competing plan, replace Go/PostgreSQL, introduce customer
TrxID/screenshot/manual normal approval, or call a mock/route scaffold done.
Complete dependency-ready work, run relevant checks, record evidence and
update repo docs after each accepted item. Identify external blockers
without inventing provider/device success or silently omitting features.
~~~

## PG01 handoff checkpoint

Additive migrations `0003_pg01_admin_mfa.sql` and `0004_pg01_environment_rls.sql` have been applied to Ekmivo production Neon (existing 0001/0002 preserved). New `ekmivo_financial_runtime` role was created using restricted PostgreSQL SQL and verified **not** to be superuser, BYPASSRLS, CREATEROLE, CREATEDB, schema CREATE, table owner or `neon_superuser` member. The earlier Neon API-generated `ekmivo_runtime` is **elevated and unused**; never configure services with it. Removing that unused role requires explicit owner approval. No secret or connection string is in Git. MFA AES encryption key is stored in encrypted Vercel production env; user must enroll via `/bn/admin/mfa` or `/en/admin/mfa` with current password and authenticator. The real Go service is not yet hosted; `/readyz` stays 503. GitHub CI tests isolated 3-tenant/2-environment RLS, session revocation, disabled users, role changes, email-verification enforcement, TOTP vectors and Go integration. Live user MFA and production runtime-role query need acceptance before PG02.

### Render handoff, PG01 (2026-10-11)
Go service is **live** at `https://ekmivo-go-api.onrender.com`, Render id `srv-db5j532d0e5s73fli4h0`, Singapore Free. Render has `AUTHZ_DATABASE_URL` bound to the restricted Neon runtime role and `EKMIVO_REQUIRE_AUTHZ=true`; startup log on deploy `dep-db5j7e8473hc73bcd8j0` confirms least-privileged DB identity and missing-context RLS isolation. Owner's real TOTP MFA enrollment and active MFA-verified session confirmed. However PG01 remains open for real authenticated HTTP authorization/tenant denials, admin MFA replay/logout/role checks and recovery evidence; these cannot be relabeled as completed based on isolated tests. Financial readiness 503 by design. Do not start PG02 until PG01 accepted.

### Independent PG01 HTTP audit — acceptance OPEN

Dedicated production HTTP fixture tests and browser reproduction steps are recorded in [PG01 evidence](evidence/PG01/README.md). Missing actual write/proxy/recovery/revocation paths remain required coverage; do not interpret read-only capability checks or fixture updates as complete acceptance. Inspect production-http-results.json for current test outcomes before advancing to PG02.
Concurrent update: the remote repository now contains PG02 UI work (observed during this audit and preserved). This does not change PG01's open acceptance status. The final verification run reports 34 passing assertions and 3 NOT_IMPLEMENTED coverage items; supported revocation/recovery lifecycle remains incomplete. See PG01 evidence for exact boundaries.

### PG02 concurrent implementation handoff (2026-10-11)
The owner authorized beginning **PG02 implementation only** while their independent agent runs PG01 final verification. Preserve the independent agent's current commits and never mark PG01 accepted from assumptions. Follow named `PRODUCT-UX-SPEC.bn.md` screen/interaction contracts before authoring any UI. PG02 source now includes member-revalidated business/product/payment environment selection, controlled URL scope, search keyboard dialog, responsive EN/BN Ink & Bone and truthful loading/error/unavailable states. Actual app/browser interaction QA and draft/record/event contracts are still missing; PG02 acceptance OPEN and PG03 blocked. Kotlin UI development stays paused. For this release, a placeholder route/endpoint is never an accepted screen.
