BEGIN;
CREATE TABLE pg13_plans(id text PRIMARY KEY CHECK(id ~ '^[a-z][a-z0-9_-]{1,39}$'),name text NOT NULL,amount_minor bigint NOT NULL CHECK(amount_minor>0),period_days integer NOT NULL DEFAULT 30 CHECK(period_days BETWEEN 1 AND 366),grace_days integer NOT NULL DEFAULT 3 CHECK(grace_days BETWEEN 0 AND 14),enabled boolean NOT NULL DEFAULT true);
CREATE TABLE pg13_platform_invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id),plan_id text NOT NULL REFERENCES pg13_plans(id),amount_minor bigint NOT NULL CHECK(amount_minor>0),period_days integer NOT NULL,grace_days integer NOT NULL,status text NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','paid')),source_payment_id uuid UNIQUE,paid_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),creation_key text NOT NULL,UNIQUE(workspace_id,creation_key));
CREATE TABLE pg13_subscriptions(workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),plan_id text NOT NULL REFERENCES pg13_plans(id),paid_until timestamptz NOT NULL,grace_until timestamptz NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['pg13_plans','pg13_platform_invoices','pg13_subscriptions'] LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_financial_runtime',t);END LOOP;END $$;
CREATE FUNCTION pg13_billing_read(w uuid,a uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg13_actor(w,a,false);RETURN jsonb_build_object('plans',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pg13_plans p WHERE enabled),'[]'),'invoices',coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM pg13_platform_invoices i WHERE workspace_id=w),'[]'),'subscription',(SELECT to_jsonb(s)||jsonb_build_object('state',CASE WHEN s.paid_until>now() THEN 'active' WHEN s.grace_until>now() THEN 'grace' ELSE 'expired' END) FROM pg13_subscriptions s WHERE workspace_id=w));
END $$;
CREATE FUNCTION pg13_billing_issue(w uuid,a uuid,plan text,k text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE i pg13_platform_invoices;p pg13_plans;BEGIN
 PERFORM pg13_actor(w,a,true);PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));
 SELECT * INTO i FROM pg13_platform_invoices WHERE workspace_id=w AND creation_key=k;
 IF FOUND THEN IF i.plan_id<>plan THEN RAISE EXCEPTION 'billing key conflict' USING ERRCODE='23505';END IF;RETURN to_jsonb(i);END IF;
 IF length(k) NOT BETWEEN 16 AND 128 THEN RAISE EXCEPTION 'billing key required' USING ERRCODE='22023';END IF;
 SELECT * INTO p FROM pg13_plans WHERE id=plan AND enabled;IF NOT FOUND THEN RAISE EXCEPTION 'plan unavailable' USING ERRCODE='P0002';END IF;
 INSERT INTO pg13_platform_invoices(workspace_id,plan_id,amount_minor,period_days,grace_days,creation_key) VALUES(w,p.id,p.amount_minor,p.period_days,p.grace_days,k) RETURNING * INTO i;RETURN to_jsonb(i);
END $$;
-- Callable only by the dedicated runtime after it queries the independent
-- operator-owned platform receiving workspace. No browser status/amount input.
CREATE FUNCTION pg13_billing_verified(w uuid,invoice uuid,payment uuid,amount bigint,verified_time timestamptz) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE i pg13_platform_invoices;until_time timestamptz;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));SELECT * INTO i FROM pg13_platform_invoices WHERE workspace_id=w AND id=invoice FOR UPDATE;
 IF i.id IS NULL OR i.amount_minor<>amount OR verified_time<i.created_at OR verified_time>now() THEN RAISE EXCEPTION 'billing proof mismatch' USING ERRCODE='23514';END IF;
 IF i.status='paid' THEN RETURN i.source_payment_id=payment;END IF;
 SELECT greatest(now(),paid_until) INTO until_time FROM pg13_subscriptions WHERE workspace_id=w;
 until_time:=coalesce(until_time,now())+make_interval(days=>i.period_days);
 INSERT INTO pg13_subscriptions(workspace_id,plan_id,paid_until,grace_until) VALUES(w,i.plan_id,until_time,until_time+make_interval(days=>i.grace_days)) ON CONFLICT(workspace_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,paid_until=EXCLUDED.paid_until,grace_until=EXCLUDED.grace_until,updated_at=now();
 UPDATE pg13_platform_invoices SET status='paid',source_payment_id=payment,paid_at=verified_time WHERE id=i.id;RETURN true;
END $$;
REVOKE ALL ON FUNCTION pg13_billing_read(uuid,uuid),pg13_billing_issue(uuid,uuid,text,text),pg13_billing_verified(uuid,uuid,uuid,bigint,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_billing_read(uuid,uuid),pg13_billing_issue(uuid,uuid,text,text),pg13_billing_verified(uuid,uuid,uuid,bigint,timestamptz) TO ekmivo_financial_runtime;
CREATE FUNCTION pg13_billing_allowed(w uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM pg13_subscriptions WHERE workspace_id=w AND grace_until>now()) $$;
REVOKE ALL ON FUNCTION pg13_billing_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_billing_allowed(uuid) TO ekmivo_financial_runtime;
COMMIT;
