# Nagad compact checkout and payer number normalization — 2026-10-14

## User-accepted design reference
Uploaded Nagad screenshot: a single compact red card/page with merchant name, invoice amount/charge, a single row of eleven white number slots, Proceed/Close controls and provider branding. Prior component showed separate duplicate white merchant/invoice header plus a 700px red entry; it forced scroll and looked unrelated to the reference.

## Implementation on isolated branch
- Remove duplicated external brand/invoice headers **only while the Nagad payer-entry step is active**. Keep all authoritative checkout context (merchant, reference, amount and sandbox label) inside the red panel. One viewport-height compact Nagad stage on mobile, sized centered card on desktop, with overflow fallback for unusually short screens/keyboard.
- Nagad number visually renders 11 local digits in separate white slots, with one focusable screen-reader labelled, paste-compatible telephone input layered over the slots. Pasting a `+8801...` number renders 11 local digits; no PIN, OTP, transaction ID or manual payment approval.
- bKash entry removes competing input focus ring from overlapping checkout styles; the text label provides keyboard focus feedback. Inline error for both empty/invalid numbers and instructions for local or full international format.
- `normalizeBangladeshPayer` mirrors the existing Go `NormalizePayer` and signed Android SMS `NormalizeNumber` canonical representation. Accept `01[3-9]XXXXXXXX`, `8801...`, `+8801...`, supported BN/Arabic/Persian numerals; normalize to `+8801[3-9]XXXXXXXX` **before POST /api/checkout/:token/lock**. Reject wrong network prefix, wrong length, letters and malformed country prefixes locally. Server remains authoritative with HTTP 422 `INVALID_PAYER_OR_METHOD` and original strict `NormalizePayer`; matching HMAC, attempt immutability and receipt verifier unchanged.
- Nagad Close returns to the merchant/back without cancelling financial state, consistent with public checkout UX specification. Proceed is never accepted without full payer validation.
- Go regression test file `backend/internal/checkout/payer_number_format_test.go` exercises accepted and rejected formats. No changes to finance schema, provider SMS matching, merchant receiver account, fees or sandbox behavior.

## Checks completed / blocked
- Standalone copy of shared TypeScript helper compiled in local TypeScript strict mode and passed 14 cases (5 valid formats and 9 invalid) using Node assertions; this is **not** a full repo Next build.
- Vercel preview previously found JSX missing closing ternary brace (TS parser: 'An object member cannot be declared optional' at checkout-experience.tsx:253); committed a repair. Latest preview deployment is blocked by Hobby quota HTTP 402 `api-deployments-free-per-day` (more than 100, retry in 24h). **Do not claim the latest checkout build passed.**
- Go regression file added but GitHub CI quota is unavailable and Go package tests were **not executed**. Existing backend `HandlePublic` verifies number using `NormalizePayer` and returns 422 if invalid; this is an inspected code path, not a live POST test.
- Manual pending: local/full international paste and type, valid +88 prefix, invalid inline and server-side 422, mismatched SMS HMAC, real checkout success/expiry/cancel, mobile virtual keyboard, Nagad at 320/375/390 and short viewport, EN/BN, browser focus, dark/light, brand logo and full visual comparison against uploaded screenshot.
- Branch kept separate until preview build and customer flow tests can be completed. Never assert an official Nagad API transaction from this visual design.
