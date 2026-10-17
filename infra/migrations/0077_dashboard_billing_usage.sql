-- Financial databases only. Usage comes from actual intent/allowance records.
BEGIN;
CREATE TABLE dashboard_checkout_checks(workspace_id uuid NOT NULL,environment text NOT NULL,intent_id uuid NOT NULL,check_date date NOT NULL,checks bigint NOT NULL DEFAULT 1,PRIMARY KEY(workspace_id,environment,intent_id,check_date),FOREIGN KEY(workspace_id,environment,intent_id) REFERENCES payment_intents(workspace_id,environment,id));
CREATE TABLE dashboard_usage_tracking(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),started_at timestamptz NOT NULL DEFAULT now());
INSERT INTO dashboard_usage_tracking DEFAULT VALUES;
ALTER TABLE dashboard_checkout_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_checkout_checks FORCE ROW LEVEL SECURITY;
CREATE POLICY dashboard_checks_owner ON dashboard_checkout_checks TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON dashboard_checkout_checks,dashboard_usage_tracking FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION dashboard_record_checkout_check(w uuid,e text,i uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);
 INSERT INTO dashboard_checkout_checks(workspace_id,environment,intent_id,check_date) VALUES(w,e,i,(now() AT TIME ZONE 'Asia/Dhaka')::date) ON CONFLICT(workspace_id,environment,intent_id,check_date) DO UPDATE SET checks=dashboard_checkout_checks.checks+1;
END $$;
CREATE FUNCTION dashboard_billing_usage(w uuid,e text,start_at timestamptz,end_at timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;BEGIN
 PERFORM pg06_scope(w,e);
 IF start_at IS NULL OR end_at IS NULL OR end_at<=start_at OR end_at-start_at>interval '2200 days' THEN RAISE EXCEPTION 'invalid usage period' USING ERRCODE='22023';END IF;
 WITH consumed AS MATERIALIZED(SELECT s.*,
  (SELECT a.method FROM financial_allocations f JOIN financial_payments p ON p.id=f.payment_id AND p.workspace_id=w AND p.environment=e JOIN payment_attempts a ON a.id=p.attempt_id AND a.workspace_id=w AND a.environment=e WHERE f.workspace_id=w AND f.environment=e AND f.intent_id=s.intent_id ORDER BY f.created_at DESC LIMIT 1) method,
  coalesce((SELECT d.kind FROM pg10_document_intents di JOIN pg10_documents d ON d.id=di.document_id AND d.workspace_id=w AND d.environment=e WHERE di.workspace_id=w AND di.environment=e AND di.intent_id=s.intent_id),'api') source
 FROM payment_allowance_slots s WHERE s.workspace_id=w AND s.environment=e AND s.state='consumed' AND s.created_at>=start_at AND s.created_at<end_at),
 days AS(SELECT stamp::date AS date_key FROM generate_series((start_at AT TIME ZONE 'Asia/Dhaka')::date,(least(end_at,now()) AT TIME ZONE 'Asia/Dhaka')::date,interval '1 day') AS dates(stamp)),
 by_day AS(SELECT (created_at AT TIME ZONE 'Asia/Dhaka')::date AS date_key,count(*) n FROM consumed GROUP BY 1),
 intents AS MATERIALIZED(SELECT pg05_intent_state(w,e,id) state FROM payment_intents WHERE workspace_id=w AND environment=e AND created_at>=start_at AND created_at<end_at)
 SELECT jsonb_build_object('period_start',start_at,'period_end',end_at,'used',(SELECT count(*) FROM consumed),
 'daily',coalesce((SELECT jsonb_agg(jsonb_build_object('day',days.date_key,'count',coalesce(b.n,0)) ORDER BY days.date_key) FROM days LEFT JOIN by_day b USING(date_key)),'[]'),
 'methods',coalesce((SELECT jsonb_agg(jsonb_build_object('name',method,'count',n) ORDER BY method) FROM(SELECT method,count(*) n FROM consumed GROUP BY method)m),'[]'),
 'sources',coalesce((SELECT jsonb_agg(jsonb_build_object('name',source,'count',n) ORDER BY source) FROM(SELECT source,count(*) n FROM consumed GROUP BY source)m),'[]'),
 'failed',(SELECT count(*) FROM intents WHERE state='exception'),'expired',(SELECT count(*) FROM intents WHERE state='expired'),
 'checks_recorded_since',(SELECT started_at FROM dashboard_usage_tracking),
 'repeat_checks',(SELECT coalesce(sum(greatest(0,checks-1)),0) FROM dashboard_checkout_checks WHERE workspace_id=w AND environment=e AND check_date>=(start_at AT TIME ZONE 'Asia/Dhaka')::date AND check_date<(end_at AT TIME ZONE 'Asia/Dhaka')::date)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION dashboard_record_checkout_check(uuid,text,uuid),dashboard_billing_usage(uuid,text,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_record_checkout_check(uuid,text,uuid),dashboard_billing_usage(uuid,text,timestamptz,timestamptz) TO ekmivo_finance_reader;
CREATE OR REPLACE FUNCTION pg13_platform_payment(cap text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('id',p.id,'amount_minor',p.verified_amount_minor,'verified_at',p.verified_at,'workspace_id',p.workspace_id,'method',a.method,'payer_suffix',a.payer_suffix)
 FROM pg05_checkout_tokens t JOIN financial_allocations x ON x.intent_id=t.intent_id AND x.workspace_id=t.workspace_id AND x.environment=t.environment JOIN financial_payments p ON p.id=x.payment_id AND p.workspace_id=x.workspace_id AND p.environment=x.environment JOIN payment_attempts a ON a.id=p.attempt_id AND a.workspace_id=p.workspace_id AND a.environment=p.environment
 WHERE t.token_digest=cap AND t.environment='live' AND x.amount_minor=p.verified_amount_minor LIMIT 1
$$;
COMMIT;
