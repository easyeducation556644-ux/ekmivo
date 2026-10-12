BEGIN;
CREATE TABLE pg10_invoice_notices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,document_id uuid NOT NULL,actor_id uuid NOT NULL,document_version bigint NOT NULL,kind text NOT NULL CHECK(kind IN('send','remind')),recipient_cipher bytea NOT NULL,creation_key text NOT NULL,status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','sending','accepted','failed','unknown','cancelled')),lease_id uuid,lease_until timestamptz,error_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workspace_id,environment,creation_key),FOREIGN KEY(workspace_id,environment,document_id) REFERENCES pg10_documents(workspace_id,environment,id));
ALTER TABLE pg10_invoice_notices ENABLE ROW LEVEL SECURITY;ALTER TABLE pg10_invoice_notices FORCE ROW LEVEL SECURITY;CREATE POLICY pg10_invoice_notices_owner ON pg10_invoice_notices TO CURRENT_USER USING(true) WITH CHECK(true);REVOKE ALL ON pg10_invoice_notices FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg10_invoice_contact(w uuid,e text,doc uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE d pg10_documents;customer pg10_documents;BEGIN
 PERFORM pg06_scope(w,e);SELECT * INTO d FROM pg10_documents WHERE workspace_id=w AND environment=e AND id=doc AND kind='invoices' AND status='issued';IF NOT FOUND THEN RAISE EXCEPTION 'issued invoice required' USING ERRCODE='23514';END IF;
 SELECT * INTO customer FROM pg10_documents WHERE workspace_id=w AND environment=e AND id=d.customer_id AND kind='customers';
 RETURN jsonb_build_object('email',customer.body->>'email','name',customer.body->>'name','reference',d.reference,'version',d.version,'capability_key',d.capability_key);
END $$;
CREATE FUNCTION pg10_invoice_send(w uuid,e text,doc uuid,actor uuid,typ text,recipient bytea,k text,expected bigint) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE d pg10_documents;result uuid;BEGIN
 PERFORM pg06_scope(w,e);IF typ NOT IN('send','remind') OR actor IS NULL OR octet_length(recipient)<29 OR length(k) NOT BETWEEN 16 AND 128 THEN RAISE EXCEPTION 'invalid invoice notice' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('invoice-notice:'||w::text||e,0));SELECT id INTO result FROM pg10_invoice_notices WHERE workspace_id=w AND environment=e AND creation_key=k AND document_id=doc AND kind=typ;IF FOUND THEN RETURN result;END IF;
 SELECT * INTO d FROM pg10_documents WHERE workspace_id=w AND environment=e AND id=doc AND kind='invoices' FOR UPDATE;IF NOT FOUND OR d.status<>'issued' OR d.version<>expected THEN RAISE EXCEPTION 'issued invoice version required' USING ERRCODE='23505';END IF;
 IF (SELECT count(*) FROM pg10_invoice_notices WHERE workspace_id=w AND environment=e AND created_at>now()-interval '1 day')>=50 OR EXISTS(SELECT 1 FROM pg10_invoice_notices WHERE document_id=doc AND created_at>now()-interval '1 hour' AND status IN('queued','sending','accepted','unknown')) THEN RAISE EXCEPTION 'invoice notice limit' USING ERRCODE='23514';END IF;
 INSERT INTO pg10_invoice_notices(workspace_id,environment,document_id,actor_id,document_version,kind,recipient_cipher,creation_key) VALUES(w,e,doc,actor,d.version,typ,recipient,k) RETURNING id INTO result;
 INSERT INTO pg09_audit(workspace_id,environment,actor_id,resource,resource_id,action) VALUES(w,e,actor,'invoices',doc,typ);RETURN result;
END $$;
CREATE FUNCTION pg10_invoice_notice_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE n pg10_invoice_notices;d pg10_documents;BEGIN
 -- A dead process may have submitted mail. Never blindly resend.
 UPDATE pg10_invoice_notices SET status='unknown',error_code='SMTP_OUTCOME_UNKNOWN',recipient_cipher=decode('00','hex') WHERE status='sending' AND lease_until<now();
 SELECT * INTO n FROM pg10_invoice_notices WHERE environment=(SELECT environment FROM financial_realm WHERE singleton) AND status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;SELECT * INTO d FROM pg10_documents WHERE id=n.document_id;
 IF d.status<>'issued' OR d.version<>n.document_version THEN UPDATE pg10_invoice_notices SET status='cancelled',recipient_cipher=decode('00','hex') WHERE id=n.id;RETURN NULL;END IF;
 UPDATE pg10_invoice_notices SET status='sending',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now() WHERE id=n.id RETURNING * INTO n;
 RETURN (to_jsonb(n)-'recipient_cipher')||jsonb_build_object('recipient_cipher',encode(n.recipient_cipher,'base64'),'reference',d.reference,'capability_key',d.capability_key);
END $$;
CREATE FUNCTION pg10_invoice_notice_finish(item uuid,lease uuid,result text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF result NOT IN('accepted','failed','unknown','cancelled') THEN RAISE EXCEPTION 'invalid notice outcome' USING ERRCODE='22023';END IF;
 UPDATE pg10_invoice_notices SET status=result,recipient_cipher=decode('00','hex'),lease_id=NULL,lease_until=NULL,updated_at=now() WHERE id=item AND lease_id=lease AND status='sending' AND environment=(SELECT environment FROM financial_realm WHERE singleton);RETURN FOUND;
END $$;
CREATE FUNCTION pg10_invoice_delivery(w uuid,e text,doc uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN PERFORM pg06_scope(w,e);RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'kind',kind,'status',status,'created_at',created_at,'version',document_version)) FROM pg10_invoice_notices WHERE workspace_id=w AND environment=e AND document_id=doc),'[]');END $$;
REVOKE ALL ON FUNCTION pg10_invoice_contact(uuid,text,uuid),pg10_invoice_send(uuid,text,uuid,uuid,text,bytea,text,bigint),pg10_invoice_notice_claim(),pg10_invoice_notice_finish(uuid,uuid,text),pg10_invoice_delivery(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_invoice_contact(uuid,text,uuid),pg10_invoice_send(uuid,text,uuid,uuid,text,bytea,text,bigint),pg10_invoice_delivery(uuid,text,uuid) TO ekmivo_finance_reader;
GRANT EXECUTE ON FUNCTION pg10_invoice_notice_claim(),pg10_invoice_notice_finish(uuid,uuid,text) TO ekmivo_financial_worker;
COMMIT;
