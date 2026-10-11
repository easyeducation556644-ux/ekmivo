# PG06–PG09 implementation / verification audit

Date: 2026-10-11. **PG06, PG07, PG08 and PG09 acceptance remain OPEN.**
No production deployment, money movement, migration 0014 execution or device/provider test was performed as part of this audit. Earlier successful PG04/PG05 tests cannot verify this newer source. Do not merge this draft or infer production safety.

## 1. Source identity and changed files

Repository: masharzy/ekmivo; branch: codex/pg06-pg09-code. Baseline main: 9e0e4d3; original checkpoint: 513ae04e8a3a8058f308cb935a57400e80c6d8e5. Follow-up source corrections: 7a585889 (parser), 6143506f (test), ede0f0ca (test regex), 24cb641a (live-parser pairing check). Subsequent documentation commits may advance branch HEAD. Verification-only [draft PR #9](https://github.com/masharzy/ekmivo/pull/9) triggers CI without merge or deploy.

- PG06 (X08, S31): backend/internal/deviceevidence/parser.go, parser_test.go, backend/internal/checkout/receipt_pipeline.go; apps/mobile/app/src/main/java/com/ekmivo/mobile/receipt/ReceiptCapture.kt, ReceiptStore.kt, ReceiptSyncWorker.kt, ReceiptSetupActivity.kt and other receipt files. Fixes: strict Bengali/Arabic/Persian numeral parsing without relaxing decimal bounds; explicitly refuse SandboxOnly parser enrollment in live.
- PG07 (P02,P03,X08,S32): backend/internal/financial/pipeline_worker.go, matching.go, infra/migrations/0014_pg06_pg09_receipt_pipeline.sql (matching, allocation and domain event functions).
- PG08 (P04,F06,S34,S45): backend/internal/merchantwebhook/delivery.go and tests, backend/cmd/webhook-receiver-example/, examples/webhook-receiver/, SQL durable deliveries.
- PG09 (D01,P03,O01,S03,S31,S32,S45,S46): apps/web/src/components/payment-operations.tsx, payment-overview.tsx, new payment routes, Next proxy and CSS; SQL pg09_read/pg09_action. Original checkpoint has full source inventory. Migration 0014 is NEW and NOT APPLIED.

## 2. Each remaining checklist row: explicit status and evidence

Allowed statuses: IMPLEMENTED+VERIFIED, IMPLEMENTED+UNVERIFIED, MISSING CODE, BLOCKED DEPENDENCY, MANUAL PENDING. New tests authored without an observed passing run are NOT counted as verified.

| ID | Requirement | Status | Evidence / exact gap |
|---|---|---|---|
| SH01 | Go compile/test/race/vet | IMPLEMENTED+UNVERIFIED | Existing CI configured; newest exact-source results need capture |
| SH02 | Next lint/TypeScript/build | IMPLEMENTED+UNVERIFIED | Existing CI configured; newest exact-source results need capture |
| SH03 | Kotlin test/debug APK, permission/manifest/OEM | IMPLEMENTED+UNVERIFIED | CI configured; no physical device check |
| SH04 | OpenAPI parsed, schema/handler/generated-client conformance | IMPLEMENTED+UNVERIFIED | Existing openapi-check script; generated/client conformance unverified |
| SH05 | 0014 empty/prior schema, two isolated realms, RLS/grants/rollback | IMPLEMENTED+UNVERIFIED | Only SQL static inspection; not executed against disposable DB |
| SH06 | PG04/PG05 regressions, wrong tenant/realm, revoked projection | IMPLEMENTED+UNVERIFIED | Prior runs older SHA; current-branch pass unconfirmed |
| SH07 | Lock/deadlock/bounds/error mapping, secret-safe logs and actor audit | IMPLEMENTED+UNVERIFIED | Selective source review only; exhaustive review missing |
| SH08 | Chronological stable time-based cursor under concurrent inserts | MISSING CODE | pg09_read orders by descending UUID; not chronological |
| SH09 | Ciphertext/device/queue/event/delivery retention/export/delete, backup/alerts | MISSING CODE | No verified complete cross-store lifecycle and key recovery |
| SH10 | Current exact-source CI and skipped tests recorded | MANUAL PENDING | See run ledger in section 3; cancelled is not PASS |
| 06A | Consent + restricted SMS/notification + pre-save filtering | IMPLEMENTED+UNVERIFIED | Native ReceiptCapture and setup source; not handset tested |
| 06B | Keystore one-use pairing, device source/account/SIM binding | IMPLEMENTED+UNVERIFIED | SQL/Go/Kotlin source; genuine SIM/OEM and lost-response recovery unverified |
| 06C | Approved parser, full payer, original time, precise minor units | IMPLEMENTED+UNVERIFIED | Fixture and new numeral tests; no genuine approved provider format |
| 06D | Tamper/stale/replay/sequence/crash ACK and offline retry | IMPLEMENTED+UNVERIFIED | Some source tests, no complete signed ingress SQL+device suite |
| 06E | Queue overflow, poison event and operator health alert | MISSING CODE | ReceiptStore.enqueue silently returns false at 500 queued |
| 06F | Actual incoming source, dual SIM, reboot/force-stop/permission tests | MANUAL PENDING | No consented phone/provider evidence |
| 07A | Five-field auto-verification + atomic payment/allocation/event | IMPLEMENTED+UNVERIFIED | SQL pg07_match + River code; no current isolated DB run |
| 07B | Exact boundaries, partial/over/advance, cancel and late sync | IMPLEMENTED+UNVERIFIED | Some SQL decisions; full reconciliation/race matrix absent |
| 07C | Duplicate identity, wrong realm, concurrent worker, rollback | IMPLEMENTED+UNVERIFIED | Not tested on disposable finance DB for 0014 |
| 07D | True live receiving instructions and live checkout issuance | BLOCKED DEPENDENCY | PG05 checkout is SANDBOX ONLY: do not send real money |
| 07E | Real consented receipt automatically confirms and triggers callback | MANUAL PENDING | Physical device and controlled merchant receiver required |
| 08A | Raw-body HMAC, HTTPS SSRF-safe bounded HTTP | IMPLEMENTED+UNVERIFIED | merchantwebhook source/unit test; thorough DNS/IPv6/redirect test pending |
| 08B | Durable lease/retry/replay/rotation/crash behavior | IMPLEMENTED+UNVERIFIED | SQL pg08_* and worker; no real isolation/receiver test |
| 08C | Receiver transaction: event dedup + fulfillment + authoritative payment query | IMPLEMENTED+UNVERIFIED | Example command and schema, not run |
| 08D | Consent-based receipt notice delivery | MISSING CODE | Polling checkout is not a notice channel |
| 08E | Expiry/exception/refund/reversal/invoice lifecycle event producers | BLOCKED DEPENDENCY | Only payment.verified producer exists; later owning services required |
| 08F | Controlled public merchant HTTPS callback + receipt notification | MANUAL PENDING | No owned receiver/channel E2E run |
| 09A | Real payments/incoming/devices/accounts/webhooks/events APIs + screens | IMPLEMENTED+UNVERIFIED | Go/SQL/Next components exist, not browser-accepted |
| 09B | Date filters, provenance, reason text, stable cursor, scoped search | IMPLEMENTED+UNVERIFIED | SQL filters; loaded-only search and UUID time-order gap |
| 09C | Owner/admin/viewer, EN/BN, Light/Dark/System, 320–desktop, keyboard | IMPLEMENTED+UNVERIFIED | React/CSS source only; no current-branch visual/role sweep |
| 09D | Refund/public receipt/full invoice/export action lifecycle | BLOCKED DEPENDENCY | PG10/PG11/PG13; must remain honest/unavailable |
| 09E | Actual backend error/empty/forbidden/offline, switch/deep link/draft flows | MANUAL PENDING | No scoped authenticated PG09 browser session on branch |

## 3. Commands, runs, environment, and simulations

Verification PR: [#9](https://github.com/masharzy/ekmivo/pull/9). Observed early CI runs: [38156076191](https://github.com/masharzy/ekmivo/actions/runs/38156076191) and [38156100792](https://github.com/masharzy/ekmivo/actions/runs/38156100792) were CANCELLED on superseding commits; [38156128600](https://github.com/masharzy/ekmivo/actions/runs/38156128600) was IN PROGRESS when first inspected, later cancelled by a new edit. A cancelled run is neither a pass nor a diagnosed test failure. Check most recent exact head and append actual outcomes. Not all testing tasks below were independently run.

Handoff commands: backend: go test ./...; go vet ./...; apps/web: npm run lint; npx tsc --noEmit; npm run build; node scripts/openapi-check.mjs; apps/mobile: Gradle :app:testDebugUnitTest :app:assembleDebug. CI may execute a subset; note omissions. Database smoke must use disposable *three separate* control/sandbox/live instances, with restricted roles, explicit 0014 migration gate and role/security/concurrency/rollback/restore assertions. No 0014 migration smoke was run here. No PG09 browser backend setup, real Android phone, real provider/account or HTTPS receiver was used.

**Simulation boundaries:** examples/receipt-parser/sandbox-fixture.json is FICTIONAL SANDBOX-ONLY; automated fixture receipt/PG04/PG05 simulated checkout/isolated browser tests are not genuine provider receipts. No claim is made about bKash/Nagad/Rocket signatures, delivery confirmation, device collection, production queue throughput, real payment or customer notices. No secrets, payer numbers or message bodies belong in CI/evidence.

## 4. Bugs fixed and remaining issues

| Severity | Location | Reproduction / actual | Expected / next action |
|---|---|---|---|
| Fixed source, test not yet confirmed | deviceevidence.MinorUnits and NormalizeNumber | Bengali/Arabic/Persian amount digits previously failed ASCII-only matcher | Normalize specified decimal numeral scripts before exact bounds, new fixture test; capture passing exact-SHA CI |
| Fixed source, integration not yet confirmed | checkout.HandleOperations (device pair) | An approved SandboxOnly fixture could be selected in live pairing | Reject at enrollment, not only on Parse |
| HIGH | ReceiptStore.enqueue / ReceiptCapture.accept | When count reaches 500, accepts no new event with no durable overflow signal | Expose persisted overflow/queue-error health, alert and recovery test |
| HIGH | pg09_read pagination | ORDER BY UUID DESC produces arbitrary rather than chronological history | Use stable timestamp+ID keyset, test inserts/page boundaries |
| HIGH / release blocker | 0014 migration/functions | No actual isolated SQL/role execution verified | Implement 0014 disposable migration harness, run RLS/races/rollback before deploy |
| HIGH | PG07 payment matching | SQL helper reviewed, concurrent transactional flow not run | Test independent mismatches and worker race in distinct finance DBs |
| MEDIUM | PG09 web actions | No source-matched authenticated browser/device verification | Run owned isolated browser and fix observed defects |
| RELEASE BLOCKER | Real provider samples/live checkout/webhook/notice | Missing external integration or later feature producers | Keep manual/dependency OPEN, never mark as tested |

## 5. Missing code vs external vs automated vs human-only

- **Missing code:** quota/poison-event durable health/alerts, stable chronological keyset, full privacy retention/export/deletion/backup, configured receipt notice channel; downstream lifecycle event producers and PG10/11/13 financial actions are not fabricated.
- **External/configuration:** consented original provider receipts with full payer and original transaction time, approved parser rule/SIM/package binding, supported Android permission/OEM routes, physically isolated finance databases, restricted projection credentials and durable encryption-key backups, controlled merchant HTTPS endpoint, customer consent/contact notice service.
- **Automated gap:** exact-commit build/lint/test/vet, OpenAPI/client parity, isolated 0014 migrate/rerun/RLS/grant, Go signed-ingress negatives, PG07 concurrency/rollback, PG08 SSRF/retry/rotation, PG09 backend/render/roles, cross-store retention and old PG04/PG05 regressions.
- **Manual-only:** approved phone(s), SMS+notification receipt, dual SIM, reboot/force-stop/offline, permission loss/restoration, device revocation/re-enrollment, controlled merchant callback, actual notice delivery, responsive 320/768/1024/desktop EN/BN Light/Dark/System keyboard/a11y/roles, operator rollout and monitored PG16 cohort. Consolidated ledger: docs/MANUAL-VERIFICATION.md.

## 6. Safe migration, deployment and recovery

Never deploy or merge for a completion label. Do not touch existing migrations or secrets. Review additive 0014 and PG05 function replacement with schema/privilege owner. On **disposable isolated** control, sandbox-finance and live-finance DBs, apply baseline 0001–0013 to their proper realms, then operator-gated 0014 to BOTH FINANCE DBs ONLY; control must reject. Test repeated coordinator behavior, least-privilege reader/worker grants/FORCE RLS, projection, cross-tenant and pool reuse, competing receipt/intent operations, replay/idempotency, crash and lease recovery. Do not apply 0014 to production until SQL and signature/client/build/browser/device evidence passes. For any eventual authorized rollout, back up data and encryption key with off-repo recovery custody, stage an additive forward recovery plan; 0014 is not safely reversible by blindly dropping immutable evidence. On incident stop ingestion/drain with operator-controlled reconciliation, preserve committed evidence/outbox and monitor gaps. PG05 customer checkout must retain sandbox do-not-send-money instructions.

## 7. Exact next tasks, dependency ordered

1. PG06: collect authorized genuine receipt feasibility samples; complete queue overflow/permission/lost-pairing fixes, signed ingress tests; obtain passing exact-head Go/Kotlin/OpenAPI CI. Do not enable fictional rules live.
2. PG07: disposable 0014 schema/roles migration and full five-field window/ambiguous/cancel/partial/late/concurrent SQL tests including PG04/PG05 regression; repair blockers before deployment.
3. PG08: durable delivery lease/replay/rotation/SSRF and controlled receiver E2E; implement notices after channel/consent available, document dependent lifecycle producers.
4. PG09: stable time-based pagination, real filtered/provenance/role/UI states in isolated browser, responsive EN/BN and theme/a11y; keep later refund/receipt/invoice dependencies unavailable.
5. Update per-PG evidence/status and one manual ledger with the observed latest exact-source outcomes. Complete a single combined owner/provider/device/browser/operator test session, never substitute simulations.

**Bottom line:** code checkpoint plus targeted source fixes; the four PGs have not met acceptance or verified real monetary functionality.
