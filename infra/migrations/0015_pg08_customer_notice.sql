-- Additive PG08 customer notice store, only in isolated financial realms.
-- NOT applied automatically or to production. Depends on reviewed 0014.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('pg07_pending()') IS NULL OR NOT EXISTS(SELECT 1 FROM financial_realm WHERE singleton)
 THEN RAISE EXCEPTION 'isolated finance prerequisites required'; END IF;
END $$;
CREATE TABLE pg08_notice_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, environment text NOT NULL,
 intent_id uuid NOT NULL, email_cipher bytea NOT NULL CHECK(octet_length(email_cipher)>=29),
 locale text NOT NULL DEFAULT 'en' CHECK(locale IN ('en','bn')),
 email_digest char(64) NOT NULL CHECK(email_digest ~ '^[a-f0-9]{64}$'),
 consent_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz, withdrawn_at timestamptz,
 verification_digest char(64) UNIQUE, verification_expires_at timestamptz,
 withdrawal_digest char(64) NOT NULL UNIQUE,
 UNIQUE(workspace_id,environment,id), UNIQUE(workspace_id,environment,intent_id,email_digest),
 FOREIGN KEY(workspace_id,environment,intent_id) REFERENCES payment_intents(workspace_id,environment,id)
);
CREATE TABLE pg08_customer_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, environment text NOT NULL,
 contact_id uuid NOT NULL, event_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','unknown','failed','withdrawn')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
 next_at timestamptz NOT NULL DEFAULT now(), lease_id uuid, lease_until timestamptz,
 reason text NOT NULL DEFAULT '' CHECK(length(reason)<=80), accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(contact_id,event_id),
 FOREIGN KEY(workspace_id,environment,contact_id) REFERENCES pg08_notice_contacts(workspace_id,environment,id),
 FOREIGN KEY(event_id) REFERENCES pg07_events(id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pg08_notice_contacts','pg08_customer_notices'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 END LOOP;
END $$;
REVOKE ALL ON pg08_notice_contacts,pg08_customer_notices FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;

-- Called only after Go has checked the existing opaque checkout capability,
-- explicit consent, normalized email and rate limits. No payer-number mutation.
CREATE FUNCTION pg08_notice_register(w uuid,e text,intent uuid,email bytea,email_hash text,verify_hash text,withdraw_hash text,language text DEFAULT 'en')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result uuid; BEGIN
 PERFORM pg06_scope(w,e);
 IF verify_hash !~ '^[a-f0-9]{64}$' OR withdraw_hash !~ '^[a-f0-9]{64}$' OR verify_hash=withdraw_hash
 THEN RAISE EXCEPTION 'invalid notice capability' USING ERRCODE='22023'; END IF;
 INSERT INTO pg08_notice_contacts(workspace_id,environment,intent_id,email_cipher,email_digest,verification_digest,verification_expires_at,withdrawal_digest,locale)
 VALUES(w,e,intent,email,email_hash,verify_hash,now()+interval '15 minutes',withdraw_hash,language)
 ON CONFLICT(workspace_id,environment,intent_id,email_digest) DO UPDATE
 SET email_cipher=excluded.email_cipher,locale=excluded.locale,consent_at=now(),verified_at=NULL,withdrawn_at=NULL,
 verification_digest=excluded.verification_digest,verification_expires_at=excluded.verification_expires_at,
 withdrawal_digest=excluded.withdrawal_digest RETURNING id INTO result;
 RETURN result;
END $$;

CREATE FUNCTION pg08_notice_enqueue(c_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 INSERT INTO pg08_customer_notices(workspace_id,environment,contact_id,event_id)
 SELECT c.workspace_id,c.environment,c.id,ev.id FROM pg08_notice_contacts c
 JOIN payment_attempts a ON a.intent_id=c.intent_id AND a.workspace_id=c.workspace_id AND a.environment=c.environment
 JOIN financial_payments p ON p.attempt_id=a.id AND p.workspace_id=c.workspace_id AND p.environment=c.environment
 JOIN pg07_events ev ON ev.payment_id=p.id AND ev.workspace_id=c.workspace_id AND ev.environment=c.environment
 WHERE c.id=c_id AND c.verified_at IS NOT NULL AND c.withdrawn_at IS NULL
 ON CONFLICT(contact_id,event_id) DO NOTHING;
END $$;

CREATE FUNCTION pg08_notice_verify(w uuid,e text,intent uuid,digest text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE contact uuid; BEGIN
 PERFORM pg06_scope(w,e);
 UPDATE pg08_notice_contacts SET verified_at=now(),verification_digest=NULL,verification_expires_at=NULL
 WHERE workspace_id=w AND environment=e AND intent_id=intent AND verification_digest=digest
 AND verification_expires_at>now() AND withdrawn_at IS NULL RETURNING id INTO contact;
 IF contact IS NULL THEN RETURN false; END IF;
 PERFORM pg08_notice_enqueue(contact); RETURN true;
END $$;

CREATE FUNCTION pg08_notice_withdraw(w uuid,e text,intent uuid,digest text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE contact uuid; BEGIN
 PERFORM pg06_scope(w,e);
 UPDATE pg08_notice_contacts SET withdrawn_at=coalesce(withdrawn_at,now()),verification_digest=NULL
 WHERE workspace_id=w AND environment=e AND intent_id=intent AND withdrawal_digest=digest RETURNING id INTO contact;
 IF contact IS NULL THEN RETURN false; END IF;
 UPDATE pg08_customer_notices SET status='withdrawn',lease_id=NULL,lease_until=NULL
 WHERE contact_id=contact AND status IN ('pending','sending','unknown');
 RETURN true;
END $$;

CREATE FUNCTION pg08_notice_on_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE contact record; BEGIN
 FOR contact IN SELECT c.id FROM pg08_notice_contacts c
 JOIN payment_attempts a ON a.intent_id=c.intent_id AND a.workspace_id=c.workspace_id AND a.environment=c.environment
 JOIN financial_payments p ON p.attempt_id=a.id AND p.id=NEW.payment_id
 WHERE c.workspace_id=NEW.workspace_id AND c.environment=NEW.environment LOOP
  PERFORM pg08_notice_enqueue(contact.id);
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER pg08_notice_payment AFTER INSERT ON pg07_events FOR EACH ROW EXECUTE FUNCTION pg08_notice_on_payment();
REVOKE ALL ON FUNCTION pg08_notice_register(uuid,text,uuid,bytea,text,text,text,text),pg08_notice_verify(uuid,text,uuid,text),pg08_notice_withdraw(uuid,text,uuid,text),pg08_notice_enqueue(uuid),pg08_notice_on_payment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg08_notice_register(uuid,text,uuid,bytea,text,text,text,text),pg08_notice_verify(uuid,text,uuid,text),pg08_notice_withdraw(uuid,text,uuid,text) TO ekmivo_finance_reader;
CREATE FUNCTION pg08_notice_due() RETURNS TABLE(id uuid,workspace_id uuid,environment text,source_version bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT n.id,n.workspace_id,n.environment,r.entitlement_version FROM pg08_customer_notices n
 JOIN financial_workspace_registry r USING(workspace_id,environment)
 WHERE r.status='active' AND
 ((n.status='pending' AND n.next_at<=now()) OR (n.status='sending' AND n.lease_until<now()))
 ORDER BY n.next_at,n.id LIMIT 10;
$$;
CREATE FUNCTION pg08_notice_claim(n_id uuid,version bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n pg08_customer_notices;c pg08_notice_contacts;ev pg07_events;l uuid:=gen_random_uuid(); BEGIN
 SELECT * INTO n FROM pg08_customer_notices WHERE id=n_id FOR UPDATE SKIP LOCKED;
 IF n.id IS NULL OR NOT ((n.status='pending' AND n.next_at<=now()) OR (n.status='sending' AND n.lease_until<now())) THEN RETURN NULL;END IF;
 IF n.status='sending' THEN UPDATE pg08_customer_notices SET status='unknown',reason='worker_lost_after_claim',lease_id=NULL,lease_until=NULL WHERE id=n.id;RETURN NULL;END IF;
 IF n.attempts>=8 THEN UPDATE pg08_customer_notices SET status='unknown',reason='attempt_limit_or_crash',lease_id=NULL,lease_until=NULL WHERE id=n.id;RETURN NULL;END IF;
 IF NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=n.workspace_id AND environment=n.environment AND status='active' AND entitlement_version=version) THEN RETURN NULL;END IF;
 SELECT * INTO c FROM pg08_notice_contacts WHERE id=n.contact_id;
 IF c.withdrawn_at IS NOT NULL OR c.verified_at IS NULL THEN
 UPDATE pg08_customer_notices SET status='withdrawn' WHERE id=n.id; RETURN NULL;END IF;
 SELECT * INTO ev FROM pg07_events WHERE id=n.event_id AND workspace_id=n.workspace_id AND environment=n.environment;
 IF ev.id IS NULL THEN RAISE EXCEPTION 'notice scope mismatch' USING ERRCODE='42501';END IF;
 UPDATE pg08_customer_notices SET status='sending',attempts=attempts+1,lease_id=l,lease_until=now()+interval '60 seconds' WHERE id=n.id;
 RETURN jsonb_build_object('id',n.id,'lease_id',l,'email_cipher',encode(c.email_cipher,'base64'),
 'consented_at',c.consent_at,'verified_at',c.verified_at,'locale',c.locale,'event',ev.payload);
END $$;
CREATE FUNCTION pg08_notice_finish(n_id uuid,l uuid,outcome text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF outcome NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'invalid notice outcome';END IF;
 UPDATE pg08_customer_notices SET status=CASE WHEN outcome='failed' AND attempts<8 THEN 'pending' ELSE outcome END,
 accepted_at=CASE WHEN outcome='accepted' THEN now() ELSE NULL END,
 reason=CASE WHEN outcome='unknown' THEN 'smtp_acceptance_unknown' WHEN outcome='failed' THEN 'smtp_failed' ELSE '' END,
 next_at=now()+interval '5 minutes',lease_id=NULL,lease_until=NULL
 WHERE id=n_id AND lease_id=l AND status='sending' AND lease_until>now();
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION pg08_notice_due(),pg08_notice_claim(uuid,bigint),pg08_notice_finish(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg08_notice_due(),pg08_notice_claim(uuid,bigint),pg08_notice_finish(uuid,uuid,text) TO ekmivo_financial_worker;
COMMIT;
