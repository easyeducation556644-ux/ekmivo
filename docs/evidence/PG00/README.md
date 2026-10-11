# PG00 — foundation evidence

## PG00 execution checkpoint — 2026-10-11

Status: **in progress, not accepted**. Docker is excluded from laptop execution at the owner's request; use hosted isolated test databases for database checks. No database migration or financial write was performed.

- Vercel CLI verified `masharzys-projects/ekmivo-web`. Development env has no DATABASE_URL; production env was pulled into a separate Git-ignored server-only local file. Existing `.env.local` was preserved. Credentials are not included in this repository or handoff.
- Read-only hosted PostgreSQL inspection succeeded. Existing public tables: app_users, auth_attempts, auth_one_time_codes, auth_sessions, platform_admin_audit, platform_administrators, platform_auth_settings, workspace_members, workspaces. No schema_migrations table exists. Do not blindly replay 0002: its named ADD CONSTRAINT is not repeatable. Establish verified baseline/history before implementing the migration runner.
- Auth/workspace duplicate error toast effects removed; inline errors retained. Landing reduced-motion uses an external-store subscription with conservative SSR snapshot and stops autoplay when OS preference changes.
- Targeted ESLint on the three changed components and database inspector, followed by TypeScript noEmit, exited successfully. Earlier whole lint output is historical; fresh full lint/build checks remain required for PG00 acceptance.
- `apps/web/scripts/inspect-database.mjs` runs a read-only transaction and prints schema table names only; connection errors are redacted. Invoke with a server-only DATABASE_URL via environment, not command arguments.
- Active CI, isolated migration/integration database and complete clean-build evidence remain open. Financial engine and Android bridge remain unimplemented.

Cloud agent starts at PG00 with the committed source and docs. Provision secrets via its approved environment; GitHub contains no database credential. The owner's supplied production connection is not an integration-test target.

## CI acceptance update — 2026-10-11

**PG00 baseline accepted for F01/S45 foundation**, following independent GitHub Actions [run 38114530626](https://github.com/masharzy/ekmivo/actions/runs/38114530626) (commit `2b9fea86361c61f1b5bf9720c32603d05d76e155`). Web: `npm ci`, `npm run lint`, isolated loopback PostgreSQL 17 smoke against `0001`/`0002`, `npx tsc --noEmit`, `npm run build` **all passed**. Go: `go test ./...`, API and worker `go build` **passed**. `/readyz` intentionally remains 503, not a running money service. No production database changes or provider/device tests; see CI log for exact independent results.

Native client changes made subsequently have their own Android acceptance evidence, not implicit PG00 financial acceptance. Backend hosts, receipt matching, real devices, cloud secrets and actual payment throughput remain PG01–PG17 release dependencies.
