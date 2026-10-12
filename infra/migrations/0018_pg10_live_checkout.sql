BEGIN;
-- Reuse the reviewed immutable route lock, changing only the obsolete
-- sandbox restriction. Actual source health and account binding stay intact.
DO $$ DECLARE definition text;needle text:='i.environment<>''sandbox'' OR ';BEGIN
 definition:=pg_get_functiondef('pg06_lock_route(text,text,text,text)'::regprocedure);
 IF position(needle IN definition)=0 THEN RAISE EXCEPTION 'route contract changed; review before migration';END IF;
 definition:=replace(definition,'FUNCTION public.pg06_lock_route(','FUNCTION public.pg10_lock_route(');
 definition:=replace(definition,needle,'');EXECUTE definition;
 definition:=replace(definition,'OR display_suffix=''0000'' AND','OR i.environment=''sandbox'' AND display_suffix=''0000'' AND');EXECUTE definition;
END $$;
CREATE FUNCTION pg10_checkout_view(cap text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;i payment_intents;a payment_attempts;cipher bytea;methods jsonb;online boolean;sources jsonb;BEGIN
 result:=pg05_checkout_view(cap);IF result IS NULL THEN RETURN NULL;END IF;
 SELECT p.* INTO i FROM pg05_checkout_tokens t JOIN payment_intents p ON p.id=t.intent_id AND p.workspace_id=t.workspace_id AND p.environment=t.environment WHERE t.token_digest=cap;
 SELECT * INTO a FROM payment_attempts WHERE intent_id=i.id AND workspace_id=i.workspace_id AND environment=i.environment ORDER BY issued_at DESC LIMIT 1;
 SELECT coalesce(jsonb_agg(DISTINCT to_jsonb(accounts.method)),'[]') INTO methods FROM financial_receiving_accounts accounts JOIN pg06_account_configuration c ON c.account_id=accounts.id
 WHERE accounts.workspace_id=i.workspace_id AND accounts.environment=i.environment AND c.disabled_at IS NULL AND EXISTS(SELECT 1 FROM pg06_devices d WHERE d.account_id=accounts.id AND d.revoked_at IS NULL AND d.permission_ok AND d.heartbeat_at>now()-interval '5 minutes');
 IF a.id IS NOT NULL THEN
 SELECT c.number_cipher INTO cipher FROM pg06_account_configuration c WHERE c.workspace_id=i.workspace_id AND c.environment=i.environment AND c.account_id=a.receiving_account_id;
 SELECT EXISTS(SELECT 1 FROM pg06_devices d WHERE d.account_id=a.receiving_account_id AND d.revoked_at IS NULL AND d.permission_ok AND d.heartbeat_at>now()-interval '5 minutes') INTO online;
 END IF;
 IF i.environment='live' THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('method',account.method,'source',device.source,'parser_id',device.parser_id)),'[]') INTO sources FROM pg06_devices device JOIN financial_receiving_accounts account ON account.id=device.account_id JOIN pg06_account_configuration config ON config.account_id=account.id WHERE account.workspace_id=i.workspace_id AND account.environment=i.environment AND config.disabled_at IS NULL AND device.revoked_at IS NULL AND device.permission_ok AND device.heartbeat_at>now()-interval '5 minutes' AND(a.id IS NULL OR account.id=a.receiving_account_id);
 result:=result||jsonb_build_object('methods',CASE WHEN a.id IS NULL THEN methods ELSE '[]'::jsonb END,'destination',NULL,'destination_cipher',CASE WHEN cipher IS NOT NULL THEN encode(cipher,'base64') END,'source_online',coalesce(online,false),'verification_available',cipher IS NOT NULL OR jsonb_array_length(methods)>0);
 result:=result||jsonb_build_object('sources',sources);
 END IF;
 result:=result||jsonb_build_object('verification',(SELECT jsonb_build_object('method',p.verification_method,'verified_at',p.verified_at,'original_transaction_at',o.original_transaction_at,'time_precision',o.time_precision,'amount_minor',p.verified_amount_minor,'currency',p.currency,'receipt_method',o.method,'receiving_suffix',account.display_suffix) FROM financial_payments p JOIN financial_receipt_observations o ON o.id=p.observation_id AND o.workspace_id=p.workspace_id AND o.environment=p.environment JOIN financial_receiving_accounts account ON account.id=o.receiving_account_id WHERE p.attempt_id=a.id AND p.workspace_id=i.workspace_id AND p.environment=i.environment));
 RETURN result;
END $$;
CREATE FUNCTION pg11_checkout_payment(cap text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.id FROM pg05_checkout_tokens t JOIN payment_attempts a ON a.intent_id=t.intent_id AND a.workspace_id=t.workspace_id AND a.environment=t.environment
 JOIN financial_payments p ON p.attempt_id=a.id AND p.workspace_id=a.workspace_id AND p.environment=a.environment WHERE t.token_digest=cap AND t.environment=(SELECT environment FROM financial_realm WHERE singleton) LIMIT 1
$$;
REVOKE ALL ON FUNCTION pg10_lock_route(text,text,text,text),pg10_checkout_view(text),pg11_checkout_payment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_lock_route(text,text,text,text),pg10_checkout_view(text),pg11_checkout_payment(text) TO ekmivo_finance_reader;
COMMIT;
