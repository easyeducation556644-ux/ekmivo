-- Control database only: versioned plans and subscription management.
BEGIN;
ALTER TABLE pg13_plans DROP CONSTRAINT pg13_plans_amount_minor_check;
ALTER TABLE pg13_plans ADD CHECK(amount_minor>=0);
CREATE TABLE payment_plan_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),plan_id text NOT NULL REFERENCES pg13_plans(id),version integer NOT NULL,
 terms jsonb NOT NULL,created_by uuid REFERENCES app_users(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(plan_id,version)
);
CREATE TABLE payment_plan_catalog (
 plan_id text PRIMARY KEY REFERENCES pg13_plans(id),current_version uuid NOT NULL REFERENCES payment_plan_versions(id),
 status text NOT NULL CHECK(status IN ('draft','published','archived')),visibility text NOT NULL CHECK(visibility IN ('public','private')),
 sort_order integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pg13_subscriptions ADD COLUMN plan_version_id uuid REFERENCES payment_plan_versions(id),
 ADD COLUMN started_at timestamptz NOT NULL DEFAULT now(),ADD COLUMN next_version_id uuid REFERENCES payment_plan_versions(id),ADD COLUMN revision bigint NOT NULL DEFAULT 1;
ALTER TABLE pg13_platform_invoices ADD COLUMN plan_version_id uuid REFERENCES payment_plan_versions(id);
CREATE TABLE payment_subscription_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid REFERENCES workspaces(id),actor_id uuid REFERENCES app_users(id),
 action text NOT NULL,before_value jsonb,after_value jsonb,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_subscription_overrides (
 workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),extra_payments bigint NOT NULL DEFAULT 0 CHECK(extra_payments>=0),
 until_at timestamptz NOT NULL,reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),created_by uuid NOT NULL REFERENCES app_users(id)
);
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['payment_plan_versions','payment_plan_catalog','payment_subscription_audit','payment_subscription_overrides'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_financial_runtime,ekmivo_financial_projection',t);END LOOP;
END $$;
-- Preserve existing purchased terms. New sample pricing is never auto-published.
INSERT INTO payment_plan_versions(plan_id,version,terms)
 SELECT id,1,jsonb_build_object('name',name,'name_bn',name,'description','','description_bn','','kind','paid','amount_minor',amount_minor,
 'period_days',period_days,'grace_days',grace_days,'free_days',NULL,'payment_limit',NULL,'quota_period','billing',
 'active_checkout_limit',100,'create_per_minute',120,'features',jsonb_build_object('invoices',true,'payment_links',true,'reports',true,'exports',true),
 'limits',jsonb_build_object('api_keys',NULL,'team_members',NULL,'devices',NULL,'payment_methods',NULL),'badge','','badge_bn','','contact_url','') FROM pg13_plans;
INSERT INTO payment_plan_catalog SELECT p.id,v.id,CASE WHEN p.enabled THEN 'published' ELSE 'archived' END,'public',0,now() FROM pg13_plans p JOIN payment_plan_versions v ON v.plan_id=p.id;
UPDATE pg13_subscriptions s SET plan_version_id=v.id FROM payment_plan_versions v WHERE v.plan_id=s.plan_id;
UPDATE pg13_platform_invoices i SET plan_version_id=v.id FROM payment_plan_versions v WHERE v.plan_id=i.plan_id;

CREATE FUNCTION payment_plan_validate(t jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text;n bigint;BEGIN
 IF NOT coalesce(t ?& ARRAY['name','kind','period_days','grace_days','free_days','payment_limit','quota_period','active_checkout_limit','create_per_minute','features','limits'],false) THEN RAISE EXCEPTION 'explicit plan terms required' USING ERRCODE='22023';END IF;
 IF jsonb_typeof(t)<>'object' OR length(coalesce(t->>'name','')) NOT BETWEEN 1 AND 100 OR length(coalesce(t->>'name_bn',''))>100
 OR length(coalesce(t->>'description',''))>1000 OR length(coalesce(t->>'description_bn',''))>1000
 OR coalesce(t->>'kind','') NOT IN ('free','paid','custom') THEN RAISE EXCEPTION 'invalid plan identity' USING ERRCODE='22023';END IF;
 IF t->>'kind'='custom' THEN t:=t||jsonb_build_object('amount_minor',0);
 ELSE n:=coalesce(nullif(t->>'amount_minor','')::bigint,0);IF n<0 OR n>10000000000 THEN RAISE EXCEPTION 'invalid price' USING ERRCODE='22023';END IF;
 t:=t||jsonb_build_object('amount_minor',n,'kind',CASE WHEN n=0 THEN 'free' ELSE 'paid' END);END IF;
 IF coalesce((t->>'period_days')::integer,0) NOT BETWEEN 1 AND 366 OR coalesce((t->>'grace_days')::integer,-1) NOT BETWEEN 0 AND 14
 OR coalesce(t->>'quota_period','') NOT IN ('calendar','billing','term') OR coalesce((t->>'create_per_minute')::integer,0) NOT BETWEEN 1 AND 10000
 OR coalesce((t->>'active_checkout_limit')::integer,0) NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'invalid plan limits' USING ERRCODE='22023';END IF;
 IF t->>'payment_limit' IS NOT NULL AND (t->>'payment_limit')::bigint NOT BETWEEN 1 AND 1000000000 THEN RAISE EXCEPTION 'invalid payment allowance' USING ERRCODE='22023';END IF;
 IF t->>'free_days' IS NOT NULL AND (t->>'free_days')::integer NOT BETWEEN 1 AND 3650 THEN RAISE EXCEPTION 'invalid free duration' USING ERRCODE='22023';END IF;
 IF jsonb_typeof(t->'features') IS DISTINCT FROM 'object' OR jsonb_typeof(t->'limits') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'features and limits required' USING ERRCODE='22023';END IF;
 IF NOT(t->'limits' ?& ARRAY['api_keys','team_members','devices','payment_methods']) THEN RAISE EXCEPTION 'explicit resource limits required' USING ERRCODE='22023';END IF;
 FOR k IN SELECT jsonb_object_keys(t->'features') LOOP
 IF k NOT IN ('invoices','payment_links','reports','exports') OR jsonb_typeof(t->'features'->k)<>'boolean' THEN RAISE EXCEPTION 'unsupported feature' USING ERRCODE='22023';END IF;END LOOP;
 FOREACH k IN ARRAY ARRAY['invoices','payment_links','reports','exports'] LOOP
 IF NOT(t->'features' ? k) THEN RAISE EXCEPTION 'feature required' USING ERRCODE='22023';END IF;END LOOP;
 FOR k IN SELECT jsonb_object_keys(t->'limits') LOOP
 IF k NOT IN ('api_keys','team_members','devices','payment_methods') OR (t->'limits'->>k IS NOT NULL AND (t->'limits'->>k)::bigint NOT BETWEEN 1 AND 1000000) THEN RAISE EXCEPTION 'invalid resource limit' USING ERRCODE='22023';END IF;END LOOP;
 IF length(coalesce(t->>'badge',''))>40 OR length(coalesce(t->>'badge_bn',''))>40 OR length(coalesce(t->>'contact_url',''))>500 THEN RAISE EXCEPTION 'invalid presentation' USING ERRCODE='22023';END IF;
 IF coalesce(t->>'contact_url','')<>'' AND t->>'contact_url' !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'HTTPS contact URL required' USING ERRCODE='22023';END IF;
 RETURN t;
END $$;
CREATE FUNCTION payment_plan_public() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.plan_id,'version_id',v.id,'terms',v.terms) ORDER BY p.sort_order,p.plan_id),'[]')
 FROM payment_plan_catalog p JOIN payment_plan_versions v ON v.id=p.current_version WHERE p.status='published' AND p.visibility='public'
$$;
CREATE FUNCTION payment_plan_effective(w uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s pg13_subscriptions;v payment_plan_versions;start_at timestamptz;end_at timestamptz;days integer;extra bigint:=0;BEGIN
 SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w;
 IF s.workspace_id IS NULL THEN RETURN jsonb_build_object('active',false,'reason','SUBSCRIPTION_REQUIRED');END IF;
 SELECT * INTO v FROM payment_plan_versions WHERE id=s.plan_version_id;
 IF v.id IS NULL THEN RETURN jsonb_build_object('active',false,'reason','PLAN_MISSING');END IF;
 days:=(v.terms->>'period_days')::integer;
 IF v.terms->>'quota_period'='calendar' THEN start_at:=date_trunc('month',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka';end_at:=(date_trunc('month',now() AT TIME ZONE 'Asia/Dhaka')+interval '1 month') AT TIME ZONE 'Asia/Dhaka';
 ELSIF v.terms->>'quota_period'='term' THEN start_at:=s.started_at;end_at:=s.paid_until;
 ELSE start_at:=s.started_at+make_interval(days=>(floor(greatest(0,extract(epoch FROM now()-s.started_at))/86400/days)::integer*days));end_at:=start_at+make_interval(days=>days);END IF;
 SELECT extra_payments INTO extra FROM payment_subscription_overrides WHERE workspace_id=w AND until_at>now();
 RETURN jsonb_build_object('active',s.grace_until>now(),'plan_id',s.plan_id,'version_id',v.id,'revision',s.revision,'terms',v.terms,
 'period_start',start_at,'period_end',end_at,'access_until',s.grace_until,'extra_payments',coalesce(extra,0),'next_version_id',s.next_version_id);
END $$;
CREATE FUNCTION payment_plan_admin(a uuid,op text,b jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pid text;v payment_plan_versions;c payment_plan_catalog;s pg13_subscriptions;old jsonb;w uuid;cfg jsonb;reason text;until_time timestamptz;BEGIN
 IF NOT EXISTS(SELECT 1 FROM platform_administrators p JOIN app_users u ON u.id=p.user_id WHERE p.user_id=a AND p.role='super_admin' AND u.disabled_at IS NULL) THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF op='read' THEN RETURN jsonb_build_object('plans',coalesce((SELECT jsonb_agg(to_jsonb(pc)||jsonb_build_object('terms',pv.terms,'version',pv.version,'subscribers',(SELECT count(*) FROM pg13_subscriptions sc WHERE sc.plan_id=pc.plan_id))) FROM payment_plan_catalog pc JOIN payment_plan_versions pv ON pv.id=pc.current_version),'[]'));END IF;
 reason:=b->>'reason';IF length(coalesce(reason,'')) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'audit reason required' USING ERRCODE='22023';END IF;
 IF op IN ('save','archive') THEN
 pid:=b->>'id';IF coalesce(pid,'') !~ '^[a-z][a-z0-9_-]{1,39}$' THEN RAISE EXCEPTION 'invalid plan id' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('plan:'||pid,0));SELECT * INTO c FROM payment_plan_catalog WHERE plan_id=pid FOR UPDATE;old:=to_jsonb(c);
 IF op='save' THEN
 cfg:=payment_plan_validate(b->'terms');
 IF coalesce(b->>'status','') NOT IN ('draft','published') OR coalesce(b->>'visibility','') NOT IN ('public','private') THEN RAISE EXCEPTION 'invalid publication' USING ERRCODE='22023';END IF;
 IF c.plan_id IS NOT NULL AND c.current_version::text IS DISTINCT FROM b->>'expected_version' THEN RAISE EXCEPTION 'plan changed; reload' USING ERRCODE='40001';END IF;
 INSERT INTO pg13_plans(id,name,amount_minor,period_days,grace_days,enabled) VALUES(pid,cfg->>'name',(cfg->>'amount_minor')::bigint,(cfg->>'period_days')::integer,(cfg->>'grace_days')::integer,b->>'status'='published')
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,amount_minor=EXCLUDED.amount_minor,period_days=EXCLUDED.period_days,grace_days=EXCLUDED.grace_days,enabled=EXCLUDED.enabled;
 INSERT INTO payment_plan_versions(plan_id,version,terms,created_by) SELECT pid,coalesce(max(version),0)+1,cfg,a FROM payment_plan_versions WHERE plan_id=pid RETURNING * INTO v;
 INSERT INTO payment_plan_catalog VALUES(pid,v.id,b->>'status',b->>'visibility',coalesce((b->>'sort_order')::integer,0),now()) ON CONFLICT(plan_id) DO UPDATE SET current_version=v.id,status=EXCLUDED.status,visibility=EXCLUDED.visibility,sort_order=EXCLUDED.sort_order,updated_at=now();
 ELSE
 IF c.plan_id IS NULL THEN RAISE EXCEPTION 'plan missing' USING ERRCODE='P0002';END IF;
 UPDATE payment_plan_catalog SET status='archived',updated_at=now() WHERE plan_id=pid;UPDATE pg13_plans SET enabled=false WHERE id=pid;
 END IF;
 INSERT INTO payment_subscription_audit(actor_id,action,before_value,after_value,reason) VALUES(a,'plan.'||op,old,b,reason);
 ELSE
 w:=(b->>'workspace_id')::uuid;PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w FOR UPDATE;old:=to_jsonb(s);
 IF op='workspace' THEN RETURN jsonb_build_object('subscription',to_jsonb(s),'effective',payment_plan_effective(w),'override',(SELECT to_jsonb(o) FROM payment_subscription_overrides o WHERE workspace_id=w),'history',coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM(SELECT * FROM payment_subscription_audit WHERE workspace_id=w ORDER BY created_at DESC LIMIT 50)h),'[]'));END IF;
 IF op IN ('expire','clear_schedule') THEN
 IF s.workspace_id IS NULL THEN RAISE EXCEPTION 'subscription missing' USING ERRCODE='P0002';END IF;
 IF op='expire' THEN UPDATE pg13_subscriptions SET paid_until=least(paid_until,now()),grace_until=now(),next_version_id=NULL,revision=revision+1 WHERE workspace_id=w;
 ELSE UPDATE pg13_subscriptions SET next_version_id=NULL,revision=revision+1 WHERE workspace_id=w;END IF;
 ELSIF op='override' THEN
 until_time:=(b->>'until_at')::timestamptz;
 IF until_time IS NULL OR until_time<=now() OR until_time>now()+interval '366 days' OR coalesce((b->>'extra_payments')::bigint,-1) NOT BETWEEN 0 AND 1000000000 THEN RAISE EXCEPTION 'invalid override' USING ERRCODE='22023';END IF;
 INSERT INTO payment_subscription_overrides VALUES(w,(b->>'extra_payments')::bigint,until_time,reason,a) ON CONFLICT(workspace_id) DO UPDATE SET extra_payments=EXCLUDED.extra_payments,until_at=EXCLUDED.until_at,reason=EXCLUDED.reason,created_by=a;
 UPDATE pg13_subscriptions SET revision=revision+1 WHERE workspace_id=w;
 ELSE
 SELECT * INTO v FROM payment_plan_versions WHERE id=(b->>'version_id')::uuid;
 IF v.id IS NULL OR NOT EXISTS(SELECT 1 FROM payment_plan_catalog WHERE plan_id=v.plan_id AND status='published') THEN RAISE EXCEPTION 'published plan required' USING ERRCODE='22023';END IF;
 IF op='schedule' THEN
 IF v.terms->>'kind'<>'paid' THEN RAISE EXCEPTION 'scheduled renewal requires a paid plan; use explicit grant for free or custom access' USING ERRCODE='22023';END IF;
 IF s.workspace_id IS NULL OR NOT isfinite(s.paid_until) THEN RAISE EXCEPTION 'finite existing subscription required' USING ERRCODE='22023';END IF;
 UPDATE pg13_subscriptions SET next_version_id=v.id,revision=revision+1 WHERE workspace_id=w;
 ELSIF op='assign' THEN
 until_time:=CASE WHEN b->>'until_at'='forever' AND v.terms->>'kind'='free' THEN 'infinity'::timestamptz ELSE (b->>'until_at')::timestamptz END;
 IF until_time IS NULL OR until_time<=now() THEN RAISE EXCEPTION 'future expiry required' USING ERRCODE='22023';END IF;
 INSERT INTO pg13_subscriptions(workspace_id,plan_id,plan_version_id,started_at,paid_until,grace_until) VALUES(w,v.plan_id,v.id,now(),until_time,until_time)
 ON CONFLICT(workspace_id) DO UPDATE SET plan_id=v.plan_id,plan_version_id=v.id,paid_until=until_time,grace_until=until_time,next_version_id=NULL,revision=pg13_subscriptions.revision+1;
 ELSE RAISE EXCEPTION 'invalid action' USING ERRCODE='22023';END IF;
 END IF;
 INSERT INTO payment_subscription_audit(workspace_id,actor_id,action,before_value,after_value,reason) VALUES(w,a,'subscription.'||op,old,b,reason);
 END IF;
 INSERT INTO platform_admin_audit(actor_id,action,description) VALUES(a,'payment_plan.'||op,reason);RETURN jsonb_build_object('saved',true);
END $$;
CREATE FUNCTION payment_plan_claim_free(w uuid,a uuid,pid text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v payment_plan_versions;end_at timestamptz;BEGIN
 PERFORM pg13_actor(w,a,true);PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));
 IF EXISTS(SELECT 1 FROM payment_subscription_audit WHERE workspace_id=w AND action='subscription.free_claim') AND EXISTS(SELECT 1 FROM pg13_subscriptions WHERE workspace_id=w AND plan_id=pid) THEN RETURN payment_plan_effective(w);END IF;
 IF EXISTS(SELECT 1 FROM payment_subscription_audit WHERE workspace_id=w AND action='subscription.free_claim') OR EXISTS(SELECT 1 FROM pg13_subscriptions WHERE workspace_id=w) THEN RAISE EXCEPTION 'existing subscription requires admin or paid upgrade' USING ERRCODE='23505';END IF;
 SELECT v0.* INTO v FROM payment_plan_catalog c JOIN payment_plan_versions v0 ON v0.id=c.current_version WHERE c.plan_id=pid AND c.status='published' AND c.visibility='public' AND v0.terms->>'kind'='free';
 IF v.id IS NULL THEN RAISE EXCEPTION 'free plan unavailable' USING ERRCODE='P0002';END IF;
 end_at:=CASE WHEN v.terms->>'free_days' IS NULL THEN 'infinity'::timestamptz ELSE now()+make_interval(days=>(v.terms->>'free_days')::integer) END;
 INSERT INTO pg13_subscriptions(workspace_id,plan_id,plan_version_id,started_at,paid_until,grace_until) VALUES(w,pid,v.id,now(),end_at,end_at);
 INSERT INTO payment_subscription_audit(workspace_id,actor_id,action,after_value,reason) VALUES(w,a,'subscription.free_claim',to_jsonb(v),'Self-service free activation');RETURN payment_plan_effective(w);
END $$;
CREATE OR REPLACE FUNCTION pg13_billing_allowed(w uuid) RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT coalesce((payment_plan_effective(w)->>'active')::boolean,false) $$;
CREATE OR REPLACE FUNCTION pg13_billing_issue(w uuid,a uuid,plan text,k text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i pg13_platform_invoices;v payment_plan_versions;s pg13_subscriptions;BEGIN
 PERFORM pg13_actor(w,a,true);PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));
 SELECT * INTO i FROM pg13_platform_invoices WHERE workspace_id=w AND creation_key=k;
 IF FOUND THEN IF i.plan_id<>plan THEN RAISE EXCEPTION 'billing key conflict' USING ERRCODE='23505';END IF;RETURN to_jsonb(i);END IF;
 IF length(k) NOT BETWEEN 16 AND 128 THEN RAISE EXCEPTION 'billing key required' USING ERRCODE='22023';END IF;
 SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w;
 SELECT v0.* INTO v FROM payment_plan_catalog c JOIN payment_plan_versions v0 ON v0.id=CASE WHEN EXISTS(SELECT 1 FROM payment_plan_versions scheduled WHERE scheduled.id=s.next_version_id AND scheduled.plan_id=plan) THEN s.next_version_id ELSE c.current_version END WHERE c.plan_id=plan AND c.status='published' AND c.visibility='public' AND v0.terms->>'kind'='paid';
 IF v.id IS NULL THEN RAISE EXCEPTION 'public paid plan unavailable' USING ERRCODE='P0002';END IF;
 INSERT INTO pg13_platform_invoices(workspace_id,plan_id,plan_version_id,amount_minor,period_days,grace_days,creation_key) VALUES(w,plan,v.id,(v.terms->>'amount_minor')::bigint,(v.terms->>'period_days')::integer,(v.terms->>'grace_days')::integer,k) RETURNING * INTO i;RETURN to_jsonb(i);
END $$;
CREATE OR REPLACE FUNCTION pg13_billing_verified(w uuid,invoice uuid,payment uuid,amount bigint,verified_time timestamptz) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i pg13_platform_invoices;s pg13_subscriptions;until_time timestamptz;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));SELECT * INTO i FROM pg13_platform_invoices WHERE workspace_id=w AND id=invoice FOR UPDATE;
 IF i.id IS NULL OR i.amount_minor<>amount OR verified_time<i.created_at OR verified_time>now() THEN RAISE EXCEPTION 'billing proof mismatch' USING ERRCODE='23514';END IF;
 IF i.status='paid' THEN RETURN i.source_payment_id=payment;END IF;
 SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w;
 until_time:=CASE WHEN s.plan_version_id=i.plan_version_id AND isfinite(s.paid_until) THEN greatest(now(),s.paid_until) ELSE now() END+make_interval(days=>i.period_days);
 INSERT INTO pg13_subscriptions(workspace_id,plan_id,plan_version_id,started_at,paid_until,grace_until) VALUES(w,i.plan_id,i.plan_version_id,now(),until_time,until_time+make_interval(days=>i.grace_days))
 ON CONFLICT(workspace_id) DO UPDATE SET plan_id=i.plan_id,plan_version_id=i.plan_version_id,paid_until=until_time,grace_until=until_time+make_interval(days=>i.grace_days),next_version_id=NULL,revision=pg13_subscriptions.revision+1;
 UPDATE pg13_platform_invoices SET status='paid',source_payment_id=payment,paid_at=verified_time WHERE id=i.id;
 INSERT INTO payment_subscription_audit(workspace_id,action,after_value,reason) VALUES(w,'subscription.verified_payment',to_jsonb(i),'Verified platform payment');RETURN true;
END $$;
CREATE OR REPLACE FUNCTION pg13_billing_read(w uuid,a uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg13_actor(w,a,false);RETURN jsonb_build_object('plans',payment_plan_public(),'invoices',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY created_at DESC) FROM pg13_platform_invoices i WHERE workspace_id=w),'[]'),
 'subscription',(SELECT to_jsonb(s)||jsonb_build_object('state',CASE WHEN s.paid_until>now() THEN 'active' WHEN s.grace_until>now() THEN 'grace' ELSE 'expired' END) FROM pg13_subscriptions s WHERE workspace_id=w),'effective',payment_plan_effective(w));
END $$;
REVOKE ALL ON FUNCTION payment_plan_validate(jsonb),payment_plan_public(),payment_plan_admin(uuid,text,jsonb),payment_plan_effective(uuid),payment_plan_claim_free(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION payment_plan_public(),payment_plan_admin(uuid,text,jsonb),payment_plan_effective(uuid),payment_plan_claim_free(uuid,uuid,text) TO ekmivo_financial_runtime;
GRANT EXECUTE ON FUNCTION payment_plan_effective(uuid) TO ekmivo_financial_projection;
CREATE FUNCTION payment_plan_control_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p jsonb;lim bigint;total bigint;k text;BEGIN
 IF TG_TABLE_NAME='merchant_api_keys' THEN IF NEW.environment='sandbox' THEN RETURN NEW;END IF;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('plan-resource:'||NEW.workspace_id::text||TG_TABLE_NAME,0));
 p:=payment_plan_effective(NEW.workspace_id);k:=CASE WHEN TG_TABLE_NAME='merchant_api_keys' THEN 'api_keys' ELSE 'team_members' END;
 lim:=(p->'terms'->'limits'->>k)::bigint;IF lim IS NULL THEN RETURN NEW;END IF;
 IF k='api_keys' THEN SELECT count(*) INTO total FROM merchant_api_keys WHERE workspace_id=NEW.workspace_id AND environment='live' AND revoked_at IS NULL AND expires_at>now();
 ELSE SELECT count(*) INTO total FROM workspace_members WHERE workspace_id=NEW.workspace_id;END IF;
 IF total>=lim THEN RAISE EXCEPTION 'PLAN_RESOURCE_LIMIT' USING ERRCODE='P6806';END IF;RETURN NEW;
END $$;
CREATE TRIGGER payment_plan_key_limit BEFORE INSERT ON merchant_api_keys FOR EACH ROW EXECUTE FUNCTION payment_plan_control_limit();
CREATE TRIGGER payment_plan_team_limit BEFORE INSERT ON workspace_members FOR EACH ROW EXECUTE FUNCTION payment_plan_control_limit();
REVOKE ALL ON FUNCTION payment_plan_control_limit() FROM PUBLIC;
CREATE FUNCTION payment_plan_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable plan or audit history' USING ERRCODE='42501';END $$;
CREATE TRIGGER payment_plan_version_immutable BEFORE UPDATE OR DELETE ON payment_plan_versions FOR EACH ROW EXECUTE FUNCTION payment_plan_immutable();
CREATE TRIGGER payment_subscription_audit_immutable BEFORE UPDATE OR DELETE ON payment_subscription_audit FOR EACH ROW EXECUTE FUNCTION payment_plan_immutable();
REVOKE ALL ON FUNCTION payment_plan_immutable() FROM PUBLIC;
COMMIT;
