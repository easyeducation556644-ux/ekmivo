# PG08 implementation evidence

## New code checkpoint — 2026-10-11 (UNVERIFIED)

See [PG06–PG09 source checkpoint](../PG06-PG09-CODE-CHECKPOINT.md). Native collection, server matching, merchant delivery and operational screens are now implementation drafts on `codex/pg06-pg09-code`. These edits have **no build/CI/database/browser/real-device evidence yet** by the owner's explicit code-first instruction. Any older PASS above belongs only to its referenced older commit.

Acceptance: OPEN. New migration 0014 is not applied; no live verification or deployment claimed. Outstanding checks and prerequisites are recorded in [the consolidated manual ledger](../../MANUAL-VERIFICATION.md). Preserve the difference between a fictional parser fixture and approved real receipt samples.

## Current branch audit follow-up — 2026-10-11 (NOT ACCEPTED)

[Required PG06–PG09 audit](../PG06-PG09-AUDIT.md); [verification-only draft PR #9](https://github.com/masharzy/ekmivo/pull/9); [single manual ledger](../../MANUAL-VERIFICATION.md). Baseline 513ae04, code fixes up to 24cb641a; later evidence commits do not prove an untested test result.

Signed raw-body merchant delivery, lease/retry/replay and receiver example source exists, but no disposable receiver or HTTPS test and no 0014 SQL execution occurred. Receipt notices are MISSING CODE; only payment.verified has a producer. Rotation, DNS/SSRF and crash E2E remain open.

Automated verification: source-authored tests/CI invocation are not PASS until a completed exact-commit run is recorded in the audit. New migration 0014 is NOT APPLIED. Real handset/provider/merchant payment, notices and deployment are NOT TESTED. Acceptance: **OPEN**.

## PG06-focused CI source context — 2026-10-11

The exact-source CI 38158507367 at 8aaf240 compiled signed webhook source and applied 0014 in disposable finance realms; no controlled HTTP merchant callback, SSRF adversarial receiver, lease crash/retry or notice channel was run. PG08 acceptance OPEN, no provider callback or delivery claim. See ../PG06-PG09-AUDIT.md.

## PG08 signed-webhook delivery implementation and isolated verification — 2026-10-12

**Exact verified source SHA:** `d3276dc0a8ef0c62c964a381078f0bec02a82054` on `codex/pg06-pg09-code`. [GitHub Actions CI 38165262343](https://github.com/masharzy/ekmivo/actions/runs/38165262343): **4/4 jobs PASS**. Go unit tests/race/vet, native Kotlin tests/debug build, Docker image builds, Next lint/TypeScript/OpenAPI/production build and isolated PostgreSQL financial regression. Log expressly records:

- `PG08 isolated webhook state machine PASS`: 2xx commit, terminal 403, retryable 408/429/500/network unknown, 1m/5m backoff with bounded jitter, stale/expired lease recovery, 8-attempt exhaustion, disabled endpoint, stable event-ID manual replay, and **payment verification unchanged after delivery failure**.
- `TestReceiverScopedTLSQueryAndTransactionalDedup PASS` and `PG08 merchant receiver PASS`: the **real Go merchant consumer handler** with a physically separate disposable merchant PostgreSQL DB, local TLS authoritative payment readback, raw-bytes HMAC/signature/key-ID/time validation, environment/workspace/payment amount/reference checks, durable event-ID dedup and one fulfillment, old-key overlap and expiry.
- Go test `TestPinnedSignedHTTPSDelivery` uses a real local TLS server with injected synthetic public DNS, checked pinned public IP, correct host/certificate/raw-body signature and header, rejected mixed public/private DNS, bad DNS and redirects. No outbound public Internet or real merchant callback was attempted.
- PG04–PG08 combined isolated finance smoke: **312 assertions total** across PG04/PG05/PG06/PG07/PG08, not 312 PG08-only tests. Migration 0014 ran twice on **disposable** independent sandbox/live PostgreSQL realms, not owner/production DBs. Normal application behavior is not simulated as live provider funds.

**Implemented corrections:** strict public-HTTPS/SSRF validation, public DNS validation and pinning, disabled proxy/redirect/follow, TLS certificate/host verification and response limits. Pg08_due/claim/finish now implement durable 60-second claim leases, rechecking realm/authorization, 8 attempts max including process crashes, terminal ordinary HTTP 4xx, 408/429/5xx/network retry, bounded exponential schedule and stale lease ACK rejection. Failed callbacks do not touch `financial_payments`. Key rotation is **prepare next once-visible key → explicit activate with old-key overlap up to 24h → emergency revoke previous**; PostgreSQL actions, operational Webhooks UI and synthetic SQL tests cover the states. Existing PG07 inserts `payment.verified` + initial webhook deliveries in its atomic financial transaction, with no manual paid shortcut. Merchant receiver code validates fresh current payment through the owned server API and transactionally stores event+fulfillment.

**Merchant example/documentation:** [Standalone setup, HMAC signature, real database consumer and rotation instructions](../../../examples/webhook-receiver/README.md); [merchant-owned schema](../../../examples/webhook-receiver/schema.sql). Tests are **local controlled fixtures**, not a public HTTPS receiver, actual customer notification, provider-verified funds or production traffic.

### PG08 gaps and release blockers — not accepted

1. **MISSING CODE / real customer receipt notices:** Verified customer consent/contact and a configured email/SMS/push delivery provider/channel do **not** exist yet. Public checkout polling or a merchant webhook is NOT a delivered customer receipt. Implement verified opt-in, consent withdrawal, retention, bounded notice retries and channel-owner E2E before acceptance.
2. **BLOCKED dependency / lifecycle producers:** `payment.verified` is implemented; `payment.exception`, `payment.expired`, `payment.reversed`, `refund.updated`, `invoice.paid` require their owning expiry/reversal/refund/invoice services (PG10–PG13). Do not fabricate unsupported lifecycle signals.
3. **MANUAL/EXTERNAL:** Actual operator-owned public HTTPS merchant receiver with permissioned sandbox credentials, real DNS/IP/cert, egress restrictions and secret rotation, key loss/recovery, real delivery retry/timeout and consumer authoritative query after PG06/PG07 approved real provider payment. CI uses only local TLS fixtures. No production deployment or real money.
4. **Operator policy:** Actual 24h receiver key overlap activation runbook, cross-region operational monitoring/alerts, retention/export/deletion/backup, on-call and user consent/privacy approval. Last-mile receipt notice and external transport remain open.

**Status:** PG08 webhook core source, automatic synthetic delivery, merchant receiver and dual-stage rotation **IMPLEMENTED + VERIFIED in isolated CI**. **PG08 full product acceptance OPEN** until notices/lifecycle/external and operator gates above close. One owner test pass goes into [MANUAL-VERIFICATION.md](../../MANUAL-VERIFICATION.md) and the full [PG06–PG09 audit](../PG06-PG09-AUDIT.md). Draft [PR #9](https://github.com/masharzy/ekmivo/pull/9) remains unmerged; production migration/deploy was not performed.
