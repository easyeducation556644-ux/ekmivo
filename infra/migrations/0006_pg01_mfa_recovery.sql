-- PG01 additive recovery lifecycle. Existing enrollments remain untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS platform_admin_recovery_codes (
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 code_hash char(64) NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,code_hash)
);
COMMIT;
