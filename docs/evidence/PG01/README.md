# PG01 — session/tenant/environment authorization and admin MFA

**Work:** PG01 / F02,F03,F04 / S02,S04,S45. **STATUS: IN PROGRESS, NOT ACCEPTED.** PG00 foundation accepted; PG02 has NOT started. Android UI expansion paused; PG06 and AN03 remain partial.

## Code
- `backend/internal/authz/authz.go`: validates existing opaque cookie session hash against PostgreSQL. Fails closed on invalid/expired/revoked/disabled, email verification required, removed members and unauthorized capabilities. Uses `SET LOCAL` tenant/workspace/environment context only after membership and capability checks, then queries FORCE-RLS data in a bounded transaction.
- `backend/cmd/api/main.go`: read-only session, workspace capability/environment and platform access endpoints; no payment success/mark-paid mutation. `/readyz` deliberately remains HTTP 503.
- `apps/web/src/lib/mfa-core.js`, `lib/server/mfa.ts`, `actions/admin-mfa.ts`, `components/admin-mfa-form.tsx`, `app/[locale]/admin/mfa/page.tsx`: six-digit RFC6238 TOTP, password-confirmed enrollment, AES-256-GCM encrypted seed stored server-side, persistent five-attempt lockout, replay-proof increasing step and session-bound admin MFA freshness (12 hours). Enforced on the real platform dashboard/actions.
- `infra/migrations/0003_pg01_admin_mfa.sql`: additive auth session/admin MFA persistence. `0004_pg01_environment_rls.sql`: workspace sandbox/live metadata, automatic trigger/backfill, FORCE RLS with membership and context checks, restricted runtime column grants.
- Previous 0001/0002, existing user/admin, and Kotlin native code preserved. No real merchant data fixtures added to production.

## Automated evidence (simulation against ephemeral local PostgreSQL)
[GitHub Actions run 38117671893](https://github.com/masharzy/ekmivo/actions/runs/38117671893), commit `c29287ba`, all three jobs PASS:
- `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `node scripts/pg00-smoke.mjs`, then `node scripts/pg01-rls-smoke.mjs`: migrations 0001–0004 on isolated PostgreSQL 17; three separate tenants × sandbox/live; FORCE RLS, missing/forged context denial, cross-tenant/environment denial, owner vs viewer write, removed and disabled members, auto seeded contexts, rollback and pooled connection cleanup.
- `go test ./...`, `go test ./internal/authz -run TestPostgresSessionMembershipAndEnvironment -count=1 -v`: Go session revocation/disabled/verified toggle, role changes, platform TOTP-gated authorization and three workspace memberships, with PostgreSQL runtime login.
- `node scripts/pg01-mfa-smoke.mjs`: RFC6238 vectors, TOTP reuse denial and AES-GCM primitive checks.
- Kotlin `:app:assembleDebug :app:testDebugUnitTest` still green, but **no Android UI/receipt expansion in PG01**.

## Production database observation — real Neon, not synthetic payment evidence
Project Ekmivo, database `ekmivo`, Singapore. Existing 0001/0002 not re-run. Additive `0003` and `0004` applied in transaction, then inspected:
- Existing user count unchanged (1), existing business 1. Two logical environment rows and two settings rows, **not live financial sandbox/provider integration**.
- 2 tables with both RLS and FORCE RLS, 3 RLS policies, new workspace-context auto-seed trigger.
- `ekmivo_financial_runtime` created by explicit SQL (not Neon role API), has LOGIN and **no** SUPERUSER/BYPASSRLS/CREATEROLE/CREATEDB/INHERIT/neon_superuser membership or schema CREATE. It can read required control-plane columns; it cannot read `app_users.password_hash` or `platform_admin_mfa.secret_ciphertext`.
- `MFA_ENCRYPTION_KEY` generated securely and configured only in Vercel production encrypted environment; no secret appears in source or evidence.
- Attempted read-only `SET LOCAL ROLE ekmivo_financial_runtime` through Neon owner's management connection was denied because owner is not a member. This is **not** an RLS test failure nor proof of a live runtime connection. CI uses a direct nonowner runtime login and verified missing context/tenant isolation there.
- Neon API-generated unused role `ekmivo_runtime` was shown to inherit `neon_superuser` and have BYPASSRLS. Privilege reductions were denied by Neon; the role is **not used or granted application access**. Its removal requires explicit operator approval.

## Remaining PG01 acceptance gates — do not proceed to PG02
1. Real owner enrolls with own password and a TOTP authenticator at `/bn/admin/mfa` (or `/en/admin/mfa`). Verify repeated/stale codes, restart, logout/revocation, and admin action gating on actual production session without exposing seed.
2. Connect persistent Go API to the restricted `ekmivo_financial_runtime` role via server-only `AUTHZ_DATABASE_URL` (retrieve from Neon in secret channel) and run **production read-only** runtime-role/missing-context and negative tenant tests without creating fictitious merchant transactions or impersonating users. The Go financial API and worker are not hosted/ready yet.
3. Independently verify admin MFA/role change UI on production deployment, log/access controls, recovery/runbook. Record redacted results; no untested capacity/safety claim.
4. Securely remove the unused elevated Neon API-created role **after owner approval**; never replace it with a financial API credential.

**No payment API, matching engine, provider receipt, signed merchant webhook, device or live transaction is implemented or tested by PG01.** PG06 signer/validation source and AN03 APK source remain partial, as required by the owner's payment-first serial instruction.

## Render deployment and production RLS startup observation (2026-10-11)

**Verified:** Render service `srv-db5j532d0e5s73fli4h0` at `https://ekmivo-go-api.onrender.com` (Singapore, free plan) built commit `16fd3351` and deployed live as `dep-db5j7e8473hc73bcd8j0`. Go service configured with server-side `AUTHZ_DATABASE_URL` and `EKMIVO_REQUIRE_AUTHZ=true` (credential never logged). Render runtime log at 06:59:29 UTC: `PG01 authz runtime PASS: nonprivileged role and no-context tenant isolation verified`. The Go startup executes a read-only transaction after checking runtime role `ekmivo_financial_runtime`, clears transaction-local context, queries the two FORCE-RLS tables and rejects any exposed rows. Service is deployed and listening on port 10000. `/readyz` still reports financial services not implemented.

**Production MFA owner observation:** Real Neon read-only query returned one confirmed administrator MFA enrollment and one active session with recent MFA, maintaining one Super Admin; no OTP seed/session contents copied.

**Not yet verified:** authentic HTTP session forwarded through approved Next.js proxy to Go; live revoked/expired and cross-tenant HTTP negative tests; browser admin role mutation denial and repeated-code scenarios; recovery/incident procedures. Isolated Go/Postgres tests cover these paths but are not production HTTP evidence. PG01 remains **OPEN** pending those checks. PG02 not started. Android PG06/AN03 remain partial, not acceptance.
