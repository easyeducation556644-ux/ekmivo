BEGIN;
CREATE TABLE pg15_worker_health(kind text PRIMARY KEY CHECK(kind IN ('critical','notice','export','maintenance','invoice_notice')),environment text NOT NULL,seen_at timestamptz NOT NULL DEFAULT now(),healthy boolean NOT NULL);
ALTER TABLE pg15_worker_health ENABLE ROW LEVEL SECURITY;ALTER TABLE pg15_worker_health FORCE ROW LEVEL SECURITY;CREATE POLICY pg15_health_owner ON pg15_worker_health TO CURRENT_USER USING(true) WITH CHECK(true);REVOKE ALL ON pg15_worker_health FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg15_heartbeat(p_kind text,p_realm text,p_healthy boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF p_realm IS DISTINCT FROM(SELECT environment FROM financial_realm WHERE singleton) THEN RAISE EXCEPTION 'worker realm mismatch' USING ERRCODE='42501';END IF;
 INSERT INTO pg15_worker_health(kind,environment,healthy) VALUES(p_kind,p_realm,p_healthy) ON CONFLICT(kind) DO UPDATE SET seen_at=now(),healthy=EXCLUDED.healthy;
END $$;
CREATE FUNCTION pg15_health() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT jsonb_build_object('critical_ready',EXISTS(SELECT 1 FROM pg15_worker_health WHERE kind='critical' AND healthy AND seen_at>now()-interval '60 seconds'),'export_ready',EXISTS(SELECT 1 FROM pg15_worker_health WHERE kind='export' AND healthy AND seen_at>now()-interval '120 seconds'),'notice_ready',EXISTS(SELECT 1 FROM pg15_worker_health WHERE kind='notice' AND healthy AND seen_at>now()-interval '60 seconds'),'maintenance_ready',EXISTS(SELECT 1 FROM pg15_worker_health WHERE kind='maintenance' AND healthy AND seen_at>now()-interval '180 seconds'),'invoice_notice_ready',EXISTS(SELECT 1 FROM pg15_worker_health WHERE kind='invoice_notice' AND healthy AND seen_at>now()-interval '120 seconds'),'environment',(SELECT environment FROM financial_realm WHERE singleton)) $$;
REVOKE ALL ON FUNCTION pg15_heartbeat(text,text,boolean),pg15_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg15_heartbeat(text,text,boolean) TO ekmivo_financial_worker;
GRANT EXECUTE ON FUNCTION pg15_health() TO ekmivo_finance_reader;
COMMIT;
