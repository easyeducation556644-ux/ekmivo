# Implementation backlog and release evidence

Baseline: [বাংলা master plan](./DUAL-SAAS-MVP-PLAN.bn.md), revision 5, 2026-10-11; this is the canonical plan the agent follows. User decisions: all features in the first public MVP; automatic phone payment verification; minimal shared design, Light/Dark/System and complete EN/BN switcher. No customer TrxID submission or routine merchant payment approval. Scope authority: [MVP-FEATURE-SCOPE.md](./MVP-FEATURE-SCOPE.md). Design authority: [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md). Status: implementation started 2026-10-11; only the repository scaffold and public web foundation are live. Single implementation owner: Codex. Product/provider owner: user.

Design specification completed: guide, [semantic tokens](./design/tokens.css) and [contrast report](./design/CONTRAST-REPORT.md). These are planning assets, not proof of working theme/localization in an application. Implement D01/D02 after the F01 scaffold and before feature-page styling.

### First implementation checkpoint, 2026-10-11

- F01 in progress: monorepo folders, Next.js app, Go API/worker entry points, Dockerfile and initial OpenAPI contract are committed in GitHub `masharzy/ekmivo`. Web production build and lint pass. Go 1.27 `go test ./...` compiles both entry points; local `/healthz` returns 200 and `/readyz` correctly returns 503 before database setup. Go worker and business API are not operational. CI configuration exists at `infra/ci-template.yml`; GitHub rejected publishing it under `.github/workflows/` because the current CLI OAuth token lacks `workflow` scope, so CI is **not active**.
- D01/D02 in progress: the public `/bn` and `/en` introduction uses design tokens and has working locale/theme selectors with server-rendered language and saved theme. Dashboard components, complete translation catalog, cross-tab theme sync, fonts, and the four-combination visual/accessibility audit remain open.
- Production web foundation: <https://ekmivo-web-masharzys-projects.vercel.app>. The page labels sample data and development status. This is not the full public MVP launch. Go API/worker hosting and Neon PostgreSQL are not connected yet.

Priority: P0 = required for the full first public release. Previously deferred features are now P0. A Spike resolves feasibility for a required feature; it does not remove that feature from launch. Every completed item must link its change, relevant checks, and staging/provider/device evidence. A green mock test does not count as a live provider test. The previous 8–12 week estimate and small-pilot budget are superseded; full-scope estimates require access checks and measured progress.

## G0 — Resolve external contracts early

| ID | Priority | Deliverable | Dependency | Acceptance |
|---|---|---|---|---|
| G0-1 | P0 | Merchant/customer workflow map and physical-goods sample catalog | User samples | A-only, B-only, combined scenarios documented |
| G0-2 | P0 | Gateway account and integration agreement check | User/provider | Sandbox credentials, merchant ownership mapping, refund/query semantics and allowed SaaS integration known |
| G0-3 | P0 | Meta app/access matrix and review preparation | User Meta account | Required scopes, privacy/deletion URLs, reviewer demo plan; no unnecessary permissions |
| G0-4 | P0 | Obtain capability/account docs for Steadfast, Pathao, RedX, eCourier | User/providers | Each provider's booking, status, webhook auth, quotas, returns/COD and unknown-outcome behavior recorded |
| G0-5 | P0 | Hosting quote and operational owner | Budget/account input | Backup/PITR, pgvector, region, worker support, alerts and monthly estimate validated |
| G0-6 | P0 Spike | Android receipt capture and matching feasibility | Consented real devices/sample messages | Reboot/offline/missing fields/permission loss, payer binding, privacy and distribution measured; feeds required X08 |
| G0-7 | P0 | All connector/modality/store capability matrix | User/provider accounts | WhatsApp/Instagram, Stars, stores/Daraz, voice, app stores and extension access validated; unsupported capability remains blocked, not silently deferred |

G0-2 blocks provider-verified payment claims; G0-3/G0-7 block the relevant public integrations; G0-6 blocks phone-bridge release. Local fake-provider development may proceed labelled sandbox. Full public launch requires every feature inventory gate, even if a partial internal alpha works.

## P0 work packages

| ID | Work package | Depends on | Acceptance evidence |
|---|---|---|---|
| F01 | Monorepo web/backend/mobile/extension, pinned toolchains, Docker local services, CI | Baseline | Reproducible clean builds, native signing secrets protected, no committed secret |
| D01 | Semantic design tokens, typography, components and responsive shell | F01 | Guide-matching neutral/green palette, Bengali glyphs, keyboard states, desktop/mobile layouts; sample data labelled |
| D02 | Theme and EN/BN infrastructure, switchers and translation catalog | D01 | Four theme-locale combinations, persistence/system changes, SSR without flash, preserved routes/forms, complete keys and locale-safe amounts/time |
| F02 | PostgreSQL migrations and tenant schema | F01 | Up migrations work on empty and prior schema; composite FK tests |
| F03 | Managed auth, membership/RBAC, admin MFA boundary | F02 | Expired/revoked identity, removed member and unauthorized role tests |
| F04 | RLS and tenant-scoped repositories/jobs | F03 | Three-tenant negative tests through runtime DB roles |
| F05 | Entitlements, configuration switches and workspace UI | F04,D02 | A-only/B-only/both/off checked server-side, queued work rechecks permissions; localized shell and theme tokens |
| F06 | Durable ingress, River queues, outbox and observability | F04 | Commit/rollback/crash tests; correlation IDs without PII |
| C01 | Catalog variants and CSV preview/import | F05 | Invalid row errors, idempotent retry, immutable SKU ownership |
| C02 | Orders, price snapshot, stock reservations | C01,F06 | Concurrent last-item orders, cancellation/expiry release, no negative available stock |
| P01 | Payment request API and checkout | C02 | Expected sender number, receiving account/method, amount and time window recorded; no customer TrxID field; standalone and order-linked requests |
| P02 | Automatic receipt verification, additional provider callbacks and reconciliation | P01,F06 | Unique sender/time/amount/account/method match auto-verifies; duplicate/wrong-sender/out-of-window/collision tests; gateway adapter access isolated to X07 |
| P03 | Partial advance, COD due, verified/exception UI | P02 | Successful phone verification automatically allocates and confirms; method visible; no routine merchant approval |
| P04 | Merchant API keys and signed outbound webhooks | P02 | Key revoke/rotate; HMAC timestamp; retry/replay; SSRF and idempotency tests |
| C03 | Courier booking/status and receipts | C02,P03,G0-4 | Ready-to-ship guard, timeout lookup, duplicate prevention, real consignment evidence |
| A01 | Web chat, contacts, inbox, human replies | F05,F06 | Reconnect/refetch, workspace scoping, delivery status and rate limits |
| A02 | Messenger adapter and onboarding | A01,G0-3 | Signed ingress, message identity dedup, echo handling, permissions/reconnect, non-role live user test |
| A03 | Knowledge ingestion and retrieval | C01,A01 | Tenant/version filters; malicious upload/prompt cases; Banglish retrieval samples |
| A04 | AI provider adapter and bounded tools | A03,C02,P01 | Budget/time/tool limits; server-derived price; confirmed-order flow |
| A05 | Handover, practice/live/off, versioned configuration | A04 | Mid-generation takeover cancels send; disputes require explicit release |
| A06 | AI evaluation harness | A04,A05 | ≥150 cases; recorded quality/cost results; release thresholds from master plan |
| B01 | Prepaid service-credit ledger and usage reservations | F06,P02,A04 | Concurrent balance checks; retry settles once; adjustment by compensating entry |
| B02 | B subscription invoices and entitlement lifecycle | B01,F05 | Verified renewal only; expiry/grace; in-flight payment and shipment complete |
| T01 | Basic Telegram physical-goods adapter | P04,C02 | Webhook secret validation, scoped token, physical order/payment flow; no digital-goods bypass |
| O01 | Admin exceptions, support audit and replay tools | P03,C03,A05 | Least privilege, reason/expiry, all actions audited |
| O02 | Data export/deletion and retention | O01 | Only requested tenant exported/deleted; required financial retention and backup expiry explained |
| O03 | Backups, restore and incident runbooks | F06,G0-5 | Timed restore in isolated environment; keys available; reconciliation after restore |
| O04 | Full-flow/failure/load/security/design checks | D02,P04,C03,A06,B02,T01,O03,X01–X14 | All S01–S46 and evidence matrix complete, theme/locale/accessibility checks, actual modality/connector workloads, no release-blocking issue |
| L01 | Public pages, pricing, onboarding help | F05,B02 | Claims match shipped capabilities; keyboard/mobile/contrast checks |
| L02 | Controlled paid cohort and launch review | O04,L01 | 7–14 day pilot log, real transactions, usage economics, owner release decision |

## Expanded P0 packages — same public release

These packages implement the prior P1 list and remaining reference capabilities. Package order is an implementation dependency order, not separate product release scope.

| ID | Work package | Depends on | Acceptance evidence |
|---|---|---|---|
| X01 | Official WhatsApp, Instagram, Facebook/Instagram comments and per-channel policy/rendering | A02,G0-3,G0-7 | Approved external accounts, supported cards/private replies/templates, consent and opt-out; no unauthorized post-window sends |
| X02 | Image recognition, voice notes, web voice calls, rich product UI | A04,G0-7 | Held-out Bengali/image evals, ambiguity confirmation, interrupt/reconnect tests, cost caps, actual client audio |
| X03 | PDF/Word/URL knowledge, natural-language Agent Desk, moderator assistant, unanswered questions | A03,A05 | Safe ingestion/SSRF tests; draft diff/test/publish/undo; no autonomous live policy edits |
| X04 | Full inbox/CRM, snooze, lead pipeline, campaigns/follow-up, tickets, persistent alerts, ratings/reviews | A01,A05,X01 | Timer/state correctness, native takeover where supported, suppression/consent, audience-bound offers, human issue resolution |
| X05 | Multiwarehouse, richer order states/returns/exchanges/refunds, coupons, picking/QR/bulk operations | C02,C03,P03 | Stock/transfer concurrency, invoice totals, authorization, partial batch failures, recorded financial reversals |
| X06 | All four couriers and WooCommerce/Shopify/Sheets/Excel/CSV/Daraz connectors | C01,C03,G0-4,G0-7 | Each capability documented; live sync/booking, conflict/dedup/retry/return/settlement; authorized Daraz access or explicit blocker |
| X07 | Named payment methods/gateways: direct merchant APIs where available, SSLCOMMERZ/AamarPay, bank import | P02,P04,G0-2 | Per-provider live validation/refund/query evidence; no unrelated personal TrxID lookup assumption; credentials isolated |
| X08 | Android receipt bridge, parser registry, device health and automatic verification | P03,G0-6,F06 | Real device/receipt tests; actual payer number/time/amount/account match; no TrxID submission, opt-in acceptance step or routine manual approval; offline/replay/collision checks and automatic confirmation/webhook |
| X09 | Agency/multi-brand permissions, consolidated credits, client budgets, pricing/trials/volume rules | F05,B01,B02 | Atomic credit ownership/charging, tenant access constraints, trial abuse and plan transition tests |
| X10 | Calendar/resource booking and Telegram digital subscriptions/Stars | T01,P03,X04,G0-7 | No slot oversell, advance/cancel/reminder flow, Stars success/refund/paysupport and membership expiry |
| X11 | Analytics, customer/courier history, return-risk assistance and reporting | X04,X05,X06 | Reconciled metric definitions, permitted data, measured predictive quality or visible data blocker; no fabricated risk score |
| X12 | Full Android/iOS merchant apps and PWA | A05,P03,X04,X05,X08,G0-7 | Device/OS matrix, push/inbox/order/payment/QR, secure tokens/deep links, offline sync, real distribution route |
| X13 | Chrome extension next to business inbox | A05,X03,G0-7 | Scoped auth and minimal permissions, takeover/assistant; native interface changes fail visibly |
| X14 | Text/voice feature requests, progress status, expanded public/help/migration surfaces | L01,X02 | Feedback lifecycle, protected attachments, status history and truthful feature docs |

## Contracts to define before endpoint implementation

All API paths below are proposed contracts, not deployed endpoints. OpenAPI is the schema source; generated TypeScript client must be checked for compatibility in CI.

| Contract | Required behavior |
|---|---|
| `POST /v1/orders` | Scoped key/session; server-calculated totals; idempotency key; confirmed customer intent |
| `POST /v1/payment-intents` | Amount in minor units, currency, expected sender number, receiving account/method, creation/expiry window; no customer TrxID required; no PII in return URLs |
| `GET /v1/payment-intents/{id}` | Authorized merchant or opaque checkout capability; status and verification method |
| `POST /webhooks/payments/{connection}` | Provider-native authentication/validation, durable dedup and fast acknowledgement |
| `POST /webhooks/channels/{connection}` | Native provider signature/secret and account-to-workspace mapping |
| `POST /v1/conversations/{id}/takeover` | Atomic ownership/version transition, queued reply cancellation |
| `POST /v1/conversations/{id}/release` | Authorized explicit release with audit |
| `POST /v1/shipments` | Approved + ready order, COD amount computed from allocations, unknown outcome tracked |
| `GET /v1/events` | Authenticated workspace-scoped SSE; safe reconnect/resume/refetch |
| `POST /v1/device-events` | Production-target device bridge; signed evidence, scoped enrollment, dedup; never trusts caller-supplied tenant or verified status |
| `PATCH /v1/payment-settings` | Scoped settings for receiving accounts/methods, payment expiry and timestamp handling; valid unique phone match auto-verifies without an extra acceptance opt-in |

Error envelope: stable code, safe human message, correlation ID; never SQL/provider secret/raw stack. Cursor pagination for message/payment/order lists. API version and webhook event version explicit.

## Financial and event invariants

1. A receipt is deduplicated by provider, receiving account and automatically extracted transaction ID/event identity across device/API sources. Allocations cannot exceed its verified amount; verification method remains explicit. A later provider check enriches the same receipt rather than posting another payment.
2. An order can receive several allocations, but one incoming payment is not silently reused across unrelated orders. MVP split-payment edge cases go to review.
3. Ledger transaction postings balance in one currency; corrections are reversals/adjustments, not overwritten history. Service credits are separate from merchant payment records.
4. A usage reservation is created atomically against available credit. Settlement/release is idempotent. Cost overflow has a defined platform-loss/stop policy; never hidden overdraft.
5. Webhook receipt, domain mutation and follow-up job are transactionally linked where applicable. External effects remain at-least-once with dedup/reconciliation.
6. Cancellation does not erase evidence of money received; refund lifecycle is separately tracked and human-authorized.
7. A provider-unknown outcome remains unknown until query/reconciliation resolves it. Timeouts are not equivalent to failure.
8. Module disable prevents new actions but does not discard already accepted financial events or erase historical records.
9. A unique valid receipt match automatically sets `verification_status=verified` with `verification_method=sms_match` or `notification_match`, records payment allocation and enqueues confirmation/webhook atomically. No gateway confirmation or routine merchant approval is required for this path.
10. Match the actual payer number, transaction time, amount, receiving account and method to the pending request. Customer TrxID input is neither requested nor required. Missing/masked required fields or multiple candidates remain pending/exception instead of selecting an arbitrary order.
11. Preserve receipt transaction time separately from device receive/server ingest times. Offline replay cannot make an old transaction eligible for a newer payment request. Each receipt can be consumed once even under concurrent verification.

## Release evidence matrix

| Scenario | Required assertion |
|---|---|
| A-only workspace | Answers FAQ/catalog, takes lead, handover works; B tool rejected |
| B-only workspace | Login without Meta, order/payment/courier works, no LLM call |
| A+B workspace | Chat → customer confirmation → order → verified advance → ready → courier → status |
| Duplicate inbound/payment event | One business mutation/charge/allocation; observable dedup |
| Spoofed browser success | Payment remains unpaid unless server/provider verification succeeds |
| Same-amount payments / reused TrxID | No amount-only match or cross-order reuse |
| Wrong tenant or provider account | Access denied, no data leak or mutation |
| Partial/overpay/expired/reversed | Correct due/review/refund state and audit |
| Worker killed after external call | Query/dedup/manual review resolves unknown outcome; no blind duplicate booking |
| Provider callback lost | Scheduled query reconciles final status |
| Two buyers, last SKU | Only one reservation accepted |
| AI generating during takeover | Generated reply discarded before dispatch |
| Prompt injection or false payment claim | No privileged action, price change or paid status |
| AI credit exhausted | AI stops; inbox human flow and B remain operational |
| B subscription expires mid-payment | New order creation policy applied; prior callback/reconciliation completes |
| Provider outage and timeout | User sees pending/retry state; budgets respected; alert delivered |
| Database restore | Measured recovery; replay safe; financial gap reconciled |
| Customer export/deletion | Correct tenant only, all registered stores covered |
| Phone bridge offline/reboot | Evidence sync health visible; no false success |
| Automatic phone verification | Actual sender number + transaction time + amount + receiving account/method match one request: auto-verified, allocated and confirmed with webhook; no customer TrxID or routine manual approval |
| Same sender/amount and overlapping requests | Multiple candidates cannot be arbitrarily selected; pending/exception; one receipt never confirms two requests |
| Receipt source fields | SMS sender label is not payer number; contact number is not silently payer number; normalized actual sender and transaction timestamp are required |
| Device/API report the same payment | One receipt/allocation; method upgraded without duplicate credit |
| All channels and rich media | Actual approved-account image/audio/card/voice flows; per-channel policy and budget gates |
| Store/courier sync and multiwarehouse | All declared connectors work; no duplicate order/stock movement; unknown outcomes resolved |
| Booking/Stars | No concurrent slot allocation; digital payment, refund/support and membership lifecycle pass |
| Android/iOS/extension | Real device/client tests; minimum permissions; secure takeover/session isolation |
| Agency/campaign/support/reporting | Workspace boundaries, shared-credit correctness, suppression rules and reporting reconciliation |
| Theme and language | Light/EN, Light/BN, Dark/EN, Dark/BN; System mode tracks OS; preference persists; no lost drafts or recreated payment requests |
| Design/readability | All required features reachable; correct tokens, Bengali glyphs, translation keys, numbers/time, focus/keyboard/mobile/zoom states; no decorative template clutter |
| Outbound messaging window closed | Message blocked or approved allowed template used |

## Build sequence within the full first release

1. Foundations, D01/D02 design/theme/locale infrastructure and one end-to-end slice establish patterns and integration contracts.
2. Implement the complete required commerce/payment/channel inventory, including X01–X14.
3. Verify each S-ID, run internal alpha/device/provider tests, then the full controlled cohort.
4. Launch publicly only when the complete inventory passes or the user explicitly changes scope. No currently listed feature is deferred to P1.

A dedicated vector database, Redis, Kubernetes, custom ML service or microservice extraction requires a documented bottleneck and operational owner; customer count alone is not the trigger.

## Decision record index to create during implementation

- ADR-001: Go modular monolith, deployable API/critical worker/AI worker.
- ADR-002: Shared-schema tenancy, RLS, role/connection boundaries.
- ADR-003: Automatic phone verification by time/sender/amount/account, no customer TrxID, deduplication and separate additional gateway adapters.
- ADR-004: Order/payment/fulfilment/settlement state separation.
- ADR-005: Transactional jobs, inbound dedup, outbound unknown outcomes.
- ADR-006: Shared catalog and A/B entitlements.
- ADR-007: LLM provider/data policy, evaluation and billing units.
- ADR-008: Managed infrastructure, recovery objectives and operator responsibilities.
- ADR-009: Full feature launch inventory, provider capability blockers and revised estimates.
- ADR-010: Native apps, Android bridge, extension and channel-specific capability boundaries.
- ADR-011: Shared minimal design tokens, personal theme preference and complete EN/BN localization.

These are planned records, not links to files that already exist.
