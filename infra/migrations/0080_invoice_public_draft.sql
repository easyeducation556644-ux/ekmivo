-- Financial realms: capability-protected Draft and Void invoice previews never allow payment before issue.
BEGIN;
CREATE OR REPLACE FUNCTION pg10_public(cap text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d pg10_documents; paid bigint; issued_at timestamptz; customer_name text;
BEGIN
 SELECT * INTO d FROM pg10_documents
 WHERE capability_digest=cap AND environment=(SELECT environment FROM financial_realm WHERE singleton)
 AND (status IN ('active','issued') OR (kind='invoices' AND status IN ('draft','cancelled')));
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT coalesce(sum(a.amount_minor),0) INTO paid FROM pg10_document_intents l
 JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=l.workspace_id AND a.environment=l.environment
 WHERE l.document_id=d.id;
 IF d.kind='payment-links' THEN paid:=0; END IF;
 IF d.kind='invoices' THEN
  SELECT min(occurred_at) INTO issued_at FROM pg10_versions WHERE document_id=d.id AND status='issued';
  IF d.customer_id IS NOT NULL THEN SELECT body->>'name' INTO customer_name FROM pg10_documents WHERE id=d.customer_id AND kind='customers' AND workspace_id=d.workspace_id AND environment=d.environment; END IF;
 END IF;
 RETURN jsonb_build_object('id',d.id,'workspace_id',d.workspace_id,'environment',d.environment,'kind',d.kind,
 'reference',d.reference,'status',d.status,'created_at',d.created_at,'issued_at',issued_at,'bill_to_name',customer_name,
 'body',(CASE WHEN d.issued_snapshot IS NOT NULL THEN d.issued_snapshot ELSE d.body END)-'private_notes'-'customer_id','amount_minor',d.amount_minor,'paid_minor',paid,
 'due_minor',greatest(d.amount_minor-paid,0),'currency','BDT','version',d.version);
END $$;
REVOKE ALL ON FUNCTION pg10_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_public(text) TO ekmivo_finance_reader;
COMMIT;
