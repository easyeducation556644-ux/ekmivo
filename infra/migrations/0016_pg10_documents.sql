-- PG10: scoped documents and public capabilities. Financial realms only.
BEGIN;
CREATE TABLE pg10_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, environment text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('customers','payment-links','invoices')),
 reference text NOT NULL CHECK(length(reference) BETWEEN 1 AND 128),
 status text NOT NULL DEFAULT 'draft', version bigint NOT NULL DEFAULT 1,
 body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'),
 amount_minor bigint CHECK(amount_minor BETWEEN 1 AND 100000000000),
 customer_id uuid, capability_digest text UNIQUE CHECK(capability_digest ~ '^[a-f0-9]{64}$'),
 capability_key text, issued_snapshot jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,environment,id), UNIQUE(workspace_id,environment,kind,reference),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment),
 FOREIGN KEY(workspace_id,environment,customer_id) REFERENCES pg10_documents(workspace_id,environment,id)
);
CREATE TABLE pg10_idempotency(workspace_id uuid NOT NULL,environment text NOT NULL,operation text NOT NULL,idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 16 AND 128),request_hash text NOT NULL CHECK(request_hash~'^[a-f0-9]{64}$'),result_code integer NOT NULL CHECK(result_code BETWEEN 200 AND 299),result_body jsonb NOT NULL CHECK(pg_column_size(result_body)<=131072),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(workspace_id,environment,operation,idempotency_key),FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment));
CREATE TABLE pg10_versions (
 document_id uuid NOT NULL, workspace_id uuid NOT NULL, environment text NOT NULL,
 version bigint NOT NULL, body jsonb NOT NULL, status text NOT NULL, actor_id uuid,
 occurred_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(document_id,version),
 FOREIGN KEY(workspace_id,environment,document_id) REFERENCES pg10_documents(workspace_id,environment,id)
);
CREATE TABLE pg10_document_intents (
 workspace_id uuid NOT NULL,environment text NOT NULL,document_id uuid NOT NULL,intent_id uuid NOT NULL,
 fields jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,environment,intent_id),
 FOREIGN KEY(workspace_id,environment,document_id) REFERENCES pg10_documents(workspace_id,environment,id),
 FOREIGN KEY(workspace_id,environment,intent_id) REFERENCES payment_intents(workspace_id,environment,id)
);
CREATE TABLE pg10_files (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,environment text NOT NULL,object_key text NOT NULL UNIQUE,
 name text NOT NULL,mime text NOT NULL,size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 5242880),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), scanned_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,environment,id),FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
CREATE TABLE pg10_exports (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,environment text NOT NULL,actor_id uuid NOT NULL,
 resource text NOT NULL,body_cipher bytea NOT NULL,capability_digest text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pg10_documents','pg10_idempotency','pg10_versions','pg10_document_intents','pg10_files','pg10_exports'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker',t);
 END LOOP;
END $$;
CREATE TRIGGER pg10_idempotency_immutable BEFORE UPDATE OR DELETE ON pg10_idempotency FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();
CREATE TRIGGER pg10_versions_immutable BEFORE UPDATE OR DELETE ON pg10_versions FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();
CREATE TRIGGER pg10_document_intents_immutable BEFORE UPDATE OR DELETE ON pg10_document_intents FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();

CREATE FUNCTION pg10_total(b jsonb) RETURNS bigint LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE row jsonb;total numeric:=0;q numeric;u numeric;extra text;
BEGIN
 IF jsonb_typeof(b->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(b->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid items' USING ERRCODE='22023';END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(b->'items') LOOP
 IF coalesce(length(btrim(row->>'title')),0) NOT BETWEEN 1 AND 160 OR coalesce(row->>'quantity','') !~ '^[1-9][0-9]{0,3}$' OR coalesce(row->>'unit_amount_minor','') !~ '^[0-9]{1,12}$'
 OR jsonb_typeof(row->'quantity') IS DISTINCT FROM 'number' OR jsonb_typeof(row->'unit_amount_minor') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'invalid item' USING ERRCODE='22023';END IF;
 q:=(row->>'quantity')::numeric;u:=(row->>'unit_amount_minor')::numeric;total:=total+q*u;
 END LOOP;
 FOREACH extra IN ARRAY ARRAY['tax_minor','fee_minor','shipping_minor','discount_minor'] LOOP
 IF b ? extra AND ((b->>extra) !~ '^[0-9]{1,12}$' OR jsonb_typeof(b->extra)<>'number') THEN RAISE EXCEPTION 'invalid adjustment' USING ERRCODE='22023';END IF;
 IF extra='discount_minor' THEN total:=total-coalesce((b->>extra)::numeric,0);ELSE total:=total+coalesce((b->>extra)::numeric,0);END IF;
 END LOOP;
 IF total NOT BETWEEN 1 AND 100000000000 THEN RAISE EXCEPTION 'invalid total' USING ERRCODE='22023';END IF;RETURN total::bigint;
END $$;

CREATE FUNCTION pg10_intent(w uuid,e text,ref text,amount bigint,minutes integer,k text,cap text,h text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old financial_idempotency; i payment_intents; result jsonb;
BEGIN
 PERFORM pg06_scope(w,e);
 IF amount NOT BETWEEN 1 AND 100000000000 OR minutes NOT BETWEEN 5 AND 60 OR length(ref) NOT BETWEEN 1 AND 128 OR length(k) NOT BETWEEN 16 AND 128 OR h !~ '^[a-f0-9]{64}$' OR cap !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid request' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w::text||e||':pg10.intent:'||k,0));
 SELECT * INTO old FROM financial_idempotency WHERE workspace_id=w AND environment=e AND operation='pg10.intent' AND idempotency_key=k;
 IF FOUND THEN IF old.request_hash<>h THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505';END IF;RETURN old.result_body;END IF;
 IF e='live' AND NOT EXISTS(SELECT 1 FROM financial_receiving_accounts a JOIN pg06_account_configuration c ON c.account_id=a.id WHERE a.workspace_id=w AND a.environment=e AND c.disabled_at IS NULL AND EXISTS(SELECT 1 FROM pg06_devices d WHERE d.account_id=a.id AND d.revoked_at IS NULL AND d.permission_ok AND d.heartbeat_at>now()-interval '5 minutes')) THEN RAISE EXCEPTION 'live source unavailable' USING ERRCODE='23514';END IF;
 INSERT INTO payment_intents(workspace_id,environment,merchant_reference,amount_minor,expires_at) VALUES(w,e,ref,amount,now()+make_interval(mins=>minutes)) RETURNING * INTO i;
 INSERT INTO pg05_checkout_tokens(workspace_id,environment,intent_id,token_digest,creation_key) VALUES(w,e,i.id,cap,k);
 INSERT INTO pg05_intent_events(workspace_id,environment,intent_id,event_type) VALUES(w,e,i.id,'created');
 result:=jsonb_build_object('id',i.id,'merchant_reference',ref,'amount_minor',amount,'currency','BDT','environment',e,'creation_key',k,'expires_at',i.expires_at,'state','requires_payer');
 INSERT INTO financial_idempotency(workspace_id,environment,operation,idempotency_key,request_hash,result_code,result_body) VALUES(w,e,'pg10.intent',k,h,201,result);RETURN result;
END $$;

CREATE FUNCTION pg10_read(w uuid,e text,res text,item uuid,after_id uuid,search text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg06_scope(w,e);IF after_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg10_documents WHERE workspace_id=w AND environment=e AND kind=res AND id=after_id) THEN RAISE EXCEPTION 'invalid document cursor' USING ERRCODE='22023';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM (
 SELECT d.id,d.kind,d.reference,d.status,d.version,CASE WHEN item IS NOT NULL THEN d.body ELSE jsonb_strip_nulls(jsonb_build_object('name',d.body->'name','description',d.body->'description','email',d.body->'email','phone',d.body->'phone','due_at',d.body->'due_at','expires_at',d.body->'expires_at')) END body,d.amount_minor,d.customer_id,d.capability_key,CASE WHEN item IS NOT NULL THEN d.issued_snapshot END issued_snapshot,d.created_at,d.updated_at,
 coalesce((SELECT sum(a.amount_minor) FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=l.workspace_id AND a.environment=l.environment WHERE l.document_id=d.id),0) paid_minor,
 CASE WHEN item IS NULL THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(jsonb_build_object('intent_id',l.intent_id,'state',pg05_intent_state(w,e,l.intent_id))), '[]') FROM pg10_document_intents l WHERE l.document_id=d.id) END payments,
 CASE WHEN item IS NULL THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.version),'[]') FROM pg10_versions v WHERE v.document_id=d.id) END history
 FROM pg10_documents d WHERE d.workspace_id=w AND d.environment=e AND d.kind=res AND (item IS NULL OR d.id=item)
 AND (search IS NULL OR d.reference ILIKE '%'||search||'%' OR d.body->>'name' ILIKE '%'||search||'%')
 AND (after_id IS NULL OR (d.created_at,d.id)<(SELECT x.created_at,x.id FROM pg10_documents x WHERE x.workspace_id=w AND x.environment=e AND x.kind=res AND x.id=after_id))
 ORDER BY d.created_at DESC,d.id DESC LIMIT 50) t;
 RETURN jsonb_build_object('items',result,'next_cursor',CASE WHEN jsonb_array_length(result)=50 THEN result->49->>'id' ELSE NULL END);
END $$;

CREATE FUNCTION pg10_write(w uuid,e text,res text,item uuid,action text,b jsonb,k text,h text,cap text,actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d pg10_documents;old pg10_idempotency;amount bigint;result jsonb;
BEGIN
 PERFORM pg06_scope(w,e);
 IF res NOT IN ('customers','payment-links','invoices') OR jsonb_typeof(b)<>'object' OR length(k) NOT BETWEEN 16 AND 128 OR h !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid document' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w::text||e||res||k,0));
 SELECT * INTO old FROM pg10_idempotency WHERE workspace_id=w AND environment=e AND operation='pg10.'||res AND idempotency_key=k;
 IF FOUND THEN IF old.request_hash<>h THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505';END IF;RETURN old.result_body;END IF;
 IF action<>'create' AND item IS NULL THEN RAISE EXCEPTION 'document ID required' USING ERRCODE='22023';END IF;
 IF item IS NOT NULL THEN SELECT * INTO d FROM pg10_documents WHERE workspace_id=w AND environment=e AND kind=res AND id=item FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002';END IF;END IF;
 IF action IN ('publish','archive','issue','cancel') AND (b->>'expected_version')::bigint IS DISTINCT FROM d.version THEN RAISE EXCEPTION 'document version conflict' USING ERRCODE='23505';END IF;
 IF action IN ('create','edit','correct') THEN
 IF action='correct' AND (res<>'invoices' OR d.status<>'issued' OR (b->>'expected_version')::bigint IS DISTINCT FROM d.version) THEN RAISE EXCEPTION 'correction requires issued version' USING ERRCODE='23505';END IF;
 IF action='edit' AND ((res='invoices' AND d.status<>'draft') OR (b->>'expected_version')::bigint IS DISTINCT FROM d.version) THEN RAISE EXCEPTION 'document version/state conflict' USING ERRCODE='23505';END IF;
 IF res='customers' THEN IF length(btrim(coalesce(b->>'name',''))) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'invalid contact' USING ERRCODE='22023';END IF;
 ELSIF res='invoices' THEN amount:=pg10_total(b);
 ELSE amount:=(b->>'amount_minor')::bigint;IF amount IS NULL OR amount NOT BETWEEN 1 AND 100000000000 THEN RAISE EXCEPTION 'invalid amount' USING ERRCODE='22023';END IF;END IF;
 IF b->>'customer_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg10_documents WHERE workspace_id=w AND environment=e AND kind='customers' AND id=(b->>'customer_id')::uuid) THEN RAISE EXCEPTION 'customer unavailable' USING ERRCODE='23503';END IF;
 IF action='create' THEN
 INSERT INTO pg10_documents(workspace_id,environment,kind,reference,status,body,amount_minor,customer_id,capability_digest,capability_key)
 VALUES(w,e,res,b->>'reference',CASE WHEN res='customers' THEN 'active' ELSE 'draft' END,b-'expected_version',amount,(b->>'customer_id')::uuid,CASE WHEN res<>'customers' THEN cap END,CASE WHEN res<>'customers' THEN k END) RETURNING * INTO d;
 ELSE IF action='correct' THEN IF amount<(SELECT coalesce(sum(a.amount_minor),0) FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id WHERE l.document_id=d.id) THEN RAISE EXCEPTION 'correction below verified allocation' USING ERRCODE='23514';END IF;PERFORM pg05_cancel_intent(w,e,l.intent_id) FROM pg10_document_intents l WHERE l.document_id=d.id AND pg05_intent_state(w,e,l.intent_id) NOT IN ('completed','cancelled','expired');END IF;IF res='payment-links' THEN PERFORM pg05_cancel_intent(w,e,l.intent_id) FROM pg10_document_intents l WHERE l.document_id=d.id AND pg05_intent_state(w,e,l.intent_id) NOT IN ('completed','cancelled','expired');END IF;UPDATE pg10_documents SET issued_snapshot=CASE WHEN action='correct' THEN b-'expected_version' ELSE issued_snapshot END,body=b-'expected_version',amount_minor=amount,customer_id=(b->>'customer_id')::uuid,version=version+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;END IF;
 ELSIF action='publish' AND res='payment-links' AND d.status IN ('draft','active') THEN UPDATE pg10_documents SET status='active',issued_snapshot=body,version=version+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 ELSIF action='archive' AND res='payment-links' THEN UPDATE pg10_documents SET status='archived',version=version+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 ELSIF action='issue' AND res='invoices' AND d.status='draft' THEN UPDATE pg10_documents SET status='issued',issued_snapshot=body,version=version+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 ELSIF action='cancel' AND res='invoices' AND d.status IN ('draft','issued') THEN
 IF EXISTS(SELECT 1 FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id WHERE l.document_id=d.id) THEN RAISE EXCEPTION 'funded invoice cannot cancel' USING ERRCODE='23514';END IF;
 PERFORM pg05_cancel_intent(w,e,l.intent_id) FROM pg10_document_intents l WHERE l.document_id=d.id;
 UPDATE pg10_documents SET status='cancelled',version=version+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 ELSE RAISE EXCEPTION 'invalid document action' USING ERRCODE='23514';END IF;
 INSERT INTO pg10_versions(document_id,workspace_id,environment,version,body,status,actor_id) VALUES(d.id,w,e,d.version,d.body,d.status,actor);
 INSERT INTO pg09_audit(workspace_id,environment,actor_id,resource,resource_id,action) VALUES(w,e,actor,res,d.id,action);
 result:=to_jsonb(d)-'capability_digest'-'issued_snapshot';
 INSERT INTO pg10_idempotency(workspace_id,environment,operation,idempotency_key,request_hash,result_code,result_body) VALUES(w,e,'pg10.'||res,k,h,200,result);RETURN result;
END $$;

CREATE FUNCTION pg10_import(w uuid,e text,a uuid,k text,h text,rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE old pg10_idempotency;row jsonb;n integer:=0;result jsonb;BEGIN
 PERFORM pg06_scope(w,e);IF length(k) NOT BETWEEN 16 AND 128 OR h !~ '^[a-f0-9]{64}$' OR jsonb_typeof(rows)<>'array' OR jsonb_array_length(rows)>1000 THEN RAISE EXCEPTION 'invalid import batch' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg10.import:'||w::text||e||k,0));
 SELECT * INTO old FROM pg10_idempotency WHERE workspace_id=w AND environment=e AND operation='pg10.customer-import' AND idempotency_key=k;
 IF FOUND THEN IF old.request_hash<>h THEN RAISE EXCEPTION 'import key conflict' USING ERRCODE='23505';END IF;RETURN old.result_body;END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(rows) LOOP
 PERFORM pg10_write(w,e,'customers',NULL,'create',row,encode(digest(k||':'||n::text,'sha256'),'hex'),encode(digest(row::text,'sha256'),'hex'),NULL,a);n:=n+1;
 END LOOP;result:=jsonb_build_object('imported',n);
 INSERT INTO pg10_idempotency(workspace_id,environment,operation,idempotency_key,request_hash,result_code,result_body) VALUES(w,e,'pg10.customer-import',k,h,200,result);RETURN result;
END $$;
REVOKE ALL ON FUNCTION pg10_import(uuid,text,uuid,text,text,jsonb) FROM PUBLIC;GRANT EXECUTE ON FUNCTION pg10_import(uuid,text,uuid,text,text,jsonb) TO ekmivo_finance_reader;

CREATE FUNCTION pg10_public(cap text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d pg10_documents;paid bigint;
BEGIN
 SELECT * INTO d FROM pg10_documents WHERE capability_digest=cap AND status IN ('active','issued') AND environment=(SELECT environment FROM financial_realm WHERE singleton);
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT coalesce(sum(a.amount_minor),0) INTO paid FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=l.workspace_id AND a.environment=l.environment WHERE l.document_id=d.id;
 IF d.kind='payment-links' THEN paid:=0;END IF;
 RETURN jsonb_build_object('id',d.id,'workspace_id',d.workspace_id,'environment',d.environment,'kind',d.kind,'reference',d.reference,'body',d.issued_snapshot-'private_notes'-'customer_id','amount_minor',d.amount_minor,'paid_minor',paid,'due_minor',greatest(d.amount_minor-paid,0),'currency','BDT','version',d.version);
END $$;

CREATE FUNCTION pg10_visit(cap text,k text,h text,intent_cap text,fields jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d pg10_documents;amount bigint;paid bigint;result jsonb;
BEGIN
 SELECT * INTO d FROM pg10_documents WHERE capability_digest=cap AND environment=(SELECT environment FROM financial_realm WHERE singleton) FOR UPDATE;
 IF NOT FOUND OR d.status NOT IN ('active','issued') THEN RAISE EXCEPTION 'document unavailable' USING ERRCODE='P0002';END IF;
 PERFORM set_config('ekmivo.workspace_id',d.workspace_id::text,true);PERFORM set_config('ekmivo.environment',d.environment,true);
 IF d.kind='payment-links' THEN
 IF d.issued_snapshot->>'expires_at' IS NOT NULL AND (d.issued_snapshot->>'expires_at')::timestamptz<=now() THEN RAISE EXCEPTION 'link expired' USING ERRCODE='23514';END IF;
 IF coalesce((d.issued_snapshot->>'max_uses')::integer,0)>0 AND (SELECT count(*) FROM pg10_document_intents WHERE document_id=d.id)>=(d.issued_snapshot->>'max_uses')::integer AND NOT EXISTS(SELECT 1 FROM financial_idempotency WHERE workspace_id=d.workspace_id AND environment=d.environment AND operation='pg10.intent' AND idempotency_key=k) THEN RAISE EXCEPTION 'link use limit' USING ERRCODE='23514';END IF;
 IF coalesce((fields->>'_quantity')::integer,1) NOT BETWEEN 1 AND greatest(1,coalesce((d.issued_snapshot->>'max_quantity')::integer,1)) THEN RAISE EXCEPTION 'quantity policy denied' USING ERRCODE='22023';END IF;amount:=d.amount_minor*coalesce((fields->>'_quantity')::integer,1);
 ELSE
 PERFORM pg_advisory_xact_lock(hashtextextended(d.id::text||':invoice',0));
 SELECT coalesce(sum(a.amount_minor),0) INTO paid FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id WHERE l.document_id=d.id;
 amount:=d.amount_minor-paid;
 IF EXISTS(SELECT 1 FROM pg10_document_intents l WHERE l.document_id=d.id AND pg05_intent_state(d.workspace_id,d.environment,l.intent_id) NOT IN ('completed','cancelled','expired') AND NOT EXISTS(SELECT 1 FROM pg05_checkout_tokens t WHERE t.intent_id=l.intent_id AND t.creation_key=k)) THEN RAISE EXCEPTION 'invoice checkout already active' USING ERRCODE='23505';END IF;
 END IF;
 result:=pg10_intent(d.workspace_id,d.environment,'DOC-'||left(d.reference,100)||'-'||substr(encode(digest(k,'sha256'),'hex'),1,20),amount,15,k,intent_cap,h);
 INSERT INTO pg10_document_intents(workspace_id,environment,document_id,intent_id,fields) VALUES(d.workspace_id,d.environment,d.id,(result->>'id')::uuid,fields) ON CONFLICT DO NOTHING;RETURN result;
END $$;

DO $$ DECLARE f record;BEGIN FOR f IN SELECT oid::regprocedure sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('pg10_read','pg10_write','pg10_intent','pg10_public','pg10_visit','pg10_total') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.sig);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO ekmivo_finance_reader',f.sig);END LOOP;END $$;
COMMIT;
