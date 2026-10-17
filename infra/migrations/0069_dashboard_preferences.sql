-- Control database: personal preferences are scoped to both member and workspace.
CREATE TABLE dashboard_user_preferences (
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 hide_customer_numbers boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,workspace_id),
 FOREIGN KEY(workspace_id,user_id) REFERENCES workspace_members(workspace_id,user_id) ON DELETE CASCADE
);
ALTER TABLE dashboard_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_user_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY dashboard_preferences_owner ON dashboard_user_preferences TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON dashboard_user_preferences FROM PUBLIC,ekmivo_financial_runtime,ekmivo_runtime;
CREATE FUNCTION dashboard_preferences(w uuid,a uuid,hidden boolean DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE member_role text;BEGIN
 PERFORM pg13_actor(w,a,false);
 SELECT role INTO member_role FROM workspace_members WHERE workspace_id=w AND user_id=a;
 IF hidden IS NOT NULL THEN
  INSERT INTO dashboard_user_preferences(user_id,workspace_id,hide_customer_numbers) VALUES(a,w,CASE WHEN member_role='viewer' THEN true ELSE hidden END)
  ON CONFLICT(user_id,workspace_id) DO UPDATE SET hide_customer_numbers=excluded.hide_customer_numbers,updated_at=now();
 END IF;
 RETURN jsonb_build_object('hide_customer_numbers',CASE WHEN member_role='viewer' THEN true ELSE coalesce((SELECT hide_customer_numbers FROM dashboard_user_preferences WHERE user_id=a AND workspace_id=w),true) END);
END $$;
REVOKE ALL ON FUNCTION dashboard_preferences(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_preferences(uuid,uuid,boolean) TO ekmivo_financial_runtime,ekmivo_runtime;
