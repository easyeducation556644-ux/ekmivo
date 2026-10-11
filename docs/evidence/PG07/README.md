# PG07 implementation evidence

## New code checkpoint — 2026-10-11 (UNVERIFIED)

See [PG06–PG09 source checkpoint](../PG06-PG09-CODE-CHECKPOINT.md). Native collection, server matching, merchant delivery and operational screens are now implementation drafts on `codex/pg06-pg09-code`. These edits have **no build/CI/database/browser/real-device evidence yet** by the owner's explicit code-first instruction. Any older PASS above belongs only to its referenced older commit.

Acceptance: OPEN. New migration 0014 is not applied; no live verification or deployment claimed. Outstanding checks and prerequisites are recorded in [the consolidated manual ledger](../../MANUAL-VERIFICATION.md). Preserve the difference between a fictional parser fixture and approved real receipt samples.

## Current branch audit follow-up — 2026-10-11 (NOT ACCEPTED)

[Required PG06–PG09 audit](../PG06-PG09-AUDIT.md); [verification-only draft PR #9](https://github.com/masharzy/ekmivo/pull/9); [single manual ledger](../../MANUAL-VERIFICATION.md). Baseline 513ae04, code fixes up to 24cb641a; later evidence commits do not prove an untested test result.

Matching SQL and worker are implemented in migration 0014 but HAVE NOT been run on disposable financial databases; exact five-field/window/competing-worker/advance and cancellation/duplicate/rollback properties are therefore not verified. Live checkout issuance and real receipt E2E remain blocked.

Automated verification: source-authored tests/CI invocation are not PASS until a completed exact-commit run is recorded in the audit. New migration 0014 is NOT APPLIED. Real handset/provider/merchant payment, notices and deployment are NOT TESTED. Acceptance: **OPEN**.

## PG06-focused CI source context — 2026-10-11

The exact-source CI 38158507367 at 8aaf240 is green for Go tests and disposable SQL 0014 migration/rerun, **not** for actual five-field matching/atomic financial settlement/reconciliation under race or real receipts. PG07 behavior acceptance OPEN; no provider/device/payment E2E. Continue the dependency-ordered PG07 matrix after PG06 real-device/protocol gates; see ../PG06-PG09-AUDIT.md.
