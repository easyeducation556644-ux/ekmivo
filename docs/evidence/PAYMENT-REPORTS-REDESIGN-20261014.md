# Payment Reports Redesign — 2026-10-14

Scope: PG13 Reports presentation only. No SQL, migrations, API, refund or phone-forwarding behavior changed.

## Implemented in code

- Reconstructed Reports from a one-line tab/paragraph layout into an information-led reporting workbench, sharing the operational Ink & Bone semantic tokens.
- Reports owns its single heading (Dashboard duplicate heading omitted for this screen); compact toolbar and aligned Refresh / Export CSV / Print.
- Automatic initial 30-day Bangladesh-calendar report fetch, 7/30/90-day presets, custom inclusive Bangladesh dates (00:00+06 to the next day 00:00+06 exclusive), receiving-account filter, Apply/Retry and 30s request timeout.
- Four top KPIs: verified payment amount, actual verified payment count, open seller-managed refund amount, seller-reported returned amount. Separate allocated/unallocated/merchant-statement-linked totals without inventing provider settlement.
- Compact responsive daily verified trend (explicit UTC buckets), method share and detailed breakdown tabs for methods, accounts, customers, seller refunds, merchant statement links and daily totals.
- Accessible scrolling financial tables, numeric right-alignment, keyboard focus, mobile 44px targets, both locales, light/dark semantic styling and print stylesheet.
- CSV exports the validated current loaded snapshot with one consistent column schema, escaping spreadsheet formula prefixes, quoted fields, BDT minor units, date scope and UTF-8 BOM. No new endpoint, customer/payment mutations, fabricated metrics or false provider confirmations.
- Unavailable source, forbidden session, invalid range, empty genuinely verified records, retries, filter-dirty, stale cached snapshot and loading state are all distinct. Export/Print disabled while snapshot is stale.

## Checks and evidence

- Production Neon Live scoped read-only query (workspace authorized by realm GUCs) confirmed `pg13_reports` returns object, arrays for methods/accounts/customers/daily, statement link object, verified/count numeric keys, method grouping; `pg56_refund_summary` returns refund items array. Query returned 3 verified payments and 1 grouped method for the sampled October range. No rows changed.
- Exact preview SHA and Next.js production build state must be recorded after final commit. A successful preview compile is **not** an authenticated merchant-browser or financial-product acceptance test.
- Legacy screen's own large UTC caveats and explanatory paragraphs were removed from the main viewport; a short seller-managed note is preserved only where financial semantics could mislead.

## Manual pending (required to call fully production-accepted)

- [ ] Authenticated merchant opens Reports: default 30-day data without clicking Run; owner/admin/editor/viewer restrictions, 401/403/503/offline, retry, stale report and custom date boundaries, including Dhaka midnight.
- [ ] Compare one selected reporting period against merchant transactions, allocated/unallocated totals and refund request statuses; do not conflate seller-reported return with independent settlement.
- [ ] Verify filter by receiving account, account list missing, date presets 7/30/90 and custom 366-day inclusive limit; no cached data leaks on business/environment change.
- [ ] Check CSV with non-ASCII names, commas/quotes, formula injection and file-name scope; confirm client report only (not asynchronous whole-ledger export); Print PDF layout.
- [ ] Viewport 320, 375, 768, 1024, 1440 desktop; zoom 200%; Hind Siliguri Bangla and EN; Light/Dark/System; keyboard and screen reader; browser screenshots.
- [ ] Record production deployment SHA and signed-in smoke test. Not provider/Android-dependent for a read-only reports UI but backend availability is essential.

**Classification: Reports source and read-only financial schema verified; runtime/browser release acceptance pending.**
