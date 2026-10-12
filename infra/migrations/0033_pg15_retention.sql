BEGIN;
ALTER TABLE pg10_files ADD COLUMN deletion_lease uuid,ADD COLUMN deletion_leased_at timestamptz;
CREATE FUNCTION pg15_file_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE f pg10_files;BEGIN
 SELECT * INTO f FROM pg10_files WHERE environment=(SELECT environment FROM financial_realm WHERE singleton) AND expires_at<=now() AND (deletion_leased_at IS NULL OR deletion_leased_at<now()-interval '2 minutes') ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 UPDATE pg10_files SET deletion_lease=gen_random_uuid(),deletion_leased_at=now() WHERE id=f.id RETURNING * INTO f;
 RETURN jsonb_build_object('id',f.id,'environment',f.environment,'object_key',f.object_key,'lease',f.deletion_lease);
END $$;
CREATE FUNCTION pg15_file_deleted(item uuid,lease uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 DELETE FROM pg10_files WHERE id=item AND deletion_lease=lease AND expires_at<=now() AND environment=(SELECT environment FROM financial_realm WHERE singleton);RETURN FOUND;
END $$;
CREATE FUNCTION pg15_prune_exports() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE n bigint;BEGIN
 DELETE FROM pg10_exports WHERE environment=(SELECT environment FROM financial_realm WHERE singleton) AND expires_at<=now();GET DIAGNOSTICS n=ROW_COUNT;RETURN n;
END $$;
REVOKE ALL ON FUNCTION pg15_file_claim(),pg15_file_deleted(uuid,uuid),pg15_prune_exports() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg15_file_claim(),pg15_file_deleted(uuid,uuid),pg15_prune_exports() TO ekmivo_financial_worker;
GRANT EXECUTE ON FUNCTION pg13_platform_payment(text) TO ekmivo_financial_worker;
COMMIT;
