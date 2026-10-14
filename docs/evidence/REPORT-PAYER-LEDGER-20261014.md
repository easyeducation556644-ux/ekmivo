# Reports: actual payer number + no duplicate Overview graph — 2026-10-14

## User correction
- Actual payer/sender number MUST be visible to the authorized seller in Reports. It is not the receiving account, SMS sender label, masked suffix or invoice-linked contact.
- Reports is transaction-level financial records, filter/export/reconciliation; Overview alone keeps the compact payment-volume graph. No second trend graph in Reports.

## Implementation
- Existing verified payment rows join to their authoritative matched receipt/physical phone observation. Database stores payer as HMAC plus AES-GCM contact JSON; there is no plaintext payer field. Historical records missing encrypted phone contact display “Not recoverable” instead of a guessed/masked number.
- New additive 0057 pg57_report_payer_ledger is READ-ONLY, uses pg06_scope + financial workspace/environment, 366-day bounded date/account filter, stable (verified_at,id) keyset pagination with 25 items and cursor. Returns authenticated payer contact ciphertext to the Go API, not to the browser; finance_reader may only EXECUTE the controlled SECURITY DEFINER function.
- Go /reports/ledger requires a signed-in payments-read **owner or admin** session and rejects editor/viewer/merchant API keys with 403. Decrypts actual payer contact JSON using existing Pipeline.Key and matching AAD, validates a real normalized full payer number, emits the number only in the authorized response; ciphertext never reaches React. Failure to decrypt fails closed.
- Reports removes all payment-volume chart sections. Main focus: authorized Verified Payments Ledger table (reference, full payer number, method, BDT amount, original payment time, verified time), Load More, dedicated CSV export of explicitly loaded rows, source-error/retry. Preserves comparison, method/account/customer/refund and allocation analysis as numeric tables.
- Existing summary CSV deliberately distinct from the owner/admin payer ledger CSV; user-facing labeling makes the distinction explicit. Query is bounded. Not a fake “export every transaction” promise.
- No payment/refund write, no SMS parser or checkout matching change, no plan or infrastructure upgrade.

## Verification observed
- Live financial database before migration: 3 verified payments; **all 3 had an encrypted payer_cipher**, validated by read-only joins (no contact plaintext queried).
- 0057 SQL transaction applied successfully to both LIVE and SANDBOX financial realms. Sandbox scoped read returned 0 rows with proper JSON array and NULL cursor. Live scoped read returned 3 verified rows with 3 encrypted payer contacts; next cursor NULL; finance reader function privilege confirmed.
- Next/Vercel preview build and Go owner/admin HTTP end-to-end still need release verification. Vercel READY does not independently certify Go compilation, live PII decrypt or browser permissions.

## Manual pending
- [ ] Signed-in owner/admin Live Reports shows actual complete phone number (not receiving, not suffix) for verified physical SMS records, with numbers matching consented original receipt.
- [ ] Owner/admin account/date filters, pagination, no-data and CSV actual payer number export. Legacy cryptographically unrecoverable numbers labelled unavailable without guessing.
- [ ] Editor/viewer and merchant API key cannot access /reports/ledger; wrong workspace/realm, expired cookie, 401/403/422 and rate limiter tested.
- [ ] Verify no ciphertext, OTP, evidence plaintext or full phone in logs, analytics, summary export or unauthorized endpoint.
- [ ] Check EN/BN, Light/Dark, mobile scroll table and keyboard, print, refund ledger semantics, and explicit difference from Overview.
- [ ] Verify both Go Render and Vercel production deploy on exact merged commit; authenticated API test required.

## Follow-up: Detailed breakdown payer visibility (isolated branch)

- Reports had two disconnected report surfaces: full verified payer numbers in a separate ledger above, but the **Detailed breakdown** only had receiving account suffixes and invoice-linked customers. The latter must not be presented as actual verified payer identity.
- Move the existing already-authorized `PaymentReportLedger` into a new **Detailed breakdown → Payers** tab, selected by default only for workspace Owner/Admin. Render the tab conditionally; Viewer/Editor cannot call the full-number endpoint from the UI, and server role checks remain in place.
- Rename **Accounts** to **Receiving accounts** and **Customers** to **Invoice customers** to distinguish funds destination, invoice relationship, and actual SMS payer.
- Keep Payers API independent of the summary report request; a summary API failure does not hide verified payer records. Ledger filters, pagination, print/loaded-only CSV, absent-cipher labels, encryption boundary and server-side authorization are unchanged. No financial migrations or API changes.
- Confirmed Vercel preview for branch commit `722425461f61fc5cd5adcc395969e69ff31696db`: **READY**; Next.js build/typecheck passed. Actual signed-in merchant browser number verification, 320px responsive inspection and role tests remain manual-pending.
- **Not merged to main.** Owner explicitly requested a separate branch.

