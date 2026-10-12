BEGIN;
CREATE TABLE pg10_export_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,actor_id uuid NOT NULL,creation_key text NOT NULL,resource text NOT NULL CHECK(resource IN ('customers','invoices','payment-links')),status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','complete','failed')),lease_id uuid,lease_until timestamptz,error_code text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workspace_id,environment,id),UNIQUE(workspace_id,environment,actor_id,creation_key),FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment));
ALTER TABLE pg10_export_jobs ENABLE ROW LEVEL SECURITY;ALTER TABLE pg10_export_jobs FORCE ROW LEVEL SECURITY;CREATE POLICY pg10_export_owner ON pg10_export_jobs TO CURRENT_USER USING(true) WITH CHECK(true);REVOKE ALL ON pg10_export_jobs FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg10_export_enqueue(w uuid,e text,a uuid,res text,k text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE id uuid;BEGIN
 PERFORM pg06_scope(w,e);IF length(k) NOT BETWEEN 16 AND 128 THEN RAISE EXCEPTION 'export key required' USING ERRCODE='22023';END IF;PERFORM pg_advisory_xact_lock(hashtextextended('export:'||w::text||e,0));SELECT j.id INTO id FROM pg10_export_jobs j WHERE j.workspace_id=w AND j.environment=e AND j.actor_id=a AND j.creation_key=k AND j.resource=res;IF FOUND THEN RETURN id;END IF;IF (SELECT count(*) FROM pg10_export_jobs WHERE workspace_id=w AND environment=e AND created_at>now()-interval '1 day')>=20 THEN RAISE EXCEPTION 'daily export limit' USING ERRCODE='23514';END IF;
 INSERT INTO pg10_export_jobs(workspace_id,environment,actor_id,resource,creation_key) VALUES(w,e,a,res,k) RETURNING pg10_export_jobs.id INTO id;RETURN id;
END $$;
CREATE FUNCTION pg10_export_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE j pg10_export_jobs;BEGIN
 SELECT * INTO j FROM pg10_export_jobs WHERE environment=(SELECT environment FROM financial_realm WHERE singleton) AND (status='queued' OR status='running' AND lease_until<now()) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;UPDATE pg10_export_jobs SET status='running',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes' WHERE id=j.id RETURNING * INTO j;RETURN to_jsonb(j);
END $$;
CREATE FUNCTION pg10_export_rows(item uuid,lease uuid,after_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE j pg10_export_jobs;BEGIN
 SELECT * INTO j FROM pg10_export_jobs WHERE id=item AND lease_id=lease AND status='running' AND lease_until>now();IF NOT FOUND THEN RAISE EXCEPTION 'export lease unavailable' USING ERRCODE='42501';END IF;
 PERFORM set_config('ekmivo.workspace_id',j.workspace_id::text,true);PERFORM set_config('ekmivo.environment',j.environment,true);RETURN pg10_read(j.workspace_id,j.environment,j.resource,NULL,after_id,NULL);
END $$;
CREATE FUNCTION pg10_export_finish(item uuid,lease uuid,cipher bytea,cap text,error text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE j pg10_export_jobs;BEGIN
 SELECT * INTO j FROM pg10_export_jobs WHERE id=item AND lease_id=lease AND status='running' AND lease_until>now() FOR UPDATE;IF NOT FOUND THEN RETURN false;END IF;
 IF error IS NULL THEN IF octet_length(cipher)>10485760 OR cap !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid export artifact' USING ERRCODE='22023';END IF;INSERT INTO pg10_exports(id,workspace_id,environment,actor_id,resource,body_cipher,capability_digest) VALUES(j.id,j.workspace_id,j.environment,j.actor_id,j.resource,cipher,cap) ON CONFLICT(id) DO NOTHING;END IF;
 UPDATE pg10_export_jobs SET status=CASE WHEN error IS NULL THEN 'complete' ELSE 'failed' END,error_code=error,lease_id=NULL,lease_until=NULL WHERE id=item;RETURN true;
END $$;
CREATE FUNCTION pg10_export_get(w uuid,e text,item uuid,a uuid,download boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE j pg10_export_jobs;BEGIN
 PERFORM pg06_scope(w,e);SELECT * INTO j FROM pg10_export_jobs WHERE workspace_id=w AND environment=e AND id=item AND actor_id=a;IF NOT FOUND THEN RAISE EXCEPTION 'export unavailable' USING ERRCODE='P0002';END IF;
 IF download THEN RETURN(SELECT jsonb_build_object('body_cipher',encode(body_cipher,'base64'),'resource',resource) FROM pg10_exports WHERE id=j.id AND expires_at>now());END IF;RETURN to_jsonb(j)-'lease_id'-'lease_until';
END $$;
REVOKE ALL ON FUNCTION pg10_export_enqueue(uuid,text,uuid,text,text),pg10_export_get(uuid,text,uuid,uuid,boolean),pg10_export_claim(),pg10_export_rows(uuid,uuid,uuid),pg10_export_finish(uuid,uuid,bytea,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_export_enqueue(uuid,text,uuid,text,text),pg10_export_get(uuid,text,uuid,uuid,boolean) TO ekmivo_finance_reader;
GRANT EXECUTE ON FUNCTION pg10_export_claim(),pg10_export_rows(uuid,uuid,uuid),pg10_export_finish(uuid,uuid,bytea,text,text) TO ekmivo_financial_worker;
COMMIT;
