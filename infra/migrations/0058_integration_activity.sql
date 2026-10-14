-- Additive, realm-local activity view. Never expose request bodies, URL queries,
-- credentials, receipt contents, free-text audit reasons or export ciphertext.
BEGIN;
CREATE TABLE pg58_delivery_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),delivery_id uuid NOT NULL REFERENCES pg08_deliveries(id),
 workspace_id uuid NOT NULL,environment text NOT NULL,status text NOT NULL,attempts integer NOT NULL,
 http_status integer,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pg58_delivery_trace ON pg58_delivery_attempts(workspace_id,environment,delivery_id,created_at,id);
ALTER TABLE pg58_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg58_delivery_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY pg58_delivery_owner ON pg58_delivery_attempts TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON pg58_delivery_attempts FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE TRIGGER pg58_delivery_immutable BEFORE UPDATE OR DELETE ON pg58_delivery_attempts FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();
CREATE FUNCTION pg58_record_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF (OLD.status,OLD.attempts,OLD.http_status,OLD.reason) IS DISTINCT FROM (NEW.status,NEW.attempts,NEW.http_status,NEW.reason) THEN
  INSERT INTO pg58_delivery_attempts(delivery_id,workspace_id,environment,status,attempts,http_status,reason)
  VALUES(NEW.id,NEW.workspace_id,NEW.environment,NEW.status,NEW.attempts,NEW.http_status,left(NEW.reason,120));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pg58_delivery_attempt AFTER UPDATE ON pg08_deliveries FOR EACH ROW EXECUTE FUNCTION pg58_record_delivery();
CREATE FUNCTION pg58_delivery_history(w uuid,e text,d uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id,status,attempts,http_status,reason,created_at
  FROM pg58_delivery_attempts WHERE workspace_id=w AND environment=e AND delivery_id=d ORDER BY created_at DESC,id DESC LIMIT 100)t),'[]');
END $$;
REVOKE ALL ON FUNCTION pg58_record_delivery(),pg58_delivery_history(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg58_delivery_history(uuid,text,uuid) TO ekmivo_finance_reader;
CREATE TABLE pg58_api_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 method text NOT NULL CHECK(method IN ('GET','POST','PATCH','DELETE','PUT')),
 route text NOT NULL CHECK(length(route)<=160),http_status integer NOT NULL CHECK(http_status BETWEEN 100 AND 599),
 duration_ms bigint NOT NULL CHECK(duration_ms>=0),correlation_id text NOT NULL CHECK(correlation_id ~ '^[0-9a-f]{24}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
CREATE INDEX pg58_api_scope ON pg58_api_activity(workspace_id,environment,created_at DESC,id DESC);
ALTER TABLE pg58_api_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg58_api_activity FORCE ROW LEVEL SECURITY;
CREATE POLICY pg58_api_owner ON pg58_api_activity TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON pg58_api_activity FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg58_record_api(w uuid,e text,m text,path text,status integer,elapsed bigint,correlation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);
 INSERT INTO pg58_api_activity(workspace_id,environment,method,route,http_status,duration_ms,correlation_id)
 VALUES(w,e,m,path,status,elapsed,correlation);
END $$;
CREATE FUNCTION pg58_activity_read(w uuid,e text,kind text,actor uuid,cursor_id uuid,q text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; stamp timestamptz; BEGIN
 PERFORM pg06_scope(w,e);
 IF kind NOT IN('audit','api','exports') OR length(coalesce(q,''))>96 OR actor IS NULL THEN
  RAISE EXCEPTION 'invalid activity input' USING ERRCODE='22023';
 END IF;
 IF kind='audit' THEN
  IF cursor_id IS NOT NULL THEN SELECT occurred_at INTO stamp FROM pg09_audit WHERE id=cursor_id AND workspace_id=w AND environment=e; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM (
   SELECT id,actor_id,resource,resource_id,split_part(action,':',1) AS action,occurred_at AS created_at FROM pg09_audit
   WHERE workspace_id=w AND environment=e AND (cursor_id IS NULL OR (occurred_at,id)<(stamp,cursor_id))
   AND (q IS NULL OR strpos(lower(resource||' '||split_part(action,':',1)),lower(q))>0)
   ORDER BY occurred_at DESC,id DESC LIMIT 50)t;
 ELSIF kind='api' THEN
  IF cursor_id IS NOT NULL THEN SELECT created_at INTO stamp FROM pg58_api_activity WHERE id=cursor_id AND workspace_id=w AND environment=e; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM (
   SELECT id,method,route,http_status,duration_ms,correlation_id,created_at FROM pg58_api_activity
   WHERE workspace_id=w AND environment=e AND (cursor_id IS NULL OR (created_at,id)<(stamp,cursor_id))
   AND (q IS NULL OR strpos(lower(route||' '||http_status::text||' '||correlation_id),lower(q))>0)
   ORDER BY created_at DESC,id DESC LIMIT 50)t;
 ELSE
  IF cursor_id IS NOT NULL THEN SELECT created_at INTO stamp FROM pg10_exports WHERE id=cursor_id AND workspace_id=w AND environment=e AND actor_id=actor; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM (
   SELECT id,resource,created_at,expires_at FROM pg10_exports WHERE workspace_id=w AND environment=e AND actor_id=actor
   AND (cursor_id IS NULL OR (created_at,id)<(stamp,cursor_id)) AND (q IS NULL OR strpos(lower(resource),lower(q))>0)
   ORDER BY created_at DESC,id DESC LIMIT 50)t;
 END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',CASE WHEN jsonb_array_length(result)=50 THEN result->49->>'id' END);
END $$;
REVOKE ALL ON FUNCTION pg58_record_api(uuid,text,text,text,integer,bigint,text),pg58_activity_read(uuid,text,text,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg58_record_api(uuid,text,text,text,integer,bigint,text),pg58_activity_read(uuid,text,text,uuid,uuid,text) TO ekmivo_finance_reader;
COMMIT;
