# PG11 source checkpoint — not accepted

Seller-managed refund requests include encrypted customer contact, capped amounts, optimistic seller transitions, durable notification/webhook and audit. Seller-reported returned never overwrites verified payments or becomes an independently verified refund. Customer checkout request form is implemented. Statement preview/import and exact account/amount/currency settlement association are implemented; merchant-imported statements remain labelled as such.

OPEN code: finish reconciliation dashboard, full pagination/filter/drill-through and remaining exception lifecycle producers. Source is not database/race/browser verified. No automatic money transfer exists or is required by the owner's corrected path.


## Local continuation — 2026-10-12

Migration 0042 and handlers add actual refund status and statement link/account filters with same-tenant/environment cursors. SQL tests cover cumulative refund cap and cursor denial but were NOT RUN. Seller-reported return is still separate from verified funds; no automatic money transfer introduced.

Shared source checks and remaining code: [implementation status](../../IMPLEMENTATION-STATUS.md). Current uncommitted working tree, not historical CI or a deployed commit.
