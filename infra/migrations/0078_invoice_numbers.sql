-- Financial realms (Live and Sandbox): concurrency-safe, per-workspace invoice numbering.
-- The sequence is not a payment record and never changes accepted allocations.
BEGIN;
CREATE TABLE pg10_invoice_sequences (
 workspace_id uuid NOT NULL,
 environment text NOT NULL,
 last_number bigint NOT NULL CHECK(last_number >= 1),
 PRIMARY KEY(workspace_id,environment),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
ALTER TABLE pg10_invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg10_invoice_sequences FORCE ROW LEVEL SECURITY;
CREATE POLICY pg10_invoice_sequences_owner ON pg10_invoice_sequences TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON pg10_invoice_sequences FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;

CREATE FUNCTION pg10_invoice_auto_create(w uuid,e text,b jsonb,k text,h text,cap text,actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old pg10_idempotency; n bigint; ref text; result jsonb; attempt integer;
BEGIN
 PERFORM pg06_scope(w,e);
 IF jsonb_typeof(b)<>'object' OR coalesce(b->>'reference','')<>'' OR length(k) NOT BETWEEN 16 AND 128 OR h !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'invalid invoice create' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg10.invoice-auto:'||w::text||e||k,0));
 SELECT * INTO old FROM pg10_idempotency WHERE workspace_id=w AND environment=e AND operation='pg10.invoice-auto' AND idempotency_key=k;
 IF FOUND THEN
  IF old.request_hash<>h THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505'; END IF;
  RETURN old.result_body;
 END IF;
 FOR attempt IN 1..10000 LOOP
  INSERT INTO pg10_invoice_sequences(workspace_id,environment,last_number) VALUES(w,e,1)
  ON CONFLICT(workspace_id,environment) DO UPDATE SET last_number=pg10_invoice_sequences.last_number+1
  RETURNING last_number INTO n;
  IF n > 999999999 THEN RAISE EXCEPTION 'invoice number limit' USING ERRCODE='22023'; END IF;
  ref:='INV-'||CASE WHEN n<10000 THEN lpad(n::text,4,'0') ELSE n::text END;
  EXIT WHEN NOT EXISTS(SELECT 1 FROM pg10_documents WHERE workspace_id=w AND environment=e AND kind='invoices' AND reference=ref);
 END LOOP;
 IF ref IS NULL OR EXISTS(SELECT 1 FROM pg10_documents WHERE workspace_id=w AND environment=e AND kind='invoices' AND reference=ref) THEN
  RAISE EXCEPTION 'invoice reference unavailable' USING ERRCODE='23505';
 END IF;
 result:=pg10_write(w,e,'invoices',NULL,'create',b||jsonb_build_object('reference',ref),k,h,cap,actor);
 INSERT INTO pg10_idempotency(workspace_id,environment,operation,idempotency_key,request_hash,result_code,result_body)
 VALUES(w,e,'pg10.invoice-auto',k,h,200,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pg10_invoice_auto_create(uuid,text,jsonb,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_invoice_auto_create(uuid,text,jsonb,text,text,text,uuid) TO ekmivo_finance_reader;
COMMIT;
