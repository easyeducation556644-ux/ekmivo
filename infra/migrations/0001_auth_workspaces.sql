-- Ekmivo auth/workspace foundation — apply with psql using Neon's direct DATABASE_URL.
-- All personal/financial records are server-side. No demo rows, super-admin seed or default password.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_email_normalized CHECK (email = lower(trim(email))),
  CONSTRAINT user_display_name_nonblank CHECK (char_length(trim(display_name)) BETWEEN 2 AND 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_key ON app_users (email);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_expires_idx ON auth_sessions (user_id,expires_at);

CREATE TABLE IF NOT EXISTS auth_attempts (
  key_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_mode text NOT NULL CHECK (service_mode IN ('ai','commerce','both')),
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_name_nonblank CHECK (char_length(trim(name)) BETWEEN 2 AND 100)
);
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id,workspace_id);

-- Platform access never follows from workspace ownership or unverified input email.
-- Only an explicitly authorized database operator can bootstrap the first platform admin.
CREATE TABLE IF NOT EXISTS platform_administrators (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES app_users(id) ON DELETE SET NULL
);
COMMIT;
