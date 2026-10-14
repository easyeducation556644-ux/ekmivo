-- Control plane only. This published TEST credential is deliberately public;
-- merchant_api_keys still stores only its hash. It can never address Live.
BEGIN;
CREATE TABLE public_sandbox_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id),
 key_id uuid NOT NULL REFERENCES merchant_api_keys(id),
 published_test_key text NOT NULL CHECK(published_test_key ~ '^ek_test_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$'),
 api_origin text CHECK(api_origin ~ '^https://[^/?#]+$'),
 enabled boolean NOT NULL DEFAULT false,
 updated_by uuid NOT NULL REFERENCES app_users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public_sandbox_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_sandbox_config FORCE ROW LEVEL SECURITY;
CREATE POLICY public_sandbox_owner ON public_sandbox_config TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON public_sandbox_config FROM PUBLIC,ekmivo_financial_runtime;
COMMIT;
