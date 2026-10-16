# Customer number recovery and dashboard navigation — 2026-10-16

## Customer root cause

`pg64_document_catalog` derives checkout-payer customer IDs from a 64-prefixed MD5 UUID, without forcing RFC UUID version/variant bits. The general Go UUID validator rejected existing valid PostgreSQL catalog identities. Both the list recovery selection and detail handler rejected those IDs before full-contact recovery; this was not an encryption-storage requirement.

The fix admits the historical 64-prefixed UUID format only for customer document IDs and only selects checkout_payer rows for recovery. Workspace/payment/invoice/link UUID validation stays strict. Tenant/realm scope, owner/admin authorization, encrypted storage and verified evidence relationships remain intact. Existing IDs are preserved; no migration.

Privacy-safe lookup/decryption failure diagnostics record stages and errors, never phone numbers, ciphertext or secrets. Temporary per-request stage counters were removed after identifying the ID issue. Detail refresh errors now surface inline and through the existing dashboard toast observer.

## Dashboard behavior

Workspace switcher uses one full-width grid column; the obsolete empty settings-button column no longer narrows the picker.

Removed the route loading boundary and its page skeleton. DashboardContent awaits authorized, no-store Go GETs before returning the destination content. Initial data is scoped to that request and provided to client screens so their first render contains real records, real empty results or an explicit error. Existing React transitions retain the old page and show the existing horizontal progress line while the route is pending. Client filters, refreshes, drafts, mutations and device polling remain available. Transaction deep-link search/date filters are applied to the initial request, including Dhaka-to-UTC conversion.

Supported initial reads: overview, transactions/SMS data, customers/invoices/payment links, payment requests, devices/methods, refunds, reports, billing, team/settings/help. API keys already load their list on the server. Unconnected modules do not fabricate a source. Public checkout and Android source are unchanged.

## Automated evidence

- Go full test suite passed; final customer selection/UUID regression package passed after extracting the pure selection helper. `go vet ./...` passed.
- Regression covers non-RFC catalog customer IDs, strict validation retained for invoices/links/payments, malformed/non-customer IDs rejected, list selection and full-phone response mutation.
- Existing encrypted contact/SMS tests cover wrong keys/AAD, ambiguous parsers and unauthorized roles.
- Nine dashboard initial-data tests passed: wait for all sources, no cross-tenant/realm cache, session required, API failures not converted to zero, nine overview sources, Live invoice sources, unsupported modules, transaction filter/time semantics and full-number first render without skeleton/client fetch.
- TypeScript and webpack production build passed. Final default production compiler and lint outcomes are recorded after completion below.
- Production Neon inspection was read-only: existing verified phone evidence and pg66 read functions confirmed; customer catalog source and UUID validation mismatch confirmed. No Docker, database fixtures or migrations were run in production.
- Browser automation tests were not run. Browser tab inventory found no accessible signed-in session; no credentials were read from a browser.

## Remaining verification

Owner-session full-number display and the visual absence of a navigation flash remain manual acceptance checks, including light/dark, narrow sidebar and keyboard navigation. Source tests are not a claim that an authenticated production screenshot or new financial payment flow was verified.

Final default Turbopack production build passed (compile, TypeScript, page-data collection and static generation). Final lint passed with 0 errors and 32 existing warnings. Backend customer-ID fix 4156d8f is confirmed live on Render deployment dep-db8q3epsrm7s739ttdqg.

Final built-server HTTP smoke passed all 16 unauthenticated login/route checks after restarting the default-compiler preview.
