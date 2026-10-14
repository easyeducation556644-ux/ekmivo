# Public API documentation — 2026-10-14

Reviewed ZiniPay https://zinipay.com/docs and https://zinipay.com/docs/trx-verification plus UddoktaPay https://uddoktapay.readme.io/reference/overview, /api-information and its create/verify endpoint references. Borrowed documentation organization, not provider-specific contracts, billing rules, secrets or transaction-ID requirements.

Implemented shared /docs and /docs/payments: overview/authentication, existing workspace-scoped endpoint table, create-request field table, cURL/Node.js/PHP/Python examples with language controls/copy feedback, backend status query, signed webhook guidance, error envelope/HTTP retry table, live integration checklist and existing generated API reference. EN/BN and semantic theme tokens preserved. No request execution from the browser or secret input/storage.

Actual Go route and createRequest fields were inspected; public samples use environment placeholders and server-only bearer authentication. Sandbox remains isolated and availability-dependent. No new advanced receipt verify/confirm endpoints added; normal phone auto-verification remains unchanged.

TypeScript and targeted lint passed. Examples were source-reviewed, not sent to a live merchant endpoint. Human layout review, real developer integration and release acceptance remain pending. No browser test, CI dispatch or manual deploy performed.
