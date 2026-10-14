# Integrations & events — implementation and evidence

2026-10-14 · Baseline a710b5f · Branch codex/integrations-events-polish.
Related gates: PG03, PG08, PG09, PG12, PG14. This does not accept entire PGs or claim production release.

## Implemented

- Developers: Quickstart, scoped credentials, API reference, real SDK/source links and isolated sandbox. Developer-only environment selector uses separate server-authorized key lists; no global merchant switch is introduced. Local tabs do not reload the server.
- Webhooks: HTTPS creation, enable/disable, once-visible signing secret, prepare/activate/revoke-previous rotation, endpoint detail, deliveries/search/pagination/loaded-status filtering and explicit replay. Replay never repeats a payment. Fixed the proxy whitelist that previously blocked existing rotation actions.
- Additive SQL 0058 records each delivery transition with real timestamps/status/attempt count/HTTP/reason. History is immutable; timestamps before installation are not reconstructed. Raw response bodies and credentials are not stored. Attempt inspector loads on demand.
- Events: domain payload inspector, payment/delivery trace, owner/admin audit/API/private-export metadata, personal notifications/mark-read and explicitly loaded-only safe JSON export. Generated CSV download still uses server role/expiry checks.
- Authorized payment-intent/document API metadata: route templates, status, duration, correlation only. No request URL/query/body, key, session, SMS, full payer or contact. Bounded async capture never delays or changes financial responses; it is best effort, not financial audit.
- Connections: semantic platform cards, guided create/edit, HTTPS origin validation, real endpoint selector, optimistic version checks, enable/disable and actual delivery diagnostics. No SIM/parser/account mapping, raw webhook-ID input, fake installed/verified badge, automatic refund or new provider API prerequisite.
- EN/BN, semantic theme tokens, reduced motion, scoped drafts/secrets, offline/error/loading/empty/forbidden states and keyboard dialogs. Temporary refresh failures retain data; auth denial clears it.
- Existing financial migration coordinator gains guarded 0058 support; operational readiness requires new functions. No duplicate runner.

## Verification

- Local TypeScript and optimized Next build passed; fixture route absent from production route output.
- Full Go suite passed. DB-dependent tests can skip without URLs; this is not live HTTP authorization evidence.
- Full lint: two existing effect errors in refund initial fetch and public motion fixed; unrelated warnings remain. New UI targeted lint passed.
- Generated OpenAPI includes three owner/admin activity views with cursor/search and safe schemas; merchant SDK operation count stays 40.
- Redaction unit tests passed for recursive credentials/contact/SMS omission and bounded unknown/deep/array/string data.
- Isolated browser simulation passed create/rotation/activation/replay, failed refresh, safe payload/trace, activity/notifications/viewer guard, edit/endpoint picker, credential form/reference/sandbox and offline states. 64 locale/theme/viewport cases cover 320/768/1024/1440. Screenshots are fictional, not live merchant/provider evidence.
- Dev-only test page is removed in finally and never committed. No real key/endpoint/payment was created by browser tests.
- SQL 0058 passed in rollback-only transactions on ekmivo_sandbox_financial with owner session: DDL, minimized audit, API metadata, wrong/missing tenant context, wrong realm, second-tenant isolation, public/direct-table/runtime-function grants, delivery transition dedup and immutable history. Exact SQL: rollback-verification.sql.
- Fresh read-only queries after both runs confirmed both pg58 tables absent and fictional workspace rows absent. No permanent migration or production data change. This proves SQL scopes/grants, not restricted runtime HTTP behavior.
- Pre-existing Nagad unit fixture lacked the colon required by unchanged approved parser grammar; fixture corrected, production parsing unchanged.

## Release gates still open

No deploy or permanent migration claimed. Vercel previously rate-limited a710b5f; no manual deploy retry or CI dispatch here. See docs/MANUAL-VERIFICATION.md for deployed runtime/receiver checks.

Run the existing backend/cmd/financial-migrate procedure with its independent owner URLs, existing PG04 authorization/source settings, plus PG58_INTEGRATION_ACTIVITY_ALLOW_MIGRATION=true and PG58_INTEGRATION_ACTIVITY_MIGRATION_FILE=../infra/migrations/0058_integration_activity.sql. Secrets stay in operator environment. Apply Sandbox, verify restricted roles, then Live; deploy matching API/worker/web when quota permits.

GO_SANDBOX_API_URL must point at a dedicated sandbox service. The proxy never falls back to Live. Real WooCommerce/Shopify/website/bot installation, signed receiver, rotation overlap and deployed auth remain manual pending. No provider/device/full-production acceptance inferred.
