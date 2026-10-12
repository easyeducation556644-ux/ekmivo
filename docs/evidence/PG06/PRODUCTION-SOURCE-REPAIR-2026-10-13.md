# Production source repair — 2026-10-13

Render deploy dep-db6i22p5efls73dm7ndg was live at d56a30d, with physical-phone
handlers. Both isolated financial databases lacked pg06_phone_list and
pg06_phone_account_cipher. Applied unchanged additive 0045 from that commit
through the existing guarded financial migration coordinator using realm owners.

Restricted reader tests then failed with SQLSTATE 42804: the cipher function
declared display_suffix text but selected financial_receiving_accounts.char(4).
Added 0046_pg06_account_cipher_text.sql with an explicit text cast. Applied it
through an optional repair-file branch in the same coordinator after its
owner/realm/prerequisite checks. Existing grants, PII encryption and data retained.

After repair, real restricted-role transaction-scoped queries passed in both
realms: pg06_phone_list and pg06_phone_account_cipher. Sandbox account count 0;
live account count 1 for the authorized owner workspace. No account values,
credentials, SMS bodies or tokens recorded. No API redeploy required for SQL fix.

Still pending: authenticated production HTTP/browser refresh and receipt-device
capture with approved real parsers. Database read success is not proof of actual
payment matching/webhook delivery. Last known parser configuration was empty;
do not fabricate approval or receipt formats to clear this separate gate.
