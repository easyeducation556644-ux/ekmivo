# Receipt email transport and recovery — PG08

This is customer email notice code, separate from merchant webhooks and from financial verification. It never changes payer identity or marks a payment paid. Optional checkout consent is consent to email use, not an opt-in to automatic payment matching.

## Operator configuration

After isolated migration and regression checks, configure the API and realm worker:
- `PG08_NOTICE_ENABLED=true`
- `PG08_SMTP_HOST`, `PG08_SMTP_PORT`: deployment-owned SMTP server using **implicit TLS** (normally port 465). STARTTLS/plaintext fallback is intentionally unsupported.
- `PG08_SMTP_USERNAME`, `PG08_SMTP_PASSWORD`, `PG08_SMTP_FROM`: use secret management; no values in code/evidence.
- Existing PG06 pipeline encryption key and restricted financial/control credentials. API/worker reject enabled notice configuration without the installed notice schema.

Existing explicit migration coordinator adds `PG08_NOTICE_ALLOW_MIGRATION=true` and `PG08_NOTICE_MIGRATION_FILE` pointing to `infra/migrations/0015_pg08_customer_notice.sql`. Apply only to disposable/staging financial realms first, never the control database. Migration 0015 was not applied to production by this work. Do not edit an applied copy to upgrade production: future modifications require a new additive migration.

## Customer behavior

Checkout only shows the receipt email controls when service configuration exists. Customer enters contact email and explicitly consents to this payment's receipt. Verification and withdrawal capabilities are distinct, keyed, intent-scoped and not returned in API responses. Verification code goes to the supplied email; it expires in 15 minutes and is single use. Codes are entered through POST in the same checkout, not query strings. No contact address/code is saved to browser storage. Recipient limits supplement per-checkout/global limits.

Verified consent can occur before or after payment. Payment event insertion queues the receipt in the same transaction; consent verification after payment queues the existing verified event. The contact/event unique constraint prevents duplicate initial notice rows. Contact remains independent of actual sender number. Sandbox emails are explicitly labelled; current public customer routes still use the PG05 sandbox checkout.

EN/BN preference is persisted with consent and used in verification/receipt emails. SMTP subjects use MIME encoding. Recipient ciphertext uses separate associated-data purpose and tenant/realm boundary; it is not selected by ordinary runtime roles.

## Delivery semantics and recovery

An independent realm-scoped River notice queue (separate from critical matching/webhook work) obtains a bounded 60-second lease, decrypts recipient, sends one receipt through validated TLS and records a safe result. SMTP DATA accepted is `accepted`, meaning the SMTP server accepted responsibility, **not inbox delivered/read**. Stable outbox ID becomes Message-ID. Provider rejection/failure is bounded to eight attempts, with five-minute backoff. A lost DATA response or a worker lost after claim becomes `unknown`; never claim success or automatically resend it. This conservative policy can leave an unsent message unknown if the worker died before sending. Operator must resolve with provider logs. Payment detail exposes masked notice history and owner/admin explicit resend with a required reason and duplicate-email confirmation; withdrawn consent cannot be resent. The resend is audited and never changes financial funds.

Withdrawal suppresses pending/unknown work and invalidates verification; it cannot recall email already sent or cancel a transmission already in flight. Notice errors never reverse payment/allocation or re-execute merchant fulfillment. Credential/key recovery and contact erasure must integrate with the separately scoped privacy/operator services; no full retention/deletion release acceptance is claimed here.

## Tests and external gate

Local Go tests include contact consent/scope/code separation, header injection, stable Message-ID, actual local certificate-validated TLS SMTP and lost-DATA-response unknown result. Disposable PostgreSQL tests exercise verification single use, wrong intent, notice enqueue, claim exclusion/stale ACK, unknown outcome, withdrawal and reader/control isolation. The latter must be observed green in CI for the exact code; merely authoring them is not PASS.

Actual SMTP account/inbox delivery, real Android/source-to-payment-to-receipt-to-public-merchant flow and deployed browser tests remain separate external gates. SMTP configuration has not been supplied or used. No live provider or inbox-delivery claim.
