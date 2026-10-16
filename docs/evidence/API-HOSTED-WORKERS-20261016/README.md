# API-hosted payment workers — 2026-10-16

## Pairing projection repair

Production pairing POST reported `PHONE_PROJECTION_STALE`; authoritative workspace access version was 5 while Live financial registry remained active at version 3. Device listing can still succeed because GET does not create authorization-bound enrollment. Queue handlers do not run the separate `cmd/financial-sync` coordinator; hosting River alone omitted this required background process.

API now optionally hosts the existing `financial.ProjectionCoordinator.SyncAll` immediately and every 20 seconds, with bounded connection pools/timeouts, retry and graceful shutdown. Enable `API_BACKGROUND_PROJECTION_ENABLED=true`, using existing restricted control projection credentials plus `PG04_PROVISIONER_SANDBOX_URL` / `PG04_PROVISIONER_LIVE_URL` dedicated provisioner credentials. No schema change, elevated worker grants, fake entitlement version or disabled phone authorization check. Provisioners cannot read finance tables; preflight uses role/function privilege/database checks and the existing SQL function enforces physical realm and monotonic versions.

Full `go test ./...` PASS (workerruntime 15.456s). Isolated branch `br-still-fog-b38to82q`: actual fixture registry versions deliberately lowered in both realms, hosted coordinator restored authoritative versions/status, then cancelled cleanly. Configuration tests reject owner/cross-realm/missing credentials without disclosure.

**Production activation verified:** commit `b4d02b9a581401e602e1461e1f47e3a8c93aa1c4`, Render deploy `dep-db93sacsiqls73d000r0` live at 15:10:29 UTC. Existing service environment merged with the two restricted provisioner URLs and enable flag; no new service or grants. Instance `srv-db5j532d0e5s73fli4h0-lxvt2` logs reconciler active at 15:10:17 and eight records reconciled at 15:10:18. Control version 5/active equals both realm registries at version 5/active. `synced_at` advanced from Live 15:10:17.987 to 15:10:57.908 UTC (Sandbox 15:10:57.913), proving continued periodic synchronization. `/readyz` operationally ready, release_verified false. No synthetic production pairing created; the owner's authenticated QR click remains manual verification pending.

> **Production activated — 2026-10-16 14:46 UTC:** Owner explicitly authorized the restricted credential configuration after clarification. PR #71 is merged (`207bcc64fed188308ca666a399769a83eeb5de74`). Existing Render API deploy `dep-db93h2jl550s73fo1a5g` is live with both hosted realm workers enabled. No separate paid service. Earlier credential-blocked notes below are historical and superseded by this activation record.

Owner requested running the existing background work inside the current API service temporarily, with no additional paid service. The financial databases, credentials, queues, leases, signed delivery, retries and tenant checks remain independent per realm.

## Source changes

- Extracted `cmd/worker` into reusable `internal/workerruntime`; standalone CLI and hosted mode run the same job registrations and handlers. The CLI entry point and its role tests remain compatible.
- API opt-in starts one River runtime each for Sandbox and Live. Missing or wrong worker credentials cannot fall back to API reader or owner credentials; no process-global environment is switched between realms.
- Separate restricted finance worker credentials plus nonprivileged control projection credentials. Direct connections support River's session-bound queue notifications. Bounded per-realm pools: four finance and two control connections.
- Startup failures return sanitized errors to a supervisor, leaving HTTP serving available and retrying with bounded 5–30 second backoff. API SIGTERM drains HTTP up to twenty seconds and both existing River clients up to fifteen seconds, in parallel, before closing resources. Existing River leases recover jobs across process restarts.
- No fabricated readiness or worker heartbeat. Only actual queue handlers update `pg15_health()` as before. Primary signed-phone matching remains inline in the HTTP API.

## Required runtime variables

Merge these into the existing `ekmivo-go-api` Render service; never replace its existing environment or commit credential values:

- `API_BACKGROUND_WORKERS_ENABLED=true`
- `API_SANDBOX_WORKER_DATABASE_URL`: independent Sandbox `ekmivo_financial_worker_sandbox` direct connection.
- `API_LIVE_WORKER_DATABASE_URL`: independent Live `ekmivo_financial_worker_live` direct connection.
- `PG04_WORKER_CONTROL_PROJECTION_URL`: control `ekmivo_financial_projection_operator` direct connection, no owner/bypass role.
- Existing pipeline/extension configuration enabled: `PG06_PIPELINE_ENABLED=true`, `PG10_EXTENSIONS_ENABLED=true`. Existing encryption/signing/storage/SMTP configuration is reused without rotating keys.

Disable hosted execution with `API_BACKGROUND_WORKERS_ENABLED=false` when moving to standalone workers. Jobs remain in PostgreSQL; existing deduplication and leases protect rolling-deploy overlap. API hosting shares memory/CPU and uptime with HTTP; a free Render instance sleeping/stopping also pauses its workers. This does not turn a free instance into guaranteed always-on infrastructure.

## Verification

- Full `go test ./...` PASS, including invalid/partial hosted configuration, cross-realm credential rejection, sanitized errors, startup retry and cancellation during backoff.
- Actual two-realm River client startup and clean shutdown PASS on isolated Neon branch `br-still-fog-b38to82q`, using dedicated restricted worker/projection roles and direct connections. Pipeline/SMTP/object-storage actions were disabled for this lifecycle test so copied test-branch data could not cause external deliveries or money claims. This is real River lifecycle evidence, not real receipt/webhook delivery acceptance.
- No new migration, dependency, Docker or paid service.

## Deployment checkpoint

Automatic approval review rejected updating the production Render service environment because explicitly authorizing those three specific restricted database credentials to that destination was required. The rejected action did not complete; hosted production execution must not be claimed until that configuration is authorized, applied and real worker health is checked. No workaround credential path is used. The code is opt-in and safe to deploy with hosted workers disabled.

## Actual production verification

- Owner subsequently approved the exact existing-API credential configuration. Render environment was merged (not replaced); credential values remain only in the service environment, never Git/evidence output. No encryption/signing key rotation or new paid resource.
- Render logs at 14:46:02 UTC: `River worker active for live; receipt pipeline enabled=true` and the equivalent Sandbox message, on API instance `srv-db5j532d0e5s73fli4h0-vvbjz`.
- Both independent financial databases report genuine `critical_ready=true`, `export_ready=true`, `maintenance_ready=true` after executing their existing periodic handlers. SMTP notice/invoice notice health remains false because those optional mail workers are not configured; no email-delivery claim is made.
- `/readyz` returns HTTP 200 with `status=operationally_ready` and `release_verified=false`. The financial release gate is not falsely promoted to real-provider verification. Initial post-start error log query returned no errors.
- Preserved counts: Sandbox intents/payments/allocations 16/2/2; Live 21/3/3; one existing active subscription and no new platform invoice. No synthetic production financial payment or public pricing plan was inserted.
- Evidence: `production-workers.json`, `production-readiness.txt`. Real callback/provider/paid renewal acceptance remains in the consolidated manual ledger. Free Render sleep/stop pauses API and its workers; persistent River jobs resume on startup.

## Recurring-sweep regression found during observation

Initial health correctly became green, then expired. Read-only production queue inspection showed exactly one completed row per periodic kind in each realm. The pre-existing worker used `UniqueOpts{ByArgs:true}`: River 0.26 includes completed jobs in its default uniqueness states, so subsequent identical sweeps were suppressed until cleanup. This was not a credential error and no health flag was forced.

All five recurring sweep factories now add `ByPeriod` equal to their actual interval (critical 2s, export 5s, maintenance 1m, optional notice/invoice notice 10s). Duplicate insertion within one period remains suppressed while completed jobs cannot block later periods. A new actual isolated-Neon transaction regression completes one sweep, crosses the period and inserts its successor through River, then rolls back; PASS. Full Go suite PASS. Final production sustained observation is recorded after deploying this correction; initial startup-only evidence above does not by itself prove recurring health.

## Sustained production verification — PASS

Correction commit `e12a329ec6e8bc1424a3ff97e47251ff7d1f9a69` is live in Render deploy `dep-db93kcfavr4c739tkorg`. Five read-only samples from 14:53:47 to 14:56:10 UTC span approximately 144 seconds. Both realms retained critical/export/maintenance readiness, and every HTTP readiness check returned 200. Real completed job counts increased: Sandbox pipeline 15→87, export 7→36, maintenance 2→4; Live pipeline 16→87, export 7→36, maintenance 2→4. Persisted handler heartbeats advanced without synthetic updates. A subsequent filtered Render log query through 14:57:23 UTC returned no error/unavailable/stopped/rejected entries.

Reproducible observer: `tools/testing/worker-runtime-observe.mjs`; full aggregate output: `sustained-worker-health.json`. This verifies recurring execution beyond initial startup and heartbeat expiry. It does not certify real-provider callbacks or paid renewal: `release_verified=false` remains accurate, and optional unconfigured SMTP workers remain excluded from operational readiness.
