# Ekmivo — Neon authentication / workspace setup

## Status and security boundaries

The web uses Next.js RSC for all protected read routes. Login, registration, logout and workspace creation use Server Actions. Database queries, hashed passwords, session tokens, membership checks and platform-admin lookup stay on the server. Server Actions/RSC requests still appear in DevTools, but database URLs, SQL statements and credentials are never bundled for browsers.

**Not live until configured:** The schema is committed but has not been applied to Neon. No database credentials were supplied in this conversation. User accounts, email verification, password reset, merchant providers and admin operations are not enabled or tested with a live database. No fake transactions populate dashboards. Account emails are stored unverified until email delivery and ownership checks are implemented; do not enable financial operations in this state.

## Environment variables

In Vercel Project → Settings → Environment Variables, add:

- `DATABASE_URL`: **pooled** Neon Postgres URL with SSL (`postgresql://...-pooler.../?sslmode=require`). Add separately to Production, Preview and Development using separate Neon branches/databases to avoid test data touching production.
- `NODE_ENV`: Vercel sets `production` automatically for production builds. Do not manually invent `NEXT_PUBLIC_DATABASE_URL`.

No static `AUTH_SECRET` is required for the current opaque, randomly generated 256-bit sessions: only SHA-256 token hashes are stored server-side, and browser cookies use `HttpOnly`, `Secure` in production and `SameSite=Lax`. Tokens can be revoked via the session table. Never send the `DATABASE_URL` or credentials over chat or GitHub commits.

### Apply the SQL migration

From Neon's SQL Editor on the **intended environment/database**, execute the reviewed `infra/migrations/0001_auth_workspaces.sql` once; alternatively, locally run `psql "$DIRECT_DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/migrations/0001_auth_workspaces.sql`. The direct URL should have SSL required. The migration creates tables for users, sessions, authentication attempts, workspaces, memberships and explicitly authorized platform admins. It creates **no test accounts or initial platform admins**.

### First platform administrator

1. Register your own account after the database connection and migration are configured.
2. Verify ownership of that email out-of-band before admin provisioning. Automated email verification is not implemented yet.
3. Once ownership is verified, manually record `email_verified_at` through Neon's secured SQL console as an authorized operator, then grant the matching *exact* user ID in `platform_administrators`. Never grant admin merely because a user entered a special email at registration. Use a transaction and independently inspect the user ID and email first:
   ```sql
   BEGIN;
   SELECT id,email,email_verified_at FROM app_users WHERE email = lower('verified-admin@example.com');
   -- Only after confirming identity and email ownership:
   -- UPDATE app_users SET email_verified_at=now() WHERE id='<verified-user-uuid>';
   -- INSERT INTO platform_administrators(user_id) VALUES ('<verified-user-uuid>') ON CONFLICT DO NOTHING;
   COMMIT;
   ```
4. `/[locale]/admin` remains inaccessible unless both email_verified_at and the platform_administrators record are present. Before production platform-admin use, enable a second factor, admin audit logging and hardened recovery; they are **not implemented yet**.

### Application routes

- `/bn/login`, `/en/register`: server-validated account flows.
- `/[locale]/workspaces`: creates AI, Commerce or Both service configuration and lists the user's workspaces.
- `/[locale]/w/[workspaceId]/dashboard`: merchant home with server-side membership check.
- `/[locale]/w/[workspaceId]/[section]`: server-filtered section list according to service mode.
- `/[locale]/admin`: restricted admin shell, no operational functionality without connected backend services.

Service mode controls navigation, **not paid entitlements**. Provider integrations must check subscriptions and permissions independently. No payment matching or live gateway transaction service is implemented by this milestone.

### Checklist before enabling customer data

- Test with a real Neon development database: registration, duplicate email, 12-character password minimum, invalid login, five-attempt lockout, workspace create/switch and cross-tenant denial.
- Add verified email delivery, reset tokens, robust signup/IP rate limits, bot defenses, MFA (especially admin), device/session management, CSRF/Origin tests, role audits and incident logging.
- Confirm deployment region vs Neon region, queries and indexes under load. The goal is fast, measurable p95 latency rather than a speculative '10x faster' claim.
- Check Vercel and preview builds, both locales, three theme settings, mobile keyboard/touch and server-error toast, before considering production access enabled.
