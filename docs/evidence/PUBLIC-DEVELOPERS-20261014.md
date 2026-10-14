# Public developers page — 2026-10-14

Replaced /en/developers and /bn/developers ComingSoonPage with a public integration guide: checkout lifecycle, three setup steps, placeholder-only HTTP request, API documentation, OpenAPI download, server credential/retry guidance and workspace links. No account query, actual credential, key-management control, platform catalogue or sandbox simulator exists on this page. Existing public header/footer and theme/locale controls are retained. API-reference deep link now has a real anchor.

TypeScript check passed. Targeted lint passed. No browser checks, production deployment or live payment acceptance claimed.

Earlier public/auth requested edits are already in main via public/auth branch 91bab10: two-step signup, eight-character server/client password validation, persistent public header, meaningful auth workflow, payment-page motion and homepage CTA/section hierarchy cleanup. The old servicesLead string remains as unused copy; it is not rendered. Main aa3b5ae GitHub Vercel status reported successful deployment; that status alone does not verify the page served on the user's domain.
