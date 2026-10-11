# PG03 — scoped merchant API credentials and contract-first auth

**Status: IMPLEMENTATION IN PROGRESS; NOT ACCEPTED.** This is real developer credential control-plane code, not proof of payment/checkout/webhook readiness.

## Intended scope and specification
- Backlog PG03 · P04/F05 · S05/S34/S45: OpenAPI 3.1, sandbox/live credential separation, hashed secret issuance, rotation, revocation, owner/admin onboarding, API auth validation.
- UI: `docs/PRODUCT-UX-SPEC.bn.md` Developers screen; Design System and tokens (EN/BN, Light/Dark/System, 320–1440px, keyboard, loading/error/empty/success/forbidden).
- Dependencies: 0001–0006 PG00–PG02 migrations and existing verified session/membership/Go authorization. PG04 financial schema/outbox and PG05 checkout are separate; leave readiness 503 until real pipeline operational.

## Real source changes
- `infra/migrations/0007_pg03_merchant_keys.sql`: workspace/environment FK, full SHA-256 token digest only, nine whitelisted scopes, expiry, audit, FORCE RLS, restricted database runtime role and constrained credential resolver. Public ID never grants access alone.
- `apps/web/src/actions/merchant-keys.ts`: current-session check, fresh role/product/environment revalidation in same transaction, server-side password confirmation, cryptographically random 32-byte token, expiry + scope validation, separate realm, once-only raw secret in action response, same-scope rotation and immediate revoke, audit and limit. No client-side raw secret persistence.
- `apps/web/src/components/{developer-console,api-key-manager}.tsx`: actual admin authorized key list and creation/rotate/revoke with once-visible copy/hide; viewer/editor forbidden; backend unavailable/error vs real empty distinct.
- `apps/web/src/components/dashboard-content.tsx`: route `/{locale}/w/{id}/payments/developers?env=sandbox|live` is wired to the real control plane, with server-validated tenant context.
- `backend/internal/authz/keys.go` + `backend/cmd/api/main.go`: bearer key authentication for `GET /v1/merchant/context?environment=sandbox|live`; wrong realm, revoked, expired, disabled product, suspended realm and missing scope fail closed. Response has `financial_api_ready:false`, no financial data.
- `contracts/openapi.yaml`: honest implemented Go API paths, environment enum, bearer scheme, safe errors and scoped context contract. Public bilingual first-use guide `/{locale}/docs/payments`.
- `apps/web/src/app/dashboard.css`: responsive key forms, keyboard focus and theme tokens.
- `apps/web/scripts/pg03-credentials-smoke.mjs`, Go tests, GitHub CI required PG03 integration step.

## Verify and record only observed outcomes
- [ ] Full PR 3/3 CI jobs green on final SHA; include run ID and commit.
- [ ] DB migration applied against production Neon using direct trusted migration path, check RLS, grants, policy/function access. Do not infer application deployment from GitHub source.
- [ ] Render Go deployment has new API path; Vercel deploy includes new Developers UI; prod commit parity and safe smoke verified.
- [ ] Create sandbox test key using actual authorized owner/admin password, copy once; refresh and confirm unrecoverable. No browser/Next server logs/URL leak.
- [ ] Query merchant context with real test secret; live-vs-sandbox mismatch 403, revoked/expired 401, missing read scope 403; cannot cross-workspace.
- [ ] Second test account editor/viewer blocked from API keys; disabled product/suspended environment denied. Real browser EN/BN, theme, touch/keyboard, 320/768/1440/zoom and error/offline as consolidated ledger.

**Not PG03 deliverables:** real payment records, payment requests, checkout, incoming receipt matcher, verified status, durable webhook, generated SDK, and Android production payment collection. Do not mark PG04–PG14 accepted by the mere existence of a server auth endpoint.

## Automated evidence
The new CI web job runs disposable PostgreSQL 17 DDL, hash-only storage, missing/no runtime table grants, correct digest authorization, mismatched public ID, revoked/expired, disabled payment product, suspended environment, cross-tenant isolation and rollback; Go tests validate token syntax, environment and fail-closed HTTP route. **Execution results to be filled from CI.**

## Owner manual test source
All manual PG03 and PG00–PG17 requirements are kept in `docs/MANUAL-VERIFICATION.md` for one consolidated owner pass. Do not require one-at-a-time manual interruptions.


## First implementation checkpoint — 2026-10-11 (evidence observed)

**Source merged:** [PR #3](https://github.com/masharzy/ekmivo/pull/3) squash merge `19c7a011004260a5db4a9d8318c7217591586671`. This is not an acceptance of the live payment product.

**Automated PASS 3/3:** [CI 38125321809](https://github.com/masharzy/ekmivo/actions/runs/38125321809), PR source `a19605ef7afafc0f55e35970924de4c901f99145`:
- Next.js lint / TypeScript / production build; disposable Postgres 17 migrations, key hash + constrained resolver + use timestamp, no runtime table rights, wrong public ID/digest, revoked/expired, disabled product, suspended environment, cross-tenant negative matrix and rollback.
- Go unit tests, merchant bearer token syntax, explicit environment and fail-closed HTTP response with correlation ID; Kotlin debug assemble/unit tests unaffected.
- Latest source also has server-scoped non-secret form Save/Restore/Discard; passwords/raw keys are never stored as drafts.
- Preceding CI failures from React render-purity lint were fixed (expiry computed by PostgreSQL rather than render-time `Date.now()`); earlier failed/cancelled runs are **not** called passed.

**Render:** live [Go deployment `dep-db5kljvavr4c73f6636g`](https://dashboard.render.com/web/srv-db5j532d0e5s73fli4h0) for exactly `19c7a011`, finished 2026-10-11 08:38 UTC. This verifies deployment metadata, not successful authenticated production API probes.

**Neon production:** read-only schema inspection of Ekmivo project `sparkling-mountain-38618629` found PG02 `workspace_environments` and `workspace_product_access`, but **no `merchant_api_keys` table**. Migration 0007 is **not applied to production**. Until an authorized, separately verified rollout, the developer UI cannot create real production keys and Go candidate resolver is unavailable. No privileged or destructive production SQL was run in this PG03 checkpoint.

**Vercel production:** latest listed READY web build is still PG02 commit `3cc4eeef`, not merged PG03 `19c7a011`. Explicit deployment request failed with **HTTP 402 `api-deployments-free-per-day`**, 24h retry advice; there is no verified PG03 web deployment. Do not label deployment parity passed or attempt repeated quota-consuming redeployments.

**Status:** PG03 source implementation and regression CI **green**, Render GO code deployed; production DB 0007 and web parity **blocked**, real owner/admin/viewer and credential/API/browser acceptance still pending. PG03 stays **OPEN / NOT ACCEPTED**. No real transaction, verified payment or outbound webhook has been claimed.

**Required safe rollout:** owner-authorized Neon schema migration through isolated branch/preflight → verify DB permissions/function and audit → production web deploy once Vercel capacity permits → issue a test sandbox key (owner + current password) → verify direct Go endpoint wrong environment/revoke/read scope/expiry and role matrix → complete one combined manual test ledger.


### Neon PG03 migration preflight — 2026-10-11

Prepared migration 0007 on an **isolated Neon temporary branch** of the Ekmivo production branch (database `ekmivo`), without applying schema writes to production. Migration creation succeeded. An independent preflight query confirmed both new tables have ENABLE/FORCE RLS, there are 0 existing test credentials, `ekmivo_financial_runtime` **cannot** SELECT credentials/audit tables, and it **can** execute only the restricted resolve/use functions. The prepared migration identifier is `165dd7db-48ff-4f5a-89e9-a935551b2a5a`. **Application to production is awaiting explicit owner approval** as required by the database migration workflow; do not mark 0007 applied or key issuance operational. Temporary branch cleanup/application is the pending completion action.


### Production rollout verified after owner approval — 2026-10-11

**Migration 0007: APPLIED SUCCESSFULLY.** Owner explicitly authorized application. Neon migration completion ID `165dd7db-48ff-4f5a-89e9-a935551b2a5a` reported success on Ekmivo `production` branch `br-solitary-river-b3ztvg8j`, database `ekmivo`; preflight branch `br-floral-poetry-b3j6rhqi` deleted. Production read-back confirmed:
- Both `merchant_api_keys` and `merchant_api_key_audit` exist, `relrowsecurity=true` and `relforcerowsecurity=true` for both.
- `ekmivo_financial_runtime` has NO SELECT on the key table; `resolve_merchant_api_key(text)` EXECUTE is granted. No raw merchant API credentials created as part of migration; key count was **0**.
- No existing user or real payment record mutation was made by the PG03 schema migration.

**Web deployment parity now verified:** Git-connected Vercel production deployment `ekmivo-iux4w3gxj-masharzys-projects.vercel.app` for `c441dca16243dce46b6896efabb5870d42cdf26d` is **READY**, newer than merged PG03 code `19c7a011`. The previously recorded manual deployment API HTTP 402 was real, but the later Git-triggered deployment succeeded; it no longer blocks source parity.

**Go deployment parity:** Render `dep-db5kno15efls73ao9bm0` for `c441dca` reported **live**. Latest code includes PG03 merchant key route, but no live authenticated key positive/negative probe was executed.

**PG03 remaining gate:** Real owner/admin password-confirmed sandbox key issuance, once-only reveal, direct Go probe (valid/wrong-env/revoked/expired), viewer/editor and cross-business forbidden, 320px/EN/BN/themes/browser screen-reader manual QA. Keep PG03 **source complete / deployed / manual acceptance OPEN**. Payment/checkout/verified receipts/webhooks not yet built.

## Independent real credential/API audit — 2026-10-11

**PG03 FAIL / NOT ACCEPTED.** Migration and deployment exist, but the valid-key API path is broken and the OpenAPI contract cannot parse. Audited source `4f1c4d6`; inspected Vercel READY production `c441dca` contains PG03, Render LIVE `4f1c4d6` (`dep-db5kq47avr4c73f69k20`). CI 38126039047 has 3/3 green jobs. These are source/deployment facts, not proof of successful credential authentication.

[Actual production outcomes](independent-production-audit.json): **29 PASS / 8 unmet assertions** including cleanup. Five failures are HTTP auth outcomes, two are dependent context/last-used assertions and one is contract integrity. All tests use disposable identities/businesses; no existing user or financial data was changed. Test live-realm credentials only access the context endpoint; they do not enable or exercise live payments.

**P1: valid merchant keys return 503 AUTH_SERVICE_UNAVAILABLE.** Password-confirmed key issuance succeeds and its full SHA-256 digest matches storage; valid sandbox key, rotated replacement and separately issued live key all return 503 instead of 200. A tampered same-prefix key and a write-only key also return 503 instead of 401/403. Valid-key-dependent tenant context and last-used checks therefore cannot pass; this report does not infer a cross-tenant leak from the unavailable response.

Root cause reproduced by a read-only query with the same pgx/database/sql adapter: `SELECT ARRAY['payments:read']::text[]` yields a Go driver `string`, and Scan into `[]string` fails. `backend/internal/authz/keys.go:52` scans `allowed_scopes` directly into `MerchantCredential.Scopes`, then maps the scan error to ErrUnavailable. Use a supported SQL scanner/pgtype conversion or JSON/text decoding with validation. Add a real PostgreSQL Go **AuthenticateMerchant positive integration test**, plus tampered secret, missing scope and replacement-key checks. Current SQL-only resolver tests and token syntax/unit tests do not execute this Go scan path. Redeploy Go and rerun actual production probes before acceptance.

**P1: OpenAPI is invalid YAML.** `contracts/openapi.yaml:162` has an unclosed single-quoted pattern (`pattern: '^[a-f0-9]{24}`), and components.responses is duplicated at lines 163/189. Redocly lint exits 1 with parser error at 163:3; see [strict parser and scan diagnostic](contract-validation.json). Repair the quoted anchored pattern, keep one response mapping, then add strict OpenAPI parse/ref/validation to required CI. Full web/Go CI being green did not validate this contract.

**Verified working:** production key/audit FORCE RLS and restricted runtime grants; owner password-confirmed sandbox/live issuance; viewer/editor/wrong-business denial; wrong password and unsupported scope denial; full hash-only storage; fresh GET never reveals the raw secret; rotation preserves scope/expiry and immediately invalidates old key; owner revoke and audit; revoked/expired credentials, disabled payment product and suspended environment rejected; wrong environment, missing bearer and malformed/repeated environment rejected. Missing-scope denial and successful-context tenant isolation remain blocked by the scan failure.

The actual deployed actions were discovered from deployed client references and invoked with real RSC encoding; no mocked actions or direct SQL key issuance substituted for the create/rotate/revoke flows. Dedicated fixture DB updates only simulate expiry and disabled/suspended state. No keys/cookies/passwords/raw HTML enter evidence. All fixture users, memberships, businesses, keys and related audit rows were deleted after tests; cleanup PASS.

UI interaction evidence is shared with PG02: key creation form appears with name/scopes/expiry/password; dirty draft navigation requires a decision; EN/BN/theme/responsive spot checks run in connected Chrome. Secret Copy/Hide, reload/back-cache behavior and complete manual accessibility remain in the single ledger. This audit does not claim those passed.

Run `scripts/pg02-pg03-production-audit.mjs` under the explicit fixture guard and an ignored production env file to reproduce. The harness deliberately exits nonzero until the recorded PG03 failures are resolved. `pg03-array-scan-probe.mjs` is read-only and prints only the adapter type/result. No new migration, deployment, credentials for real merchants, or product code fixes were made during this verification request.
### Corrective implementation — 2026-10-11
Go now selects PostgreSQL-generated scope JSON and decodes it rather than scanning a pgx text[] string into []string. No applied migration changes. A real restricted-role PostgreSQL Go test covers successful multi-scope authentication and usage recording, tampered credentials, missing scope, wrong environment and revoked keys. The existing isolated CI credentials step runs that test after migration 0007. OpenAPI now has one responses mapping and a correctly anchored quoted correlation pattern; pinned swagger-parser validates YAML, schema and references in the same required CI step. Historical failed evidence remains intact. Live API re-verification and deployment references will be appended after deployment.

### Post-fix live verification — 2026-10-11 (supersedes scan/contract blockers)
Source `1ffa7dae9e90377dcfc88fa9d0db51b7fe82184a`; exact Vercel **READY/PROMOTED** `dpl_JDnPKiACxKqeXnPc3no7etommyR9` and Render **LIVE** `dep-db5lnlnavr4c73f71q5g`. [CI 38129786695](https://github.com/masharzy/ekmivo/actions/runs/38129786695) all three jobs PASS. Required web PostgreSQL job executed `TestPostgresMerchantCredentials` against the real nonprivileged runtime role, after 0007, and strict OpenAPI YAML/schema/reference validation. Local Go tests, contract validation, web lint/types/production build PASS.

[Post-fix actual deployed RSC/Go HTTP/database results](post-fix-production-audit.json): **37/37 PASS**, including dedicated-fixture cleanup. Valid sandbox and live credentials and rotated replacement return **200**; client tenant override retains authenticated workspace; same-prefix tampered secret returns **401**, required scope absent returns **403**; revoked/expired keys **401**; environment mismatch **403**. Actual issuance/rotation/revocation, password/role checks, hash-only persistence, last-used timestamp and audits verified with database assertions. No secret/password/cookie/token enters evidence. Expiry/product/environment fixture state changes are dedicated-test simulations, not provider tests. No new migration applied.

The two PG03 runtime/contract blockers are **CLOSED**. PG03 is **implemented, manual pending**; Copy/Hide/reload/back-cache and remaining manual UI checks remain open. `/readyz` intentionally stays **503** (`financial_services_not_implemented`); successful merchant authentication does not claim checkout, receipt verification, payments or provider readiness. Preserve historical failed audit reports; do not use the diagnostic direct-array scan as acceptance, since its purpose is to demonstrate the unchanged pgx adapter representation.

### Owner confirmation — 2026-10-11
Owner reported **All pass** for the supplied PG01/PG02/PG03 combined checklist. Record this as owner-reported browser smoke, not agent-observed physical authenticator/device/provider testing. PG01 security lifecycle was independently repeated against deployed HTTP with dedicated fixtures: 51/51 PASS, cleanup included; existing owner enrollment/recovery data were untouched. The owner subsequently deferred admin UI work. Admin UI expansion remains out of this checkpoint. PG02 route latency and full-shell loading were reported separately and are being corrected; do not erase that performance follow-up.
