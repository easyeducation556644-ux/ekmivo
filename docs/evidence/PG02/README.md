# PG02 — UX implementation and acceptance evidence

**Current status: IN PROGRESS, NOT ACCEPTED.** PG01 has a separate verification agent; owner authorized PG02 implementation in parallel. **Do not mark PG02 accepted before PG01's sign-off and this complete evidence matrix.** Kotlin/Compose Android UI expansion remains paused. PG06 Android signer/validation and AN03 debug build remain partial evidence only.

## Source of truth
- `docs/PRODUCT-UX-SPEC.bn.md` §1–3 lines 23–62: actual control placement, product/business/environment transitions, responsive navigation, list behavior, uncommitted drafts, search and keyboard.
- `docs/PRODUCT-UX-SPEC.bn.md` §4–7: payment and AI screens/actions/data definitions; separate downstream PG09/AN and full-product acceptance.
- `docs/DESIGN-SYSTEM.md` and `docs/design/tokens.css`: Ink & Bone palette, Hind Siliguri, full-page theme system, accessible contrast and motion.
- `docs/IMPLEMENTATION-BACKLOG.md` PG02: D01/D02/F05, S03/S05/S46. A compiled shell is only source evidence.

## Required functional acceptance matrix (each row needs captured test result)

| Feature | Required proof (not just route/render) | Status |
|---|---|---|
| Business selector | Search, selected check, role, manage/create; switch preserves an entitled product and resolves target business on server; account B cannot see A's records; no invented aggregate revenue | OPEN |
| Product selector | Payment and AI purpose/capability, selected check, disabled reason; same business and last **authorized** page; first visit Overview; unavailable action is visibly disabled | OPEN |
| Sandbox / Live | Header control; distinct server-validated data/credentials; persistent sandbox banner, Live setup checklist; switching never carries payment record IDs, secrets or cross-env filters | OPEN |
| Unsaved drafts | Product/business/environment/locale/theme transitions use **Save draft / Discard / Stay** when editing; returning/back preserves valid unsaved state. A browser confirm alone is not Save draft | OPEN |
| Route and history | Authorized bookmarkable `/{locale}/w/{id}/{product}/{section}`, payments `?env=...`; back/forward restores section/filter; revoked permission is denied, not silently redirected into other business | OPEN |
| Search | Global Ctrl/⌘K, arrows/Enter/Esc, product/environment-scoped authorized records plus navigation; sidebar search is navigation-only; no fabricated record results | OPEN |
| Shared list and detail contracts | Real data or explicit source-unavailable state; URL-backed search/filter/sort/cursor, refresh/freshness, scoped export; loading/error+retry/empty/forbidden/stale/offline/not-found, keyboard row detail link | OPEN — downstream data surfaces tied to PG03–PG09 may be blocked and must not be advertised functional |
| Header/profile/events | EN/BN + Light/Dark/System visible on mobile; notification list/count and read action only when wired; profile security/session actions; no phantom unread count | OPEN |
| Language/theme | Light/EN, Light/BN, Dark/EN, Dark/BN and System preference, OS change and cross-tab sync; complete strings and locale-safe currency/dates; no hydration flash; route/query/form draft retained | OPEN |
| Responsive/a11y | 320/768/1440px, 200% zoom, Hind Siliguri, keyboard focus, drawer focus return, Escape, screen reader labels, reduced motion; mobile one-pane scroll/back restoration | OPEN |
| Errors and feedback | Explicit submit/loading/success/failure for **real** actions, live permission denial, safe retries, no fake payments, no invented success toast | OPEN |

## Evidence format required before acceptance
For every feature above record **commit SHA**, scenario/setup (tenant A/B, sandbox/live, locale/theme/device), exact action, expected and actual result, CI/browser evidence link, failures and remediation. Product-specific money flows that do not exist until PG03–PG09 stay *blocked by dependency*, not “complete because the page renders”.

## Current groundwork
A previous dashboard shell, EN/BN/theme controls, route guards and server-issued environment context existed prior to this checkpoint. New `feat(pg02)` commits have begun business/product/environment navigation and theme switching; **unverified source progress is not acceptance**. Work must preserve concurrent agent changes, migration history and production credentials.

## Execution rule
Do not create a new UI screen without first checking the corresponding row in `PRODUCT-UX-SPEC.bn.md`. Implement specified data, actions, loading/error/empty/success, responsive EN/BN/theme handling; if a required backend is not ready, accurately classify the screen as incomplete instead of calling the route finished.
