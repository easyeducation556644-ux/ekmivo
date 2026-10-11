-- PG01 part A: safe additive administrator MFA persistence.
-- Can be applied without the financial runtime SQL role. Never replay 0001/0002.
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
COMMIT;
