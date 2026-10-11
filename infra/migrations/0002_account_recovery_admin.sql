-- 0002 / account recovery, verification and platform administration.
-- Do not seed demo admins, users, email codes, or provider secrets.
BEGIN;
CREATE TABLE IF NOT EXISTS platform_auth_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  email_verification_enabled boolean NOT NULL DEFAULT false,
  email_provider text NOT NULL DEFAULT 'resend' CHECK(email_provider IN ('resend')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL
);
INSERT INTO platform_auth_settings (singleton,email_verification_enabled)
VALUES (true,false) ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth_one_time_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  code_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_one_time_codes_lookup_idx
 ON auth_one_time_codes(user_id,purpose,created_at DESC);

ALTER TABLE platform_administrators
 ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'super_admin';
ALTER TABLE platform_administrators
 DROP CONSTRAINT IF EXISTS platform_administrators_role_check;
ALTER TABLE platform_administrators
 ADD CONSTRAINT platform_administrators_role_check
 CHECK (role IN ('super_admin','admin','support','analyst'));

CREATE TABLE IF NOT EXISTS platform_admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 action text NOT NULL,
 subject_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
 description text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_admin_audit_time_idx
 ON platform_admin_audit(occurred_at DESC);

COMMIT;
