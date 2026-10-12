-- Control-plane request ledger. Completion requires evidence from every store;
-- accepting a request never claims that financial history/backups were erased.
BEGIN;
CREATE TABLE pg13_privacy_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id),actor_id uuid NOT NULL REFERENCES app_users(id),
 kind text NOT NULL CHECK(kind IN ('export','delete')),request_key text NOT NULL CHECK(length(request_key) BETWEEN 16 AND 128),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','processing','blocked','complete_with_retention','complete','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workspace_id,actor_id,request_key)
);
CREATE TABLE pg13_privacy_stores(
 request_id uuid NOT NULL REFERENCES pg13_privacy_requests(id),store text NOT NULL CHECK(store IN ('control','financial_live','financial_sandbox','private_objects','jobs','android_cache','backups')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','blocked','exported','deleted','retained','not_applicable')),
 evidence_sha256 text CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),reason text CHECK(length(reason) BETWEEN 10 AND 500),retained_until timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(request_id,store)
);
CREATE TABLE pg13_privacy_observations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL REFERENCES pg13_privacy_requests(id),store text NOT NULL,status text NOT NULL,evidence_sha256 text NOT NULL,reason text NOT NULL,retained_until timestamptz,operator_name text NOT NULL DEFAULT current_user,observed_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['pg13_privacy_requests','pg13_privacy_stores','pg13_privacy_observations'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_financial_runtime,ekmivo_financial_projection',t);
END LOOP;END $$;
CREATE FUNCTION pg13_privacy_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'privacy observations are immutable' USING ERRCODE='42501';END $$;
CREATE TRIGGER pg13_privacy_observation_immutable BEFORE UPDATE OR DELETE ON pg13_privacy_observations FOR EACH ROW EXECUTE FUNCTION pg13_privacy_history_guard();
REVOKE ALL ON FUNCTION pg13_privacy_history_guard() FROM PUBLIC;
CREATE FUNCTION pg13_privacy_read(w uuid,a uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF pg13_actor(w,a,false)<>'owner' THEN RAISE EXCEPTION 'owner required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(r)||jsonb_build_object('stores',(SELECT jsonb_agg(to_jsonb(s)-'request_id' ORDER BY store) FROM pg13_privacy_stores s WHERE s.request_id=r.id)) ORDER BY r.created_at DESC) FROM(SELECT * FROM pg13_privacy_requests WHERE workspace_id=w ORDER BY created_at DESC LIMIT 100)r),'[]'));
END $$;
CREATE FUNCTION pg13_privacy_request(w uuid,a uuid,typ text,k text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE r pg13_privacy_requests;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('pg13:control:'||w::text,0));
 IF pg13_actor(w,a,true)<>'owner' OR typ NOT IN ('export','delete') OR length(k) NOT BETWEEN 16 AND 128 THEN RAISE EXCEPTION 'owner/valid request required' USING ERRCODE='42501';END IF;
 SELECT * INTO r FROM pg13_privacy_requests WHERE workspace_id=w AND actor_id=a AND request_key=k;
 IF FOUND THEN IF r.kind<>typ THEN RAISE EXCEPTION 'request key conflict' USING ERRCODE='23505';END IF;RETURN to_jsonb(r);END IF;
 IF EXISTS(SELECT 1 FROM pg13_privacy_requests WHERE workspace_id=w AND kind=typ AND status IN ('requested','processing','blocked')) THEN RAISE EXCEPTION 'request already open' USING ERRCODE='23505';END IF;
 INSERT INTO pg13_privacy_requests(workspace_id,actor_id,kind,request_key) VALUES(w,a,typ,k) RETURNING * INTO r;
 INSERT INTO pg13_privacy_stores(request_id,store) SELECT r.id,unnest(ARRAY['control','financial_live','financial_sandbox','private_objects','jobs','android_cache','backups']);
 INSERT INTO pg13_control_audit(workspace_id,actor_id,action,resource_id) VALUES(w,a,'privacy.'||typ||'.requested',r.id);
 RETURN to_jsonb(r);
END $$;
-- Operator-only evidence ingestion. Never granted to API or worker roles.
CREATE FUNCTION pg13_privacy_observe(item uuid,w uuid,store_name text,state text,proof text,why text,until_time timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE r pg13_privacy_requests;s pg13_privacy_stores;BEGIN
 SELECT * INTO r FROM pg13_privacy_requests WHERE id=item AND workspace_id=w FOR UPDATE;
 IF NOT FOUND OR r.status IN ('complete','cancelled') THEN RAISE EXCEPTION 'open request required' USING ERRCODE='23514';END IF;
 SELECT * INTO s FROM pg13_privacy_stores WHERE request_id=item AND store=store_name FOR UPDATE;
 IF NOT FOUND OR s.status IN('deleted','exported','not_applicable') THEN RAISE EXCEPTION 'open store required' USING ERRCODE='23514';END IF;
 IF (s.status='retained' OR s.retained_until IS NOT NULL) AND state IN('deleted','not_applicable') AND(s.retained_until IS NULL OR s.retained_until>now() OR state='not_applicable') THEN RAISE EXCEPTION 'retained store cannot be erased early' USING ERRCODE='23514';END IF;
 IF state NOT IN ('blocked','exported','deleted','retained','not_applicable') OR proof IS NULL OR proof !~ '^[a-f0-9]{64}$' OR length(btrim(why)) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'reviewed evidence required' USING ERRCODE='22023';END IF;
 IF r.kind='export' AND state IN ('deleted','retained') OR r.kind='delete' AND state='exported' OR state='retained' AND(until_time IS NULL OR until_time<=now()) THEN RAISE EXCEPTION 'invalid disposition' USING ERRCODE='23514';END IF;
 UPDATE pg13_privacy_stores SET status=state,evidence_sha256=proof,reason=why,retained_until=CASE WHEN state='blocked' THEN COALESCE(s.retained_until,until_time) ELSE until_time END,updated_at=now() WHERE request_id=item AND store=store_name;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown store' USING ERRCODE='22023';END IF;
 INSERT INTO pg13_privacy_observations(request_id,store,status,evidence_sha256,reason,retained_until,operator_name) VALUES(item,store_name,state,proof,why,until_time,session_user);
 UPDATE pg13_privacy_requests SET status=CASE
 WHEN EXISTS(SELECT 1 FROM pg13_privacy_stores WHERE request_id=item AND status='blocked') THEN 'blocked'
 WHEN EXISTS(SELECT 1 FROM pg13_privacy_stores WHERE request_id=item AND status='pending') THEN 'processing'
 WHEN EXISTS(SELECT 1 FROM pg13_privacy_stores WHERE request_id=item AND status='retained') THEN 'complete_with_retention'
 ELSE 'complete' END,updated_at=now() WHERE id=item;
 RETURN true;
END $$;
CREATE FUNCTION pg13_privacy_cancel(item uuid,w uuid,a uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE r pg13_privacy_requests;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('pg13:control:'||w::text,0));
 IF pg13_actor(w,a,true)<>'owner' THEN RAISE EXCEPTION 'owner required' USING ERRCODE='42501';END IF;
 SELECT * INTO r FROM pg13_privacy_requests WHERE id=item AND workspace_id=w FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'request missing' USING ERRCODE='P0002';END IF;
 IF r.status='cancelled' THEN RETURN to_jsonb(r);END IF;
 IF r.status<>'requested' OR EXISTS(SELECT 1 FROM pg13_privacy_stores WHERE request_id=item AND status<>'pending') THEN RAISE EXCEPTION 'request already processing' USING ERRCODE='23514';END IF;
 UPDATE pg13_privacy_requests SET status='cancelled',updated_at=now() WHERE id=item RETURNING * INTO r;
 INSERT INTO pg13_control_audit(workspace_id,actor_id,action,resource_id) VALUES(w,a,'privacy.cancelled',item);RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION pg13_privacy_cancel(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_privacy_cancel(uuid,uuid,uuid) TO ekmivo_financial_runtime;
REVOKE ALL ON FUNCTION pg13_privacy_read(uuid,uuid),pg13_privacy_request(uuid,uuid,text,text),pg13_privacy_observe(uuid,uuid,text,text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_privacy_read(uuid,uuid),pg13_privacy_request(uuid,uuid,text,text) TO ekmivo_financial_runtime;
COMMIT;
