BEGIN;
CREATE UNIQUE INDEX pg11_exception_once ON pg07_events((payload->'data'->>'observation_id'),(payload->'data'->>'status'),(payload->'data'->>'reason')) WHERE event_type='payment.exception';
CREATE UNIQUE INDEX pg11_expiry_once ON pg07_events((payload->'data'->>'intent_id')) WHERE event_type='payment.expired';
CREATE FUNCTION pg11_exception_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF NEW.status IN('unmatched','ambiguous','cancelled') AND(OLD.status,OLD.reason) IS DISTINCT FROM(NEW.status,NEW.reason) AND NOT EXISTS(SELECT 1 FROM pg07_events WHERE event_type='payment.exception' AND payload->'data'->>'observation_id'=NEW.observation_id::text AND payload->'data'->>'status'=NEW.status AND payload->'data'->>'reason'=NEW.reason) THEN
 PERFORM pg11_event(NEW.workspace_id,NEW.environment,NULL,'payment.exception',jsonb_build_object('observation_id',NEW.observation_id,'status',NEW.status,'reason',NEW.reason,'financially_verified',false));
 INSERT INTO pg13_notifications(workspace_id,environment,type,resource_id,body) VALUES(NEW.workspace_id,NEW.environment,'payment.exception',(SELECT id FROM pg06_transport WHERE observation_id=NEW.observation_id ORDER BY received_at LIMIT 1),jsonb_build_object('status',NEW.status,'reason',NEW.reason));END IF;RETURN NEW;
END $$;
CREATE TRIGGER pg11_receipt_exception AFTER UPDATE ON pg07_receipt_results FOR EACH ROW EXECUTE FUNCTION pg11_exception_event();
CREATE FUNCTION pg11_emit_expiry() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE i payment_intents;n bigint:=0;BEGIN
 FOR i IN SELECT p.* FROM payment_intents p WHERE p.environment=(SELECT environment FROM financial_realm WHERE singleton) AND p.expires_at<=now() AND pg05_intent_state(p.workspace_id,p.environment,p.id)='expired' AND NOT EXISTS(SELECT 1 FROM pg07_events WHERE event_type='payment.expired' AND payload->'data'->>'intent_id'=p.id::text) AND EXISTS(SELECT 1 FROM financial_workspace_registry r WHERE r.workspace_id=p.workspace_id AND r.environment=p.environment AND r.status='active') ORDER BY p.expires_at LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
 IF pg05_intent_state(i.workspace_id,i.environment,i.id)='expired' THEN PERFORM pg11_event(i.workspace_id,i.environment,NULL,'payment.expired',jsonb_build_object('intent_id',i.id,'merchant_reference',i.merchant_reference,'expires_at',i.expires_at,'financially_verified',false));n:=n+1;END IF;END LOOP;RETURN n;
END $$;
REVOKE ALL ON FUNCTION pg11_exception_event(),pg11_emit_expiry() FROM PUBLIC;GRANT EXECUTE ON FUNCTION pg11_emit_expiry() TO ekmivo_financial_worker;
COMMIT;
