-- PG01 additive tenant/environment authorization baseline.
-- IMPORTANT: provision the dedicated ekmivo_runtime role separately before applying.
-- Never use table owner, postgres superuser or BYPASSRLS for financial API transactions.
-- Auth identity and pre-existing 0001/0002 tables remain intact.
BEGIN;

ALTER TABLE auth_sessions
 ADD COLUMN IF NOT EXISTS mfa_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS platform_admin_mfa (
 user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 secret_ciphertext text NOT NULL,
 confirmed_at timestamptz,
 last_used_step bigint NOT NULL DEFAULT -1,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_admin_mfa_attempts (
 user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
 blocked_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_environments (
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 environment text NOT NULL CHECK(environment IN ('sandbox','live')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,environment)
);
INSERT INTO workspace_environments(workspace_id,environment)
 SELECT w.id,e.environment
 FROM workspaces w CROSS JOIN (VALUES('sandbox'),('live')) e(environment)
 ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS workspace_environment_settings (
 workspace_id uuid NOT NULL,
 environment text NOT NULL,
 checkout_expiry_minutes integer NOT NULL DEFAULT 15
  CHECK(checkout_expiry_minutes BETWEEN 5 AND 120),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,environment),
 FOREIGN KEY (workspace_id,environment)
  REFERENCES workspace_environments(workspace_id,environment) ON DELETE CASCADE
);
INSERT INTO workspace_environment_settings(workspace_id,environment)
 SELECT workspace_id,environment FROM workspace_environments ON CONFLICT DO NOTHING;

-- The runtime SQL role is provisioned OUTSIDE migration as a NOLOGIN / nonsuperuser
-- role with NO BYPASSRLS and no table ownership. Applying this without that role
-- deliberately fails; do not silently fall back to privileged application queries.
GRANT USAGE ON SCHEMA public TO ekmivo_runtime;
GRANT SELECT ON app_users,auth_sessions,workspace_members,workspaces,platform_administrators,
 platform_auth_settings TO ekmivo_runtime;
GRANT SELECT (user_id,confirmed_at) ON platform_admin_mfa TO ekmivo_runtime;
GRANT SELECT ON workspace_environments,workspace_environment_settings TO ekmivo_runtime;
GRANT UPDATE (checkout_expiry_minutes,updated_at)
 ON workspace_environment_settings TO ekmivo_runtime;

ALTER TABLE workspace_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_environments FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_environment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_environment_settings FORCE ROW LEVEL SECURITY;

-- RLS is defense in depth; custom session variables are not credentials.
-- Go must authorize the opaque session, workspace role/capability and environment
-- before setting LOCAL transaction context on a nonowner connection.
CREATE POLICY workspace_environments_scope_select ON workspace_environments
 FOR SELECT TO ekmivo_runtime
 USING (
  workspace_id = NULLIF(current_setting('ekmivo.workspace_id',true),'')::uuid
  AND environment = current_setting('ekmivo.environment',true)
  AND status='active'
  AND EXISTS (
   SELECT 1 FROM workspace_members m JOIN app_users u ON u.id=m.user_id
   WHERE m.workspace_id=workspace_environments.workspace_id
   AND m.user_id=NULLIF(current_setting('ekmivo.user_id',true),'')::uuid
   AND u.disabled_at IS NULL
  )
 );
CREATE POLICY workspace_environment_settings_scope_select ON workspace_environment_settings
 FOR SELECT TO ekmivo_runtime
 USING (
  workspace_id = NULLIF(current_setting('ekmivo.workspace_id',true),'')::uuid
  AND environment=current_setting('ekmivo.environment',true)
  AND EXISTS (
   SELECT 1 FROM workspace_environments e
   WHERE e.workspace_id=workspace_environment_settings.workspace_id
   AND e.environment=workspace_environment_settings.environment
  )
 );
CREATE POLICY workspace_environment_settings_scope_update ON workspace_environment_settings
 FOR UPDATE TO ekmivo_runtime
 USING (
  workspace_id = NULLIF(current_setting('ekmivo.workspace_id',true),'')::uuid
  AND environment=current_setting('ekmivo.environment',true)
  AND EXISTS (
   SELECT 1 FROM workspace_members m
   WHERE m.workspace_id=workspace_environment_settings.workspace_id
   AND m.user_id=NULLIF(current_setting('ekmivo.user_id',true),'')::uuid
   AND m.role IN ('owner','admin')
  )
  AND EXISTS (
   SELECT 1 FROM workspace_environments e
   WHERE e.workspace_id=workspace_environment_settings.workspace_id
   AND e.environment=workspace_environment_settings.environment
  )
 )
 WITH CHECK (
  workspace_id = NULLIF(current_setting('ekmivo.workspace_id',true),'')::uuid
  AND environment=current_setting('ekmivo.environment',true)
  AND EXISTS (
   SELECT 1 FROM workspace_members m
   WHERE m.workspace_id=workspace_environment_settings.workspace_id
   AND m.user_id=NULLIF(current_setting('ekmivo.user_id',true),'')::uuid
   AND m.role IN ('owner','admin')
  )
 );

COMMIT;
