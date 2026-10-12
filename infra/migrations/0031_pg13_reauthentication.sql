BEGIN;
CREATE TABLE pg13_reauth_attempts(user_id uuid PRIMARY KEY REFERENCES app_users(id),attempts integer NOT NULL DEFAULT 0,window_start timestamptz NOT NULL DEFAULT now());
ALTER TABLE pg13_reauth_attempts ENABLE ROW LEVEL SECURITY;ALTER TABLE pg13_reauth_attempts FORCE ROW LEVEL SECURITY;CREATE POLICY pg13_reauth_owner ON pg13_reauth_attempts TO CURRENT_USER USING(true) WITH CHECK(true);REVOKE ALL ON pg13_reauth_attempts FROM PUBLIC,ekmivo_financial_runtime;
CREATE FUNCTION pg13_reauth_hash(a uuid,s uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result text;attempt integer;BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth_sessions WHERE id=s AND user_id=a AND revoked_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'session unavailable' USING ERRCODE='42501';END IF;
 INSERT INTO pg13_reauth_attempts(user_id) VALUES(a) ON CONFLICT DO NOTHING;SELECT attempts INTO attempt FROM pg13_reauth_attempts WHERE user_id=a FOR UPDATE;
 UPDATE pg13_reauth_attempts SET attempts=CASE WHEN window_start<now()-interval '10 minutes' THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<now()-interval '10 minutes' THEN now() ELSE window_start END WHERE user_id=a RETURNING attempts INTO attempt;
 IF attempt>5 THEN RETURN NULL;END IF;SELECT password_hash INTO result FROM app_users WHERE id=a AND disabled_at IS NULL;RETURN result;
END $$;
REVOKE ALL ON FUNCTION pg13_reauth_hash(uuid,uuid) FROM PUBLIC;GRANT EXECUTE ON FUNCTION pg13_reauth_hash(uuid,uuid) TO ekmivo_financial_runtime;
CREATE FUNCTION pg13_reauth_success(a uuid,s uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM auth_sessions WHERE id=s AND user_id=a AND revoked_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'session unavailable' USING ERRCODE='42501';END IF;UPDATE pg13_reauth_attempts SET attempts=0,window_start=now() WHERE user_id=a;END $$;
REVOKE ALL ON FUNCTION pg13_reauth_success(uuid,uuid) FROM PUBLIC;GRANT EXECUTE ON FUNCTION pg13_reauth_success(uuid,uuid) TO ekmivo_financial_runtime;
COMMIT;
