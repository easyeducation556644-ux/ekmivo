-- PG06–PG09 code checkpoint. Explicit operator migration ONLY, after 0010–0012,
-- in each isolated finance realm. No startup migration and no control-DB data.
BEGIN;
CREATE TABLE pg06_account_configuration (
 workspace_id uuid NOT NULL,environment text NOT NULL,account_id uuid PRIMARY KEY,
 number_cipher bytea NOT NULL,disabled_at timestamptz,
 FOREIGN KEY(workspace_id,environment,account_id) REFERENCES financial_receiving_accounts(workspace_id,environment,id)
);
CREATE UNIQUE INDEX financial_exclusive_receiving_identity ON financial_receiving_accounts(environment,method,identity_hmac);
CREATE TABLE pg06_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, environment text NOT NULL,
 account_id uuid NOT NULL, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 source text NOT NULL CHECK(length(source) BETWEEN 1 AND 160), parser_id text NOT NULL,
 binding text NOT NULL CHECK(length(binding) BETWEEN 1 AND 160),
 pair_digest char(64) UNIQUE, pair_expires_at timestamptz,
 recovery_digest char(64) UNIQUE, recovery_expires_at timestamptz,
 public_key bytea, claimed_at timestamptz, revoked_at timestamptz,
 heartbeat_at timestamptz, permission_ok boolean NOT NULL DEFAULT false,
 backlog integer NOT NULL DEFAULT 0 CHECK(backlog BETWEEN 0 AND 10000),
 overflow_count bigint NOT NULL DEFAULT 0 CHECK(overflow_count>=0),
 model text NOT NULL DEFAULT '', app_version text NOT NULL DEFAULT '',
 UNIQUE(workspace_id,environment,id),
 FOREIGN KEY(workspace_id,environment,account_id) REFERENCES financial_receiving_accounts(workspace_id,environment,id),
 CHECK((public_key IS NULL)=(claimed_at IS NULL))
);
CREATE UNIQUE INDEX pg06_active_binding ON pg06_devices(environment,account_id,source,binding) WHERE revoked_at IS NULL;
CREATE TABLE pg06_transport (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 device_id uuid NOT NULL,event_id text NOT NULL,digest char(64) NOT NULL,sequence bigint NOT NULL CHECK(sequence>0),
 observation_id uuid,parse_reason text NOT NULL DEFAULT '',observed_at timestamptz NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(device_id,event_id),
 UNIQUE(device_id,sequence),
 FOREIGN KEY(workspace_id,environment,device_id) REFERENCES pg06_devices(workspace_id,environment,id)
);
CREATE TABLE pg07_receipt_results (
 workspace_id uuid NOT NULL,environment text NOT NULL,observation_id uuid PRIMARY KEY,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','matched','unmatched','ambiguous','cancelled','duplicate')),
 reason text NOT NULL DEFAULT '',payment_id uuid, processed_at timestamptz,
 FOREIGN KEY(workspace_id,environment,observation_id) REFERENCES financial_receipt_observations(workspace_id,environment,id)
);
CREATE TABLE pg08_endpoints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 url text NOT NULL CHECK(length(url) BETWEEN 1 AND 2048),active boolean NOT NULL DEFAULT true,
 secret bytea NOT NULL, previous_secret bytea,previous_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workspace_id,environment,id),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
-- Domain event and per-endpoint delivery are the durable transactional merchant
-- outbox. River wakes a bounded drain; a crashed wake-up cannot lose an event.
CREATE TABLE pg07_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 payment_id uuid NOT NULL UNIQUE,event_type text NOT NULL CHECK(event_type='payment.verified'),
 payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,environment,payment_id) REFERENCES financial_payments(workspace_id,environment,id)
);
CREATE TABLE pg09_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 actor_id uuid DEFAULT nullif(current_setting('ekmivo.actor_id',true),'')::uuid,
 resource text NOT NULL,resource_id uuid,action text NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment)
);
CREATE TABLE pg08_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 endpoint_id uuid NOT NULL,event_id uuid NOT NULL REFERENCES pg07_events(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','delivered','failed','disabled')),
 attempts integer NOT NULL DEFAULT 0, next_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid,lease_until timestamptz,http_status integer,reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 FOREIGN KEY(workspace_id,environment,endpoint_id) REFERENCES pg08_endpoints(workspace_id,environment,id)
);
CREATE UNIQUE INDEX pg08_initial_delivery ON pg08_deliveries(endpoint_id,event_id) WHERE attempts=0 AND status='pending';
CREATE INDEX pg08_due ON pg08_deliveries(next_at) WHERE status IN ('pending','sending');
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pg06_devices','pg06_transport','pg07_receipt_results','pg08_endpoints','pg07_events','pg08_deliveries','pg09_audit','pg06_account_configuration'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 END LOOP;
END $$;
REVOKE ALL ON pg06_devices,pg06_transport,pg07_receipt_results,pg08_endpoints,pg07_events,pg08_deliveries FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
REVOKE ALL ON pg09_audit FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
REVOKE ALL ON pg06_account_configuration FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE TRIGGER pg09_audit_immutable BEFORE UPDATE OR DELETE ON pg09_audit FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();
CREATE TRIGGER pg07_event_immutable BEFORE UPDATE OR DELETE ON pg07_events FOR EACH ROW EXECUTE FUNCTION financial_reject_history_change();

CREATE FUNCTION pg06_scope(w uuid,e text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF current_setting('ekmivo.workspace_id',true) IS DISTINCT FROM w::text OR
 current_setting('ekmivo.environment',true) IS DISTINCT FROM e OR NOT EXISTS
 (SELECT 1 FROM financial_workspace_registry WHERE workspace_id=w AND environment=e AND status='active')
 THEN RAISE EXCEPTION 'scope denied' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION pg06_pair(w uuid,e text,a uuid,n text,s text,p text,b text,d text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE row pg06_devices;BEGIN
 PERFORM pg06_scope(w,e);
 IF d !~ '^[a-f0-9]{64}$' OR p='' OR length(p)>80 THEN RAISE EXCEPTION 'invalid pairing' USING ERRCODE='22023'; END IF;
 INSERT INTO pg06_devices(workspace_id,environment,account_id,name,source,parser_id,binding,pair_digest,pair_expires_at)
 VALUES(w,e,a,n,s,p,b,d,now()+interval '5 minutes') RETURNING * INTO row;
 INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,'devices',row.id,'pair_issued');
 RETURN jsonb_build_object('id',row.id,'account_id',a,'environment',e,'expires_at',row.pair_expires_at);
END $$;
CREATE FUNCTION pg06_account(w uuid,e text,m text,identity text,suffix text,ciphertext bytea) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE a uuid;BEGIN
 PERFORM pg06_scope(w,e);
 IF identity !~ '^[a-f0-9]{64}$' OR suffix !~ '^[0-9]{4}$' OR m NOT IN ('bkash','nagad','rocket') OR octet_length(ciphertext)<29 THEN RAISE EXCEPTION 'invalid receiving account' USING ERRCODE='22023';END IF;
 INSERT INTO financial_receiving_accounts(workspace_id,environment,method,identity_hmac,display_suffix) VALUES(w,e,m,identity,suffix) RETURNING id INTO a;
 INSERT INTO pg06_account_configuration(workspace_id,environment,account_id,number_cipher) VALUES(w,e,a,ciphertext);
 INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,'gateways',a,'create');
 RETURN jsonb_build_object('id',a,'method',m,'display_suffix',suffix,'status','source_binding_required');
END $$;
CREATE FUNCTION pg06_account_attempt_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg06_account_configuration WHERE account_id=NEW.receiving_account_id AND disabled_at IS NOT NULL) THEN RAISE EXCEPTION 'receiving account disabled for new attempts' USING ERRCODE='23514';END IF;RETURN NEW;END $$;
CREATE TRIGGER pg06_account_attempt_guard BEFORE INSERT ON payment_attempts FOR EACH ROW EXECUTE FUNCTION pg06_account_attempt_guard();
-- Preserve the latest PG05 cancellation/idempotency behavior; only route
-- selection changes. Existing fixture accounts remain explicitly sandbox.
DO $$ DECLARE definition text; needle text:='AND display_suffix=''0000'' ORDER BY created_at LIMIT 1;'; BEGIN
 definition:=pg_get_functiondef('pg05_lock_payer(text,text,text,text)'::regprocedure);
 IF position(needle IN definition)=0 THEN RAISE EXCEPTION 'PG05 route definition changed; review migration before applying';END IF;
 definition:=replace(definition,'FUNCTION public.pg05_lock_payer(','FUNCTION public.pg06_lock_route(');
 definition:=replace(definition,needle,
 'AND NOT EXISTS(SELECT 1 FROM pg06_account_configuration c WHERE c.account_id=financial_receiving_accounts.id AND c.disabled_at IS NOT NULL)
 AND (EXISTS(SELECT 1 FROM pg06_devices d WHERE d.account_id=financial_receiving_accounts.id AND d.revoked_at IS NULL AND d.permission_ok AND d.heartbeat_at>now()-interval ''5 minutes'')
 OR display_suffix=''0000'' AND NOT EXISTS(SELECT 1 FROM pg06_account_configuration c WHERE c.workspace_id=i.workspace_id AND c.environment=i.environment AND EXISTS(SELECT 1 FROM financial_receiving_accounts actual WHERE actual.id=c.account_id AND actual.method=p_method)))
 ORDER BY CASE WHEN display_suffix=''0000'' THEN 1 ELSE 0 END,created_at,id LIMIT 1;');
 EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION pg06_lock_route(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg06_lock_route(text,text,text,text) TO ekmivo_finance_reader;
CREATE FUNCTION pg06_claim(d text,k bytea) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $
DECLARE device_row pg06_devices; BEGIN
 IF d !~ '^[a-f0-9]{64}
CREATE FUNCTION pg06_device_context(d uuid) RETURNS TABLE(workspace_id uuid,environment text,account_id uuid,source text,binding text,parser_id text,public_key bytea,entitlement_version bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT d.workspace_id,d.environment,d.account_id,d.source,d.binding,d.parser_id,d.public_key,r.entitlement_version
 FROM pg06_devices d JOIN financial_workspace_registry r USING(workspace_id,environment)
 WHERE d.id=$1 AND d.revoked_at IS NULL AND d.public_key IS NOT NULL AND r.status='active'
$$;
CREATE FUNCTION pg06_ingest(d uuid,event text,hash text,ciphertext bytea,payer text,amount bigint,at_time timestamptz,time_precision_name text,ref text,method_name text,parser integer,source_kind text,parse_error text,observed_time timestamptz,event_sequence bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE device pg06_devices; previous pg06_transport; inbound uuid; observation uuid; original uuid;old_receipt financial_receipt_observations;
BEGIN
 SELECT * INTO device FROM pg06_devices WHERE id=d AND revoked_at IS NULL AND public_key IS NOT NULL FOR UPDATE;
 IF device.id IS NULL OR hash !~ '^[a-f0-9]{64}$' OR length(event) NOT BETWEEN 1 AND 128 OR source_kind NOT IN ('device_sms','device_notification') OR NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=device.workspace_id AND environment=device.environment AND status='active') THEN RAISE EXCEPTION 'ingress denied' USING ERRCODE='42501';END IF;
 SELECT * INTO previous FROM pg06_transport WHERE device_id=d AND event_id=event;
 IF previous.id IS NOT NULL THEN
  IF previous.digest<>hash THEN RAISE EXCEPTION 'reused event' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('ack','durable','observation_id',previous.observation_id,'reason',previous.parse_reason,'replayed',true);
 END IF;
 IF parse_error='' THEN
  IF payer !~ '^[a-f0-9]{64}$' OR ref !~ '^[a-f0-9]{64}$' OR at_time IS NULL OR at_time>now()+interval '5 minutes' OR amount<=0 OR time_precision_name NOT IN ('second','minute') OR NOT EXISTS(SELECT 1 FROM financial_receiving_accounts a WHERE a.id=device.account_id AND a.method=method_name AND a.workspace_id=device.workspace_id AND a.environment=device.environment) THEN RAISE EXCEPTION 'invalid parsed evidence' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('receipt|'||device.account_id::text||'|'||ref,0));
  SELECT * INTO old_receipt FROM financial_receipt_observations WHERE workspace_id=device.workspace_id AND environment=device.environment AND receiving_account_id=device.account_id AND provider_reference_hmac=ref;
  original:=old_receipt.id;
  IF original IS NOT NULL THEN
   -- Different transports for the same provider/account transaction do not allocate twice.
   IF old_receipt.payer_hmac IS DISTINCT FROM payer OR old_receipt.amount_minor IS DISTINCT FROM amount OR old_receipt.original_transaction_at IS DISTINCT FROM at_time OR old_receipt.time_precision IS DISTINCT FROM time_precision_name OR old_receipt.method IS DISTINCT FROM method_name THEN parse_error:='provider_identity_conflict';
   ELSE observation:=original;parse_error:='duplicate_provider_identity';END IF;
  ELSE
   INSERT INTO financial_inbound_events(workspace_id,environment,source_kind,source_event_id,event_digest,original_source_at,encrypted_evidence)
   VALUES(device.workspace_id,device.environment,source_kind,d::text||':'||event,hash,at_time,ciphertext) RETURNING id INTO inbound;
   INSERT INTO financial_receipt_observations(workspace_id,environment,inbound_event_id,receiving_account_id,provider_reference_hmac,payer_hmac,amount_minor,method,direction,original_transaction_at,time_precision,parser_version)
   VALUES(device.workspace_id,device.environment,inbound,device.account_id,ref,payer,amount,method_name,'incoming',at_time,time_precision_name,parser) RETURNING id INTO observation;
   INSERT INTO pg07_receipt_results(workspace_id,environment,observation_id) VALUES(device.workspace_id,device.environment,observation);
  END IF;
 END IF;
 INSERT INTO pg06_transport(workspace_id,environment,device_id,event_id,digest,observation_id,parse_reason,observed_at,sequence)
 VALUES(device.workspace_id,device.environment,d,event,hash,observation,parse_error,observed_time,event_sequence);
 RETURN jsonb_build_object('ack','durable','observation_id',observation,'reason',parse_error,'replayed',false);
END $$;
CREATE FUNCTION pg06_heartbeat(d uuid,permission boolean,pending integer,model_name text,version_name text,overflows bigint) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $
BEGIN
 IF pending NOT BETWEEN 0 AND 10000 OR overflows IS NULL OR overflows<0 THEN
  RAISE EXCEPTION 'invalid device health' USING ERRCODE='22023';
 END IF;
 UPDATE pg06_devices SET heartbeat_at=now(),permission_ok=permission,backlog=pending,
  overflow_count=greatest(overflow_count,overflows),model=left(model_name,80),app_version=left(version_name,40)
  WHERE id=d AND revoked_at IS NULL AND public_key IS NOT NULL;
 RETURN FOUND;
END $;
CREATE FUNCTION pg06_history(d uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (
 SELECT t.event_id,t.observed_at,t.received_at,t.parse_reason,coalesce(r.status,'invalid') AS status,r.reason
 FROM pg06_transport t JOIN pg06_devices device ON device.id=t.device_id
 LEFT JOIN pg07_receipt_results r ON r.observation_id=t.observation_id
 WHERE t.device_id=d AND device.revoked_at IS NULL ORDER BY t.received_at DESC LIMIT 50)t
$$;

CREATE FUNCTION pg07_pending() RETURNS TABLE(id uuid,workspace_id uuid,environment text,entitlement_version bigint) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT s.observation_id,s.workspace_id,s.environment,r.entitlement_version FROM pg07_receipt_results s JOIN financial_workspace_registry r USING(workspace_id,environment) WHERE s.status='pending' AND r.status='active' ORDER BY s.observation_id LIMIT 10
$$;
CREATE FUNCTION pg07_match(o_id uuid,expected_version bigint) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o financial_receipt_observations; a payment_attempts; candidates integer; payment uuid; event uuid; source text; status_name text;result pg07_receipt_results;
BEGIN
 SELECT * INTO result FROM pg07_receipt_results WHERE observation_id=o_id FOR UPDATE;
 IF result.status IS DISTINCT FROM 'pending' THEN RETURN result.status; END IF;
 IF NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=result.workspace_id AND environment=result.environment AND status='active' AND entitlement_version=expected_version) THEN RAISE EXCEPTION 'stale authority' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM financial_receipt_observations WHERE id=o_id FOR UPDATE;
 -- Same bucket lock as attempt issuance; prevents new candidate races.
 PERFORM pg_advisory_xact_lock(hashtextextended(o.workspace_id::text||':'||o.environment||':'||o.receiving_account_id::text||':'||o.payer_hmac||':'||o.method||':'||o.amount_minor::text,0));
 SELECT count(*) INTO candidates FROM payment_attempts p WHERE p.workspace_id=o.workspace_id AND p.environment=o.environment AND p.receiving_account_id=o.receiving_account_id AND p.payer_hmac=o.payer_hmac AND p.method=o.method AND p.amount_minor=o.amount_minor AND p.currency=o.currency AND o.direction='incoming' AND o.time_precision IN ('second','minute') AND o.original_transaction_at>=p.window_start AND o.original_transaction_at<p.window_end AND (o.time_precision<>'minute' OR o.original_transaction_at+interval '1 minute'<=p.window_end);
 IF candidates<>1 THEN
  status_name:=CASE WHEN candidates=0 THEN 'unmatched' ELSE 'ambiguous' END;
  UPDATE pg07_receipt_results SET status=status_name,reason=CASE WHEN candidates=0 THEN 'no_exact_five_field_candidate' ELSE 'multiple_exact_candidates' END,processed_at=now() WHERE observation_id=o_id; RETURN status_name;
 END IF;
 SELECT p.* INTO a FROM payment_attempts p WHERE p.workspace_id=o.workspace_id AND p.environment=o.environment AND p.receiving_account_id=o.receiving_account_id AND p.payer_hmac=o.payer_hmac AND p.method=o.method AND p.amount_minor=o.amount_minor AND p.currency=o.currency AND o.original_transaction_at>=p.window_start AND o.original_transaction_at<p.window_end AND (o.time_precision<>'minute' OR o.original_transaction_at+interval '1 minute'<=p.window_end) FOR UPDATE;
 PERFORM 1 FROM payment_intents WHERE id=a.intent_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM pg05_intent_events WHERE intent_id=a.intent_id AND event_type='cancelled') THEN UPDATE pg07_receipt_results SET status='cancelled',reason='funds_for_cancelled_intent',processed_at=now() WHERE observation_id=o_id; RETURN 'cancelled'; END IF;
 IF EXISTS(SELECT 1 FROM financial_payments WHERE attempt_id=a.id OR observation_id=o.id) OR EXISTS(SELECT 1 FROM financial_allocations WHERE intent_id=a.intent_id) THEN UPDATE pg07_receipt_results SET status='duplicate',reason='attempt_already_funded',processed_at=now() WHERE observation_id=o_id; RETURN 'duplicate'; END IF;
 SELECT source_kind INTO source FROM financial_inbound_events WHERE id=o.inbound_event_id;
 INSERT INTO financial_payments(workspace_id,environment,attempt_id,observation_id,verified_amount_minor,currency,verification_method,policy_version)
 VALUES(o.workspace_id,o.environment,a.id,o.id,o.amount_minor,o.currency,CASE source WHEN 'device_sms' THEN 'sms_match' WHEN 'device_notification' THEN 'notification_match' ELSE 'sandbox_fixture' END,a.policy_version) RETURNING id INTO payment;
 INSERT INTO financial_allocations(workspace_id,environment,payment_id,intent_id,amount_minor,currency) VALUES(o.workspace_id,o.environment,payment,a.intent_id,o.amount_minor,o.currency);
 INSERT INTO pg07_events(workspace_id,environment,payment_id,event_type,payload)
 VALUES(o.workspace_id,o.environment,payment,'payment.verified',jsonb_build_object('schema_version',1,'type','payment.verified','workspace_id',o.workspace_id,'environment',o.environment,'occurred_at',now(),'data',jsonb_build_object('payment_id',payment,'payment_intent_id',a.intent_id,'merchant_reference',(SELECT merchant_reference FROM payment_intents WHERE id=a.intent_id),'amount_minor',o.amount_minor,'currency',o.currency,'verification_status','verified','verification_method',CASE source WHEN 'device_sms' THEN 'sms_match' ELSE 'notification_match' END,'original_transaction_at',o.original_transaction_at,'verified_at',now(),'resource_version',1,'late_sync',now()>a.window_end))) RETURNING id INTO event;
 INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id) SELECT o.workspace_id,o.environment,e.id,event FROM pg08_endpoints e WHERE e.workspace_id=o.workspace_id AND e.environment=o.environment AND e.active;
 UPDATE pg07_receipt_results SET status='matched',payment_id=payment,processed_at=now() WHERE observation_id=o_id;
 RETURN 'matched';
END $$;
CREATE FUNCTION pg08_due() RETURNS TABLE(id uuid,workspace_id uuid,environment text,entitlement_version bigint) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT d.id,d.workspace_id,d.environment,r.entitlement_version FROM pg08_deliveries d JOIN financial_workspace_registry r USING(workspace_id,environment) WHERE r.status='active' AND d.next_at<=now() AND (d.status='pending' OR d.status='sending' AND d.lease_until<now()) ORDER BY d.next_at LIMIT 10
$$;
CREATE FUNCTION pg08_claim(delivery uuid,expected_version bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d pg08_deliveries;endpoint pg08_endpoints;event pg07_events;lease uuid:=gen_random_uuid(); BEGIN
 SELECT * INTO d FROM pg08_deliveries WHERE id=delivery AND next_at<=now() AND (status='pending' OR status='sending' AND lease_until<now()) FOR UPDATE SKIP LOCKED;
 IF d.id IS NULL THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=d.workspace_id AND environment=d.environment AND status='active' AND entitlement_version=expected_version) THEN RAISE EXCEPTION 'stale authority' USING ERRCODE='42501';END IF;
 SELECT * INTO endpoint FROM pg08_endpoints WHERE id=d.endpoint_id;
 IF NOT endpoint.active THEN UPDATE pg08_deliveries SET status='disabled',reason='endpoint_disabled' WHERE id=d.id;RETURN NULL;END IF;
 SELECT * INTO event FROM pg07_events WHERE id=d.event_id;
 UPDATE pg08_deliveries SET status='sending',attempts=attempts+1,lease_id=lease,lease_until=now()+interval '60 seconds' WHERE id=d.id;
 RETURN jsonb_build_object('id',d.id,'event_id',event.id,'lease_id',lease,'url',endpoint.url,'secret',encode(endpoint.secret,'base64'),'body',event.payload||jsonb_build_object('id',event.id),'attempt',d.attempts+1,'workspace_id',d.workspace_id,'environment',d.environment);
END $$;
CREATE FUNCTION pg08_finish(delivery uuid,lease uuid,code integer,error_code text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN UPDATE pg08_deliveries SET status=CASE WHEN code BETWEEN 200 AND 299 THEN 'delivered' WHEN attempts>=10 THEN 'failed' ELSE 'pending' END,http_status=code,reason=left(error_code,80),lease_id=NULL,lease_until=NULL,next_at=now()+make_interval(secs=>least(3600,(power(2,least(attempts,10))*5)::integer)),completed_at=CASE WHEN code BETWEEN 200 AND 299 OR attempts>=10 THEN now() END WHERE id=delivery AND lease_id=lease AND status='sending';RETURN FOUND;END $$;

CREATE FUNCTION pg07_candidates(w uuid,e text,observation uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (
 SELECT a.id AS attempt_id,a.intent_id,a.payer_suffix,a.amount_minor,a.receiving_account_id,a.method,a.window_start,a.window_end,
 o.payer_hmac=a.payer_hmac AS payer_matches,o.amount_minor=a.amount_minor AS amount_matches,o.receiving_account_id=a.receiving_account_id AS account_matches,o.method=a.method AS method_matches,
 o.original_transaction_at>=a.window_start AND o.original_transaction_at<a.window_end AND (o.time_precision<>'minute' OR o.original_transaction_at+interval '1 minute'<=a.window_end) AS time_matches,
 EXISTS(SELECT 1 FROM pg05_intent_events WHERE intent_id=a.intent_id AND event_type='cancelled') AS cancelled
 FROM financial_receipt_observations o JOIN payment_attempts a ON a.workspace_id=o.workspace_id AND a.environment=o.environment
 WHERE o.id=observation AND o.workspace_id=w AND o.environment=e
 ORDER BY abs(extract(epoch FROM (a.window_start-o.original_transaction_at))) NULLS LAST,a.id LIMIT 20)t
$$;
REVOKE ALL ON FUNCTION pg07_candidates(uuid,text,uuid) FROM PUBLIC;

CREATE FUNCTION pg09_read(w uuid,e text,resource text,resource_id uuid,cursor_id uuid,status_filter text DEFAULT NULL,account_filter uuid DEFAULT NULL,method_filter text DEFAULT NULL,date_from timestamptz DEFAULT NULL,date_to timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result jsonb; BEGIN
 PERFORM pg06_scope(w,e);
 IF resource='overview' THEN result:=jsonb_build_array(jsonb_build_object('verified_minor',(SELECT coalesce(sum(verified_amount_minor),0) FROM financial_payments WHERE workspace_id=w AND environment=e),'pending_requests',(SELECT count(*) FROM payment_intents WHERE workspace_id=w AND environment=e AND pg05_intent_state(w,e,id) IN ('requires_payer','awaiting_payment')),'unmatched_receipts',(SELECT count(*) FROM pg07_receipt_results WHERE workspace_id=w AND environment=e AND status IN ('unmatched','ambiguous','cancelled')),'online_devices',(SELECT count(*) FROM pg06_devices WHERE workspace_id=w AND environment=e AND revoked_at IS NULL AND permission_ok AND heartbeat_at>now()-interval '5 minutes'),'failed_deliveries',(SELECT count(*) FROM pg08_deliveries WHERE workspace_id=w AND environment=e AND status='failed')));
 ELSIF resource='devices' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,name,account_id,source,binding,parser_id,claimed_at,revoked_at,heartbeat_at,permission_ok,backlog,overflow_count,model,app_version FROM pg06_devices WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSIF resource='gateways' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT a.id,a.method,a.display_suffix,a.created_at,c.disabled_at,CASE WHEN c.account_id IS NULL THEN 'sandbox_fixture' WHEN c.disabled_at IS NOT NULL THEN 'disabled' WHEN EXISTS(SELECT 1 FROM pg06_devices d WHERE d.account_id=a.id AND d.revoked_at IS NULL AND d.permission_ok AND d.heartbeat_at>now()-interval '5 minutes') THEN 'receiving_source_online' ELSE 'source_binding_required' END AS source_status FROM financial_receiving_accounts a LEFT JOIN pg06_account_configuration c ON c.account_id=a.id WHERE a.workspace_id=w AND a.environment=e AND (resource_id IS NULL OR a.id=resource_id) AND (cursor_id IS NULL OR a.id<cursor_id) ORDER BY a.id DESC LIMIT 50)t;
 ELSIF resource='payments' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT p.id,p.verified_amount_minor,p.currency,p.verification_method,p.verified_at,p.policy_version,a.intent_id,a.payer_suffix,a.receiving_account_id,a.method,a.window_start,a.window_end,o.original_transaction_at,o.time_precision,o.parser_version,o.amount_minor AS receipt_amount_minor,p.verified_amount_minor AS allocated_minor,i.merchant_reference FROM financial_payments p JOIN payment_attempts a ON a.id=p.attempt_id JOIN payment_intents i ON i.id=a.intent_id JOIN financial_receipt_observations o ON o.id=p.observation_id WHERE p.workspace_id=w AND p.environment=e AND (resource_id IS NULL OR p.id=resource_id) AND (cursor_id IS NULL OR p.id<cursor_id) AND (status_filter IS NULL OR status_filter='verified') AND (account_filter IS NULL OR a.receiving_account_id=account_filter) AND (method_filter IS NULL OR a.method=method_filter) AND (date_from IS NULL OR p.verified_at>=date_from) AND (date_to IS NULL OR p.verified_at<date_to) ORDER BY p.id DESC LIMIT 50)t;
 ELSIF resource='incoming' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT t.id,t.observation_id,t.device_id,t.parse_reason,t.observed_at,t.received_at,o.receiving_account_id,o.amount_minor,o.method,o.original_transaction_at,o.time_precision,o.parser_version,CASE WHEN t.parse_reason='duplicate_provider_identity' THEN 'duplicate' WHEN t.parse_reason<>'' THEN 'invalid' ELSE s.status END AS status,s.reason,s.payment_id,pg07_candidates(w,e,t.observation_id) AS candidates FROM pg06_transport t LEFT JOIN financial_receipt_observations o ON o.id=t.observation_id LEFT JOIN pg07_receipt_results s ON s.observation_id=t.observation_id WHERE t.workspace_id=w AND t.environment=e AND (resource_id IS NULL OR t.id=resource_id) AND (cursor_id IS NULL OR t.id<cursor_id) AND (status_filter IS NULL OR status_filter=CASE WHEN t.parse_reason='duplicate_provider_identity' THEN 'duplicate' WHEN t.parse_reason<>'' THEN 'invalid' ELSE s.status END) AND (account_filter IS NULL OR o.receiving_account_id=account_filter) AND (method_filter IS NULL OR o.method=method_filter) AND (date_from IS NULL OR t.received_at>=date_from) AND (date_to IS NULL OR t.received_at<date_to) ORDER BY t.id DESC LIMIT 50)t;
 ELSIF resource='webhooks' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,url,active,created_at,previous_until FROM pg08_endpoints WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSIF resource='deliveries' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,endpoint_id,event_id,status,attempts,next_at,http_status,reason,created_at,completed_at FROM pg08_deliveries WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR endpoint_id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSIF resource='events' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,payment_id,event_type,payload,created_at FROM pg07_events WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSE RAISE EXCEPTION 'resource unavailable' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',CASE WHEN jsonb_array_length(result)=50 THEN result->49->>'id' END);
END $$;
CREATE FUNCTION pg09_action(w uuid,e text,resource text,resource_id uuid,action text,payload jsonb,secret_cipher bytea) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE generated uuid;affected integer;BEGIN
 PERFORM pg06_scope(w,e);
 IF resource='devices' AND action='revoke' THEN UPDATE pg06_devices SET revoked_at=now(),pair_digest=NULL,pair_expires_at=NULL,recovery_digest=NULL,recovery_expires_at=NULL WHERE workspace_id=w AND environment=e AND id=resource_id AND revoked_at IS NULL;
 ELSIF resource='gateways' AND action='disable' THEN UPDATE pg06_account_configuration SET disabled_at=now() WHERE workspace_id=w AND environment=e AND account_id=resource_id;
 ELSIF resource='gateways' AND action='enable' THEN UPDATE pg06_account_configuration SET disabled_at=NULL WHERE workspace_id=w AND environment=e AND account_id=resource_id;
 ELSIF resource='devices' AND action='rename' THEN UPDATE pg06_devices SET name=payload->>'name' WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='incoming' AND action='reprocess' THEN UPDATE pg07_receipt_results SET status='pending',reason='',processed_at=NULL WHERE workspace_id=w AND environment=e AND observation_id=(SELECT observation_id FROM pg06_transport WHERE workspace_id=w AND environment=e AND id=resource_id) AND status IN ('unmatched','ambiguous');
 ELSIF resource='webhooks' AND action='create' THEN INSERT INTO pg08_endpoints(workspace_id,environment,url,secret) VALUES(w,e,payload->>'url',secret_cipher) RETURNING id INTO generated;INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,resource,generated,action);RETURN jsonb_build_object('id',generated);
 ELSIF resource='webhooks' AND action='disable' THEN UPDATE pg08_endpoints SET active=false WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='webhooks' AND action='enable' THEN UPDATE pg08_endpoints SET active=true WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='webhooks' AND action='rotate' THEN UPDATE pg08_endpoints SET previous_secret=secret,previous_until=now()+interval '24 hours',secret=secret_cipher WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='deliveries' AND action='replay' THEN INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id) SELECT w,e,endpoint_id,event_id FROM pg08_deliveries WHERE workspace_id=w AND environment=e AND id=resource_id AND status IN ('failed','delivered','disabled') RETURNING id INTO generated; IF generated IS NOT NULL THEN INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,resource,generated,action);RETURN jsonb_build_object('id',generated); END IF;
 ELSE RAISE EXCEPTION 'action unavailable' USING ERRCODE='22023'; END IF;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'resource or allowed transition unavailable' USING ERRCODE='P0002';END IF;
 INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,resource,resource_id,action);
 RETURN jsonb_build_object('updated',true);
END $$;
-- Narrow callable boundary: no arbitrary financial INSERT or evidence reads.
DO $$ DECLARE f record;BEGIN FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('pg06_scope','pg06_pair','pg06_account','pg06_account_attempt_guard','pg06_claim','pg06_device_context','pg06_ingest','pg06_heartbeat','pg06_history','pg07_pending','pg07_match','pg08_due','pg08_claim','pg08_finish','pg09_read','pg09_action') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.signature);
 IF f.proname IN ('pg07_pending','pg07_match','pg08_due','pg08_claim','pg08_finish') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO ekmivo_financial_worker',f.signature);
 ELSIF f.proname NOT IN ('pg06_scope','pg06_account_attempt_guard') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO ekmivo_finance_reader',f.signature);END IF;
END LOOP;END $$;
COMMIT;
 OR octet_length(k) NOT BETWEEN 60 AND 256 THEN
  RAISE EXCEPTION 'pair unavailable' USING ERRCODE='42501';
 END IF;
 -- Same public key can recover a lost claim response for five minutes, but
 -- the token cannot pair a second key or restore a revoked enrollment.
 SELECT * INTO device_row FROM pg06_devices
 WHERE revoked_at IS NULL AND (
  (pair_digest=d AND pair_expires_at>now() AND public_key IS NULL)
  OR (recovery_digest=d AND recovery_expires_at>now() AND public_key=k AND claimed_at IS NOT NULL)
 ) FOR UPDATE;
 IF device_row.id IS NULL OR NOT EXISTS(
  SELECT 1 FROM financial_workspace_registry r WHERE r.workspace_id=device_row.workspace_id
  AND r.environment=device_row.environment AND r.status='active'
 ) OR EXISTS(
  SELECT 1 FROM pg06_account_configuration c WHERE c.account_id=device_row.account_id AND c.disabled_at IS NOT NULL
 ) THEN RAISE EXCEPTION 'pair unavailable' USING ERRCODE='42501'; END IF;
 IF device_row.public_key IS NULL THEN
  UPDATE pg06_devices SET public_key=k,claimed_at=now(),pair_digest=NULL,pair_expires_at=NULL,
   recovery_digest=d,recovery_expires_at=now()+interval '5 minutes' WHERE id=device_row.id;
 END IF;
 RETURN jsonb_build_object('id',device_row.id,'workspace_id',device_row.workspace_id,
  'environment',device_row.environment,'account_id',device_row.account_id,'source',device_row.source,
  'binding',device_row.binding,'parser_id',device_row.parser_id);
END $;
CREATE FUNCTION pg06_device_context(d uuid) RETURNS TABLE(workspace_id uuid,environment text,account_id uuid,source text,binding text,parser_id text,public_key bytea,entitlement_version bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT d.workspace_id,d.environment,d.account_id,d.source,d.binding,d.parser_id,d.public_key,r.entitlement_version
 FROM pg06_devices d JOIN financial_workspace_registry r USING(workspace_id,environment)
 WHERE d.id=$1 AND d.revoked_at IS NULL AND d.public_key IS NOT NULL AND r.status='active'
$$;
CREATE FUNCTION pg06_ingest(d uuid,event text,hash text,ciphertext bytea,payer text,amount bigint,at_time timestamptz,time_precision_name text,ref text,method_name text,parser integer,source_kind text,parse_error text,observed_time timestamptz,event_sequence bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE device pg06_devices; previous pg06_transport; inbound uuid; observation uuid; original uuid;old_receipt financial_receipt_observations;
BEGIN
 SELECT * INTO device FROM pg06_devices WHERE id=d AND revoked_at IS NULL AND public_key IS NOT NULL FOR UPDATE;
 IF device.id IS NULL OR hash !~ '^[a-f0-9]{64}$' OR length(event) NOT BETWEEN 1 AND 128 OR source_kind NOT IN ('device_sms','device_notification') OR NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=device.workspace_id AND environment=device.environment AND status='active') THEN RAISE EXCEPTION 'ingress denied' USING ERRCODE='42501';END IF;
 SELECT * INTO previous FROM pg06_transport WHERE device_id=d AND event_id=event;
 IF previous.id IS NOT NULL THEN
  IF previous.digest<>hash THEN RAISE EXCEPTION 'reused event' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('ack','durable','observation_id',previous.observation_id,'reason',previous.parse_reason,'replayed',true);
 END IF;
 IF parse_error='' THEN
  IF payer !~ '^[a-f0-9]{64}$' OR ref !~ '^[a-f0-9]{64}$' OR at_time IS NULL OR at_time>now()+interval '5 minutes' OR amount<=0 OR time_precision_name NOT IN ('second','minute') OR NOT EXISTS(SELECT 1 FROM financial_receiving_accounts a WHERE a.id=device.account_id AND a.method=method_name AND a.workspace_id=device.workspace_id AND a.environment=device.environment) THEN RAISE EXCEPTION 'invalid parsed evidence' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('receipt|'||device.account_id::text||'|'||ref,0));
  SELECT * INTO old_receipt FROM financial_receipt_observations WHERE workspace_id=device.workspace_id AND environment=device.environment AND receiving_account_id=device.account_id AND provider_reference_hmac=ref;
  original:=old_receipt.id;
  IF original IS NOT NULL THEN
   -- Different transports for the same provider/account transaction do not allocate twice.
   IF old_receipt.payer_hmac IS DISTINCT FROM payer OR old_receipt.amount_minor IS DISTINCT FROM amount OR old_receipt.original_transaction_at IS DISTINCT FROM at_time OR old_receipt.time_precision IS DISTINCT FROM time_precision_name OR old_receipt.method IS DISTINCT FROM method_name THEN parse_error:='provider_identity_conflict';
   ELSE observation:=original;parse_error:='duplicate_provider_identity';END IF;
  ELSE
   INSERT INTO financial_inbound_events(workspace_id,environment,source_kind,source_event_id,event_digest,original_source_at,encrypted_evidence)
   VALUES(device.workspace_id,device.environment,source_kind,d::text||':'||event,hash,at_time,ciphertext) RETURNING id INTO inbound;
   INSERT INTO financial_receipt_observations(workspace_id,environment,inbound_event_id,receiving_account_id,provider_reference_hmac,payer_hmac,amount_minor,method,direction,original_transaction_at,time_precision,parser_version)
   VALUES(device.workspace_id,device.environment,inbound,device.account_id,ref,payer,amount,method_name,'incoming',at_time,time_precision_name,parser) RETURNING id INTO observation;
   INSERT INTO pg07_receipt_results(workspace_id,environment,observation_id) VALUES(device.workspace_id,device.environment,observation);
  END IF;
 END IF;
 INSERT INTO pg06_transport(workspace_id,environment,device_id,event_id,digest,observation_id,parse_reason,observed_at,sequence)
 VALUES(device.workspace_id,device.environment,d,event,hash,observation,parse_error,observed_time,event_sequence);
 RETURN jsonb_build_object('ack','durable','observation_id',observation,'reason',parse_error,'replayed',false);
END $$;
CREATE FUNCTION pg06_heartbeat(d uuid,permission boolean,pending integer,model_name text,version_name text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN UPDATE pg06_devices SET heartbeat_at=now(),permission_ok=permission,backlog=pending,model=left(model_name,80),app_version=left(version_name,40) WHERE id=d AND revoked_at IS NULL AND public_key IS NOT NULL;RETURN FOUND;END $$;
CREATE FUNCTION pg06_history(d uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (
 SELECT t.event_id,t.observed_at,t.received_at,t.parse_reason,coalesce(r.status,'invalid') AS status,r.reason
 FROM pg06_transport t JOIN pg06_devices device ON device.id=t.device_id
 LEFT JOIN pg07_receipt_results r ON r.observation_id=t.observation_id
 WHERE t.device_id=d AND device.revoked_at IS NULL ORDER BY t.received_at DESC LIMIT 50)t
$$;

CREATE FUNCTION pg07_pending() RETURNS TABLE(id uuid,workspace_id uuid,environment text,entitlement_version bigint) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT s.observation_id,s.workspace_id,s.environment,r.entitlement_version FROM pg07_receipt_results s JOIN financial_workspace_registry r USING(workspace_id,environment) WHERE s.status='pending' AND r.status='active' ORDER BY s.observation_id LIMIT 10
$$;
CREATE FUNCTION pg07_match(o_id uuid,expected_version bigint) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o financial_receipt_observations; a payment_attempts; candidates integer; payment uuid; event uuid; source text; status_name text;result pg07_receipt_results;
BEGIN
 SELECT * INTO result FROM pg07_receipt_results WHERE observation_id=o_id FOR UPDATE;
 IF result.status IS DISTINCT FROM 'pending' THEN RETURN result.status; END IF;
 IF NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=result.workspace_id AND environment=result.environment AND status='active' AND entitlement_version=expected_version) THEN RAISE EXCEPTION 'stale authority' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM financial_receipt_observations WHERE id=o_id FOR UPDATE;
 -- Same bucket lock as attempt issuance; prevents new candidate races.
 PERFORM pg_advisory_xact_lock(hashtextextended(o.workspace_id::text||':'||o.environment||':'||o.receiving_account_id::text||':'||o.payer_hmac||':'||o.method||':'||o.amount_minor::text,0));
 SELECT count(*) INTO candidates FROM payment_attempts p WHERE p.workspace_id=o.workspace_id AND p.environment=o.environment AND p.receiving_account_id=o.receiving_account_id AND p.payer_hmac=o.payer_hmac AND p.method=o.method AND p.amount_minor=o.amount_minor AND p.currency=o.currency AND o.direction='incoming' AND o.time_precision IN ('second','minute') AND o.original_transaction_at>=p.window_start AND o.original_transaction_at<p.window_end AND (o.time_precision<>'minute' OR o.original_transaction_at+interval '1 minute'<=p.window_end);
 IF candidates<>1 THEN
  status_name:=CASE WHEN candidates=0 THEN 'unmatched' ELSE 'ambiguous' END;
  UPDATE pg07_receipt_results SET status=status_name,reason=CASE WHEN candidates=0 THEN 'no_exact_five_field_candidate' ELSE 'multiple_exact_candidates' END,processed_at=now() WHERE observation_id=o_id; RETURN status_name;
 END IF;
 SELECT p.* INTO a FROM payment_attempts p WHERE p.workspace_id=o.workspace_id AND p.environment=o.environment AND p.receiving_account_id=o.receiving_account_id AND p.payer_hmac=o.payer_hmac AND p.method=o.method AND p.amount_minor=o.amount_minor AND p.currency=o.currency AND o.original_transaction_at>=p.window_start AND o.original_transaction_at<p.window_end AND (o.time_precision<>'minute' OR o.original_transaction_at+interval '1 minute'<=p.window_end) FOR UPDATE;
 PERFORM 1 FROM payment_intents WHERE id=a.intent_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM pg05_intent_events WHERE intent_id=a.intent_id AND event_type='cancelled') THEN UPDATE pg07_receipt_results SET status='cancelled',reason='funds_for_cancelled_intent',processed_at=now() WHERE observation_id=o_id; RETURN 'cancelled'; END IF;
 IF EXISTS(SELECT 1 FROM financial_payments WHERE attempt_id=a.id OR observation_id=o.id) OR EXISTS(SELECT 1 FROM financial_allocations WHERE intent_id=a.intent_id) THEN UPDATE pg07_receipt_results SET status='duplicate',reason='attempt_already_funded',processed_at=now() WHERE observation_id=o_id; RETURN 'duplicate'; END IF;
 SELECT source_kind INTO source FROM financial_inbound_events WHERE id=o.inbound_event_id;
 INSERT INTO financial_payments(workspace_id,environment,attempt_id,observation_id,verified_amount_minor,currency,verification_method,policy_version)
 VALUES(o.workspace_id,o.environment,a.id,o.id,o.amount_minor,o.currency,CASE source WHEN 'device_sms' THEN 'sms_match' WHEN 'device_notification' THEN 'notification_match' ELSE 'sandbox_fixture' END,a.policy_version) RETURNING id INTO payment;
 INSERT INTO financial_allocations(workspace_id,environment,payment_id,intent_id,amount_minor,currency) VALUES(o.workspace_id,o.environment,payment,a.intent_id,o.amount_minor,o.currency);
 INSERT INTO pg07_events(workspace_id,environment,payment_id,event_type,payload)
 VALUES(o.workspace_id,o.environment,payment,'payment.verified',jsonb_build_object('schema_version',1,'type','payment.verified','workspace_id',o.workspace_id,'environment',o.environment,'occurred_at',now(),'data',jsonb_build_object('payment_id',payment,'payment_intent_id',a.intent_id,'merchant_reference',(SELECT merchant_reference FROM payment_intents WHERE id=a.intent_id),'amount_minor',o.amount_minor,'currency',o.currency,'verification_status','verified','verification_method',CASE source WHEN 'device_sms' THEN 'sms_match' ELSE 'notification_match' END,'original_transaction_at',o.original_transaction_at,'verified_at',now(),'resource_version',1,'late_sync',now()>a.window_end))) RETURNING id INTO event;
 INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id) SELECT o.workspace_id,o.environment,e.id,event FROM pg08_endpoints e WHERE e.workspace_id=o.workspace_id AND e.environment=o.environment AND e.active;
 UPDATE pg07_receipt_results SET status='matched',payment_id=payment,processed_at=now() WHERE observation_id=o_id;
 RETURN 'matched';
END $$;
CREATE FUNCTION pg08_due() RETURNS TABLE(id uuid,workspace_id uuid,environment text,entitlement_version bigint) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT d.id,d.workspace_id,d.environment,r.entitlement_version FROM pg08_deliveries d JOIN financial_workspace_registry r USING(workspace_id,environment) WHERE r.status='active' AND d.next_at<=now() AND (d.status='pending' OR d.status='sending' AND d.lease_until<now()) ORDER BY d.next_at LIMIT 10
$$;
CREATE FUNCTION pg08_claim(delivery uuid,expected_version bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d pg08_deliveries;endpoint pg08_endpoints;event pg07_events;lease uuid:=gen_random_uuid(); BEGIN
 SELECT * INTO d FROM pg08_deliveries WHERE id=delivery AND next_at<=now() AND (status='pending' OR status='sending' AND lease_until<now()) FOR UPDATE SKIP LOCKED;
 IF d.id IS NULL THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM financial_workspace_registry WHERE workspace_id=d.workspace_id AND environment=d.environment AND status='active' AND entitlement_version=expected_version) THEN RAISE EXCEPTION 'stale authority' USING ERRCODE='42501';END IF;
 SELECT * INTO endpoint FROM pg08_endpoints WHERE id=d.endpoint_id;
 IF NOT endpoint.active THEN UPDATE pg08_deliveries SET status='disabled',reason='endpoint_disabled' WHERE id=d.id;RETURN NULL;END IF;
 SELECT * INTO event FROM pg07_events WHERE id=d.event_id;
 UPDATE pg08_deliveries SET status='sending',attempts=attempts+1,lease_id=lease,lease_until=now()+interval '60 seconds' WHERE id=d.id;
 RETURN jsonb_build_object('id',d.id,'event_id',event.id,'lease_id',lease,'url',endpoint.url,'secret',encode(endpoint.secret,'base64'),'body',event.payload||jsonb_build_object('id',event.id),'attempt',d.attempts+1,'workspace_id',d.workspace_id,'environment',d.environment);
END $$;
CREATE FUNCTION pg08_finish(delivery uuid,lease uuid,code integer,error_code text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN UPDATE pg08_deliveries SET status=CASE WHEN code BETWEEN 200 AND 299 THEN 'delivered' WHEN attempts>=10 THEN 'failed' ELSE 'pending' END,http_status=code,reason=left(error_code,80),lease_id=NULL,lease_until=NULL,next_at=now()+make_interval(secs=>least(3600,(power(2,least(attempts,10))*5)::integer)),completed_at=CASE WHEN code BETWEEN 200 AND 299 OR attempts>=10 THEN now() END WHERE id=delivery AND lease_id=lease AND status='sending';RETURN FOUND;END $$;

CREATE FUNCTION pg07_candidates(w uuid,e text,observation uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (
 SELECT a.id AS attempt_id,a.intent_id,a.payer_suffix,a.amount_minor,a.receiving_account_id,a.method,a.window_start,a.window_end,
 o.payer_hmac=a.payer_hmac AS payer_matches,o.amount_minor=a.amount_minor AS amount_matches,o.receiving_account_id=a.receiving_account_id AS account_matches,o.method=a.method AS method_matches,
 o.original_transaction_at>=a.window_start AND o.original_transaction_at<a.window_end AND (o.time_precision<>'minute' OR o.original_transaction_at+interval '1 minute'<=a.window_end) AS time_matches,
 EXISTS(SELECT 1 FROM pg05_intent_events WHERE intent_id=a.intent_id AND event_type='cancelled') AS cancelled
 FROM financial_receipt_observations o JOIN payment_attempts a ON a.workspace_id=o.workspace_id AND a.environment=o.environment
 WHERE o.id=observation AND o.workspace_id=w AND o.environment=e
 ORDER BY abs(extract(epoch FROM (a.window_start-o.original_transaction_at))) NULLS LAST,a.id LIMIT 20)t
$$;
REVOKE ALL ON FUNCTION pg07_candidates(uuid,text,uuid) FROM PUBLIC;

CREATE FUNCTION pg09_read(w uuid,e text,resource text,resource_id uuid,cursor_id uuid,status_filter text DEFAULT NULL,account_filter uuid DEFAULT NULL,method_filter text DEFAULT NULL,date_from timestamptz DEFAULT NULL,date_to timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE result jsonb; BEGIN
 PERFORM pg06_scope(w,e);
 IF resource='overview' THEN result:=jsonb_build_array(jsonb_build_object('verified_minor',(SELECT coalesce(sum(verified_amount_minor),0) FROM financial_payments WHERE workspace_id=w AND environment=e),'pending_requests',(SELECT count(*) FROM payment_intents WHERE workspace_id=w AND environment=e AND pg05_intent_state(w,e,id) IN ('requires_payer','awaiting_payment')),'unmatched_receipts',(SELECT count(*) FROM pg07_receipt_results WHERE workspace_id=w AND environment=e AND status IN ('unmatched','ambiguous','cancelled')),'online_devices',(SELECT count(*) FROM pg06_devices WHERE workspace_id=w AND environment=e AND revoked_at IS NULL AND permission_ok AND heartbeat_at>now()-interval '5 minutes'),'failed_deliveries',(SELECT count(*) FROM pg08_deliveries WHERE workspace_id=w AND environment=e AND status='failed')));
 ELSIF resource='devices' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,name,account_id,source,binding,parser_id,claimed_at,revoked_at,heartbeat_at,permission_ok,backlog,model,app_version FROM pg06_devices WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSIF resource='gateways' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT a.id,a.method,a.display_suffix,a.created_at,c.disabled_at,CASE WHEN c.account_id IS NULL THEN 'sandbox_fixture' WHEN c.disabled_at IS NOT NULL THEN 'disabled' WHEN EXISTS(SELECT 1 FROM pg06_devices d WHERE d.account_id=a.id AND d.revoked_at IS NULL AND d.permission_ok AND d.heartbeat_at>now()-interval '5 minutes') THEN 'receiving_source_online' ELSE 'source_binding_required' END AS source_status FROM financial_receiving_accounts a LEFT JOIN pg06_account_configuration c ON c.account_id=a.id WHERE a.workspace_id=w AND a.environment=e AND (resource_id IS NULL OR a.id=resource_id) AND (cursor_id IS NULL OR a.id<cursor_id) ORDER BY a.id DESC LIMIT 50)t;
 ELSIF resource='payments' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT p.id,p.verified_amount_minor,p.currency,p.verification_method,p.verified_at,p.policy_version,a.intent_id,a.payer_suffix,a.receiving_account_id,a.method,a.window_start,a.window_end,o.original_transaction_at,o.time_precision,o.parser_version,o.amount_minor AS receipt_amount_minor,p.verified_amount_minor AS allocated_minor,i.merchant_reference FROM financial_payments p JOIN payment_attempts a ON a.id=p.attempt_id JOIN payment_intents i ON i.id=a.intent_id JOIN financial_receipt_observations o ON o.id=p.observation_id WHERE p.workspace_id=w AND p.environment=e AND (resource_id IS NULL OR p.id=resource_id) AND (cursor_id IS NULL OR p.id<cursor_id) AND (status_filter IS NULL OR status_filter='verified') AND (account_filter IS NULL OR a.receiving_account_id=account_filter) AND (method_filter IS NULL OR a.method=method_filter) AND (date_from IS NULL OR p.verified_at>=date_from) AND (date_to IS NULL OR p.verified_at<date_to) ORDER BY p.id DESC LIMIT 50)t;
 ELSIF resource='incoming' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT t.id,t.observation_id,t.device_id,t.parse_reason,t.observed_at,t.received_at,o.receiving_account_id,o.amount_minor,o.method,o.original_transaction_at,o.time_precision,o.parser_version,CASE WHEN t.parse_reason='duplicate_provider_identity' THEN 'duplicate' WHEN t.parse_reason<>'' THEN 'invalid' ELSE s.status END AS status,s.reason,s.payment_id,pg07_candidates(w,e,t.observation_id) AS candidates FROM pg06_transport t LEFT JOIN financial_receipt_observations o ON o.id=t.observation_id LEFT JOIN pg07_receipt_results s ON s.observation_id=t.observation_id WHERE t.workspace_id=w AND t.environment=e AND (resource_id IS NULL OR t.id=resource_id) AND (cursor_id IS NULL OR t.id<cursor_id) AND (status_filter IS NULL OR status_filter=CASE WHEN t.parse_reason='duplicate_provider_identity' THEN 'duplicate' WHEN t.parse_reason<>'' THEN 'invalid' ELSE s.status END) AND (account_filter IS NULL OR o.receiving_account_id=account_filter) AND (method_filter IS NULL OR o.method=method_filter) AND (date_from IS NULL OR t.received_at>=date_from) AND (date_to IS NULL OR t.received_at<date_to) ORDER BY t.id DESC LIMIT 50)t;
 ELSIF resource='webhooks' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,url,active,created_at,previous_until FROM pg08_endpoints WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSIF resource='deliveries' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,endpoint_id,event_id,status,attempts,next_at,http_status,reason,created_at,completed_at FROM pg08_deliveries WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR endpoint_id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSIF resource='events' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (SELECT id,payment_id,event_type,payload,created_at FROM pg07_events WHERE workspace_id=w AND environment=e AND (resource_id IS NULL OR id=resource_id) AND (cursor_id IS NULL OR id<cursor_id) ORDER BY id DESC LIMIT 50)t;
 ELSE RAISE EXCEPTION 'resource unavailable' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',CASE WHEN jsonb_array_length(result)=50 THEN result->49->>'id' END);
END $$;
CREATE FUNCTION pg09_action(w uuid,e text,resource text,resource_id uuid,action text,payload jsonb,secret_cipher bytea) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE generated uuid;affected integer;BEGIN
 PERFORM pg06_scope(w,e);
 IF resource='devices' AND action='revoke' THEN UPDATE pg06_devices SET revoked_at=now(),pair_digest=NULL,pair_expires_at=NULL WHERE workspace_id=w AND environment=e AND id=resource_id AND revoked_at IS NULL;
 ELSIF resource='gateways' AND action='disable' THEN UPDATE pg06_account_configuration SET disabled_at=now() WHERE workspace_id=w AND environment=e AND account_id=resource_id;
 ELSIF resource='gateways' AND action='enable' THEN UPDATE pg06_account_configuration SET disabled_at=NULL WHERE workspace_id=w AND environment=e AND account_id=resource_id;
 ELSIF resource='devices' AND action='rename' THEN UPDATE pg06_devices SET name=payload->>'name' WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='incoming' AND action='reprocess' THEN UPDATE pg07_receipt_results SET status='pending',reason='',processed_at=NULL WHERE workspace_id=w AND environment=e AND observation_id=(SELECT observation_id FROM pg06_transport WHERE workspace_id=w AND environment=e AND id=resource_id) AND status IN ('unmatched','ambiguous');
 ELSIF resource='webhooks' AND action='create' THEN INSERT INTO pg08_endpoints(workspace_id,environment,url,secret) VALUES(w,e,payload->>'url',secret_cipher) RETURNING id INTO generated;INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,resource,generated,action);RETURN jsonb_build_object('id',generated);
 ELSIF resource='webhooks' AND action='disable' THEN UPDATE pg08_endpoints SET active=false WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='webhooks' AND action='enable' THEN UPDATE pg08_endpoints SET active=true WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='webhooks' AND action='rotate' THEN UPDATE pg08_endpoints SET previous_secret=secret,previous_until=now()+interval '24 hours',secret=secret_cipher WHERE workspace_id=w AND environment=e AND id=resource_id;
 ELSIF resource='deliveries' AND action='replay' THEN INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id) SELECT w,e,endpoint_id,event_id FROM pg08_deliveries WHERE workspace_id=w AND environment=e AND id=resource_id AND status IN ('failed','delivered','disabled') RETURNING id INTO generated; IF generated IS NOT NULL THEN INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,resource,generated,action);RETURN jsonb_build_object('id',generated); END IF;
 ELSE RAISE EXCEPTION 'action unavailable' USING ERRCODE='22023'; END IF;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'resource or allowed transition unavailable' USING ERRCODE='P0002';END IF;
 INSERT INTO pg09_audit(workspace_id,environment,resource,resource_id,action) VALUES(w,e,resource,resource_id,action);
 RETURN jsonb_build_object('updated',true);
END $$;
-- Narrow callable boundary: no arbitrary financial INSERT or evidence reads.
DO $$ DECLARE f record;BEGIN FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('pg06_scope','pg06_pair','pg06_account','pg06_account_attempt_guard','pg06_claim','pg06_device_context','pg06_ingest','pg06_heartbeat','pg06_history','pg07_pending','pg07_match','pg08_due','pg08_claim','pg08_finish','pg09_read','pg09_action') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.signature);
 IF f.proname IN ('pg07_pending','pg07_match','pg08_due','pg08_claim','pg08_finish') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO ekmivo_financial_worker',f.signature);
 ELSIF f.proname NOT IN ('pg06_scope','pg06_account_attempt_guard') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO ekmivo_finance_reader',f.signature);END IF;
END LOOP;END $$;
COMMIT;
