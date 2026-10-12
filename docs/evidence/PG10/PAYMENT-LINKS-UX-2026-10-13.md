# Payment links UX refresh — 2026-10-13

Implementation: dedicated payment-link cards and primary create action;
loaded-result status filters; amount/verified received/expiry hierarchy;
copy/preview/edit/publish/archive actions; archive confirmation; guided empty
states; advanced checkout configuration disclosure; focus and scroll to editor.
Uses existing document APIs, versions, idempotency and draft navigation guard.
Invoices/customers retain their original behavior. Filters explicitly indicate
loaded-result scope when pagination remains. No fabricated totals or live evidence.

Checks: targeted ESLint passed; final TypeScript no-emit passed; git diff
whitespace check passed. New changes are local; no deploy was triggered.

Manual pending: authenticated live browser create/save/publish/copy/preview/edit/
archive; viewer restrictions; source unavailable/offline; 320/768/1024/desktop,
keyboard, EN/BN and Light/Dark/System. Verify invoice/customer regression smoke.
This report does not close PG10 financial or production acceptance.
