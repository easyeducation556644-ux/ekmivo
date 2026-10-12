# PG14 source checkpoint — not accepted

New source routes have generated OpenAPI extension references; Go/TypeScript request clients are generated from canonical operations. PHP/Python/TypeScript signed webhook validation examples accompany the existing complete Go receiver with PostgreSQL durable consumer dedup.

Continuation source includes bilingual generated API reference, expanded typed schemas, generation drift CI, full PHP/Python/TypeScript consumers, SDK and website-example typecheck, 13 isolated matcher scenario names and history-preserving reset. Contract/drift/schema check PASS; separate TypeScript example check PASS. OPEN code: full scenario/failure coverage, clean-account quickstart/conformance harness and final schema/runtime parity. Signature-only examples explicitly do not fulfil goods. Generation is not conformance or clean-account quickstart evidence.

Sandbox UI proxy now requires `GO_SANDBOX_API_URL` and fails closed when absent. The simulator process must have no live financial credentials, `PG14_SANDBOX_TOOLS_ENABLED=true`, the isolated sandbox database/worker, and the same narrowly scoped identity authority. No fallback to the live-capable API is made. This configuration has not been deployed/tested.


## Local continuation — 2026-10-12

58 extension paths and 40 SDK operations generated; contract/drift validation PASS. TS response streaming bounded before allocation; upload filenames encoded across four SDKs; Go SDK compile and Python AST PASS. Six mocked SDK transport tests PASS; no clean-account/live SDK conformance claimed. Thirteen real matcher SQL fixture scenarios are written but unexecuted. Dedicated sandbox-tools URL never falls back to Live.

Shared source checks and remaining code: [implementation status](../../IMPLEMENTATION-STATUS.md). Current uncommitted working tree, not historical CI or a deployed commit.

## Local source continuation — 2026-10-12

The merchant quickstart has an explicit dedicated Sandbox run gate and exercises wrong-realm/tenant denial, server-created intents, idempotency and public checkout without recording credentials. It has passed syntax only; no account HTTP execution, real receipt or webhook confirmation is claimed.
