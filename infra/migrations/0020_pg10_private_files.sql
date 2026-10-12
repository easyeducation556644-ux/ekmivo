BEGIN;
ALTER TABLE pg10_files ADD COLUMN document_id uuid;
ALTER TABLE pg10_files ADD FOREIGN KEY(workspace_id,environment,document_id) REFERENCES pg10_documents(workspace_id,environment,id);
CREATE FUNCTION pg10_file_save(w uuid,e text,document uuid,item uuid,key text,name text,mime text,size bigint,sha text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);PERFORM pg_advisory_xact_lock(hashtextextended(w::text||e||':upload-quota',0));
 IF (SELECT coalesce(sum(size_bytes),0) FROM pg10_files WHERE workspace_id=w AND environment=e AND created_at>now()-interval '1 day')+size>104857600 OR key<>e||'/'||w::text||'/'||item::text OR mime NOT IN ('image/jpeg','image/png','application/pdf') THEN RAISE EXCEPTION 'upload quota/type denied' USING ERRCODE='23514';END IF;
 INSERT INTO pg10_files(id,workspace_id,environment,document_id,object_key,name,mime,size_bytes,sha256,scanned_at) VALUES(item,w,e,document,key,name,mime,size,sha,now());
END $$;
CREATE FUNCTION pg10_file_read(w uuid,e text,item uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result jsonb;BEGIN
 PERFORM pg06_scope(w,e);SELECT to_jsonb(f) INTO result FROM pg10_files f WHERE workspace_id=w AND environment=e AND id=item AND expires_at>now();RETURN result;
END $$;
CREATE FUNCTION pg10_validate_files() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE field jsonb;file uuid;BEGIN
 FOR field IN SELECT value FROM jsonb_array_elements(coalesce((SELECT issued_snapshot->'fields' FROM pg10_documents WHERE id=NEW.document_id),'[]')) LOOP
 IF field->>'type'='file' AND NEW.fields ? (field->>'id') THEN
 file:=(NEW.fields->>(field->>'id'))::uuid;
 IF NOT EXISTS(SELECT 1 FROM pg10_files WHERE id=file AND workspace_id=NEW.workspace_id AND environment=NEW.environment AND document_id=NEW.document_id AND expires_at>now()) THEN RAISE EXCEPTION 'file unavailable in document scope' USING ERRCODE='23503';END IF;
 END IF;END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER pg10_visit_files BEFORE INSERT ON pg10_document_intents FOR EACH ROW EXECUTE FUNCTION pg10_validate_files();
REVOKE ALL ON FUNCTION pg10_file_save(uuid,text,uuid,uuid,text,text,text,bigint,text),pg10_file_read(uuid,text,uuid),pg10_validate_files() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_file_save(uuid,text,uuid,uuid,text,text,text,bigint,text),pg10_file_read(uuid,text,uuid) TO ekmivo_finance_reader;
COMMIT;
