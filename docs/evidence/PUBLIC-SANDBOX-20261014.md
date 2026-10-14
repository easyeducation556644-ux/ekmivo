# Universal public sandbox key — 2026-10-14

Owner explicitly requested one universal public TEST key, not per-developer credentials or a separate sandbox dashboard.

Provisioned control migration 0059 and dedicated test workspace 8dc6b5f0-5c5a-442f-af1d-a88604637792. Shared merchant credential is Sandbox-only; Live environment for this workspace is suspended. Existing merchant credentials are unchanged. Raw token is deliberately published TEST data in the separate configuration row; merchant authentication retains only its SHA-256 digest. Key expires after one year. Configuration is disabled pending complete public testing readiness.

Existing financial-sync projected only this workspace into ekmivo_sandbox_financial, version 2 active. No Live projection or real customer/payment mutation.

Actual deployed HTTP tests using this key:
- GET own sandbox payment-intents: 200.
- GET same workspace with environment=live: 403 ACCESS_DENIED.
- GET different merchant workspace: 403 ACCESS_DENIED.
- POST synthetic PUBLIC-TEST-1, 12500 minor units: 201, intent 8011fffc-db6a-41c0-9dfb-2ad0a1759af3.
- Same idempotency key and same payload: 201, SAME intent ID.
- Same idempotency key with changed amount: 409 CONFLICT.
- Invalid credential: 401 UNAUTHENTICATED.
- Read-only database assertion: exactly one PUBLIC-TEST-1 intent at 12500 minor units. No payment confirmation claimed.

Source: MFA-protected super-admin URL/save, rotate/revoke and guarded readiness activation; public test configuration endpoint; docs playground with bounded fixed-route forwarding and no Live fallback; public-key simulator access only in explicitly configured isolated sandbox-only Go process; public reset forbidden; no admin identity impersonation. Added 0059 support to existing financial migration coordinator.

Checks: TypeScript PASS; targeted lint PASS after dependency correction; Go authz/checkout/migration-command tests PASS. A sandbox fixture run is NOT a real device/provider test.

STILL OPEN: isolated public simulator service/URL, worker compatibility with existing sandbox encryption, actual signed webhook receiver/retries, all simulation scenarios, hosted checkout E2E, admin browser MFA/rotation/revocation tests, docs portal layout and dashboard navigation reorganization, verified release APK and deployment/browser checks. Current API origin allows merchant Sandbox requests but mixed Live API deliberately rejects simulator routes. Public playground stays disabled; do not call the entire sandbox or product production-ready.

## 2026-10-15 source checkpoint - NOT deployed-flow acceptance

Reuses the existing Sandbox database and API. No new database/service was created. New database creation was rejected by automatic approval review; that approach was abandoned.

Migration 0060 was applied to existing Sandbox through the financial coordinator. Receiver functions require fixed public-workspace and Sandbox scope. Logs retain IDs, event type, HTTP status and timestamps only. Live received no 0060 changes.

Shared API simulation is now limited to the configured public TEST workspace, authenticated key and explicit Sandbox realm. Public reset is forbidden. A restricted Sandbox worker drains only this workspace, using the existing API encryption key. The controlled HTTPS receiver checks native HMAC, timestamp, key ID, event identity and Sandbox workspace; modes are success, fail-once and always-fail.

Docs source has searchable topic navigation, central guide, language-switchable code rail and readable endpoint reference. Dashboard navigation is API Keys, API Docs, Webhooks, Apps & Plugins. Old integration links redirect to docs. No debug APK is represented as a production release.

Checks: TypeScript no-emit PASS; targeted ESLint PASS; Go API, checkout, financial, migration and merchant-webhook tests PASS after compiler-cache permission rerun.

Still OPEN: deployed worker readiness; actual HTTPS signed delivery/retry/replay; all simulation scenarios; confirmation of a user-created hosted checkout; admin browser key controls; verified release APK; responsive docs/browser verification. Public playground stays disabled. Earlier isolated-process restriction above is superseded by the fixed-workspace implementation, not by full production acceptance.
