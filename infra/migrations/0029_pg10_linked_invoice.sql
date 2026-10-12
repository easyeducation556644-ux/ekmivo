BEGIN;
CREATE FUNCTION pg10_invoice_intent(w uuid,e text,doc uuid,ref text,minutes integer,k text,cap text,h text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE d pg10_documents;paid bigint;result jsonb;BEGIN
 PERFORM pg06_scope(w,e);SELECT * INTO d FROM pg10_documents WHERE workspace_id=w AND environment=e AND id=doc AND kind='invoices' AND status='issued' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'issued invoice unavailable' USING ERRCODE='P0002';END IF;PERFORM pg_advisory_xact_lock(hashtextextended(d.id::text||':invoice',0));
 IF EXISTS(SELECT 1 FROM financial_idempotency WHERE workspace_id=w AND environment=e AND operation='pg10.intent' AND idempotency_key=k) THEN RETURN pg10_intent(w,e,ref,d.amount_minor,minutes,k,cap,h);END IF;
 SELECT coalesce(sum(a.amount_minor),0) INTO paid FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=l.workspace_id AND a.environment=l.environment WHERE l.document_id=d.id;
 IF EXISTS(SELECT 1 FROM pg10_document_intents l WHERE l.document_id=d.id AND pg05_intent_state(w,e,l.intent_id) NOT IN ('completed','cancelled','expired')) THEN RAISE EXCEPTION 'invoice attempt already active' USING ERRCODE='23505';END IF;
 result:=pg10_intent(w,e,ref,d.amount_minor-paid,minutes,k,cap,h);
 INSERT INTO pg10_document_intents(workspace_id,environment,document_id,intent_id) VALUES(w,e,d.id,(result->>'id')::uuid);RETURN result;
END $$;
REVOKE ALL ON FUNCTION pg10_invoice_intent(uuid,text,uuid,text,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_invoice_intent(uuid,text,uuid,text,integer,text,text,text) TO ekmivo_finance_reader;
COMMIT;
