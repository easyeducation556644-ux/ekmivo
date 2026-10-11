-- PG02 control-plane product access state. This is NOT paid subscription proof.
-- Root Next.js server confirms membership before any write; financial Go runtime
-- reads the enabled payment product only under transaction-local tenant RLS.
-- Additive and backward compatible: 0001-0004 remain untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS workspace_product_access (
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 product text NOT NULL CHECK(product IN ('ai','payments')),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,product)
);
INSERT INTO workspace_product_access(workspace_id,product,enabled)
 SELECT id,'ai',service_mode IN ('ai','both') FROM workspaces
 ON CONFLICT DO NOTHING;
INSERT INTO workspace_product_access(workspace_id,product,enabled)
 SELECT id,'payments',service_mode IN ('commerce','both') FROM workspaces
 ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS workspace_product_access_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 product text NOT NULL CHECK(product IN ('ai','payments')),
 previous_enabled boolean NOT NULL,
 new_enabled boolean NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_product_access_audit_business_idx
 ON workspace_product_access_audit(workspace_id,changed_at DESC);

CREATE OR REPLACE FUNCTION seed_workspace_product_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO workspace_product_access(workspace_id,product,enabled)
 VALUES(NEW.id,'ai',NEW.service_mode IN ('ai','both')),
       (NEW.id,'payments',NEW.service_mode IN ('commerce','both'))
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END
$$;
CREATE TRIGGER workspace_product_access_after_insert
 AFTER INSERT ON workspaces
 FOR EACH ROW EXECUTE FUNCTION seed_workspace_product_access();

GRANT SELECT (workspace_id,product,enabled) ON workspace_product_access
 TO ekmivo_financial_runtime;
ALTER TABLE workspace_product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_product_access FORCE ROW LEVEL SECURITY;
CREATE POLICY pg02_runtime_product_read ON workspace_product_access
 FOR SELECT TO ekmivo_financial_runtime
 USING (
  workspace_id=NULLIF(current_setting('ekmivo.workspace_id',true),'')::uuid
  AND EXISTS (
   SELECT 1 FROM workspace_members m JOIN app_users u ON u.id=m.user_id
   WHERE m.workspace_id=workspace_product_access.workspace_id
   AND m.user_id=NULLIF(current_setting('ekmivo.user_id',true),'')::uuid
   AND u.disabled_at IS NULL
  )
 );
COMMIT;
