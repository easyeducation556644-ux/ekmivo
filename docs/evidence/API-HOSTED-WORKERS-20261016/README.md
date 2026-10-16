# API-hosted payment workers — 2026-10-16

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
