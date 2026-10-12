BEGIN;
CREATE FUNCTION pg10_return_allowed(w uuid,e text,url text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT url IS NULL OR url='' OR EXISTS(SELECT 1 FROM pg12_integrations WHERE workspace_id=w AND environment=e AND status='configured' AND (url=origin OR left(url,length(origin)+1)=origin||'/') AND url!~ '[?#]') $$;
REVOKE ALL ON FUNCTION pg10_return_allowed(uuid,text,text) FROM PUBLIC;
DO $$ DECLARE d text;BEGIN
 d:=pg_get_functiondef('pg10_write(uuid,text,text,uuid,text,jsonb,text,text,text,uuid)'::regprocedure);
 d:=replace(d,'IF action IN (''create'',''edit'',''correct'') THEN','IF action IN (''create'',''edit'',''correct'') THEN IF NOT pg10_return_allowed(w,e,b->>''return_url'') THEN RAISE EXCEPTION ''registered return origin required'' USING ERRCODE=''23514'';END IF;');EXECUTE d;
END $$;
CREATE FUNCTION pg10_customer_activity(w uuid,e text,customer uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);IF NOT EXISTS(SELECT 1 FROM pg10_documents WHERE workspace_id=w AND environment=e AND id=customer AND kind='customers') THEN RAISE EXCEPTION 'customer missing' USING ERRCODE='P0002';END IF;
 RETURN jsonb_build_object('invoices',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'reference',d.reference,'status',d.status,'amount_minor',d.amount_minor,'paid_minor',coalesce((SELECT sum(a.amount_minor) FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id WHERE l.document_id=d.id),0))) FROM pg10_documents d WHERE d.workspace_id=w AND d.environment=e AND d.customer_id=customer AND d.kind='invoices'),'[]'));
END $$;
REVOKE ALL ON FUNCTION pg10_customer_activity(uuid,text,uuid) FROM PUBLIC;GRANT EXECUTE ON FUNCTION pg10_customer_activity(uuid,text,uuid) TO ekmivo_finance_reader;
DO $$ DECLARE definition text;BEGIN definition:=pg_get_functiondef('pg10_checkout_view(text)'::regprocedure);definition:=replace(definition,'RETURN result;',E'result:=result||jsonb_build_object(''return_url'',(SELECT d.issued_snapshot->>''return_url'' FROM pg05_checkout_tokens t JOIN pg10_document_intents l ON l.intent_id=t.intent_id JOIN pg10_documents d ON d.id=l.document_id WHERE t.token_digest=cap AND pg10_return_allowed(d.workspace_id,d.environment,d.issued_snapshot->>''return_url''))); RETURN result;');EXECUTE definition;END $$;
COMMIT;
