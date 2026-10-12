BEGIN;
CREATE FUNCTION pg13_platform_payment(cap text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('id',p.id,'amount_minor',p.verified_amount_minor,'verified_at',p.verified_at,'workspace_id',p.workspace_id)
 FROM pg05_checkout_tokens t JOIN financial_allocations x ON x.intent_id=t.intent_id AND x.workspace_id=t.workspace_id AND x.environment=t.environment JOIN financial_payments p ON p.id=x.payment_id AND p.workspace_id=x.workspace_id AND p.environment=x.environment
 WHERE t.token_digest=cap AND t.environment='live' AND x.amount_minor=p.verified_amount_minor LIMIT 1
$$;
REVOKE ALL ON FUNCTION pg13_platform_payment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_platform_payment(text) TO ekmivo_finance_reader;
COMMIT;
