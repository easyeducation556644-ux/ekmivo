BEGIN;
-- A cursor is a scoped resource ID, never an offset or a foreign tenant's pivot.
CREATE FUNCTION pg11_page(w uuid,e text,res text,item uuid,after_id uuid,filter_status text,account uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pivot timestamptz; result jsonb; next_id uuid;
BEGIN
 PERFORM pg06_scope(w,e);
 IF account IS NOT NULL AND NOT EXISTS(SELECT 1 FROM financial_receiving_accounts WHERE workspace_id=w AND environment=e AND id=account) THEN RAISE EXCEPTION 'account unavailable' USING ERRCODE='P0002';END IF;
 IF res='refunds' THEN
  IF filter_status IS NOT NULL AND filter_status NOT IN ('requested','reviewing','approved','rejected','seller_reported_returned','cancelled') THEN RAISE EXCEPTION 'invalid status' USING ERRCODE='22023';END IF;
  IF after_id IS NOT NULL THEN SELECT created_at INTO pivot FROM pg11_refunds WHERE workspace_id=w AND environment=e AND id=after_id;IF NOT FOUND THEN RAISE EXCEPTION 'cursor unavailable' USING ERRCODE='P0002';END IF;END IF;
  WITH page AS (SELECT r.* FROM pg11_refunds r WHERE r.workspace_id=w AND r.environment=e AND(item IS NULL OR r.id=item) AND(filter_status IS NULL OR r.status=filter_status) AND(after_id IS NULL OR (r.created_at,r.id)<(pivot,after_id)) ORDER BY r.created_at DESC,r.id DESC LIMIT 101), numbered AS(SELECT *,row_number() OVER(ORDER BY created_at DESC,id DESC) rn FROM page)
  SELECT coalesce(jsonb_agg(to_jsonb(n)-'rn' ORDER BY created_at DESC,id DESC) FILTER(WHERE rn<=100),'[]'),CASE WHEN count(*)>100 THEN (array_agg(id ORDER BY created_at DESC,id DESC))[100] END INTO result,next_id FROM numbered n;
  IF item IS NOT NULL AND jsonb_array_length(result)=0 THEN RAISE EXCEPTION 'refund unavailable' USING ERRCODE='P0002';END IF;
  RETURN jsonb_build_object('items',result,'next_cursor',next_id);
 ELSIF res='reconciliation' THEN
  IF filter_status IS NOT NULL AND filter_status NOT IN ('linked','unlinked') THEN RAISE EXCEPTION 'invalid status' USING ERRCODE='22023';END IF;
  IF after_id IS NOT NULL THEN SELECT transaction_at INTO pivot FROM pg11_statements WHERE workspace_id=w AND environment=e AND id=after_id;IF NOT FOUND THEN RAISE EXCEPTION 'cursor unavailable' USING ERRCODE='P0002';END IF;END IF;
  WITH page AS(SELECT s.* FROM pg11_statements s WHERE s.workspace_id=w AND s.environment=e AND(account IS NULL OR s.account_id=account) AND(filter_status IS NULL OR filter_status='linked' AND s.payment_id IS NOT NULL OR filter_status='unlinked' AND s.payment_id IS NULL) AND(after_id IS NULL OR(s.transaction_at,s.id)<(pivot,after_id)) ORDER BY s.transaction_at DESC,s.id DESC LIMIT 101),numbered AS(SELECT *,row_number() OVER(ORDER BY transaction_at DESC,id DESC) rn FROM page)
  SELECT coalesce(jsonb_agg(to_jsonb(n)-'rn' ORDER BY transaction_at DESC,id DESC) FILTER(WHERE rn<=100),'[]'),CASE WHEN count(*)>100 THEN(array_agg(id ORDER BY transaction_at DESC,id DESC))[100] END INTO result,next_id FROM numbered n;
  RETURN jsonb_build_object('items',jsonb_build_object('statements',result),'next_cursor',next_id,'definition','Merchant-imported statements; not provider-authenticated payment proof');
 END IF;
 RAISE EXCEPTION 'invalid resource' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION pg11_page(uuid,text,text,uuid,uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg11_page(uuid,text,text,uuid,uuid,text,uuid) TO ekmivo_finance_reader;
CREATE INDEX pg11_refund_page ON pg11_refunds(workspace_id,environment,created_at DESC,id DESC);
CREATE INDEX pg11_statement_page ON pg11_statements(workspace_id,environment,transaction_at DESC,id DESC);
COMMIT;
