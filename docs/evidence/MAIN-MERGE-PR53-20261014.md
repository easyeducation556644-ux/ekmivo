# Main merge review — 2026-10-14

Integrated public/auth branch 91bab10 and PR #53 head c803742b into latest main
a01cf2c. Both merges were conflict-free; the already-merged Transactions type fix
was retained. PR #53 changes Reports UI/CSS, not financial matching or authorization.

Review confirmed full payer access remains owner/admin-only in the Go handler
and gated in the ledger component. Ledger filter/workspace/environment/permission
changes now remount the scoped ledger, resetting pagination/data immediately;
this fixes a pre-existing synchronous-effect lint error without disabling lint.
Translation callbacks are stable and included in fetch-effect dependencies.

Combined initial optimized production build and signup transaction simulations
passed. Final targeted lint and optimized production build after the scoped-ledger repair passed.
Existing local auth/public browser evidence remains in PUBLIC-AUTH-POLISH-20261014.
No CI success claimed: owner reports exhausted GitHub Actions quota.
No provider/device/live-payer acceptance claimed by this merge.
