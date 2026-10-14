-- Sandbox only. A controlled receiver proves actual HTTPS/HMAC/retry behaviour.
BEGIN;
DO $$ BEGIN IF (SELECT environment FROM financial_realm WHERE singleton)<>'sandbox' THEN RAISE EXCEPTION 'public test receiver requires Sandbox' USING ERRCODE='42501';END IF;END $$;
CREATE TABLE pg60_public_workspace(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),workspace_id uuid NOT NULL UNIQUE,environment text NOT NULL DEFAULT 'sandbox' CHECK(environment='sandbox'),FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment));
ALTER TABLE pg60_public_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg60_public_workspace FORCE ROW LEVEL SECURITY;
CREATE POLICY pg60_workspace_owner ON pg60_public_workspace TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON pg60_public_workspace FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE TABLE pg60_receiver_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,receiver_id uuid NOT NULL,event_id uuid NOT NULL,delivery_id uuid NOT NULL,event_type text NOT NULL CHECK(length(event_type)<=80),http_status integer NOT NULL CHECK(http_status IN(200,503)),received_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workspace_id,receiver_id,delivery_id));
ALTER TABLE pg60_receiver_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg60_receiver_log FORCE ROW LEVEL SECURITY;
CREATE POLICY pg60_log_owner ON pg60_receiver_log TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON pg60_receiver_log FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg60_receiver_credentials(w uuid,u text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,'sandbox');
 IF NOT EXISTS(SELECT 1 FROM pg60_public_workspace WHERE singleton AND workspace_id=w) THEN RAISE EXCEPTION 'not public test workspace' USING ERRCODE='42501';END IF;
 RETURN (SELECT jsonb_build_object('active',encode(secret,'base64'),'previous',CASE WHEN previous_until>now() THEN encode(previous_secret,'base64') ELSE NULL END) FROM pg08_endpoints WHERE workspace_id=w AND environment='sandbox' AND active AND url=u ORDER BY created_at DESC,id DESC LIMIT 1);
END $$;
CREATE FUNCTION pg60_receiver_record(w uuid,r uuid,ev uuid,d uuid,kind text,mode text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE code integer;BEGIN
 PERFORM pg06_scope(w,'sandbox');IF mode NOT IN('success','fail-once','always-fail') OR NOT EXISTS(SELECT 1 FROM pg60_public_workspace WHERE singleton AND workspace_id=w) THEN RAISE EXCEPTION 'invalid test receiver' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('receiver:'||w::text||r::text,0));
 SELECT http_status INTO code FROM pg60_receiver_log WHERE workspace_id=w AND receiver_id=r AND delivery_id=d;IF FOUND THEN RETURN code;END IF;
 code:=CASE WHEN mode='always-fail' OR (mode='fail-once' AND NOT EXISTS(SELECT 1 FROM pg60_receiver_log WHERE workspace_id=w AND receiver_id=r)) THEN 503 ELSE 200 END;
 INSERT INTO pg60_receiver_log(workspace_id,receiver_id,event_id,delivery_id,event_type,http_status) VALUES(w,r,ev,d,left(kind,80),code);RETURN code;
END $$;
CREATE FUNCTION pg60_receiver_read(w uuid,r uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,'sandbox');IF NOT EXISTS(SELECT 1 FROM pg60_public_workspace WHERE singleton AND workspace_id=w) THEN RAISE EXCEPTION 'not public test workspace' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT receiver_id,event_id,delivery_id,event_type,http_status,received_at FROM pg60_receiver_log WHERE workspace_id=w AND receiver_id=r ORDER BY received_at DESC,id DESC LIMIT 50)t),'[]');
END $$;
REVOKE ALL ON FUNCTION pg60_receiver_credentials(uuid,text),pg60_receiver_record(uuid,uuid,uuid,uuid,text,text),pg60_receiver_read(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg60_receiver_credentials(uuid,text),pg60_receiver_record(uuid,uuid,uuid,uuid,text,text),pg60_receiver_read(uuid,uuid) TO ekmivo_finance_reader;
COMMIT;
