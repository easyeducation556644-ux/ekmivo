# Unified developer guide — 2026-10-15

Owner decision: /developers is the single payment integration guide. No separate overview or large endpoint-reference section. Examples belong with the relevant instructions, with enough space to read and use them.

Moved the existing owner-written guide to /developers; /docs and /docs/payments permanently redirect there. Updated dashboard API-doc links. Removed the generated endpoint-reference section and its topic link; preserved OpenAPI download and curated create/status/transaction lookup details and examples. Existing automatic-verification, custom-checkout, sample controls and real Sandbox actions are preserved.

Replaced accumulated docs CSS with a two-column topic/content layout. Removed the right code rail; create-payment code and Sandbox controls now sit inline in that section. Increased code font size, padding and line height; separated language controls, actions, response preview and real Sandbox form. Simplified section borders/cards, neutral theme surfaces, focus states and responsive navigation.

Verification: TypeScript no-emit PASS; targeted ESLint PASS; local Next route compilation PASS; sample language switching and simulated response action PASS. Browser: no horizontal page overflow at 320/768/1024/1280; mobile topics opens; no right rail or generated reference section; /docs/payments#custom-verification redirects to /developers#custom-verification. Light/dark rendering checked. This is visual/navigation evidence, not actual payment acceptance. Production parity remains pending merge/deploy.

Follow-up browser finding: locale switching from a section fragment used same-URL assignment, which could retain the previous server language. Changed it to an explicit reload after the existing draft guard and cookie write. Bengali guide heading verified after switching at /developers#custom-verification; fragment preserved. Backend and payment behaviour unchanged.
