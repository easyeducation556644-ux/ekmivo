-- Raw evidence retention is distinct from immutable normalized financial truth.
-- Disabled until the operator records the reviewed policy. No money is erased.
BEGIN;
CREATE TABLE pg15_receipt_policy(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),enabled boolean NOT NULL DEFAULT false,days integer NOT NULL CHECK(days BETWEEN 1 AND 3650),version bigint NOT NULL DEFAULT 1,review_reference text NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now(),CHECK(NOT enabled OR length(review_reference) BETWEEN 10 AND 200));
INSERT INTO pg15_receipt_policy(singleton,days) VALUES(true,30);
CREATE TABLE pg15_evidence_holds(workspace_id uuid NOT NULL,environment text NOT NULL,inbound_event_id uuid,reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 500),until_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),id uuid PRIMARY KEY DEFAULT gen_random_uuid(),FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment),FOREIGN KEY(workspace_id,environment,inbound_event_id) REFERENCES financial_inbound_events(workspace_id,environment,id));
CREATE TABLE pg15_evidence_redactions(inbound_event_id uuid PRIMARY KEY,workspace_id uuid NOT NULL,environment text NOT NULL,old_cipher_sha256 text NOT NULL,new_cipher_sha256 text NOT NULL,policy_version bigint NOT NULL,redacted_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(workspace_id,environment,inbound_event_id) REFERENCES financial_inbound_events(workspace_id,environment,id));
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['pg15_receipt_policy','pg15_evidence_holds','pg15_evidence_redactions'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker',t);
 END LOOP;END $$;
-- All existing financial UPDATE/DELETE prohibitions remain. The only exception
-- destroys one old raw ciphertext after its pre-recorded retention action.
CREATE OR REPLACE FUNCTION financial_reject_history_change() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF TG_TABLE_NAME='financial_inbound_events' AND TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD)-'encrypted_evidence')=(to_jsonb(NEW)-'encrypted_evidence') AND EXISTS(SELECT 1 FROM pg15_evidence_redactions r WHERE r.inbound_event_id=OLD.id AND r.workspace_id=OLD.workspace_id AND r.environment=OLD.environment AND r.old_cipher_sha256=encode(digest(OLD.encrypted_evidence,'sha256'),'hex') AND r.new_cipher_sha256=encode(digest(NEW.encrypted_evidence,'sha256'),'hex')) THEN RETURN NEW;END IF;
 END IF;
 RAISE EXCEPTION 'immutable financial history' USING ERRCODE='55000';
END $$;
CREATE TRIGGER pg15_redaction_history BEFORE UPDATE OR DELETE ON pg15_evidence_redactions FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();
CREATE FUNCTION pg15_prune_receipt_evidence() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE p pg15_receipt_policy;r financial_inbound_events;replacement bytea;n bigint:=0;BEGIN
 SELECT * INTO p FROM pg15_receipt_policy WHERE singleton AND enabled FOR SHARE;IF NOT FOUND THEN RETURN 0;END IF;
 FOR r IN SELECT i.* FROM financial_inbound_events i WHERE i.environment=(SELECT environment FROM financial_realm WHERE singleton) AND i.received_at<now()-make_interval(days=>p.days) AND NOT EXISTS(SELECT 1 FROM pg15_evidence_redactions x WHERE x.inbound_event_id=i.id) AND NOT EXISTS(SELECT 1 FROM pg15_evidence_holds h WHERE h.workspace_id=i.workspace_id AND h.environment=i.environment AND(h.inbound_event_id IS NULL OR h.inbound_event_id=i.id) AND h.until_at>now()) AND EXISTS(SELECT 1 FROM financial_receipt_observations o JOIN pg07_receipt_results m ON m.observation_id=o.id WHERE o.inbound_event_id=i.id AND m.status<>'pending') ORDER BY i.received_at LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('pg15.retention:'||r.workspace_id::text,0));
  IF EXISTS(SELECT 1 FROM pg15_evidence_holds h WHERE h.workspace_id=r.workspace_id AND h.environment=r.environment AND(h.inbound_event_id IS NULL OR h.inbound_event_id=r.id) AND h.until_at>now()) THEN CONTINUE;END IF;
  replacement:=gen_random_bytes(32);
  INSERT INTO pg15_evidence_redactions(inbound_event_id,workspace_id,environment,old_cipher_sha256,new_cipher_sha256,policy_version) VALUES(r.id,r.workspace_id,r.environment,encode(digest(r.encrypted_evidence,'sha256'),'hex'),encode(digest(replacement,'sha256'),'hex'),p.version);
  UPDATE financial_inbound_events SET encrypted_evidence=replacement WHERE id=r.id;
  n:=n+1;
 END LOOP;RETURN n;
END $$;
-- Operator only: callers must use the same lock ordering as the prune job.
CREATE FUNCTION pg15_hold_evidence(w uuid,e text,event uuid,reason_text text,expires timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result uuid;BEGIN
 IF e<>(SELECT environment FROM financial_realm WHERE singleton) OR expires<=now() OR length(reason_text) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'invalid evidence hold' USING ERRCODE='22023';END IF;
 IF event IS NOT NULL THEN PERFORM 1 FROM financial_inbound_events WHERE workspace_id=w AND environment=e AND id=event FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'evidence unavailable' USING ERRCODE='P0002';END IF;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg15.retention:'||w::text,0));
 INSERT INTO pg15_evidence_holds(workspace_id,environment,inbound_event_id,reason,until_at) VALUES(w,e,event,reason_text,expires) RETURNING id INTO result;RETURN result;
END $$;
REVOKE ALL ON FUNCTION pg15_hold_evidence(uuid,text,uuid,text,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION pg15_prune_receipt_evidence() FROM PUBLIC;GRANT EXECUTE ON FUNCTION pg15_prune_receipt_evidence() TO ekmivo_financial_worker;
COMMIT;
