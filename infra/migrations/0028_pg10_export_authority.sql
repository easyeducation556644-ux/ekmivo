BEGIN;
CREATE FUNCTION pg10_export_authorized(w uuid,a uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w AND m.user_id=a AND m.role IN ('owner','admin') AND u.disabled_at IS NULL) $$;
REVOKE ALL ON FUNCTION pg10_export_authorized(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_export_authorized(uuid,uuid) TO ekmivo_financial_projection;
COMMIT;
