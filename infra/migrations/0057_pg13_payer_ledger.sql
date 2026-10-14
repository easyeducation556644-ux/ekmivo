-- 0057: scope-bound reporting ledger; authoritative payer stays AES-GCM encrypted at rest.
-- Read-only. Intended for owner/admin reports via the Go API, which decrypts
-- per-record contact JSON only after membership+role authorization.
BEGIN;
DO $preflight$
DECLARE actual text; owner_ok boolean;
BEGIN
 SELECT environment INTO actual FROM financial_realm WHERE singleton;
 SELECT relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
 INTO owner_ok FROM pg_class WHERE oid='public.financial_realm'::regclass;
 IF actual NOT IN ('live','sandbox') OR NOT coalesce(owner_ok,false)
   OR to_regclass('public.pg06_phone_forwarded') IS NULL
   OR to_regclass('public.financial_payments') IS NULL
   OR to_regprocedure('public.pg06_scope(uuid,text)') IS NULL
 THEN RAISE EXCEPTION '0057 requires isolated owner financial realm and existing forwarder'; END IF;
END $preflight$;

CREATE FUNCTION pg57_report_payer_ledger(
 w uuid, e text, date_from timestamptz, date_to timestamptz,
 account_filter uuid, cursor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
DECLARE cursor_ts timestamptz; rows jsonb; result jsonb; more boolean;
BEGIN
 PERFORM pg06_scope(w,e);
 IF date_from IS NULL OR date_to IS NULL OR date_to<=date_from
    OR date_to-date_from>interval '366 days' THEN
  RAISE EXCEPTION 'invalid ledger range' USING ERRCODE='22023';
 END IF;
 IF cursor_id IS NOT NULL THEN
  SELECT p.verified_at INTO cursor_ts FROM financial_payments p
  JOIN payment_attempts a ON a.id=p.attempt_id AND a.workspace_id=p.workspace_id AND a.environment=p.environment
  WHERE p.workspace_id=w AND p.environment=e AND p.id=cursor_id
    AND p.verified_at>=date_from AND p.verified_at<date_to
    AND (account_filter IS NULL OR a.receiving_account_id=account_filter);
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid or foreign ledger cursor' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.verified_at DESC,t.id DESC),'[]'::jsonb)
 INTO rows FROM (
  SELECT p.id,p.verified_at,p.verified_amount_minor,p.currency,
         i.merchant_reference,a.method,a.payer_suffix,
         o.original_transaction_at,
         encode(f.payer_cipher,'base64') AS payer_cipher_b64
  FROM financial_payments p
  JOIN payment_attempts a ON a.id=p.attempt_id AND a.workspace_id=p.workspace_id AND a.environment=p.environment
  JOIN payment_intents i ON i.id=a.intent_id AND i.workspace_id=p.workspace_id AND i.environment=p.environment
  JOIN financial_receipt_observations o ON o.id=p.observation_id AND o.workspace_id=p.workspace_id AND o.environment=p.environment
  LEFT JOIN LATERAL (
   SELECT f2.payer_cipher FROM pg06_phone_forwarded f2
   WHERE f2.observation_id=p.observation_id AND f2.workspace_id=w AND f2.environment=e
    AND f2.payer_cipher IS NOT NULL
   ORDER BY f2.received_at DESC,f2.id DESC LIMIT 1
  ) f ON true
  WHERE p.workspace_id=w AND p.environment=e
   AND p.verified_at>=date_from AND p.verified_at<date_to
   AND (account_filter IS NULL OR a.receiving_account_id=account_filter)
   AND (cursor_id IS NULL OR (p.verified_at,p.id)<(cursor_ts,cursor_id))
  ORDER BY p.verified_at DESC,p.id DESC LIMIT 26
 ) t;
 more:=jsonb_array_length(rows)>25;
 SELECT coalesce(jsonb_agg(x.value ORDER BY x.ord),'[]'::jsonb) INTO result
 FROM jsonb_array_elements(rows) WITH ORDINALITY x(value,ord) WHERE x.ord<=25;
 RETURN jsonb_build_object('items',result,'next_cursor',
  CASE WHEN more THEN result->24->>'id' ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION pg57_report_payer_ledger(uuid,text,timestamptz,timestamptz,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg57_report_payer_ledger(uuid,text,timestamptz,timestamptz,uuid,uuid)
 TO ekmivo_finance_reader;
COMMIT;
