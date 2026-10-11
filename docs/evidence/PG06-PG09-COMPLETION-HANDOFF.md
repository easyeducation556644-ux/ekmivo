# PG06–PG09 completion and audit handoff

Date: 2026-10-11. Branch: `codex/pg06-pg09-code`; baseline main `9e0e4d3`.
All new code is UNVERIFIED. No PG06–PG09 acceptance, deployment or migration application is claimed. This checklist supplements the canonical plan, not a replacement plan. See [source checkpoint](PG06-PG09-CODE-CHECKPOINT.md), per-PG evidence and `docs/MANUAL-VERIFICATION.md`.

## Instructions for the next agent

Read AGENTS.md, nested instructions and its ordered canonical documents. Inspect this branch and actual code before editing. Preserve secrets, existing migrations and concurrent changes. Work PG06 → PG07 → PG08 → PG09, fix as much as possible, self-test available checks and record blockers without deleting required scope. Do not wait for human-only tests; list them in the consolidated manual ledger. No local Docker or long terminal waiting on the owner's laptop. Use disposable isolated DBs/CI for database tests. Never apply an unreviewed migration to production. Keep Android in the same Kotlin/Compose APK and limit UI to receipt setup/health.

Before stopping, produce the audit below even if work is incomplete. Do not report a completion percentage without a enumerated denominator. Never equate source written, simulated data or old CI with a verified feature.

## Shared source review and automated checks — all pending

- [ ] Go compilation, unit tests and vet; fix parser, checkout, worker and receiver errors.
- [ ] Next lint, TypeScript and production build; check all new routes and hooks.
- [ ] Kotlin unit tests and debug APK assembly; validate manifest, permissions, WorkManager and Java regex compatibility.
- [ ] Parse/validate canonical OpenAPI; reconcile request/response/error schemas with real handlers and generated clients.
- [ ] Review migration 0014 using the existing coordinator: empty/prior schema, both isolated financial realms, role grants/FORCE RLS, rollback or documented irreversible rollout/recovery, rerun behavior and schema conflict handling. Check dynamic PG05 function replacement against expected source. Control DB must reject this migration.
- [ ] Extend and run PG04/PG05 regression harnesses; wrong tenant/realm/no context, pool reuse, viewer mutation, revoked membership/key/session and fresh entitlement projection.
- [ ] Review lock order/deadlocks, error mapping, bounds, transaction rollback, actor auditing and secret/PII log exclusion.
- [ ] Review UUID cursor ordering versus chronological history; fix if UX requires time order and verify stable pagination under concurrent inserts.
- [ ] Add retention/export/deletion coverage for new ciphertext, device/transport/event/delivery stores and Android queue; document key backup, rotation/recovery and operator alerts.
- [ ] CI evidence must identify the exact tested commit and skipped integration tests. No current checkpoint tests have been run.

## PG06 — receipt collection

Remaining source review/fixes:
- [ ] Obtain consented real incoming receipt samples; approved, versioned parser rules must cover real sources. Current fixture is fictional and sandbox-only. Missing/full masked payer and absent original time must become safe exceptions, never inferred facts.
- [ ] Verify receiving-account ownership/binding, actual SIM subscription IDs across supported Android versions/OEMs, notification package binding and source authenticity limitations. A device signature alone does not prove a receipt is true.
- [ ] Review pairing expiry/single use/self-key proof, lost-response recovery, duplicate enrollment, account disable, revoke and consent withdrawal. Define safe user recovery without accidental collection.
- [ ] Review queue quota/overflow visibility, failed/poison events, permission loss and health alarms; expose required state rather than silent data loss.
- [ ] Review Android byte-identical signing, encrypted persistence, history authorization, scheduling and cleartext/backup exclusion.

Automated tests:
- [ ] Parser full/minute timestamp, timezone, exact decimal, incoming/debit/reversal/OTP, missing fields, malformed UTF-8/input bounds, source/method mismatch and sandbox fixture rejected in live.
- [ ] Tampered body/key/time/realm/account/enrollment, replay, same event changed bytes, duplicate sequence, offline reordered sequences, revoked device and rate limiting.
- [ ] Durable ACK only after commit; crash before/after commit and lost ACK preserve idempotency and no orphan records.

Real-device manual gates:
- [ ] Consented physical phone(s), actual incoming provider messages, dual SIM, notification/SMS paths, Keystore signature and original timestamp/full payer correctness.
- [ ] Offline reconnect, reboot, app upgrade, permission revoke/restore, force-stop gap, quota and pairing-response-loss recovery. Record Android/OEM versions and measured collection limits; no uninterrupted force-stop promise.

## PG07 — automatic matching

Remaining source review/fixes:
- [ ] Trace actual receipt → observation → matcher → payment/allocation/domain event/delivery row through real SQL, not just pure helper tests.
- [ ] Confirm every route to financial mutation enforces complete five fields, incoming direction, correct policy/currency/source and fresh control authorization.
- [ ] Review same-bucket serialization/lock ordering, full minute interval containment, cancellation/expiry/late-sync semantics, duplicate provider identity with conflicting evidence and already-funded guards.
- [ ] Review exact advance, partial/under/over payments, ambiguity and reconciliation reason semantics against canonical scope. Do not create a human mark-paid shortcut.
- [ ] Resolve production receiving instructions/live intent issuance dependency: PG05 checkout is still sandbox-only; optional live operations do not constitute live checkout.

Automated/database gates:
- [ ] Independently mismatch payer/time/amount/account/method; masked/missing fields, equal amounts across customers, reused identity across intents, wrong realm and currency.
- [ ] Time window edges, second/minute uncertainty, original time vs upload time, late sync, cancel/expiry races, partial/overpayment and candidate ambiguity.
- [ ] Competing workers/attempt issuance, repeated transport/reprocess, crash and rollback: exactly one accepted mutation, no over-allocation, no double payment/event/delivery; paid status cannot be client-forged.

Manual/E2E gates:
- [ ] Actual consented provider receipt uniquely matches the intended payer/account/time/amount/method, automatically confirms and schedules callback without customer TrxID, screenshot or routine approval.

## PG08 — merchant delivery

Remaining source review/fixes:
- [ ] Implement required receipt notice with consent/contact and configured delivery channel; current checkout polling is not receipt-notice delivery.
- [ ] Inventory all documented webhook events. Only payment.verified currently has a producer; connect exception/expiry/refund/reversal/invoice lifecycle producers when their owning services exist. Keep dependencies explicit.
- [ ] Validate rotation overlap/recovery semantics, encrypted key handling, stable event IDs and new delivery IDs; review worker lease/timeouts and platform budgets.
- [ ] Complete developer/API examples and error/retry/rotation/query/replay guidance against actual contract; run merchant receiver example with its own disposable DB and real API query.

Automated gates:
- [ ] Raw bytes HMAC, wrong secret/key ID/signature/timestamp, altered event/delivery IDs, wrong workspace/environment/version, duplicate/reordered event and old-key overlap expiry.
- [ ] SSRF DNS rebinding/private/metadata/IPv4-mapped/IPv6/redirect/credentials/proxy cases; DNS failures, slow receiver, large response, TLS errors and bounded time/body.
- [ ] Worker crash after send/before completion, lost receiver response, expired lease, concurrent claims, retries/max attempts, replay and disabled endpoint. Failed callback never undoes verified funds.
- [ ] Merchant persists dedup and fulfilment work atomically, queries authoritative payment, rejects amount/reference mismatch and duplicate fulfilment.

Manual gates:
- [ ] Public controlled merchant HTTPS receiver: real signed receipt-to-payment callback, retry and rotation; notice delivery through actual configured channel. Simulated receiver results remain labelled simulated.

## PG09 — dashboard and customer checkout

Remaining source review/fixes:
- [ ] Compare every named canonical screen with actual routes/actions: Overview, Payments/Requests/Incoming detail and comparison/provenance, Devices, Receiving accounts, Webhooks/deliveries, Events. Record any missing fields/actions explicitly.
- [ ] Finish server filters where promised, search scope, pagination and timestamps (original transaction, received, verified, delivered separately); correct unsupported lifecycle statuses and misleading zero states.
- [ ] Review exports, public receipt/refund/invoice actions against PG10/11/13 dependencies; distinguish dependency-unavailable from completed functionality.
- [ ] Complete EN/BN labels and readable safe reasons, Light/Dark/System, Hind Siliguri, role masking, deep links, switching, drafts and once-visible-secret behavior.
- [ ] Review live checkout integration as an OPEN prerequisite, retain sandbox do-not-send-money messaging until real live issuance is implemented and verified.

Browser gates using actual isolated backend data:
- [ ] Authorized list/detail and every available action; loading/error/empty/success/forbidden/offline/source-unavailable states.
- [ ] Owner/admin/viewer, wrong tenant, removed membership, refresh/deep links, product/business/environment switching with no stale data or cross-realm draft leak.
- [ ] 320/768/1024/desktop, keyboard/focus/Escape/dialogs, unsaved drafts, secret never persisted, full EN/BN + theme modes and stable sidebar/page skeleton behavior.
- [ ] UI reprocess never marks paid manually; device revoke/rename/pair, account enable/disable, endpoint create/rotate/disable and delivery replay reflect real API state.

## Required final audit from next agent

Create `docs/evidence/PG06-PG09-AUDIT.md`, link it from AGENT-HANDOFF and per-PG evidence. Include:

1. Exact source commit/branch and baseline; changed files and scope IDs per PG.
2. Each checklist row: IMPLEMENTED+VERIFIED / IMPLEMENTED+UNVERIFIED / MISSING CODE / BLOCKED DEPENDENCY / MANUAL PENDING, with evidence.
3. Commands, actual outcomes, CI/run references, skipped tests, disposable DB/browser/device setup and simulation labels. Never include secret values, raw messages or full payer numbers.
4. Bugs found/fixed; remaining bug severity, file/function, reproduction, expected vs actual and suggested next action.
5. Separate code gaps, configuration/provider/device blockers, automated verification gaps and manual-only gates; dependencies/owner needed for each.
6. Safe migration/deployment/rollback instructions after verification. Do not merge/deploy just to obtain a completion label.
7. Exact recommended next tasks in dependency order. Update IMPLEMENTATION-STATUS, per-PG evidence and one MANUAL-VERIFICATION ledger. Mark a PG accepted only when its actual required gates pass.

Owner will forward this audit when usage resets so remaining implementation/verification can resume from evidence rather than repeating work.
