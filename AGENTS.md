# Ekmivo agent entry point

## Canonical plan

**Use `docs/DUAL-SAAS-MVP-PLAN.bn.md` as the main implementation plan.** Do not create a competing plan or infer scope from a previous chat summary when these documents contain a newer explicit correction.

Read in this order before implementation:

1. `docs/DUAL-SAAS-MVP-PLAN.bn.md` — product, architecture, payment behavior, delivery gates.
2. `docs/MVP-FEATURE-SCOPE.md` — complete first-release capability inventory and acceptance.
3. `docs/DESIGN-SYSTEM.md` — required visual system, responsive patterns, light/dark and EN/BN behavior.
4. `docs/design/tokens.css` — exact semantic design tokens.
5. `docs/IMPLEMENTATION-BACKLOG.md` — dependency-ordered work and required evidence.
6. `docs/PAYMENT-SYSTEM-DESIGN.bn.md`, `docs/PRODUCT-UX-SPEC.bn.md`, `docs/PAYMENT-API-AND-SANDBOX.md` — detailed payment architecture, every-screen UX and contract/sandbox/docs specification.
7. `docs/IMPLEMENTATION-STATUS.md` and `docs/AGENT-HANDOFF.md` — latest code evidence and execution handoff.

## Fixed user decisions

- All listed features belong in the first full public MVP. Do not silently move them to a later release. Internal build milestones can be partial.
- Payment verification is automatic using transaction time, actual sender number, amount, receiving account and method. A valid unique match automatically verifies/confirms and dispatches the merchant webhook.
- Do not introduce customer TrxID entry, screenshot submission, routine merchant approval or an auto-verification opt-in into the normal payment flow. Receipt IDs may be extracted internally for deduplication. Additional gateway integrations are not prerequisites for the phone verification path.
- Follow the latest user-selected V3 public landing direction: a premium animated Ink & Bone (Option F) monochrome product narrative, with light #FAFAF8/#FFFFFF/#222222/#262626 and dark #141414/#242424/#F5F5F1/#F1F1E9, full-page Light/Dark/System coverage with Hind Siliguri. Operational UI remains readable, information-led and accessible. Both light/dark modes and a complete EN/BN switcher are first-release features.
- Build the design foundation before product page styling. Preserve feature coverage; minimal visuals do not mean fewer features.
- Selected core: Go, PostgreSQL, Next.js/TypeScript and **Android Kotlin + Jetpack Compose**. No React Native/Flutter UI and no separate Kotlin bridge app. Android receipt collection is a native module inside this same Kotlin application; iOS is separately scoped for later. Single implementation collaborator is Codex; account/business actions belong to the user.
- Latest sequence (2026-10-11): first complete running payment gateway with isolated sandbox, tests, developer/API docs; then full Android merchant app with inbox; then remaining full dual-service MVP. A minimal native Android receipt collector inside the full Kotlin app is a phase-1 dependency; there is no React Native-to-Kotlin bridge. Follow PG00–PG17, AN01–AN05, then FM01–FM05 in the backlog; no feature silently removed.
- Existing self-hosted auth source is preserved/hardened with Go authorization; earlier proposed Clerk is not implemented. Preserve applied migrations in infra/migrations; no duplicate migration runner.

## Document ownership and work evidence

The user's latest explicit instruction takes precedence. Within the documents, the master plan owns architecture; the feature inventory owns feature completeness; the design guide owns UI behavior; token CSS owns exact values; the backlog owns sequencing. Resolve discrepancies by updating the affected documents together without undoing the user's decisions.

Take the next dependency-ready work item. Record the item and scope IDs, concrete changes, relevant checks and unresolved dependencies. Planned work, mock provider output and sample screens are not evidence of a live integration. Do not mark incomplete tasks done or claim an untested capability.

Current repository status: partial web/auth/dashboard foundation; financial engine/API/worker/bridge/sandbox not implemented. Latest evidence is docs/IMPLEMENTATION-STATUS.md. PG00 CI accepted. PG01 is in progress with Go authz, admin TOTP, applied additive migrations 0003/0004 and production least-privileged role verified. PG01 acceptance remains OPEN until live admin MFA and authorized Go runtime checks; PG02 must not start until PG01 passes. D01/D02 remain open.

## Latest owner execution constraint — 2026-10-11

Keep Android entirely Kotlin/Jetpack Compose, but **stop Android UI expansion**. Follow payment-first PG01, PG02, ... serially; only advance after each item's acceptance evidence is complete. PG06 Android signer/structural validation and AN03 debug APK remain **partial source evidence**, not real receipt collection/payment or Android release acceptance. Never silently mark PG06/AN03 complete.
