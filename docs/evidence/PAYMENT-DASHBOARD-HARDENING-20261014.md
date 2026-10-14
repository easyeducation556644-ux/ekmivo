## Applied-schema update — 2026-10-14 (after the source audit)

**MIGRATION 0056 APPLIED TO BOTH PRIMARY FINANCIAL DATABASES.** With explicit owner approval, the exact reviewed `infra/migrations/0056_phone_incoming_and_late_refund_reports.sql` migration was applied atomically to `ekmivo_sandbox_financial` and `ekmivo_live_financial`. Neon migration preview could not parse the PostgreSQL dollar-quoted procedure bodies, so a dollar-quote-aware 8-statement transaction was used for each database (the same statements previously verified on the disposable branch). Both financial realms were confirmed isolated from control; both functions and `ekmivo_finance_reader` EXECUTE grants are present.

Live verification with tenant/environment-scoped GUCs: 4 incoming rows (physical source count 4, legacy count 0), status filters 3 matched/1 cancelled, method filter 4 bKash, future-date filter 0, no next cursor on current 4 rows. One physical receipt detail returned candidates array. October late seller refund summary: 1 requested case, 1000 BDT minor units (৳10) open, 0 seller-reported returned. Sandbox scoped read: 0 receipts/0 refund requests, as expected from pre-migration existing counts. All counts of existing financial receipts, observations and refunds remained unchanged. Migration creates functions/grants only; no payment verification, refund transfer, deletion or new receipt occurred.

The earlier statements below saying migration 0056 is not applied were accurate at source-checkpoint time but **are superseded by this update**. Source/API deployment on existing Render services, actual authenticated HTTP/dashboard smoke, Android handset reconnect/heartbeat, real provider/payment/webhook and PG16/PG17 acceptance remain **UNVERIFIED**.

# Payment dashboard operational hardening — 2026-10-14

Scope: Payment Gateway Dashboard only. No POS/Commerce/AI functionality is claimed.

## Source changes
- Cmd/Ctrl+K workspace-scoped record search queries the existing authorized Go payment/incoming and PG10 document APIs, preserving business isolation and never sharing a sensitive record body.
- Overview shows actual paired-phone online counts from the /phones resource (no zero on fetch failure), actionable receipt/webhook/request/drill-through links, and the current physical-SMS four-field matching rule instead of the retired SIM/receiving-number requirement.
- Reports from/to dates filter Bangladesh calendar days consistently and identify the still-UTC daily buckets; refund CSV no longer mislabels all states as requested.
- Normalized notification, invoice/link detail and overview links to the canonical locale-neutral dashboard routes. Sandbox/live remains server-authorized; no restored UI selector.
- Added responsive and keyboard-visible record-search result styles.

## Verification actually available
- The exact preview commit 1f9969e3b21a15cade33f19bfdd14c393f5929b2 reached Vercel READY after production Next.js build. Preview build validates compilation, NOT real API/role behavior.
- GitHub Actions PR #41 failed all four jobs within ~3 seconds before any steps. It is not valid evidence of code-specific test failure or successful Go/Android tests.
- Neon Live and Sandbox financial databases both still lack pg56_incoming_read and pg56_refund_summary (migration 0056). Both DBs require owner-authorized normal additive migration before incoming/report endpoints can function. An earlier disposable Neon SQL fixture passed four incoming records, one late-refund request.
- One-time Live projection version reconciliation from 1 to 3 was applied previously; reliable continuous financial projection watcher and actual handset reconnect require checking existing Render configuration.
- No independently observed bKash/Nagad/Rocket handset, provider payment, merchant webhook, refund action, restore or release smoke test for this branch.

## Release gates still open
- [ ] Apply/review migration 0056 to both financial realms with production migration operator; run scope, role, pagination and cross-tenant negative tests.
- [ ] Confirm existing separate financial projection service is running/reconciling, record actual handset heartbeat (no new pairing).
- [ ] Browser: global search with real records and each role; route/deep link, EN/BN, theme, 320/768/1024/desktop, keyboard, stale connection and drafting tests.
- [ ] Dashboard: real API comparison overview to transaction to incoming to reports to refunds, transaction and webhook event ID trace, CSV injection and date boundaries.
- [ ] Existing PG16/PG17 financial/security, backup/restore, monitoring, provider/Android and owner acceptance.
- [ ] Release web/API/Android together only with compatible schema; record exact deployed SHA and smoke evidence.

**Current classification: source hardening and Next preview build only, production/payment release NOT accepted.**
