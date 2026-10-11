# PG06–PG09 code checkpoint — 2026-10-11

Owner instruction: implement code first, defer builds, CI, device/provider tests and bug-fixing. This instruction permits coding PG06→PG09 without claiming their acceptance. Baseline: main `9e0e4d3`; branch `codex/pg06-pg09-code`. No production migration or deployment performed.

## Source written

| Item / scope | Code checkpoint |
|---|---|
| PG06 / X08, S31 | Same Kotlin APK: explicit consent, one-use five-minute pairing, Keystore proof, SMS receiver/notification listener, provider/source/SIM binding, pre-persistence allowlist filter, encrypted SQLite outbox, durable event ID + sequence, WorkManager backoff/reboot recovery, health and masked server receipt log. Go: fresh enrollment/control authorization, timestamp/raw-body signature, approved versioned parser registry, integer minor units, timezone/precision, encrypted relevant evidence and dedup. |
| PG07 / P02, P03, X08, S32 | PostgreSQL matcher serializes the exact payer/account/method/amount bucket, rechecks original time and full minute containment, locks attempt/intent, preserves cancelled funds as exceptions, guards duplicate provider identity/changed evidence and already-funded intents. Payment + allocation + event + delivery job rows commit atomically. Late sync uses original time, not arrival time. Masked/missing payer is never guessed. |
| PG08 / P04, F06, S34, S45 | Encrypted signing keys, raw-body HMAC contract, current/previous key overlap metadata, public HTTPS validation, per-attempt DNS validation and pinning, no redirects/proxy env, bounded HTTP, leased durable delivery records, bounded exponential retries, same-event replay, safe outcome codes. River periodically drains durable records and verifies fresh control projection before work. Merchant receiver example verifies signature/scope, queries authoritative payment and persists event dedup + fulfilment job in its own DB transaction. |
| PG09 / D01, P03, O01, S03, S31, S32, S45, S46 | Real masked list/detail APIs and Next proxy allowlist; Overview, Payments, Incoming, Receiving accounts, Devices, Webhooks, Events, per-endpoint deliveries. Account add/disable; device pair/revoke/rename; five-field candidate comparisons; reprocess; webhook create/disable/rotate/replay. Scoped cursor pagination, loaded-record search, source unavailable vs empty, loading/error/offline, owner/admin actions, draft integration, EN/BN and semantic light/dark styles. Prior real Requests/checkout UI retained. |

Source locations: `backend/internal/deviceevidence/parser.go`, `backend/internal/checkout/receipt_pipeline.go`, `backend/internal/financial/pipeline_worker.go`, `backend/internal/merchantwebhook/`, `apps/mobile/app/src/main/java/com/ekmivo/mobile/receipt/`, `apps/web/src/components/payment-operations.tsx`, `payment-overview.tsx`.

`infra/migrations/0014_pg06_pg09_receipt_pipeline.sql` is NEW, NOT APPLIED. Existing coordinator adds an explicit `PG06_ALLOW_MIGRATION=true` gate and explicit file path. Never run against control DB. Sandbox/live financial DBs remain physically separate. Ordinary readers/workers have function grants; no arbitrary financial INSERT or raw-evidence SELECT.

## Configuration required later

- API: existing PG05 sandbox configuration; `PG06_PIPELINE_ENABLED=true`, `PG06_ENCRYPTION_KEY_HEX` (32-byte AES key encoded as 64 hex characters), `PG06_PARSER_RULES_JSON`, `PG06_CONTROL_PROJECTION_URL` (restricted control projection credential). Optional `PG06_LIVE_DATABASE_URL`: a separately authenticated restricted live financial reader; startup checks physical realm and database/user separation.
- Realm worker: existing financial worker/control projection URLs and explicit realm; same pipeline-enabled flag and encryption key for the ciphertext it processes. Keep key backup/recovery outside repository. No secret values belong in evidence or logs.
- Android build: existing `ekmivoApiBaseUrl` public HTTPS origin. No credentials embedded in the APK. SMS runtime permission and notification-listener settings are separate opt-in capabilities.
- Parser registry: only rules supported by consented real samples may be enabled for real sources. Exact whole-message incoming expressions; full actual payer, exact amount, original transaction time, internal reference dedup. `capture_pattern` may admit relevant masked receipts into safe exceptions while still excluding unrelated messages/OTP. Provider-specific receipt formats are NOT invented.
- `examples/receipt-parser/sandbox-fixture.json` is a FICTIONAL, SANDBOX-ONLY format, not a bKash format or real device proof.

## Checks NOT run

No Go build/tests, Next lint/typecheck/build, Kotlin build/unit/device tests, PostgreSQL migration smoke, browser audit, CI, deployment or real payment/provider/device tests were run for this checkpoint. Go formatting only is not compile evidence. Previously green CI belongs to its old commits and does not verify this source.

Later owner-run commands, separately (do not run them automatically during this code-only checkpoint):

```powershell
# In backend
go test ./...
# In apps/web, existing installed dependencies
npm run lint
npx tsc --noEmit
npm run build
# In apps/mobile
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
```

Database/security/concurrency checks must use DISPOSABLE isolated finance/control DBs, with existing migration coordinator plus 0014. Do not point a smoke test at production. No Docker is required locally; CI can provide disposable PostgreSQL later. Run existing PG04/PG05 regressions as well as new parser/window/signature tests.

## Gates still OPEN — not silently removed

1. Compile/typecheck/migration/CI and source review, including role-grant and SQL-function replacement review, before any deploy. Bugs are expected to be resolved during the later verification pass requested by the owner.
2. G0-6 actual consented provider samples and a real approved parser/source binding. Verify exact full payer/original timestamp/receiving identity; test dual SIM, spoofed source, masked/missing fields, debit/reversal/OTP, timezone and minute uncertainty.
3. Real Keystore, OS permissions, reconnect, reboot, force-stop gaps, packet tampering, offline ordering, queue quota and revocation. OS force-stop cannot be promised as uninterrupted collection. Lost pairing response requires revoke/re-enroll; no silent capture begins before account confirmation.
4. Full merchant/device→receipt→automatic payment→signed callback E2E and races, reconciliation after process death, cancellation/late/under/over/fingerprint collision. Load targets remain unmeasured; at-least-once callbacks require merchant dedup.
5. PG05 hosted checkout is still SANDBOX-only and says **do not send real money**. The receipt-pipeline operations optionally support a live finance DB, but this does not implement or release a live hosted checkout. Its production receiving instructions/live issuance dependency remains OPEN. PG06 route selection can bind configured sandbox accounts to healthy devices, without replacing honest sandbox labels.
6. PG08 currently emits `payment.verified`; other documented events require their lifecycle producers (expiry/exception/refund/reversal/invoice), not a fictitious emitter. Checkout polls authoritative confirmation. Email/SMS receipt notice needs customer consent/contact and a configured channel; no successful notice claimed. Keep required notice delivery OPEN.
7. PG09 source is not visually/behaviorally accepted. Server status/account/method/date filters and human audit actor context are coded but unverified. Exports and lifecycle-specific refund/reversal states still require their later services and scope review. Search is explicitly over loaded records. Refund/public receipt/full invoice actions remain honestly unavailable dependencies under PG10/PG11/PG13.
8. Privacy retention/export/deletion coverage must include new account ciphertext, device/transport history, delivery records, parser configuration and local encrypted queue; signing-key rotation/recovery and quota alerts still require operational verification.

PG06, PG07, PG08, PG09 acceptance: **OPEN**. This is a substantial implementation draft, not proof that every scope/gate is complete. Use the consolidated manual ledger rather than asking the owner to test each PG separately.
