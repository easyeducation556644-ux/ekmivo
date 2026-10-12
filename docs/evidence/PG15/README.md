# PG15 source checkpoint — not accepted

Read-only HTTP readiness/latency probe and encrypted backup/isolated restore tooling are implemented. Restore requires explicit independent target credentials, authenticates the archive before mutation and does not claim financial reconciliation. Tools have not run against databases or deployments.

OPEN code: full new-flow failure/security/load/design suites, operational alert delivery/worker readiness and complete recovery/rollback automation/runbooks. No measured recovery/load/security PASS claimed.

Continuation: bounded monitor/alert-state tooling, critical/export/notice worker freshness and extension-schema checks, file/export cleanup and migration 0040 raw-receipt retention source added. Raw policy is disabled by default. An operator must record the reviewed retention period/reference before enabling it; explicit evidence holds prevent erasure. Only raw ciphertext can be redacted with a digest-bound append-only record; normalized money/identity/time/evidence digest cannot change. This changes a sensitive trigger boundary: disposable PostgreSQL negative/hold/expiry tests are written but NOT RUN, so it is not production approved. Unparsed pending evidence is excluded and must be resolved/covered by policy before release.

Release-validator negative unit fixtures 5/5 PASS. This is fictional unit evidence, not recovery/load/security acceptance.


## Local continuation — 2026-10-12

Readiness now requires fresh healthy maintenance and, when SMTP configured, invoice-notice workers in addition to existing workers. Source-only signed receipt load, SQL worker observer and authenticated read load cover named timing targets; none has run. Privacy export scope/redaction registry unit tests 4/4 PASS, executor syntax PASS. Full failure/security/design/load/restore/alert gates remain OPEN.

Shared source checks and remaining code: [implementation status](../../IMPLEMENTATION-STATUS.md). Current uncommitted working tree, not historical CI or a deployed commit.

## Local source continuation — 2026-10-12

An encrypted filesystem-backup catalog now hashes/authenticates a reviewed backup before registration and requires a newer retained backup in the same realm before expiry. Expiry records an expiring intent durably before unlinking, then records completion. Interrupted expiry halts later removal for operator reconciliation. Registry unit tests pass; no real backup was registered, restored or expired, and provider-managed snapshots are outside this catalog.
