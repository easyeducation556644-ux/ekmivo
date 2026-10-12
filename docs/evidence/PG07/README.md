# PG07 implementation evidence

## Current source follow-up — 2026-10-12

**Observed exact-source verification:** `9131284dbb908df3e36a3b188e93f8001f659a36`, [CI 38193033849](https://github.com/masharzy/ekmivo/actions/runs/38193033849), 4/4 PASS. Isolated matcher/atomicity/concurrency/negative cases and newly signed ingress → one verified payment PASS. 531 assertions are combined PG04–PG09, not a per-PG count. Real provider/device and live issuance remain open.

Five-field matching and payment/allocation/event atomicity continue to run against isolated restricted PostgreSQL. New signed HTTP ingress coverage feeds the matcher and asserts one funded payment after replay; see [current audit](../PG06-PG09-AUDIT.md) for its observed exact-source result. Customer receipt outbox creation is attached transactionally to the payment event by additive migration 0015; it never changes matching eligibility. Genuine provider/device evidence and PG05 live checkout issuance remain open. PG07 production acceptance is not upgraded by simulations.

## New code checkpoint — 2026-10-11 (UNVERIFIED)

See [PG06–PG09 source checkpoint](../PG06-PG09-CODE-CHECKPOINT.md). Native collection, server matching, merchant delivery and operational screens are now implementation drafts on `codex/pg06-pg09-code`. These edits have **no build/CI/database/browser/real-device evidence yet** by the owner's explicit code-first instruction. Any older PASS above belongs only to its referenced older commit.

Acceptance: OPEN. New migration 0014 is not applied; no live verification or deployment claimed. Outstanding checks and prerequisites are recorded in [the consolidated manual ledger](../../MANUAL-VERIFICATION.md). Preserve the difference between a fictional parser fixture and approved real receipt samples.

## Current branch audit follow-up — 2026-10-11 (NOT ACCEPTED)

[Required PG06–PG09 audit](../PG06-PG09-AUDIT.md); [verification-only draft PR #9](https://github.com/masharzy/ekmivo/pull/9); [single manual ledger](../../MANUAL-VERIFICATION.md). Baseline 513ae04, code fixes up to 24cb641a; later evidence commits do not prove an untested test result.

Matching SQL and worker are implemented in migration 0014 but HAVE NOT been run on disposable financial databases; exact five-field/window/competing-worker/advance and cancellation/duplicate/rollback properties are therefore not verified. Live checkout issuance and real receipt E2E remain blocked.

Automated verification: source-authored tests/CI invocation are not PASS until a completed exact-commit run is recorded in the audit. New migration 0014 is NOT APPLIED. Real handset/provider/merchant payment, notices and deployment are NOT TESTED. Acceptance: **OPEN**.

## PG06-focused CI source context — 2026-10-11

The exact-source CI 38158507367 at 8aaf240 is green for Go tests and disposable SQL 0014 migration/rerun, **not** for actual five-field matching/atomic financial settlement/reconciliation under race or real receipts. PG07 behavior acceptance OPEN; no provider/device/payment E2E. Continue the dependency-ordered PG07 matrix after PG06 real-device/protocol gates; see ../PG06-PG09-AUDIT.md.

## PG07 source and database verification — 2026-10-11 (AUTOMATED PASS; ACCEPTANCE OPEN)

**Exact tested source:** `a33c9dc308ea7c5ea738d59aaed51dbdd701187a` on `codex/pg06-pg09-code`. [GitHub Actions run 38160139898](https://github.com/masharzy/ekmivo/actions/runs/38160139898) **4/4 jobs PASS**: Go unit + race + vet; Kotlin unit/debug assemble; Docker API/worker/migrator; Next lint, strict OpenAPI, Postgres 17, TypeScript, production build. The independent financial regression log states **PG07 isolated matching PASS** and **268 assertions across PG04–PG07 combined**; never label all 268 as PG07-only tests.

### Implemented and verified in disposable finance databases

- Strict all-five-field equality: actual full payer HMAC, receiving account ID, amount in minor units, provider original transaction timestamp (not upload/observed time), and method. Direction must be incoming, parser precision second or entire minute interval fully within the immutable attempt window; currency, source provenance, active workspace entitlement and physical realm are separately checked. Missing/masked payer or original time never inferred.
- Unique evidence candidate under matching attempt-bucket advisory lock. Duplicate or already-funded attempts never allocate twice. Receipt result row lock, locked attempt, **SKIP LOCKED** on intent prevents deadlock with PG05's intent-first payer-lock/cancellation path. Two simultaneous matcher workers converge on exactly one payment, event and delivery. Locked intent returns pending, subsequent sweep matches.
- Automatically and transactionally INSERTs verified payment, immutable financial allocation, `payment.verified` domain event and one pending delivery per active merchant webhook. Real `pg05_intent_state` becomes completed from allocation; no browser-paid flag or customer TrxID, screenshot, or approval exists. Rollback on SQL failure preserves atomicity and existing cap/source constraints.
- Original time exactly at minute boundaries, exclusive end and an entire minute interval, late-arriving provider receipts inside their pre-expiry attempt window, cancelled intent rejection and stale entitlement rejection. Underpayments and overpayments yield named **unmatched/reconciliation-required reasons**, never partial paid/over-allocated or financial credit. Synthetic wrong payer/account/method, masked payer, debit/outgoing, missing time, wrong amount and currency remain nonmatching.
- Least-privileged `ekmivo_financial_worker_sandbox` successfully invokes `pg07_match` while a direct `INSERT financial_payments` attempt is denied. Isolated sandbox/live financial realms apply migration 0014 twice, RLS enforced; no receipt table appears in control DB. All fixture accounts/evidence are isolated fictional CI records; no real sender or merchant financial transaction.

### Not yet accepted — external/manual/dependency gates

- **BLOCKED / PG05/live:** public checkout creation/locking and destination currently SANDBOX-ONLY, display **SIMULATED — DO NOT SEND MONEY**. No real live receiving instructions, trusted provider onboarding or approved parser. **Never send actual money** to test PG07 without the separate owner-approved PG05/PG06/PG12 live onboarding and release path.
- **MANUAL PENDING / real source:** consented Android phone, real authorized full payer/original-time receipt samples from applicable bKash/Nagad/Rocket versions, SIM/notification source ownership, actual signed Android request, controlled merchant webhook listener and verified automatic customer state. Source fixture `sandbox_fixture` is explicitly fictional; no provider authenticity or actual funds asserted.
- **OPERATIONAL GAP:** beyond the checked deterministic races, a staged crash/restart recovery under a real deployment, replay/backlog soak, real external delivery and pre-cutover signing/key backup need operator testing. No physical-device merchant E2E or production migration was performed. Additional live source/policy security sign-off remains required.
- **SCOPE DEPENDENCIES:** PG08 signed HTTP merchant delivery is queued but not verified end to end; PG09 dashboard browser acceptance, future refund/exception reconciliation and PG12 adapter coverage remain independent requirements.

**Status:** PG07 matching engine, tested source, atomic database financial behavior and available simulated CI verification **COMPLETE**. **PG07 product/live-provider acceptance OPEN** until external/manual gates above pass. Full evidence: [audit](../PG06-PG09-AUDIT.md), [combined owner manual ledger](../../MANUAL-VERIFICATION.md). Earlier sections saying this source was never tested are historical and superseded **for the exact verified commit only**.
