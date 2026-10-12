# Recovery and rollback

Source tooling is unexecuted. Recovery times and restored financial correctness remain manual pending.

Before release, retain encrypted control, sandbox and live backups independently; keep encryption keys in a separate recoverable secret store. Record backup time and last reconciliation watermark. Test restoration to dedicated disposable databases, never production or a shared development DB.

`encrypted-backup.mjs` uses operator environment configuration and explicit isolated restore confirmation. Inspect its usage and flags. The script authenticates the archive before invoking `pg_restore`; restoring bytes does not prove payment integrity.

After an isolated restore: verify restricted runtime/worker roles and physical realm identity; verify FORCE RLS and no-context denial; compare verified payments/allocations/events against the retained watermark; re-query unknown outcomes before external effects; ensure one durable payment/event/allocation and one consumer fulfilment. Unknown receipt gaps remain exceptions. Do not invent verified payments from checkout success screens.

For application rollback: pause new intent creation; keep accepted receipt ingestion/reconciliation available; record exact previous API, worker and web commits and schema compatibility. Additive migrations remain applied. Never down-migrate financial evidence. Re-enable intake only after role/realm/readiness and post-release smoke pass. Incident owner confirms receipt ingestion, pending webhooks, queued exports and subscription renewal recovered.

Measure actual restore duration, data gap, reconciliation duration and key availability in PG15 evidence. Supply tested rollback/deployment references to the PG17 manifest. Keep unresolved issues open.
