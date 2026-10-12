BEGIN;
CREATE FUNCTION pg13_pending_billing() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') FROM(SELECT id,workspace_id,amount_minor FROM pg13_platform_invoices WHERE status='issued' AND created_at>now()-interval '90 days' ORDER BY created_at LIMIT 100)i $$;
REVOKE ALL ON FUNCTION pg13_pending_billing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_pending_billing(),pg13_billing_verified(uuid,uuid,uuid,bigint,timestamptz) TO ekmivo_financial_projection;
COMMIT;
