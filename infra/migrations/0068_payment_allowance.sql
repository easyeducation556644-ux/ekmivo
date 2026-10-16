-- BOTH isolated financial realms. Creation-only admission control; verification
-- never depends on an active subscription or available allowance.
BEGIN;
CREATE TABLE payment_allowance_slots (
 workspace_id uuid NOT NULL,environment text NOT NULL,intent_id uuid NOT NULL,
 created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 state text NOT NULL CHECK(state IN ('reserved','released','consumed')),
 consumed_at timestamptz,plan_version_id uuid NOT NULL,
 PRIMARY KEY(workspace_id,environment,intent_id),
 FOREIGN KEY(workspace_id,environment,intent_id) REFERENCES payment_intents(workspace_id,environment,id)
);
CREATE INDEX payment_allowance_period ON payment_allowance_slots(workspace_id,environment,created_at,state);
CREATE INDEX payment_allowance_open ON payment_allowance_slots(workspace_id,environment,expires_at) WHERE state='reserved';
CREATE TABLE payment_creation_buckets(workspace_id uuid NOT NULL,environment text NOT NULL,minute_at timestamptz NOT NULL,requests integer NOT NULL,PRIMARY KEY(workspace_id,environment));
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['payment_allowance_slots','payment_creation_buckets'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker',t);END LOOP;END $$;

CREATE FUNCTION payment_allowance_reserve() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p jsonb;lim bigint;used bigint;held bigint;active_count bigint;request_count integer;BEGIN
 IF NEW.environment='sandbox' THEN RETURN NEW;END IF;
 p:=nullif(current_setting('ekmivo.payment_plan',true),'')::jsonb;
 IF p IS NULL OR p->>'workspace_id' IS DISTINCT FROM NEW.workspace_id::text OR (p->>'fetched_at')::timestamptz<clock_timestamp()-interval '30 seconds' THEN RAISE EXCEPTION 'PLAN_SNAPSHOT_REQUIRED' USING ERRCODE='P6801';END IF;
 -- This flag is set only by the backend for its operator-owned SaaS checkout.
 IF p->>'platform_billing'='true' THEN RETURN NEW;END IF;
 IF coalesce((p->>'active')::boolean,false)=false OR (p->>'access_until')::timestamptz<=now() THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED' USING ERRCODE='P6802';END IF;
 IF p->>'version_id' IS NULL OR p->>'period_start' IS NULL OR p->>'period_end' IS NULL OR p->>'access_until' IS NULL OR NEW.created_at<(p->>'period_start')::timestamptz OR NEW.created_at>=(p->>'period_end')::timestamptz THEN RAISE EXCEPTION 'PLAN_SNAPSHOT_REQUIRED' USING ERRCODE='P6801';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('payment-allowance:'||NEW.workspace_id::text||NEW.environment,0));
 SELECT count(*) FILTER(WHERE state='consumed' AND created_at>=(p->>'period_start')::timestamptz AND created_at<(p->>'period_end')::timestamptz),
 count(*) FILTER(WHERE state='reserved' AND expires_at>now()) INTO used,held FROM payment_allowance_slots WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND created_at>=(p->>'period_start')::timestamptz AND created_at<(p->>'period_end')::timestamptz;
 SELECT count(*) INTO active_count FROM payment_allowance_slots WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND state='reserved' AND expires_at>now();
 lim:=(p->'terms'->>'payment_limit')::bigint;
 IF lim IS NOT NULL AND used+held>=lim+coalesce((p->>'extra_payments')::bigint,0) THEN RAISE EXCEPTION 'PAYMENT_ALLOWANCE_EXHAUSTED' USING ERRCODE='P6803';END IF;
 IF active_count>=(p->'terms'->>'active_checkout_limit')::bigint THEN RAISE EXCEPTION 'ACTIVE_CHECKOUT_LIMIT' USING ERRCODE='P6804';END IF;
 INSERT INTO payment_creation_buckets VALUES(NEW.workspace_id,NEW.environment,date_trunc('minute',now()),1)
 ON CONFLICT(workspace_id,environment) DO UPDATE SET minute_at=EXCLUDED.minute_at,requests=CASE WHEN payment_creation_buckets.minute_at=EXCLUDED.minute_at THEN payment_creation_buckets.requests+1 ELSE 1 END RETURNING requests INTO request_count;
 IF request_count>(p->'terms'->>'create_per_minute')::integer THEN RAISE EXCEPTION 'PLAN_RATE_LIMITED' USING ERRCODE='P6805';END IF;
 INSERT INTO payment_allowance_slots VALUES(NEW.workspace_id,NEW.environment,NEW.id,NEW.created_at,NEW.expires_at,'reserved',NULL,(p->>'version_id')::uuid);
 RETURN NEW;
END $$;
CREATE TRIGGER payment_allowance_reservation AFTER INSERT ON payment_intents FOR EACH ROW EXECUTE FUNCTION payment_allowance_reserve();
CREATE FUNCTION payment_allowance_settle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='pg05_intent_events' THEN
 IF NEW.event_type='cancelled' THEN UPDATE payment_allowance_slots SET state='released' WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND intent_id=NEW.intent_id AND state='reserved';END IF;
 ELSE
 IF (SELECT coalesce(sum(amount_minor),0) FROM financial_allocations WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND intent_id=NEW.intent_id)>=(SELECT amount_minor FROM payment_intents WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND id=NEW.intent_id) THEN
 UPDATE payment_allowance_slots SET state='consumed',consumed_at=coalesce(consumed_at,now()) WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND intent_id=NEW.intent_id AND state<>'consumed';END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_allowance_completion AFTER INSERT ON financial_allocations FOR EACH ROW EXECUTE FUNCTION payment_allowance_settle();
CREATE TRIGGER payment_allowance_cancellation AFTER INSERT ON pg05_intent_events FOR EACH ROW EXECUTE FUNCTION payment_allowance_settle();
CREATE FUNCTION payment_allowance_usage(w uuid,e text,start_at timestamptz,end_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF current_setting('ekmivo.workspace_id',true) IS DISTINCT FROM w::text OR current_setting('ekmivo.environment',true) IS DISTINCT FROM e THEN RAISE EXCEPTION 'scope required' USING ERRCODE='42501';END IF;
 RETURN (SELECT jsonb_build_object('used',count(*) FILTER(WHERE state='consumed'),'reserved',count(*) FILTER(WHERE state='reserved' AND expires_at>now()),'period_start',start_at,'period_end',end_at)
 FROM payment_allowance_slots WHERE workspace_id=w AND environment=e AND created_at>=start_at AND created_at<end_at);
END $$;
REVOKE ALL ON FUNCTION payment_allowance_reserve(),payment_allowance_settle(),payment_allowance_usage(uuid,text,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION payment_allowance_usage(uuid,text,timestamptz,timestamptz) TO ekmivo_finance_reader;
CREATE FUNCTION payment_plan_financial_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p jsonb;k text;lim bigint;total bigint;BEGIN
 IF NEW.environment='sandbox' THEN RETURN NEW;END IF;
 p:=nullif(current_setting('ekmivo.payment_plan',true),'')::jsonb;
 IF p IS NULL OR p->>'workspace_id' IS DISTINCT FROM NEW.workspace_id::text OR (p->>'fetched_at')::timestamptz<clock_timestamp()-interval '30 seconds' THEN RAISE EXCEPTION 'PLAN_SNAPSHOT_REQUIRED' USING ERRCODE='P6801';END IF;
 IF p->>'platform_billing'='true' THEN RETURN NEW;END IF;
 k:=CASE WHEN TG_TABLE_NAME='pg06_account_configuration' THEN 'payment_methods' ELSE 'devices' END;
 lim:=(p->'terms'->'limits'->>k)::bigint;IF lim IS NULL THEN RETURN NEW;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('plan-resource:'||NEW.workspace_id::text||k,0));
 IF k='payment_methods' THEN SELECT count(*) INTO total FROM pg06_account_configuration WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND disabled_at IS NULL;
 ELSE SELECT (SELECT count(*) FROM pg06_phones WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND revoked_at IS NULL AND (claimed_at IS NOT NULL OR pair_expires_at>now()))+(SELECT count(*) FROM pg06_devices WHERE workspace_id=NEW.workspace_id AND environment=NEW.environment AND revoked_at IS NULL AND physical_phone_id IS NULL AND (claimed_at IS NOT NULL OR pair_expires_at>now())) INTO total;END IF;
 IF TG_TABLE_NAME='pg06_devices' THEN IF NEW.physical_phone_id IS NOT NULL THEN RETURN NEW;END IF;END IF;
 IF total>=lim THEN RAISE EXCEPTION 'PLAN_RESOURCE_LIMIT' USING ERRCODE='P6806';END IF;RETURN NEW;
END $$;
CREATE TRIGGER payment_plan_phone_limit BEFORE INSERT ON pg06_phones FOR EACH ROW EXECUTE FUNCTION payment_plan_financial_limit();
CREATE TRIGGER payment_plan_device_limit BEFORE INSERT ON pg06_devices FOR EACH ROW EXECUTE FUNCTION payment_plan_financial_limit();
CREATE TRIGGER payment_plan_account_limit BEFORE INSERT ON pg06_account_configuration FOR EACH ROW EXECUTE FUNCTION payment_plan_financial_limit();
CREATE TRIGGER payment_plan_account_reenable_limit BEFORE UPDATE OF disabled_at ON pg06_account_configuration FOR EACH ROW WHEN (OLD.disabled_at IS NOT NULL AND NEW.disabled_at IS NULL) EXECUTE FUNCTION payment_plan_financial_limit();
REVOKE ALL ON FUNCTION payment_plan_financial_limit() FROM PUBLIC;
COMMIT;
