# 2026-10-14 — Phone / Incoming / Refunds / Statements patch audit

Status: **SOURCE FIXES IN DRAFT PR; NOT PRODUCTION ACCEPTED.** Preserve all financial receipts, payment attempts, refund cases, and Android encrypted outbox rows. No fabricated invoices/customers.

## Real issue, root cause, and fixes

1. Multiple Android pairing attempts reported "revoked" even for a non-revoked phone. The Live financial workspace registry's entitlement_version was **1**, but the authoritative control source_version was **3**. Signed physical device configuration correctly rejected the stale projection (403), while Compose falsely called every 403 "revoked". The last active phone had no successful heartbeat. A forward-only, non-destructive **one-time live financial projection reconciliation to version 3** was applied through the existing `financial_sync_workspace` function. Server now labels stale projection as `503 PHONE_PROJECTION_STALE`, and new pairing issuance checks freshness first. Android distinguishes revoked from authorization mismatch, offers an explicit refresh, and unpauses only after server-signed configuration succeeds. **Physical handset reconnect and heartbeat NOT TESTED.** No phone was deleted or force-unpaired.
2. New phone ingestion writes `pg06_phone_forwarded`, but the old Incoming Receipts screen reads `pg06_transport`. Live DB counts at investigation: **4 physical forwarded, 0 legacy transport**, **4 receipt observations**. New `pg56_incoming_read` maintains tenant-scoped, status/date/method/account/search filter and page cursor across both sources. Go operations switch for `incoming` only. No claim of payment verification from transport alone.
3. Refund page had **one** late-SMS seller-managed request (**1000 BDT minor**, status `requested`) without a verified payment; `pg13_reports` omitted it by inner joining payments. `pg56_refund_summary` includes payment-linked and late-evidence cases, returns open-request and seller-reported money separately, and supports account/date filtering. Go report merges it with existing verified payment report; UI displays pending refunds separately from returned money.
4. Reconciliation UI embedded an identical Incoming Receipts table while statements DB count was **0**. Removed duplicate table and kept the dedicated merchant statement import/settlement functions and an explicit link to Incoming Receipts. Sidebar label now reflects statement-only content.
5. Live `pg10_documents` held **4 payment links and zero invoice/customer documents**. Those two empty states are truthful; changed copy to explain separate create flows. Payment Request versus reusable Payment Link clarified in EN/BN.

## Executed verification

- **PASS:** Additive SQL 0056 created in a preexisting **disposable Neon branch**, `br-gentle-hat-b35500zw`, for the independent Live test database using 8 transaction statements, with no customer-ledger mutation.
- **PASS (disposable SQL):** `pg56_incoming_read` returned 4 physical-phone receipt entries, with status shape and no unmasked receipt body. Follow-up filtered reads: matched **3**, cancelled **1**, bKash **4**, future date window **0**. `pg56_refund_summary` returned 1 `requested` case, open amount 1000 minor and seller-reported returned 0.
- **PASS (live metadata only):** refreshed the authenticated control projection source and advanced a single stale Live financial registry row **monotonically from 1 to 3**. Postflight: active phone still claimed, not revoked, no heartbeat yet.
- **NOT RUN:** Go tests, Next.js compile/lint, Android Gradle, signed device HTTP test, automated build and release. GitHub Actions workflow at PR creation showed four failure conclusions but no job steps/log blobs; this is an execution blocker, **not a source test pass or established failure**.
- **NOT APPLIED TO PRIMARY FINANCIAL SCHEMA:** migration 0056 was tested in a disposable realm only. An attempted production schema-tool call was stopped by safety checks. Do not deploy Go report/receipt changes before 0056 exists in both production Sandbox and Live realms.
- **NOT DEPLOYED:** GitHub PR is draft pending code verification and ordered SQL/API/web/Android deployment.

## Remaining release checks

- [ ] Run 0056 on both authorized financial realms via the normal migration owner after backup and review; preserve existing migration sequence and audit.
- [ ] Go `go test ./...`, Kotlin `:app:testDebugUnitTest :app:assembleDebug`, web TypeScript/production build and SQL query negative tests at exact branch commit.
- [ ] Cross-tenant negative SQL, authorized role grants and pagination/filter/detail tests for both legacy and physical streams.
- [ ] Device install/upgrade without deleting the encrypted outbox, verify signed configuration, RECEIVE_SMS, initial heartbeat, offline retry, durable ACK, no duplicate payment, wrong parser/actual cancelled receipt.
- [ ] Browser EN/BN light/dark for Incoming Receipts (4 correct rows), Reports requested late refund (1), truthful empty invoices/customers and independent statement UI.
- [ ] Production API/web/Android deploy only after schema, then audit live health logs, final owner acceptance.

Never label one-time projection repair as evidence that every new phone, updated APK, or payment provider has passed an end-to-end test.
