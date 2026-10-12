# PG10 source checkpoint — not accepted

Branch: `codex/pg10-pg17-code`. Local implementation; no push, deployment or database migration performed.

Source includes tenant-scoped customers, CSV preview/import, payment links/custom fields, versioned invoice drafts/issued snapshots, per-visitor checkout, server totals/due, private scanned uploads, capability public pages, print/share and encrypted private asynchronous CSV exports. Export jobs run in a separate River queue with fresh membership checks; removed actors cannot download.

Basic Go API compilation and web TypeScript checks succeeded during implementation. These are not schema execution, security acceptance or browser/device evidence. Later edits require the final combined check.

Continuation source now includes correction/reminder/send, linked customer activity and search, image/quantity/registered-return policy, receipt provenance, draft guards, file/export cleanup, optimistic action versions and whole-batch import/retry idempotency. OPEN code: full privacy/deletion coverage and final UI/failure/contract parity. New SQL is unapplied and unverified. Do not mark PG10 complete from this checkpoint.

Combined real-data/manual acceptance belongs in `docs/MANUAL-VERIFICATION.md`.


## Local continuation — 2026-10-12

Immutable checkout retry retains body/key while an outcome is unknown; async document CSV export persists actor/workspace/environment/resource-scoped job/key across navigation. Bengali filenames use explicitly encoded headers through UI/proxy/Go/SDK; RFC filename downloads already exist. Public reload retry persistence, final field/draft/state parity and private-storage/database/browser execution remain OPEN.

Shared source checks and remaining code: [implementation status](../../IMPLEMENTATION-STATUS.md). Current uncommitted working tree, not historical CI or a deployed commit.
