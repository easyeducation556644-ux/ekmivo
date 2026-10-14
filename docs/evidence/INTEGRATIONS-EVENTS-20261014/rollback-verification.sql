BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
DO $$ BEGIN IF current_database()<>'ekmivo_sandbox_financial' OR current_user<>'ekmivo_sandbox_owner' OR (SELECT environment FROM financial_realm WHERE singleton)<>'sandbox' OR to_regclass('public.pg58_api_activity') IS NOT NULL OR EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id IN('f0580001-0000-4000-8000-000000000001'::uuid,'f0580002-0000-4000-8000-000000000002'::uuid)) THEN RAISE EXCEPTION 'sandbox rollback test guard failed';END IF; END $$;

-- Additive, realm-local activity view. Never expose request bodies, URL queries,
-- credentials, receipt contents, free-text audit reasons or export ciphertext.

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

INSERT INTO financial_workspace_registry(workspace_id,environment,status,entitlement_version) VALUES('f0580001-0000-4000-8000-000000000001','sandbox','active',1),('f0580002-0000-4000-8000-000000000002','sandbox','active',1);

SELECT set_config('ekmivo.workspace_id','f0580001-0000-4000-8000-000000000001',true),set_config('ekmivo.environment','sandbox',true);

SELECT pg58_record_api('f0580001-0000-4000-8000-000000000001','sandbox','POST','POST /v1/workspaces/{workspaceID}/payment-intents',201,42,'111111111111111111111111');

INSERT INTO pg09_audit(workspace_id,environment,resource,action)VALUES('f0580001-0000-4000-8000-000000000001','sandbox','webhooks','rotate: PRIVATE_TEST_NOTE_MUST_NOT_RETURN');

DO $$ DECLARE result jsonb; BEGIN
 result:=pg58_activity_read('f0580001-0000-4000-8000-000000000001','sandbox','api','f0580001-0000-4000-8000-000000000001',NULL,NULL);
 IF jsonb_array_length(result->'items')<>1 OR result->'items'->0->>'http_status'<>'201' THEN RAISE EXCEPTION 'API metadata mismatch'; END IF;
 result:=pg58_activity_read('f0580001-0000-4000-8000-000000000001','sandbox','audit','f0580001-0000-4000-8000-000000000001',NULL,NULL);
 IF result->'items'->0->>'action'<>'rotate' OR result::text LIKE '%PRIVATE_TEST_NOTE%' THEN RAISE EXCEPTION 'audit minimization failed';END IF;
 BEGIN PERFORM pg58_activity_read('f0580002-0000-4000-8000-000000000002','sandbox','api','f0580001-0000-4000-8000-000000000001',NULL,NULL);RAISE EXCEPTION 'wrong tenant accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM pg58_activity_read('f0580001-0000-4000-8000-000000000001','live','api','f0580001-0000-4000-8000-000000000001',NULL,NULL);RAISE EXCEPTION 'wrong realm accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF has_table_privilege('ekmivo_finance_reader','pg58_api_activity','SELECT') OR has_table_privilege('ekmivo_finance_reader','pg58_delivery_attempts','SELECT') OR has_function_privilege('public','pg58_activity_read(uuid,text,text,uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'direct/public privilege leaked';END IF;
 IF NOT has_function_privilege('ekmivo_finance_reader','pg58_activity_read(uuid,text,text,uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'runtime function grant missing';END IF;
 END $$;

SELECT set_config('ekmivo.workspace_id','f0580002-0000-4000-8000-000000000002',true);

DO $$ BEGIN IF jsonb_array_length(pg58_activity_read('f0580002-0000-4000-8000-000000000002','sandbox','api','f0580001-0000-4000-8000-000000000001',NULL,NULL)->'items')<>0 THEN RAISE EXCEPTION 'cross tenant data leaked';END IF;END $$;

SELECT set_config('ekmivo.workspace_id','',true);

DO $$ BEGIN BEGIN PERFORM pg58_activity_read('f0580001-0000-4000-8000-000000000001','sandbox','api','f0580001-0000-4000-8000-000000000001',NULL,NULL);RAISE EXCEPTION 'missing context accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;

SELECT set_config('ekmivo.workspace_id','f0580001-0000-4000-8000-000000000001',true);

INSERT INTO pg08_endpoints(id,workspace_id,environment,url,secret,active)VALUES('f0580004-0000-4000-8000-000000000004','f0580001-0000-4000-8000-000000000001','sandbox','https://example.test/rollback-fixture',decode(repeat('11',48),'hex'),false);

INSERT INTO pg07_events(id,workspace_id,environment,event_type,payload)VALUES('f0580003-0000-4000-8000-000000000003','f0580001-0000-4000-8000-000000000001','sandbox','payment.expired','{"type":"payment.expired","data":{"fixture":true}}');

INSERT INTO pg08_deliveries(id,workspace_id,environment,endpoint_id,event_id)VALUES('f0580005-0000-4000-8000-000000000005','f0580001-0000-4000-8000-000000000001','sandbox','f0580004-0000-4000-8000-000000000004','f0580003-0000-4000-8000-000000000003');

UPDATE pg08_deliveries SET status='sending',attempts=1 WHERE id='f0580005-0000-4000-8000-000000000005';

UPDATE pg08_deliveries SET status='failed',http_status=503,reason='transport_unknown' WHERE id='f0580005-0000-4000-8000-000000000005';

UPDATE pg08_deliveries SET status='failed',http_status=503,reason='transport_unknown' WHERE id='f0580005-0000-4000-8000-000000000005';

DO $$ DECLARE history jsonb;BEGIN history:=pg58_delivery_history('f0580001-0000-4000-8000-000000000001','sandbox','f0580005-0000-4000-8000-000000000005');IF jsonb_array_length(history)<>2 THEN RAISE EXCEPTION 'attempt timeline missing or duplicate';END IF;IF history->0 ? 'secret' OR history->0 ? 'response_body' THEN RAISE EXCEPTION 'unsafe delivery metadata';END IF;BEGIN UPDATE pg58_delivery_attempts SET reason='changed' WHERE delivery_id='f0580005-0000-4000-8000-000000000005';RAISE EXCEPTION 'immutable attempt history changed';EXCEPTION WHEN SQLSTATE '55000' THEN NULL;END;END $$;

SELECT 'PASS: rollback SQL includes delivery-attempt trigger, idempotent history, immutable trail, scoped API/audit metadata and grant checks' AS evidence;

ROLLBACK;
