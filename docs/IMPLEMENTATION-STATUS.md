# Implementation status and remaining work

Checkpoint: 2026-10-11; inspected working tree based on Git HEAD **164afe8**. This report includes local uncommitted dashboard work; it is not a production deployment claim. Plans/tests from earlier turns are cited, not represented as fresh provider tests.

## বর্তমান ফলাফল

Repository/web/auth/dashboard foundation শুরু হয়েছে। **Running payment gateway এখনো তৈরি হয়নি।** Go business API, financial schema, auto-matcher, merchant API, signed webhook delivery, sandbox and receipt bridge are not implemented. No recorded end-to-end live automatic payment evidence exists in this repository checkpoint.

A completion percentage would mix screens, source code, deployed behavior and real-provider evidence. Track accepted work packages instead. Newly defined phase-1 PG00–PG17 gates are all open; existing foundation work is credited below. This does not mean no code exists.

| Area | Actual evidence | Status | Remaining |
|---|---|---|---|
| Monorepo/runtime | apps/web, backend API/worker, contracts, infra, mobile/bridge/extension folders | Partial foundation | Reproducible local DB/services, dependency/security fixes, active CI |
| Public web | Bilingual V3 Ink & Bone landing, self-hosted Hind Siliguri, login/register/recovery pages source | Implemented source; prior deployment evidence for foundation | Complete public/help/legal/pricing/status claims, rendered audit, current deployment parity |
| Auth/workspaces | [auth](../apps/web/src/lib/server/auth.ts), [account actions](../apps/web/src/actions/account.ts), migrations 0001/0002 | Source present; not complete production-security evidence | Go identity boundary, granular capability, removed/revoked tests, MFA, live recovery/mail evidence, session/CSRF hardening |
| OTP/admin | Recovery adapter/forms, admin toggle/audit/role source | Partial | Real email/recovery, bootstrap/MFA/least privilege and deploy validation |
| Separate dashboards | [navigation](../apps/web/src/lib/dashboard-navigation.ts), [frame](../apps/web/src/components/dashboard-frame.tsx), local two-level routes | Local UI foundation | Environment selector, last-page persistence, real record search, all data/actions/details/states, visual/device evidence |
| Theme/locale | Tokens, bilingual labels, selectors | Partial D01/D02 | Complete catalog, cross-tab/OS sync, filter/draft preservation, four-combination/mobile/a11y checks |
| Tenant isolation | Membership checks in web; schema FK for current identity | Partial application boundary | Financial RLS/runtime roles/composite tenant-env FKs/jobs/storage/SSE/export tests; no financial isolation claim |
| PostgreSQL | Auth migration source; server-side connection adapter | Source/config available | Live schema/application validation not repeated here; financial migrations absent; Go readiness not DB-backed |
| Go API | [main.go](../backend/cmd/api/main.go) has healthz; readyz returns 503 database_not_configured | Skeleton | All product endpoints/auth/DB/commands |
| Go worker | [worker](../backend/cmd/worker/main.go) exits jobs-not-implemented | Skeleton | River setup/durable jobs/retries/operational queue |
| API contract | [OpenAPI](../contracts/openapi.yaml) documents health only | Skeleton | All merchant/public/device/domain schemas, generated clients, compatibility tests |
| Payment records/matching | No financial Go packages/migrations in inspected tree | Not started | Five-field matching, atomic consumption/allocation, exceptions, state/reconciliation |
| Merchant API/keys/webhooks | Route/UI descriptions only | Not started | Scoped hashed keys, idempotent API, signed events, SSRF-safe retries/rotation/replay |
| Checkout/links/invoices/refunds | UI schemas/marketing samples; no authoritative backend | Not started | Complete financial flow and real UI actions |
| Sandbox | No isolated payment test environment/simulator | Not started | Separate data/key/worker/source adapter, named scenarios, test-run evidence |
| Android receipt bridge | apps/android-bridge README only; no Kotlin build | Not started | Phase-1 minimal bridge and real samples/device tests |
| Android merchant/inbox app | Native Kotlin/Compose Gradle sources in apps/mobile; theme/copy/preferences/animated shell and honest connection probes | Foundation source only; CI compile/device gate pending | Secure mobile sessions, actual payments/inbox, Android receipt module and phase-2 acceptance |
| AI/channels/commerce/connectors | Domain navigation/empty state source | Not functional | Full remaining S-ID implementation and native provider access/evidence |
| Reliability/security/recovery | Infra template and planning/runbooks | Partial planning | Active CI, observability, load/failure tests, restore/rollback, operational owner |
| Competitor research | AiPraktor/ZiniPay/PipraPay/Paymently reports and redacted evidence | Research complete within recorded limits | Input for design; not our product implementation proof |

## Recorded checks and limitations

[Dashboard checkpoint](research/DASHBOARD-FOUNDATION-CHECKPOINT.md) records:

- npm ci, TypeScript noEmit and production build passed for local dashboard work.
- Changed dashboard files lint passed; full lint failed on three existing React effect rules in auth-form, workspace-onboarding and marketing-experience, plus existing warnings.
- Production-only dependency audit had zero findings; full audit reported five high development dependency findings. Not a comprehensive security audit.
- git diff whitespace check passed at that checkpoint.
- No complete local rendered/keyboard/mobile/four-theme-locale evidence, no live matching/provider tests.
- GitHub workflow template exists under infra; active CI was not established by prior scaffold work. Verify actual CI state in PG00 rather than assume.
- Previously deployed web foundation URL: https://ekmivo-web-masharzys-projects.vercel.app. This checkpoint did not redeploy/re-audit its current parity. Earlier signed-in browser showed older mixed dashboard; local separation cannot be claimed live.

Current task creates/refines planning docs only. It does not run migrations, change accounts, build Android, implement the financial API, push or deploy a gateway.

## What remains, in the requested order

1. PG00–PG17: finish shared prerequisites and **complete running payment product**, minimal receipt bridge, sandbox, merchant developer API/docs, tested native payment sources, real paid-cohort/recovery evidence.
2. AN01–AN05: Go/web inbox/channel foundation, full Android management/inbox app using existing bridge, push/offline/OS validation.
3. FM01–FM05: full commerce/courier/store sync, all channels and AI/media/voice, booking/Stars/agency, iOS/PWA/extension, analytics/feedback, complete dual-MVP audit.

Exact step dependencies/acceptance in [backlog](IMPLEMENTATION-BACKLOG.md). Exact menus/content in [UX](PRODUCT-UX-SPEC.bn.md). Do not mark an S-ID complete merely because one phase implemented a subset.

## External inputs to record early

| Input | Needed by | Action/evidence |
|---|---|---|
| Real bKash/Nagad/Rocket samples and receiving identities | G0-6, PG06/PG07/PG16 | Consented relevant receipts showing full payer/time/direction; dual-SIM/account binding |
| Android test phone and distribution/signing ownership | PG06/PG16, AN03–AN05 | Permission/background/reboot/offline behavior; supported tested OS/OEM matrix |
| Required native payment provider merchant access | G0-2, PG12/PG16 | Account docs/credentials, sandbox/live permissions, callback/query/refund semantics |
| Hosting/database/email accounts and budget | PG00/PG01/PG15 | Approved secret channel; region/PITR/worker/email configuration and operational quote |
| Business/support/legal/retention policies and price | PG13/PG17 | Real checkout identity, human incident contact, retention and service-billing policy |
| Meta/channel account access | AN01 and full channels | Official app/access/review; no claim of live channel from mocks |

External blockers must be explicit, with affected gates. Continue independent authorized work; don't silently defer capabilities or repeatedly ask for already supplied credentials/approval.

## Status update format for subsequent agents

For each item record: ID + S-IDs; proposed/in_progress/blocked/accepted; code change/commit; relevant automated checks; actual staging/browser/provider/device evidence; unresolved inputs; next dependency-ready item. Separate local/source, deployed, simulated, provider-sandbox and live-device evidence. This report is the latest status summary; history remains in research/checkpoints.

## PG00 execution checkpoint — 2026-10-11

Status: **in progress, not accepted**. Docker is excluded from laptop execution at the owner's request; use hosted isolated test databases for database checks. No database migration or financial write was performed.

- Vercel CLI verified `masharzys-projects/ekmivo-web`. Development env has no DATABASE_URL; production env was pulled into a separate Git-ignored server-only local file. Existing `.env.local` was preserved. Credentials are not included in this repository or handoff.
- Read-only hosted PostgreSQL inspection succeeded. Existing public tables: app_users, auth_attempts, auth_one_time_codes, auth_sessions, platform_admin_audit, platform_administrators, platform_auth_settings, workspace_members, workspaces. No schema_migrations table exists. Do not blindly replay 0002: its named ADD CONSTRAINT is not repeatable. Establish verified baseline/history before implementing the migration runner.
- Auth/workspace duplicate error toast effects removed; inline errors retained. Landing reduced-motion uses an external-store subscription with conservative SSR snapshot and stops autoplay when OS preference changes.
- Targeted ESLint on the three changed components and database inspector, followed by TypeScript noEmit, exited successfully. Earlier whole lint output is historical; fresh full lint/build checks remain required for PG00 acceptance.
- `apps/web/scripts/inspect-database.mjs` runs a read-only transaction and prints schema table names only; connection errors are redacted. Invoke with a server-only DATABASE_URL via environment, not command arguments.
- Active CI, isolated migration/integration database and complete clean-build evidence remain open. Financial engine and Android bridge remain unimplemented.

Cloud agent starts at PG00 with the committed source and docs. Provision secrets via its approved environment; GitHub contains no database credential. The owner's supplied production connection is not an integration-test target.

## Native Android architecture decision — 2026-10-11

The owner selected one Android-native Kotlin + Jetpack Compose application. React Native and a separate receipt bridge are removed from the design (no source was deleted). Android receipt intake lives in the same app and Go remains authoritative for payment matching/confirmation; iOS is a separate FM04 client. Source foundation work is underway and must not be mistaken for real device performance or payment evidence.

### PG00 CI verified

GitHub Actions `Foundation CI` run [38114530626](https://github.com/masharzy/ekmivo/actions/runs/38114530626) completed successfully on commit `2b9fea86361c61f1b5bf9720c32603d05d76e155`: whole Next.js lint, production build, TypeScript noEmit, isolated PostgreSQL 17 migrations/rollback smoke, Go tests and both binary builds passed. No production database migration or receipt transaction was involved. PG00 foundation baseline is accepted; ongoing Android build/hosting/device gates remain individually open.


### AN03 Kotlin source checkpoint (unaccepted)
`apps/mobile` now contains an actual Gradle/Kotlin/Jetpack Compose Android implementation with Ink & Bone Material3 colors, Hind Siliguri sourced from the existing web fonts, BN/EN copy, DataStore appearance/language preferences, animated merchant navigation, payment/inbox empty states and a real Go HTTP health/readiness probe. No receipt/SMS permissions are requested. A native CI job has passed on run 38115451816: Android debug APK assembly and unit tests (artifact 11693123111); web/Go/PostgreSQL tests also passed. Real Android device/performance/auth/payment behavior remains untested. All AN03/PG06/full inbox release gates remain open.

### Kotlin build CI accepted (source only)
Workflow: https://github.com/masharzy/ekmivo/actions/runs/38115451816 — success on b8247408; Kotlin/Compose assembled and unit-tested APK artifact 11693123111. No real-device benchmark, auth, inbox or receipt tests; PG06 and AN03 remain open.


### PG06 native receipt evidence security helpers (source-only, unaccepted)
Kotlin `receipt/EvidenceGate.kt` implements strict *submission completeness* checks for full payer number, exact amount, original transaction time, enrolled receiving-source binding, method and incoming direction; masked/omitted evidence stays incomplete. `AndroidKeystoreSigner.kt` can generate/sign with P-256 private keys bound to the Android Keystore after enrollment. `DeviceSignature.kt` canonicalizes method/path/transport timestamp/event ID/SHA-256(raw body), and Go `backend/internal/deviceevidence/signature.go` verifies X.509 P-256 DER signatures and transport timestamp freshness. Relevant unit tests added. No collector/permission, device enrollment, actual receipt, payment matcher, webhook or sandbox is integrated; **PG06 remains OPEN**.
