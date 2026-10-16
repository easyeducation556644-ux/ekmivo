# Managed payment plans — 2026-10-16

Implementation scope: PG13 billing/catalog and public pricing continuation. This is not whole-PG13 acceptance, a production rollout, real-provider payment proof or AI billing implementation.

## Delivered behavior

- Public homepage and `/pricing` read only published public catalog versions. Draft/private/archived plans are not offered; database failures are unavailable states, never invented prices.
- Super-admin + verified MFA; mutations require fresh MFA within ten minutes. Free/Paid/Custom editor, blank/zero price normalization to Free, finite/always-free duration, EN/BN copy, badges/order/visibility, immutable versions, optimistic edit conflicts, duplication/archive and audit reasons.
- Four enforced feature controls: invoice creation, payment-link creation, reports, exports. Resource caps: active Live API keys, members including owner, connected phones, enabled receiving accounts. Null resource caps explicitly mean unlimited; receipt forwarding and existing resources are preserved after reduction. Existing hourly credential-minting abuse protection remains separate from plan caps.
- Per-workspace audited grants, paid-renewal scheduling/cancellation, immediate expiry and expiring extra allowance. Grants never manufacture payment evidence. No automatic charge, purchased addon pack or prorated refund is introduced.
- Paid invoices freeze their price/version. Existing verified platform-receipt reconciliation activates/renews them; retries cannot extend a subscription twice. Editing a catalog does not rewrite a purchase. Switching paid versions replaces terms immediately on verified purchase; same-version renewal extends access. Usage anchors are retained to avoid upgrade-reset abuse.
- All integrations and API keys share Live allowance. Checkout creation atomically reserves a slot under a workspace lock. Verified full allocation consumes once. Unpaid cancellation releases; expired reservations stop occupying allowance automatically. Refunds do not restore consumed usage. Usage belongs to the checkout's creation period, including later completion.
- Exhaustion or expiry blocks new issuance, including public document checkouts; accepted verification, signed receipt ingress, seller refunds and webhook delivery stay independent. Sandbox consumes no Live allowance. App/bot Create Payment may omit redirect URL.
- Existing migration coordinator has an explicit targeted 0067-control / 0068-financial mode which never traverses old migrations. No new runner. Admin allowance endpoint requires explicit workspace and super-admin MFA, without impersonation. Financial usage failures remain unavailable, not zero.

## Actual checks

- `go test ./...`: PASS, including new plan error/status/Retry-After and Sandbox independence checks; opt-in unrelated DB/provider tests are not claimed.
- Next.js webpack production build and TypeScript: PASS. Targeted ESLint: PASS.
- Generated OpenAPI/SDK drift and strict schema/reference validation: PASS. Public Create Payment amount remains taka; internal billing/financial amounts remain minor units.
- Actual isolated Neon control, Sandbox and Live schema application, followed by refreshed final functions/triggers/indexes: PASS. Dedicated reader credentials tested financial runtime restrictions. `neon-results.txt` records the final retained result.
- Neon tests cover admin authorization, invalid input, omitted-price Free, one-time free activation/retry without extension, membership denial, immutable versions, optimistic conflicts, private catalog, team/API-key/phone/account caps, account re-enable bypass, active-checkout and shared-minute limits, 12 concurrent attempts for 3 slots, idempotent replay, cancellation/expiry release, synthetic complete financial allocation after subscription expiry, duplicate allocation denial, tenant scope, overrides, frozen paid quote, wrong proof amount, duplicate renewal, scheduled paid change/cancellation, explicit expiry, stale/period-boundary context rejection and archive.
- Existing targeted coordinator run against **isolated test databases only**: `Managed-plan migrations verified; no older migration path executed` at 2026-10-16 17:01 Dhaka.
- Actual built Next server + isolated Neon synthetic established admin session: draft creation → save → edit → publish → public catalog PASS. 24 public/admin × EN/BN × Light/Dark × 320/768/1440 viewport cases PASS, no document overflow or page exceptions. Results in `ui-results.json`; desktop screenshots visually inspected. This does not prove real MFA enrollment or real subscription payment.
- Final built-server HTTP selection tests PASS: registration preserves the selected plan, new users can choose/create a payment workspace, an unknown workspace cannot be selected, and an unavailable plan clears a stale selection. No subscription is purchased by following a pricing link. Results: `selection-results.txt`.

The test initially caught a pre-existing 320px admin-header overflow; compact header spacing fixes it. Preview must bind/access the same `localhost` hostname; mixing a 127.0.0.1 bind with Next's normalized localhost rewrite caused a preview redirect loop. Production proxy behavior was not changed for that environment issue.

Neon project: `sparkling-mountain-38618629`. Main test branch: `br-still-fog-b38to82q` (`test-managed-plans-final-20261016`). Earlier isolated branch `br-lucky-mode-b3hkfaxa` remains. No production writes, Docker, real money or real device collection used. Temporary credential/session files stay outside Git. Test prices and synthetic rows exist only in the isolated branch and are not commercial pricing recommendations.

## Rollout and remaining release gates

1. Review commercial plan terms; no proposed pricing is automatically seeded or published. Existing operator catalog/subscriptions are imported with original terms, not retroactively limited. Pre-migration accepted intents remain unmetered grandfathered work.
2. Deploy matching code and control 0067 / Sandbox+Live 0068 together in a controlled issuance window. Applying financial triggers before compatible API code would block new checkouts with `PLAN_SNAPSHOT_REQUIRED`; do not do a blind migration-first rollout. Existing verification must remain available. Validate the exact target realms/owner connections before running.
3. Existing coordinator invocation: `PAYMENT_PLANS_ALLOW_MIGRATION=true`, reviewed `PAYMENT_PLANS_CONTROL_FILE` / `PAYMENT_PLANS_FINANCIAL_FILE`, and the existing three `PG04_*_MIGRATION_DATABASE_URL` variables. Credentials must come from the target environment and must never be printed. Main source migrations are transactional within each database; there is no cross-database atomic commit.
4. Reconcile existing purchased subscriptions, verify a real owner-controlled platform billing payment and worker renewal, real fresh-MFA challenge, accepted-payment completion across expiry, and screen-reader/keyboard/System-theme flows. Details in the consolidated `docs/MANUAL-VERIFICATION.md`.

No production migration, deployment, load capacity or revenue correctness is inferred from these source/test results. The existing platform receiving workspace/phone configuration is required for paid checkout. No auto-charge or real provider integration was fabricated.

## Remote review checkpoint

Source commit `9255e02c1977bdf89632b8081bac737bafbcd949` is pushed in draft [PR #70](https://github.com/masharzy/ekmivo/pull/70). Vercel preview succeeded. [Foundation CI run 38892196859](https://github.com/masharzy/ekmivo/actions/runs/38892196859) did **not execute any job steps** (all four jobs had zero steps): GitHub's annotation says recent account payments failed or its spending limit must be increased. These are not passing CI results and are not test failures observed in executed source. Local/Neon verification above remains separately evidenced. PR is not merged; production migrations are not applied.

## Owner-authorized PR integration — 2026-10-16

Owner explicitly requested merging #69 and #70. Integrated #69 head `4bf3ff0fd00a63ecca979719429d657b34bf6f93` into #70, resolving three conflicts while preserving fresh MFA, compact mobile header, global billing/subscription/invoice/revenue inventory, workspace product/environment operations and payment plan management. Workspace Billing retains invoices and adds subscription management; Payment plans has its own workspace tab. Infinite free access is safely formatted in legacy inventory views.

Combined final Next production build and TypeScript PASS. Targeted combined-admin ESLint exits 0 with five unused-variable warnings. Twelve authenticated built-server read routes PASS against the isolated Neon branch (including both workspace billing and plan routes); `merge-smoke.txt` records them. No production mutations, new financial schema rollout, real admin mutations or live payment acceptance is inferred. #69 CI also has zero executed steps due to the same account-billing annotation. No Docker run.
