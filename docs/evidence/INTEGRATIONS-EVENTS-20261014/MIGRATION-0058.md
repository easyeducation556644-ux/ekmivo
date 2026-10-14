# 0058 permanent migration — 2026-10-14

Applied successfully at approximately 22:22 Asia/Dhaka using the existing Go financial-migrate coordinator from main aa3b5ae. Sandbox was applied before Live. No replacement runner or customer-data mutation was used.

Databases: ekmivo_sandbox_financial and ekmivo_live_financial. Separate owner connections and immutable realm checks passed. Existing PG04 migrations were already installed and preserved.

Post-commit SQL verification passed independently in both databases:
- Activity read, API recording and delivery-history functions exist.
- Both new tables have enabled and forced row-level security.
- Runtime finance-reader role has the scoped activity function permission.
- Runtime finance-reader role cannot directly SELECT API activity table.
- Delivery-history trigger exists.

This supersedes the earlier permanent-migration-pending statement in README.md and the manual ledger for migration 0058 only. Deployed HTTP checks, controlled receiver tests and production release acceptance remain pending. No deployment was triggered as part of this migration.
