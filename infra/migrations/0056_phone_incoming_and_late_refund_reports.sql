-- 0056: unify legacy and physical-phone receipt reads, plus ALL seller refund states.
-- No payment/receipt/refund data is rewritten. Caller remains scoped by pg06_scope.
BEGIN;
DO $preflight$ BEGIN
 IF to_regclass('public.financial_realm') IS NULL
    OR to_regclass('public.pg06_phone_forwarded') IS NULL
    OR to_regclass('public.pg11_refunds') IS NULL
    OR to_regprocedure('public.pg06_scope(uuid,text)') IS NULL
    OR to_regclass('public.auth_sessions') IS NOT NULL THEN
  RAISE EXCEPTION '0056 requires the isolated financial realm and PG06/PG11';
 END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.pg56_incoming_read(
 w uuid, e text, resource_id uuid, cursor_id uuid,
 status_filter text, account_filter uuid, method_filter text,
 date_from timestamptz, date_to timestamptz, search_filter text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE anchor_time timestamptz; result jsonb; next_id uuid;
BEGIN
 PERFORM pg06_scope(w,e);
 IF search_filter IS NOT NULL AND (btrim(search_filter)='' OR char_length(search_filter)>96) THEN
  RAISE EXCEPTION 'invalid search filter' USING ERRCODE='22023';
 END IF;
 IF cursor_id IS NOT NULL THEN
  SELECT received_at INTO anchor_time FROM pg06_phone_forwarded
    WHERE workspace_id=w AND environment=e AND id=cursor_id;
  IF anchor_time IS NULL THEN
   SELECT received_at INTO anchor_time FROM pg06_transport
    WHERE workspace_id=w AND environment=e AND id=cursor_id;
  END IF;
  IF anchor_time IS NULL THEN RAISE EXCEPTION 'invalid or foreign cursor' USING ERRCODE='22023'; END IF;
 END IF;
 WITH sources AS (
  -- Historical per-source SMS enrollments remain readable.
  SELECT t.id,t.observation_id,t.device_id,t.parse_reason,t.observed_at,t.received_at,
   d.source AS device_source,d.binding AS device_binding,d.name AS device_name,
   o.receiving_account_id,o.amount_minor,o.method,o.original_transaction_at,
   o.time_precision,o.parser_version,o.provider_reference_hmac,o.inbound_event_id,
   CASE WHEN t.parse_reason='duplicate_provider_identity' THEN 'duplicate'
        WHEN t.parse_reason<>'' THEN 'invalid'
        ELSE coalesce(s.status,'pending') END AS status,
   s.reason,s.payment_id,t.digest,'legacy'::text AS receipt_source
  FROM pg06_transport t
  JOIN pg06_devices d ON d.id=t.device_id AND d.workspace_id=w AND d.environment=e
  LEFT JOIN financial_receipt_observations o ON o.id=t.observation_id
  LEFT JOIN pg07_receipt_results s ON s.observation_id=t.observation_id
  WHERE t.workspace_id=w AND t.environment=e
  UNION ALL
  -- Current physical-phone forwarder: no SIM/account binding is asserted.
  SELECT f.id,f.observation_id,f.phone_id AS device_id,
   CASE WHEN f.reason='accepted_for_verification' THEN '' ELSE f.reason END AS parse_reason,
   f.observed_at,f.received_at,f.sender AS device_source,
   'physical_sms'::text AS device_binding,p.name AS device_name,
   o.receiving_account_id,o.amount_minor,o.method,o.original_transaction_at,
   o.time_precision,o.parser_version,o.provider_reference_hmac,o.inbound_event_id,
   CASE WHEN f.reason='duplicate_provider_identity' THEN 'duplicate'
        WHEN f.reason<>'accepted_for_verification' THEN 'invalid'
        ELSE coalesce(s.status,'pending') END AS status,
   s.reason,s.payment_id,f.digest,'physical_phone'::text AS receipt_source
  FROM pg06_phone_forwarded f
  JOIN pg06_phones p ON p.id=f.phone_id AND p.workspace_id=w AND p.environment=e
  LEFT JOIN financial_receipt_observations o ON o.id=f.observation_id
  LEFT JOIN pg07_receipt_results s ON s.observation_id=f.observation_id
  WHERE f.workspace_id=w AND f.environment=e
 ),
 eligible AS (
  SELECT * FROM sources x WHERE
   (resource_id IS NULL OR x.id=resource_id)
   AND (cursor_id IS NULL OR (x.received_at,x.id)<(anchor_time,cursor_id))
   AND (status_filter IS NULL OR x.status=status_filter)
   AND (account_filter IS NULL OR x.receiving_account_id=account_filter)
   AND (method_filter IS NULL OR x.method=method_filter)
   AND (date_from IS NULL OR x.received_at>=date_from)
   AND (date_to IS NULL OR x.received_at<date_to)
   AND (search_filter IS NULL OR
      strpos(lower(coalesce(x.parse_reason,'')),lower(search_filter))>0 OR
      strpos(lower(coalesce(x.reason,'')),lower(search_filter))>0 OR
      strpos(lower(coalesce(x.device_name,'')),lower(search_filter))>0 OR
      strpos(lower(coalesce(x.method,'')),lower(search_filter))>0)
 ),
 page AS (SELECT * FROM eligible ORDER BY received_at DESC,id DESC LIMIT 50),
 mapped AS (
  SELECT x.id,x.received_at,
  jsonb_build_object(
   'id',x.id,'observation_id',x.observation_id,'device_id',x.device_id,
   'parse_reason',x.parse_reason,'observed_at',x.observed_at,'received_at',x.received_at,
   'device_source',x.device_source,'device_binding',x.device_binding,
   'source_kind',(SELECT ie.source_kind FROM financial_inbound_events ie WHERE ie.id=x.inbound_event_id),
   'receipt_source',x.receipt_source,'receiving_account_id',x.receiving_account_id,
   'amount_minor',x.amount_minor,'method',x.method,
   'original_transaction_at',x.original_transaction_at,'time_precision',x.time_precision,
   'parser_version',x.parser_version,'status',x.status,'reason',x.reason,
   'payment_id',x.payment_id,
   'evidence_digest_prefix',CASE WHEN resource_id IS NOT NULL THEN left(x.digest,12) END,
   'reference_digest_prefix',CASE WHEN resource_id IS NOT NULL THEN left(x.provider_reference_hmac,12) END,
   'candidates',CASE WHEN resource_id IS NOT NULL AND x.observation_id IS NOT NULL
      THEN pg07_candidates(w,e,x.observation_id) END
  ) AS item FROM page x
 )
 SELECT coalesce(jsonb_agg(item ORDER BY received_at DESC,id DESC),'[]'::jsonb),
  CASE WHEN count(*)=50 THEN (array_agg(id ORDER BY received_at DESC,id DESC))[50] END
 INTO result,next_id FROM mapped;
 RETURN jsonb_build_object('items',result,'next_cursor',next_id);
END $$;

CREATE OR REPLACE FUNCTION public.pg56_refund_summary(
 w uuid,e text,start_time timestamptz,end_time timestamptz,account uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg06_scope(w,e);
 IF start_time IS NULL OR end_time IS NULL OR end_time<=start_time OR
    end_time-start_time>interval '366 days' THEN
   RAISE EXCEPTION 'invalid report period' USING ERRCODE='22023';
 END IF;
 IF account IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM financial_receiving_accounts a
    WHERE a.workspace_id=w AND a.environment=e AND a.id=account
 ) THEN RAISE EXCEPTION 'account unavailable' USING ERRCODE='P0002'; END IF;
 WITH eligible AS (
  SELECT r.status,r.amount_minor FROM pg11_refunds r
  WHERE r.workspace_id=w AND r.environment=e
   AND r.created_at>=start_time AND r.created_at<end_time
   AND (account IS NULL OR EXISTS(
     SELECT 1 FROM financial_payments p JOIN payment_attempts a ON a.id=p.attempt_id
      WHERE p.id=r.payment_id AND a.workspace_id=w AND a.environment=e
       AND a.receiving_account_id=account
   ) OR (r.payment_id IS NULL AND EXISTS(
     SELECT 1 FROM payment_attempts a WHERE a.intent_id=r.source_intent_id
      AND a.workspace_id=w AND a.environment=e AND a.receiving_account_id=account
   )))
 ), by_status AS (
  SELECT status,sum(amount_minor) amount_minor,count(*) request_count
  FROM eligible GROUP BY status
 )
 SELECT jsonb_build_object(
  'items',coalesce((SELECT jsonb_agg(to_jsonb(b)) FROM by_status b),'[]'::jsonb),
  'request_count',(SELECT count(*) FROM eligible),
  'open_requested_minor',coalesce((SELECT sum(amount_minor) FROM eligible
    WHERE status IN ('requested','reviewing','approved')),0),
  'seller_reported_returned_minor',coalesce((SELECT sum(amount_minor) FROM eligible
    WHERE status='seller_reported_returned'),0)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pg56_incoming_read(uuid,text,uuid,uuid,text,uuid,text,timestamptz,timestamptz,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pg56_refund_summary(uuid,text,timestamptz,timestamptz,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pg56_incoming_read(uuid,text,uuid,uuid,text,uuid,text,timestamptz,timestamptz,text) TO ekmivo_finance_reader;
GRANT EXECUTE ON FUNCTION public.pg56_refund_summary(uuid,text,timestamptz,timestamptz,uuid) TO ekmivo_finance_reader;
COMMIT;
