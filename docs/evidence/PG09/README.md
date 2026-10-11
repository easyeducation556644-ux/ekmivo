# PG09 implementation evidence

## New code checkpoint — 2026-10-11 (UNVERIFIED)

See [PG06–PG09 source checkpoint](../PG06-PG09-CODE-CHECKPOINT.md). Native collection, server matching, merchant delivery and operational screens are now implementation drafts on `codex/pg06-pg09-code`. These edits have **no build/CI/database/browser/real-device evidence yet** by the owner's explicit code-first instruction. Any older PASS above belongs only to its referenced older commit.

Acceptance: OPEN. New migration 0014 is not applied; no live verification or deployment claimed. Outstanding checks and prerequisites are recorded in [the consolidated manual ledger](../../MANUAL-VERIFICATION.md). Preserve the difference between a fictional parser fixture and approved real receipt samples.

## Current branch audit follow-up — 2026-10-11 (NOT ACCEPTED)

[Required PG06–PG09 audit](../PG06-PG09-AUDIT.md); [verification-only draft PR #9](https://github.com/masharzy/ekmivo/pull/9); [single manual ledger](../../MANUAL-VERIFICATION.md). Baseline 513ae04, code fixes up to 24cb641a; later evidence commits do not prove an untested test result.

Operational real API/UI source exists but has not been tested with logged-in browser, real isolated records, roles and EN/BN/theme responsive view. UUID-desc pagination is not chronological. Exports/refund/public receipt/full invoice depend on later PGs and must remain unavailable.

Automated verification: source-authored tests/CI invocation are not PASS until a completed exact-commit run is recorded in the audit. New migration 0014 is NOT APPLIED. Real handset/provider/merchant payment, notices and deployment are NOT TESTED. Acceptance: **OPEN**.

## PG06-focused CI source context — 2026-10-11

The exact-source CI 38158507367 at 8aaf240 passed Next build/lint/typecheck and 0014 isolated installation. This is NOT authenticated real-record/role/browser coverage of PG09 screens, actions, responsive EN/BN, theme or stable time cursors. PG09 acceptance OPEN; see ../PG06-PG09-AUDIT.md.
