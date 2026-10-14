# Reports analytics separation — 2026-10-14

## User feedback
Owner noted that Reports and Overview looked almost identical after PR #48. Reports must be a **financial analytical workbench** rather than a second daily operations dashboard.

## Source changes
- Replaced four Overview-like cards with a report period analysis: total verified collection, transactions for period, average verified transaction amount and optional prior equal-length calendar-period comparison. Percentage growth shows 'no baseline' if previous period has zero rather than an invented infinity.
- Previous-period comparison is opt-in only (avoids unnecessary extra backend load/cold-start 502). It uses the same already-authorized workspace, financial environment, receiving account scope and Bangladesh calendar-day inclusive date logic. On change/unmount it cancels stale network activity. If the prior request fails, it reports unavailable, not an invented percentage.
- Chart is now distinctly report-sized and supports daily or grouped seven-day UTC buckets. Chart drill-through to full UTC daily table and keyboard-accessible labeled grouping controls.
- Payment-method contribution shows percentage share, raw BDT and verified count; reconciliation has a dedicated allocation proportion bar plus allocated/unallocated and imported statement-linked amount with honest settlement distinction.
- Existing six data breakdowns, period presets, receiving account filters, CSV/Print, EN/BN, responsive/theme functionality remain.
- 502/503/504 upstream status now uses a temporary reporting-service unavailable message with explicit Retry rather than an unspecified error. No synthetic data, database schema changes, new paid service or financial mutations.

## Verification and release gates
- [ ] Vercel preview Next build on final changed SHA: compile and typecheck.
- [ ] With real authenticated workspace, compare 30-day report against previous 30 days and verify equality with independent pg13_reports SQL; compare 0-baseline, no-data and unavailable source.
- [ ] Check filters and switched workspace/env prevent cross-scope previous data; toggling comparison does not trigger a financial write.
- [ ] Verify daily vs 7-day group chart and UTC labels with gaps in the daily source; check Bengali and English at desktop and 320/375/768 width plus light/dark/system.
- [ ] Check export and print match the displayed filtered successful snapshot; comparison is intentionally not in the CSV until a specifically scoped export contract exists.
- [ ] Check production Go and Vercel deployments both live/READY after main merge; Render Free redeploy caused temporary 502 previously. Real merchant API response and visual pixel checks remain separate manual checks.

**Source refactor, not final runtime acceptance.** Existing PG56 financial DB schema remains unchanged.
