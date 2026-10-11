# ADR-0002 — PostgreSQL authorization runtime and RLS role boundary

Status: Accepted architecture, PG01 acceptance evidence remains open. Date: 2026-10-11.

## Decision
Keep original scrypt/opaque-cookie identities from migrations 0001/0002, and enforce a fresh session/member/capability check within Go for every financial request. Bind `user_id`, `workspace_id`, and `environment` in transaction-local `set_config(...,true)` only after checking disabled/revoked status, workspace membership, environment and capability. The database's tenant-owned tables require `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, scoped to those values. Transaction commit/rollback must release context to protect pooled connections. Never treat client-supplied custom PostgreSQL GUCs as credentials: authorization and RLS are separate layers.

## Production SQL role
The Neon API created `ekmivo_runtime` with elevated `neon_superuser` membership and `BYPASSRLS`; Neon denied changing those privileges. It is unused and must not be pointed at Go. Direct SQL provisioned **`ekmivo_financial_runtime`** with LOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOINHERIT and no elevated membership. Runtime self-validation rejects elevated/owner roles and refuses to serve. Only column-limited control-plane SELECT grants and RLS-protected environment reads/authorized updates were assigned. The role credential must be supplied to Go only as a server-side secret; it is not `DATABASE_URL` in the Next.js client.

## Migrations
Preserve previous applied 0001/0002. Additive 0003 contains session/admin MFA fields; additive 0004 contains environment RLS and future-workspace seed trigger. Both applied on Neon after real PostgreSQL isolated CI; no destructive SQL used. Sandbox/live context rows do not imply providers or payment flows are operational.

## Security invariants
No runtime table ownership/BYPASSRLS, no reading password hashes, MFA seeds, or broader admin writes. No browser payment success authority. Session invalidation, email verification toggle, removed memberships, role/capability boundaries and platform TOTP are validated in Go as well as Next.js. Administrator TOTP is deliberately separate from the optional email-verification setting.

## Outstanding verification
Actual Go production host deployment, secure role connection, owner MFA enrollment/live session negative tests, incident/recovery procedures and remaining financial schema are not verified. PG01 acceptance stays open until the required evidence exists. No PG02 until accepted.
