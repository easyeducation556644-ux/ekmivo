-- Seller-managed refunds; no native automatic refund execution.
BEGIN;
ALTER TABLE pg07_events DROP CONSTRAINT pg07_events_payment_id_key;
ALTER TABLE pg07_events DROP CONSTRAINT pg07_events_event_type_check;
ALTER TABLE pg07_events ALTER COLUMN payment_id DROP NOT NULL;
ALTER TABLE pg07_events ADD CONSTRAINT pg07_event_types CHECK(event_type IN ('payment.verified','payment.exception','payment.expired','payment.reversed','refund.updated','invoice.paid'));
CREATE UNIQUE INDEX pg07_once_verified ON pg07_events(payment_id) WHERE event_type='payment.verified';
CREATE TABLE pg11_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,payment_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','approved','rejected','seller_reported_returned','cancelled')),
 customer_cipher bytea NOT NULL,reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 2000),
 seller_note text NOT NULL DEFAULT '',seller_reference text,actor_id uuid,version bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,environment,id),FOREIGN KEY(workspace_id,environment,payment_id) REFERENCES financial_payments(workspace_id,environment,id)
);
CREATE TABLE pg11_statements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,account_id uuid NOT NULL,
 line_id text NOT NULL,reference text NOT NULL,amount_minor bigint NOT NULL CHECK(amount_minor>0),currency text NOT NULL CHECK(currency='BDT'),
 direction text NOT NULL CHECK(direction IN ('incoming','outgoing')),transaction_at timestamptz NOT NULL,line_digest text NOT NULL,
 provenance text NOT NULL DEFAULT 'merchant_imported_statement' CHECK(provenance='merchant_imported_statement'),
 payment_id uuid,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,line_id),FOREIGN KEY(workspace_id,environment,account_id) REFERENCES financial_receiving_accounts(workspace_id,environment,id),
 FOREIGN KEY(workspace_id,environment,payment_id) REFERENCES financial_payments(workspace_id,environment,id)
);
CREATE TABLE pg13_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,type text NOT NULL,
 resource_id uuid,body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
CREATE TABLE pg13_notification_reads(notification_id uuid NOT NULL REFERENCES pg13_notifications(id),actor_id uuid NOT NULL,read_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(notification_id,actor_id));
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['pg11_refunds','pg11_statements','pg13_notifications','pg13_notification_reads'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker',t);END LOOP;END $$;

CREATE FUNCTION pg11_event(w uuid,e text,payment uuid,typ text,data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE event uuid;BEGIN
 INSERT INTO pg07_events(workspace_id,environment,payment_id,event_type,payload) VALUES(w,e,payment,typ,jsonb_build_object('type',typ,'schema_version',1,'workspace_id',w,'environment',e,'occurred_at',now(),'data',data)) RETURNING id INTO event;
 INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id) SELECT w,e,id,event FROM pg08_endpoints WHERE workspace_id=w AND environment=e AND active;
 RETURN event;
END $$;
CREATE OR REPLACE FUNCTION pg08_notice_enqueue(c_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 INSERT INTO pg08_customer_notices(workspace_id,environment,contact_id,event_id)
 SELECT c.workspace_id,c.environment,c.id,ev.id FROM pg08_notice_contacts c
 JOIN payment_attempts a ON a.intent_id=c.intent_id AND a.workspace_id=c.workspace_id AND a.environment=c.environment
 JOIN financial_payments p ON p.attempt_id=a.id AND p.workspace_id=c.workspace_id AND p.environment=c.environment
 JOIN pg07_events ev ON ev.payment_id=p.id AND ev.workspace_id=c.workspace_id AND ev.environment=c.environment AND ev.event_type='payment.verified'
 WHERE c.id=c_id AND c.verified_at IS NOT NULL AND c.withdrawn_at IS NULL ON CONFLICT(contact_id,event_id) DO NOTHING;
END $$;

CREATE FUNCTION pg11_refund(w uuid,e text,payment uuid,amount bigint,cipher bytea,why text,k text,h text,actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE p financial_payments;used bigint;r pg11_refunds;old financial_idempotency;result jsonb;BEGIN
 PERFORM pg06_scope(w,e);
 IF length(k) NOT BETWEEN 16 AND 128 OR h !~ '^[a-f0-9]{64}$' OR length(why) NOT BETWEEN 10 AND 2000 OR octet_length(cipher)<29 THEN RAISE EXCEPTION 'invalid refund request' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w::text||e||':refund:'||k,0));
 SELECT * INTO old FROM financial_idempotency WHERE workspace_id=w AND environment=e AND operation='pg11.refund' AND idempotency_key=k;
 IF FOUND THEN IF old.request_hash<>h THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505';END IF;RETURN old.result_body;END IF;
 SELECT * INTO p FROM financial_payments WHERE workspace_id=w AND environment=e AND id=payment FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'payment not found' USING ERRCODE='P0002';END IF;
 SELECT coalesce(sum(amount_minor),0) INTO used FROM pg11_refunds WHERE payment_id=p.id AND status NOT IN ('rejected','cancelled');
 IF amount<=0 OR amount>p.verified_amount_minor-used THEN RAISE EXCEPTION 'refundable cap exceeded' USING ERRCODE='23514';END IF;
 INSERT INTO pg11_refunds(workspace_id,environment,payment_id,amount_minor,customer_cipher,reason,actor_id) VALUES(w,e,payment,amount,cipher,why,actor) RETURNING * INTO r;
 result:=to_jsonb(r)-'customer_cipher';
 PERFORM pg11_event(w,e,payment,'refund.updated',result-'reason'-'seller_note');
 INSERT INTO pg13_notifications(workspace_id,environment,type,resource_id,body) VALUES(w,e,'refund_requested',r.id,jsonb_build_object('refund_id',r.id,'payment_id',payment,'amount_minor',amount,'status','requested'));
 INSERT INTO pg09_audit(workspace_id,environment,actor_id,resource,resource_id,action) VALUES(w,e,actor,'refunds',r.id,'requested');
 INSERT INTO financial_idempotency(workspace_id,environment,operation,idempotency_key,request_hash,result_code,result_body) VALUES(w,e,'pg11.refund',k,h,201,result);RETURN result;
END $$;
CREATE FUNCTION pg11_refund_action(w uuid,e text,item uuid,action text,note text,ref text,actor uuid,expected bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE r pg11_refunds;target text;result jsonb;BEGIN
 PERFORM pg06_scope(w,e);SELECT * INTO r FROM pg11_refunds WHERE workspace_id=w AND environment=e AND id=item FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'refund not found' USING ERRCODE='P0002';END IF;
 IF r.version<>expected OR length(btrim(note)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'version/reason required' USING ERRCODE='23505';END IF;
 target:=CASE WHEN action='review' AND r.status='requested' THEN 'reviewing' WHEN action='approve' AND r.status IN ('requested','reviewing') THEN 'approved' WHEN action='reject' AND r.status IN ('requested','reviewing') THEN 'rejected' WHEN action='report-returned' AND r.status='approved' AND length(btrim(ref)) BETWEEN 1 AND 128 THEN 'seller_reported_returned' WHEN action='cancel' AND r.status='requested' THEN 'cancelled' END;
 IF target IS NULL THEN RAISE EXCEPTION 'refund transition unavailable' USING ERRCODE='23514';END IF;
 UPDATE pg11_refunds SET status=target,seller_note=note,seller_reference=ref,actor_id=actor,version=version+1,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 result:=to_jsonb(r)-'customer_cipher';PERFORM pg11_event(w,e,r.payment_id,'refund.updated',result-'reason'-'seller_note');
 INSERT INTO pg09_audit(workspace_id,environment,actor_id,resource,resource_id,action) VALUES(w,e,actor,'refunds',r.id,target||': '||note);RETURN result;
END $$;
CREATE FUNCTION pg11_read(w uuid,e text,res text,item uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result jsonb;BEGIN
 PERFORM pg06_scope(w,e);
 IF res='refunds' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM (SELECT * FROM pg11_refunds WHERE workspace_id=w AND environment=e AND (item IS NULL OR id=item) ORDER BY created_at DESC,id DESC LIMIT 100) t;
 ELSIF res='reconciliation' THEN SELECT jsonb_build_object('receipts',pg09_read(w,e,'incoming',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),'statements',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM pg11_statements WHERE workspace_id=w AND environment=e ORDER BY transaction_at DESC LIMIT 100) t),'[]'),'definition','Merchant-imported statements; not provider-authenticated payment proof') INTO result;
 ELSE RAISE EXCEPTION 'invalid resource' USING ERRCODE='22023';END IF;RETURN jsonb_build_object('items',result);
END $$;
CREATE FUNCTION pg11_statement(w uuid,e text,account uuid,line text,ref text,amount bigint,currency text,direction text,at_time timestamptz,h text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result uuid;old text;BEGIN
 PERFORM pg06_scope(w,e);IF length(line) NOT BETWEEN 1 AND 128 OR length(ref)>128 OR h !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid statement line' USING ERRCODE='22023';END IF;
 INSERT INTO pg11_statements(workspace_id,environment,account_id,line_id,reference,amount_minor,currency,direction,transaction_at,line_digest) VALUES(w,e,account,line,ref,amount,currency,direction,at_time,h) ON CONFLICT(account_id,line_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id,line_digest INTO result,old FROM pg11_statements WHERE account_id=account AND line_id=line AND workspace_id=w AND environment=e;IF old IS DISTINCT FROM h THEN RAISE EXCEPTION 'statement line identity changed' USING ERRCODE='23505';END IF;END IF;RETURN result;
END $$;
CREATE FUNCTION pg11_settlement(w uuid,e text,line uuid,payment uuid,why text,actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE s pg11_statements;p financial_payments;BEGIN
 PERFORM pg06_scope(w,e);IF length(btrim(why))<10 THEN RAISE EXCEPTION 'reason required' USING ERRCODE='22023';END IF;
 SELECT * INTO s FROM pg11_statements WHERE workspace_id=w AND environment=e AND id=line FOR UPDATE;
 SELECT * INTO p FROM financial_payments WHERE workspace_id=w AND environment=e AND id=payment;
 IF s.id IS NULL OR p.id IS NULL OR s.direction<>'incoming' OR s.currency<>p.currency OR s.amount_minor<>p.verified_amount_minor OR s.payment_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM payment_attempts a WHERE a.id=p.attempt_id AND a.receiving_account_id=s.account_id) THEN RAISE EXCEPTION 'settlement mismatch' USING ERRCODE='23514';END IF;
 UPDATE pg11_statements SET payment_id=p.id WHERE id=s.id;
 INSERT INTO pg09_audit(workspace_id,environment,actor_id,resource,resource_id,action) VALUES(w,e,actor,'statements',s.id,'merchant_statement_link: '||why);
 RETURN jsonb_build_object('id',s.id,'payment_id',p.id,'provenance','merchant_imported_statement','provider_verified',false);
END $$;
CREATE UNIQUE INDEX pg11_settlement_payment_once ON pg11_statements(workspace_id,environment,payment_id) WHERE payment_id IS NOT NULL;
DO $$ DECLARE f record;BEGIN FOR f IN SELECT oid::regprocedure sig,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('pg11_event','pg11_refund','pg11_refund_action','pg11_read','pg11_statement','pg11_settlement') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.sig);IF f.proname<>'pg11_event' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO ekmivo_finance_reader',f.sig);END IF;END LOOP;END $$;
COMMIT;
