# Docs and Developers UI polish — 2026-10-15

Base: owner rewrite pulled from main at bbe9759. Branch: codex/docs-ui-polish.

Preserved the owner's simplified documentation, key-bound API examples, endpoint behaviour and sample-versus-real-Sandbox controls. No API, financial logic or migration changed.

Replaced decorative emoji with shared aria-hidden SVG line icons across Docs, Developers, custom-verification cards, navigation labels and sample controls. Polished section spacing, heading/icon alignment, card density, code-panel borders, focus states, mobile workflow layout and theme-aware surfaces. Dark card surfaces use semantic neutral tokens.

Checks: TypeScript no-emit PASS; targeted ESLint PASS; diff whitespace PASS. Local Next development compilation and browser rendering PASS. Docs: no horizontal page overflow at 320, 768, 1024 and 1280 pixels; Bengali mobile topics open successfully; English language switch and Light/Dark rendering checked. Docs main has 24 SVG icons and no pictographic emoji. No actual payment/provider verification claimed by this visual-only change.

Production deployment not performed. Developers overview browser review PASS: 12 SVG icons, no pictographic emoji and no desktop overflow. Remaining: production parity after merge/deploy. No full payment or release gate marked accepted.
