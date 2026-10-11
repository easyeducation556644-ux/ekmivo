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

Next dependency-ready task: **PG00**. Existing foundation and local dashboard changes must be preserved. Inspect current source before treating any recorded check/deployment as current. Do not reset working tree, copy competitor source, or rebuild a parallel architecture.

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
