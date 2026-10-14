# SMS Devices / pairing QR / customer checkout chrome — 2026-10-14

Implementation replaces the generic SMS Devices screen with a dedicated phone
setup, QR/code pairing panel, live status cards, permission/offline next actions,
rename and confirmed disconnect. Receiving numbers remain in Payment Methods;
no SIM IDs, parser selectors or new account entry. Existing authenticated phone
API endpoints and receipt verification are unchanged.

Pairing QR is generated locally using the existing vendored MIT QR generator.
Uses the Android scanner’s exact ekmivo://pair?token=... payload, explicit square
sizing, black modules on opaque white, and five-module quiet zone. No remote QR
service, secret persistence or new pairing protocol. QR/code disappear on claim
or expiry. Workspace/realm/permission changes remount the scoped UI and clear
pairing state. Device data is retained when refresh fails; no fabricated zeros.

Customer /pay and /checkout use route-segment + pathname chrome guards and a
page marker with scoped CSS fallback. Site header/footer are excluded even for
retained layouts. Provider branding and merchant checkout controls remain.

Executed evidence:
- TypeScript no-emit passed. Targeted source lint passed (existing checkout
  unused-state/img warnings remain outside this change).
- Local isolated browser using mocked API responses passed: QR visible and square;
  no technical account fields; claim removes QR; rename/revoke; failed refresh
  retains data; 320px dark layout; EN/BN pay/checkout header/footer absence; client
  navigation into pay; header returns on login.
- OpenCV decoded the rendered QR PNG to the exact expected Android pairing payload
  using a synthetic token. This is not a real Android scanner test.
- Temporary development fixture route was deleted after testing. It is not shipped.
- Final optimized Next.js production build (including TypeScript) and final targeted lint passed.

Screenshots are simulations (test phone + synthetic QR), never live integration:
- pairing-light-desktop.png
- pairing-dark-mobile.png
- pairing-qr-test-only.png

Manual pending: actual Android scan/claim, expiry, permissions/heartbeat, offline
receipt replay, viewer denial and revoke blocking uploads; deployed checkout
navigation. See docs/MANUAL-VERIFICATION.md. No real production phone was changed.
No GitHub CI quota or extra manual deployment used for these checks.
