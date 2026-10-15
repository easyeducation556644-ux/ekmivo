-- Additive, isolated financial realm migration. Reuse signed delivery worker.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.pg62_intent_options') IS NULL OR to_regclass('public.auth_sessions') IS NOT NULL THEN
 RAISE EXCEPTION '0063 requires isolated financial realm and 0062'; END IF;
END $$;
ALTER TABLE pg08_endpoints ADD COLUMN auto_intent_id uuid;
ALTER TABLE pg08_endpoints ADD CONSTRAINT pg63_auto_intent_fk FOREIGN KEY(workspace_id,environment,auto_intent_id) REFERENCES payment_intents(workspace_id,environment,id);
CREATE UNIQUE INDEX pg63_auto_endpoint ON pg08_endpoints(workspace_id,environment,auto_intent_id) WHERE auto_intent_id IS NOT NULL;
CREATE FUNCTION pg63_bind_payment_endpoint(w uuid,e text,intent uuid,hook text,cipher bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE endpoint uuid; old_url text;
BEGIN
 PERFORM pg06_scope(w,e);
 IF hook !~ '^https://' OR length(hook)>2048 OR octet_length(cipher)<40 OR NOT EXISTS(SELECT 1 FROM payment_intents WHERE workspace_id=w AND environment=e AND id=intent) THEN
 RAISE EXCEPTION 'invalid automatic endpoint binding' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg63:'||w::text||':'||intent::text,0));
 SELECT id,url INTO endpoint,old_url FROM pg08_endpoints WHERE workspace_id=w AND environment=e AND auto_intent_id=intent;
 IF FOUND THEN
 IF old_url<>hook THEN RAISE EXCEPTION 'payment endpoint changed on retry' USING ERRCODE='23505'; END IF;
 RETURN endpoint;
 END IF;
 INSERT INTO pg08_endpoints(workspace_id,environment,url,secret,auto_intent_id) VALUES(w,e,hook,cipher,intent) RETURNING id INTO endpoint;
 RETURN endpoint;
END $$;
REVOKE ALL ON FUNCTION pg63_bind_payment_endpoint(uuid,text,uuid,text,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg63_bind_payment_endpoint(uuid,text,uuid,text,bytea) TO ekmivo_finance_reader;
CREATE OR REPLACE FUNCTION pg62_store_intent_options(w uuid,e text,intent uuid,redir text,cancel text,hook text,cname text,cemail text,cphone text,extra jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing_options pg62_intent_options%ROWTYPE; endpoint uuid;
BEGIN
 IF current_setting('ekmivo.workspace_id',true) IS DISTINCT FROM w::text OR
 current_setting('ekmivo.environment',true) IS DISTINCT FROM e OR
 e IS DISTINCT FROM (SELECT environment FROM financial_realm WHERE singleton) OR
 NOT EXISTS(SELECT 1 FROM payment_intents WHERE workspace_id=w AND environment=e AND id=intent) OR
 length(redir)>2048 OR length(cancel)>2048 OR length(hook)>2048 OR
 length(cname)>160 OR length(cemail)>254 OR length(cphone)>32 OR
 length(extra::text)>2048 OR jsonb_typeof(extra) IS DISTINCT FROM 'object' THEN
 RAISE EXCEPTION 'invalid payment options or authority' USING ERRCODE='22023';
 END IF;
 SELECT * INTO existing_options FROM pg62_intent_options WHERE intent_id=intent;
 IF FOUND THEN
 IF (existing_options.redirect_url,existing_options.cancel_url,existing_options.webhook_url,existing_options.customer_name,
     existing_options.customer_email,existing_options.customer_phone,existing_options.merchant_metadata)
    IS DISTINCT FROM (redir,cancel,hook,cname,cemail,cphone,extra)
 THEN RAISE EXCEPTION 'payment options changed on retry' USING ERRCODE='23505'; END IF;
 RETURN true;
 END IF;
 -- The Go boundary validates HTTPS before binding a scoped encrypted endpoint.
 IF hook<>'' THEN
  SELECT id INTO endpoint FROM pg08_endpoints
  WHERE workspace_id=w AND environment=e AND url=hook AND active AND auto_intent_id=intent;
  IF endpoint IS NULL THEN RAISE EXCEPTION 'automatic payment endpoint binding required' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO pg62_intent_options(workspace_id,environment,intent_id,redirect_url,cancel_url,webhook_url,webhook_endpoint_id,customer_name,customer_email,customer_phone,merchant_metadata)
 VALUES(w,e,intent,redir,cancel,hook,endpoint,cname,cemail,cphone,extra);
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION pg62_route_payment_webhook() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target_endpoint uuid; automatic_intent uuid;
BEGIN
 SELECT options.webhook_endpoint_id INTO target_endpoint
 FROM pg07_events ev
 LEFT JOIN financial_payments p ON p.id=ev.payment_id AND p.workspace_id=ev.workspace_id AND p.environment=ev.environment
 LEFT JOIN payment_attempts a ON a.id=p.attempt_id AND a.workspace_id=p.workspace_id AND a.environment=p.environment
 JOIN pg62_intent_options options ON options.workspace_id=ev.workspace_id AND options.environment=ev.environment
 AND options.intent_id::text=COALESCE(a.intent_id::text,ev.payload->'data'->>'payment_intent_id',ev.payload->'data'->>'intent_id')
 WHERE ev.id=NEW.event_id AND ev.workspace_id=NEW.workspace_id AND ev.environment=NEW.environment;
 SELECT auto_intent_id INTO automatic_intent FROM pg08_endpoints WHERE id=NEW.endpoint_id AND workspace_id=NEW.workspace_id AND environment=NEW.environment;
 IF target_endpoint IS NOT NULL AND target_endpoint<>NEW.endpoint_id THEN RETURN NULL; END IF;
 -- Automatic endpoints never receive unrelated payments or default broadcasts.
 IF target_endpoint IS NULL AND automatic_intent IS NOT NULL THEN RETURN NULL; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION pg63_payment_callback_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE intent uuid;
BEGIN
 IF NEW.event_type='payment.verified' THEN
 SELECT a.intent_id INTO intent FROM financial_payments p JOIN payment_attempts a ON a.id=p.attempt_id AND a.workspace_id=p.workspace_id AND a.environment=p.environment
 WHERE p.id=NEW.payment_id AND p.workspace_id=NEW.workspace_id AND p.environment=NEW.environment;
 IF intent IS NOT NULL THEN NEW.payload:=NEW.payload||jsonb_build_object('invoice_id',intent,'status','COMPLETED'); END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pg63_payment_callback_fields() FROM PUBLIC;
CREATE TRIGGER pg63_callback_fields BEFORE INSERT ON pg07_events FOR EACH ROW EXECUTE FUNCTION pg63_payment_callback_fields();
COMMIT;
