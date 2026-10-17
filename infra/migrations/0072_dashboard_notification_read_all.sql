BEGIN;
CREATE FUNCTION pg13_notification_read_all(w uuid,e text,actor uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);
 INSERT INTO pg13_notification_reads(notification_id,actor_id,read_at)
 SELECT n.id,actor,now() FROM pg13_notifications n WHERE n.workspace_id=w AND n.environment=e
 ON CONFLICT(notification_id,actor_id) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION pg13_notification_read_all(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_notification_read_all(uuid,text,uuid) TO ekmivo_finance_reader;
COMMIT;
