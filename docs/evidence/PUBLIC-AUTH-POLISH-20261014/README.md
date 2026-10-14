# Public/auth polish — 2026-10-14

Branch: codex/public-auth-polish. Base: main 301b1da.
Owner requested a separate branch; no main merge, manual deploy or CI dispatch.

Changes:
- Payment Gateway entrance/path animations, hover polish, reduced-motion support.
- Homepage canonical Next Link hero navigation; duplicate pricing CTA and secondary
  final CTA removed. One centered final workspace CTA. Section labels above
  headings, decorative numbers removed, extra service-heading paragraph removed.
- Shared header on login/signup/workspace creation; retained-layout navigation
  restores the header on returning home. Purposeful payment/workspace illustrations
  and compact mobile navigation. Dashboard retains operational navigation.
- Two-step signup: email/password, then personal/workspace names. Shared 8–256
  password policy requiring letters/numbers, optional symbols and visual checks.
  Existing-password login unchanged. Password not stored in browser storage.
- Account, payment workspace and owner membership created in one transaction;
  session/default workspace follow. No paid-plan activation claim.
- Workspace service icons improved; existing draft guards preserved.
- Three obsolete payments route references fixed to transactions to close baseline
  TypeScript errors. No financial matching or payment-provider changes.

Checks executed:
- Local optimized Next production build (including TypeScript): PASS.
- TypeScript no-emit: PASS.
- Targeted ESLint: PASS. Earlier broad check had existing recovery _prev warning.
- Shared password policy: PASS, including boundary and invalid-composition cases.
- Server-action unit simulation: signup success, duplicate email, workspace-failure
  rollback and invalid password PASS. These are not real SQL tests.
- Local isolated browser: two steps, zero step-one server submissions, retained
  inputs, shared header, SPA hero navigation and one final CTA PASS.
- EN/BN dark auth at 320px, Payment Gateway at 768/1024px, section labels above
  headings and reduced-motion disabling PASS. Light desktop screenshots reviewed.

Screenshots:
- signup-step-two-light.png
- payment-gateway-light.png
- login-bn-dark-mobile.png / login-en-dark-mobile.png
- signup-bn-step-two-dark-mobile.png / signup-en-step-two-dark-mobile.png
- payment-gateway-bn-dark-tablet.png / payment-gateway-en-dark-tablet.png

Manual pending: dedicated-account real registration/login/recovery, real database
transaction and verification-email delivery, authenticated workspace creation,
System theme and final human copy review. See docs/MANUAL-VERIFICATION.md.
CI quota is exhausted per owner. No green CI or production acceptance is claimed.
