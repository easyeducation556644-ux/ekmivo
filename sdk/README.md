# Merchant SDK sources

Server-only clients: TypeScript, Go, Python (standard library) and PHP 8.1+ with cURL. `operations.json`, TS/Go operation definitions and TS request/response types derive from `contracts/openapi.yaml`. Generate/check using `npm run payment:generate` / `npm run payment:contract-check` in `apps/web`. PHP/Python read the same operation registry. No key is embedded in browser/mobile UI.

Set an explicit HTTPS API origin, server secret and immutable sandbox/live environment. Pass the persisted order idempotency key for POST retries. Timeouts are unknown outcomes; query authoritative state before a new attempt. Clients reject credential redirects and cross-environment overrides. Errors expose only status, safe code and correlation ID.

Example TS: `client.request('createPaymentIntent', {path:{workspaceID}, body:{merchant_reference:reference,amount_minor:12500,currency:'BDT',expires_in_minutes:30}, idempotencyKey:orderKey})`. Check the generated registry for operation names. Go `Request(ctx, operation, Options{...})` returns response bytes; decode against the published schema. All four clients support raw private document-field upload bytes and an explicit filename option; filenames use URI-component headers so Bengali names work. PHP/Python additionally return bytes for CSV responses. The TS client reads responses through a bounded stream; caller cancellation remains combined with its timeout.

The canonical webhook consumers live in `examples/webhook-receiver`. Signature verification alone does not fulfil orders. All languages validate timestamp/HMAC/scope, query financial truth, check the server-priced merchant order and durably dedup/queue fulfilment in one transaction.

Source is not packaged/published to external registries or clean-account/live conformance verified. Use local modules until combined checks and release packaging complete.
