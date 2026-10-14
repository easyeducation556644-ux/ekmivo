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
