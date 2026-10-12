-- Track object creation before its external side effect, including lost replies.
BEGIN;
CREATE TABLE pg10_upload_intents(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,environment text NOT NULL,object_key text NOT NULL UNIQUE,size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 5242880),committed_at timestamptz,deleted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',deletion_lease uuid,deletion_leased_at timestamptz,FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment));
ALTER TABLE pg10_upload_intents ENABLE ROW LEVEL SECURITY;ALTER TABLE pg10_upload_intents FORCE ROW LEVEL SECURITY;CREATE POLICY pg10_upload_owner ON pg10_upload_intents TO CURRENT_USER USING(true) WITH CHECK(true);REVOKE ALL ON pg10_upload_intents FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg10_upload_reserve(w uuid,e text,item uuid,key text,size bigint) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);IF key<>e||'/'||w::text||'/'||item::text THEN RAISE EXCEPTION 'upload object scope mismatch' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg10.upload:'||w::text||e,0));
 IF coalesce((SELECT sum(size_bytes) FROM pg10_upload_intents WHERE workspace_id=w AND environment=e AND created_at>now()-interval '1 day'),0)+coalesce((SELECT sum(f.size_bytes) FROM pg10_files f WHERE f.workspace_id=w AND f.environment=e AND f.created_at>now()-interval '1 day' AND NOT EXISTS(SELECT 1 FROM pg10_upload_intents u WHERE u.id=f.id)),0)+size>104857600 THEN RAISE EXCEPTION 'upload daily quota' USING ERRCODE='23514';END IF;
 INSERT INTO pg10_upload_intents(id,workspace_id,environment,object_key,size_bytes) VALUES(item,w,e,key,size);RETURN true;
END $$;
CREATE FUNCTION pg10_upload_commit(w uuid,e text,item uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);UPDATE pg10_upload_intents SET committed_at=now() WHERE id=item AND workspace_id=w AND environment=e AND committed_at IS NULL AND expires_at>now() AND EXISTS(SELECT 1 FROM pg10_files f WHERE f.id=item AND f.workspace_id=w AND f.environment=e);IF NOT FOUND THEN RAISE EXCEPTION 'upload completion unconfirmed' USING ERRCODE='23514';END IF;RETURN true;
END $$;
CREATE FUNCTION pg15_orphan_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE u pg10_upload_intents;BEGIN
 SELECT * INTO u FROM pg10_upload_intents i WHERE i.environment=(SELECT environment FROM financial_realm WHERE singleton) AND i.committed_at IS NULL AND i.deleted_at IS NULL AND i.expires_at<=now() AND(i.deletion_leased_at IS NULL OR i.deletion_leased_at<now()-interval '2 minutes') AND NOT EXISTS(SELECT 1 FROM pg10_files f WHERE f.id=i.id) ORDER BY i.expires_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;UPDATE pg10_upload_intents SET deletion_lease=gen_random_uuid(),deletion_leased_at=now() WHERE id=u.id RETURNING * INTO u;
 RETURN jsonb_build_object('id',u.id,'environment',u.environment,'object_key',u.object_key,'lease',u.deletion_lease);
END $$;
CREATE FUNCTION pg15_orphan_deleted(item uuid,lease uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 UPDATE pg10_upload_intents i SET deleted_at=now(),deletion_lease=NULL WHERE i.id=item AND i.deletion_lease=lease AND i.committed_at IS NULL AND i.deleted_at IS NULL AND i.expires_at<=now() AND i.environment=(SELECT environment FROM financial_realm WHERE singleton) AND NOT EXISTS(SELECT 1 FROM pg10_files f WHERE f.id=i.id);RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION pg10_upload_reserve(uuid,text,uuid,text,bigint),pg10_upload_commit(uuid,text,uuid),pg15_orphan_claim(),pg15_orphan_deleted(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_upload_reserve(uuid,text,uuid,text,bigint),pg10_upload_commit(uuid,text,uuid) TO ekmivo_finance_reader;
GRANT EXECUTE ON FUNCTION pg15_orphan_claim(),pg15_orphan_deleted(uuid,uuid) TO ekmivo_financial_worker;
COMMIT;
