-- Control database only. Preserve membership/privacy checks and support replies.
BEGIN;
DO $fix$
DECLARE definition text;
BEGIN
 IF to_regclass('public.auth_sessions') IS NULL OR to_regclass('public.financial_realm') IS NOT NULL THEN
 RAISE EXCEPTION '0065 requires the control-plane database'; END IF;
 definition:=pg_get_functiondef('pg13_workspace_read(uuid,uuid,text)'::regprocedure);
 IF position('DECLARE role text' IN definition)>0 THEN
  definition:=replace(definition,'DECLARE role text','DECLARE actor_role text');
  definition:=replace(definition,'role:=pg13_actor','actor_role:=pg13_actor');
  definition:=replace(definition,'WHEN role IN','WHEN actor_role IN');
  definition:=replace(definition,'OR role IN','OR actor_role IN');
  EXECUTE definition;
 ELSIF position('DECLARE actor_role text' IN definition)=0 THEN
  RAISE EXCEPTION 'unknown workspace read function; inspect before migration';
 END IF;
END $fix$;
COMMIT;
