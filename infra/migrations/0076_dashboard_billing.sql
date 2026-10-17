-- Control database: explicit quotes and period-end changes; never automatic debits.
BEGIN;
ALTER TABLE pg13_platform_invoices ADD COLUMN cycle_count integer NOT NULL DEFAULT 1 CHECK(cycle_count IN (1,3,6)), ADD COLUMN billing_operation text NOT NULL DEFAULT 'purchase', ADD COLUMN entitlement_end timestamptz, ADD COLUMN subscription_revision bigint, ADD COLUMN tax_minor bigint NOT NULL DEFAULT 0 CHECK(tax_minor>=0), ADD COLUMN paid_method text CHECK(paid_method IN ('bkash','nagad','rocket')), ADD COLUMN payer_suffix text CHECK(payer_suffix~'^[0-9]{4}$');
CREATE TABLE dashboard_billing_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id),actor_id uuid NOT NULL REFERENCES app_users(id),
 plan_version_id uuid NOT NULL REFERENCES payment_plan_versions(id),cycle_count integer NOT NULL CHECK(cycle_count IN (1,3,6)),
 operation text NOT NULL CHECK(operation IN ('renew','upgrade')),amount_minor bigint NOT NULL CHECK(amount_minor>0),
 entitlement_end timestamptz NOT NULL,subscription_revision bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes'
);
ALTER TABLE dashboard_billing_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_billing_quotes FORCE ROW LEVEL SECURITY;
CREATE POLICY dashboard_billing_quotes_owner ON dashboard_billing_quotes TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON dashboard_billing_quotes FROM PUBLIC,ekmivo_runtime,ekmivo_financial_runtime;
CREATE FUNCTION dashboard_billing_change(w uuid,a uuid,pid text,undo boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s pg13_subscriptions;v payment_plan_versions;old_terms jsonb;BEGIN
 PERFORM pg13_actor(w,a,true);
 IF pg13_capability_override(w,a,'workspace:settings') IS FALSE THEN RAISE EXCEPTION 'access denied' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));
 SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w FOR UPDATE;
 IF s.workspace_id IS NULL THEN RAISE EXCEPTION 'subscription missing' USING ERRCODE='P0002';END IF;
 IF NOT undo THEN
  SELECT pv.* INTO v FROM payment_plan_catalog c JOIN payment_plan_versions pv ON pv.id=c.current_version WHERE c.plan_id=pid AND c.status='published' AND c.visibility='public' AND pv.terms->>'kind'<>'custom';
  SELECT terms INTO old_terms FROM payment_plan_versions WHERE id=s.plan_version_id;
  IF v.id IS NULL OR NOT isfinite(s.paid_until) OR s.paid_until<=now() OR v.plan_id=s.plan_id OR (v.terms->>'amount_minor')::numeric/(v.terms->>'period_days')::integer >= (old_terms->>'amount_minor')::numeric/(old_terms->>'period_days')::integer THEN RAISE EXCEPTION 'future downgrade required' USING ERRCODE='22023';END IF;
 END IF;
 UPDATE pg13_subscriptions SET next_version_id=CASE WHEN undo THEN NULL ELSE v.id END,revision=revision+1 WHERE workspace_id=w;
 INSERT INTO payment_subscription_audit(workspace_id,actor_id,action,before_value,after_value,reason) VALUES(w,a,CASE WHEN undo THEN 'subscription.clear_schedule' ELSE 'subscription.schedule' END,to_jsonb(s),jsonb_build_object('next_version_id',v.id),'Merchant requested period-end plan change');
 RETURN jsonb_build_object('saved',true);
END $$;
CREATE FUNCTION dashboard_billing_quote(w uuid,a uuid,pid text,n integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s pg13_subscriptions;v payment_plan_versions;old_terms jsonb;q dashboard_billing_quotes;price bigint;until_at timestamptz;op text:='renew';BEGIN
 PERFORM pg13_actor(w,a,true);
 IF pg13_capability_override(w,a,'workspace:settings') IS FALSE THEN RAISE EXCEPTION 'access denied' USING ERRCODE='42501';END IF;
 IF n NOT IN (1,3,6) THEN RAISE EXCEPTION 'invalid renewal duration' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));
 SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w;
 SELECT pv.* INTO v FROM payment_plan_catalog c JOIN payment_plan_versions pv ON pv.id=CASE WHEN EXISTS(SELECT 1 FROM payment_plan_versions sv WHERE sv.id=s.next_version_id AND sv.plan_id=pid) THEN s.next_version_id ELSE c.current_version END WHERE c.plan_id=pid AND c.status='published' AND c.visibility='public' AND pv.terms->>'kind'='paid';
 IF v.id IS NULL THEN RAISE EXCEPTION 'public paid plan unavailable' USING ERRCODE='P0002';END IF;
 SELECT terms INTO old_terms FROM payment_plan_versions WHERE id=s.plan_version_id;
 price:=(v.terms->>'amount_minor')::bigint*n;
 until_at:=CASE WHEN s.plan_id=pid AND isfinite(s.paid_until) THEN greatest(now(),s.paid_until) ELSE now() END+make_interval(days=>(v.terms->>'period_days')::integer*n);
 IF s.plan_id IS DISTINCT FROM pid AND isfinite(s.paid_until) AND s.paid_until>now() AND old_terms->>'kind'='paid' THEN
  IF (v.terms->>'amount_minor')::numeric/(v.terms->>'period_days')::integer <= (old_terms->>'amount_minor')::numeric/(old_terms->>'period_days')::integer THEN RAISE EXCEPTION 'downgrade starts at period end' USING ERRCODE='23514';END IF;
  op:='upgrade';n:=1;until_at:=s.paid_until;
  price:=greatest(1,ceil(((v.terms->>'amount_minor')::numeric/(v.terms->>'period_days')::integer-(old_terms->>'amount_minor')::numeric/(old_terms->>'period_days')::integer)*extract(epoch FROM s.paid_until-now())/86400)::bigint);
 END IF;
 INSERT INTO dashboard_billing_quotes(workspace_id,actor_id,plan_version_id,cycle_count,operation,amount_minor,entitlement_end,subscription_revision) VALUES(w,a,v.id,n,op,price,until_at,coalesce(s.revision,0)) RETURNING * INTO q;
 RETURN to_jsonb(q)||jsonb_build_object('plan_id',pid,'terms',v.terms);
END $$;
CREATE FUNCTION dashboard_billing_issue(w uuid,a uuid,qid uuid,k text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE q dashboard_billing_quotes;v payment_plan_versions;i pg13_platform_invoices;rev bigint;BEGIN
 PERFORM pg13_actor(w,a,true);
 IF pg13_capability_override(w,a,'workspace:settings') IS FALSE THEN RAISE EXCEPTION 'access denied' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('platform-billing:'||w::text,0));
 SELECT * INTO q FROM dashboard_billing_quotes WHERE id=qid AND workspace_id=w AND actor_id=a;
 IF q.id IS NULL OR length(k) NOT BETWEEN 16 AND 128 THEN RAISE EXCEPTION 'quote required' USING ERRCODE='22023';END IF;
 SELECT * INTO v FROM payment_plan_versions WHERE id=q.plan_version_id;
 SELECT * INTO i FROM pg13_platform_invoices WHERE workspace_id=w AND creation_key=k;
 IF i.id IS NOT NULL THEN IF i.plan_version_id<>q.plan_version_id OR i.amount_minor<>q.amount_minor OR i.billing_operation<>q.operation OR i.cycle_count<>q.cycle_count THEN RAISE EXCEPTION 'billing key conflict' USING ERRCODE='23505';END IF;RETURN to_jsonb(i);END IF;
 SELECT revision INTO rev FROM pg13_subscriptions WHERE workspace_id=w;
 IF q.expires_at<=now() OR q.subscription_revision<>coalesce(rev,0) THEN RAISE EXCEPTION 'quote expired; review again' USING ERRCODE='40001';END IF;
 INSERT INTO pg13_platform_invoices(workspace_id,plan_id,plan_version_id,amount_minor,period_days,grace_days,creation_key,cycle_count,billing_operation,entitlement_end,subscription_revision)
 VALUES(w,v.plan_id,v.id,q.amount_minor,(v.terms->>'period_days')::integer*q.cycle_count,(v.terms->>'grace_days')::integer,k,q.cycle_count,q.operation,q.entitlement_end,q.subscription_revision) RETURNING * INTO i;
 RETURN to_jsonb(i);
END $$;
-- Existing invoices retain their previous proof checks and renewal behavior.
DO $patch$ DECLARE def text;BEGIN
 def:=pg_get_functiondef('pg13_billing_verified(uuid,uuid,uuid,bigint,timestamptz)'::regprocedure);
 IF position('until_time:=CASE WHEN s.plan_version_id=i.plan_version_id' IN def)=0 THEN RAISE EXCEPTION 'unknown billing verifier';END IF;
 def:=replace(def,'until_time:=CASE WHEN s.plan_version_id=i.plan_version_id AND isfinite(s.paid_until) THEN greatest(now(),s.paid_until) ELSE now() END+make_interval(days=>i.period_days);',
 'IF i.billing_operation=''upgrade'' THEN
   IF s.revision<>i.subscription_revision OR i.entitlement_end<=now() THEN RAISE EXCEPTION ''subscription changed; review verified payment'' USING ERRCODE=''40001'';END IF;
   until_time:=i.entitlement_end;
  ELSE
   until_time:=CASE WHEN (s.plan_version_id=i.plan_version_id OR (i.billing_operation=''renew'' AND s.plan_id=i.plan_id)) AND isfinite(s.paid_until) THEN greatest(now(),s.paid_until) ELSE now() END+make_interval(days=>i.period_days);
  END IF;');
 EXECUTE def;
 -- A paid scheduled plan requires payment. A scheduled free grant needs none.
 def:=pg_get_functiondef('payment_plan_effective(uuid)'::regprocedure);
 def:=replace(def,'SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w;',
 'PERFORM pg_advisory_xact_lock(hashtextextended(''platform-billing:''||w::text,0));
 SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w FOR UPDATE;
 IF s.paid_until<=now() AND s.next_version_id IS NOT NULL AND EXISTS(SELECT 1 FROM payment_plan_versions nv WHERE nv.id=s.next_version_id AND nv.terms->>''kind''=''free'') THEN
  SELECT * INTO v FROM payment_plan_versions WHERE id=s.next_version_id;
  end_at:=CASE WHEN v.terms->>''free_days'' IS NULL THEN ''infinity''::timestamptz ELSE s.paid_until+make_interval(days=>(v.terms->>''free_days'')::integer) END;
  UPDATE pg13_subscriptions SET plan_id=v.plan_id,plan_version_id=v.id,started_at=s.paid_until,paid_until=end_at,grace_until=end_at,next_version_id=NULL,revision=revision+1 WHERE workspace_id=w;
  INSERT INTO payment_subscription_audit(workspace_id,action,before_value,after_value,reason) VALUES(w,''subscription.scheduled_free'',to_jsonb(s),to_jsonb(v),''Previously approved free downgrade reached its effective date'');
  SELECT * INTO s FROM pg13_subscriptions WHERE workspace_id=w;
 END IF;');
 EXECUTE def;
END $patch$;
CREATE OR REPLACE FUNCTION pg13_billing_read(w uuid,a uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE eff jsonb;BEGIN
 PERFORM pg13_actor(w,a,false);eff:=payment_plan_effective(w);
 RETURN jsonb_build_object('plans',payment_plan_public(),'invoices',coalesce((SELECT jsonb_agg(to_jsonb(i)||jsonb_build_object('plan_name',pv.terms->>'name','plan_name_bn',pv.terms->>'name_bn') ORDER BY i.created_at DESC) FROM pg13_platform_invoices i LEFT JOIN payment_plan_versions pv ON pv.id=i.plan_version_id WHERE i.workspace_id=w),'[]'),
 'subscription',(SELECT to_jsonb(s)||jsonb_build_object('state',CASE WHEN s.paid_until>now() THEN 'active' WHEN s.grace_until>now() THEN 'grace' ELSE 'expired' END) FROM pg13_subscriptions s WHERE workspace_id=w),
 'effective',eff||jsonb_build_object('terms_version',(SELECT version FROM payment_plan_versions WHERE id=(eff->>'version_id')::uuid)),
 'scheduled',(SELECT jsonb_build_object('plan_id',pv.plan_id,'version_id',pv.id,'terms',pv.terms,'starts_at',s.paid_until) FROM pg13_subscriptions s JOIN payment_plan_versions pv ON pv.id=s.next_version_id WHERE s.workspace_id=w));
END $$;
CREATE FUNCTION dashboard_billing_verified(w uuid,i uuid,p uuid,amount bigint,at_time timestamptz,method text,suffix text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE saved boolean;BEGIN
 saved:=pg13_billing_verified(w,i,p,amount,at_time);
 IF saved AND method IN ('bkash','nagad','rocket') THEN UPDATE pg13_platform_invoices SET paid_method=method,payer_suffix=CASE WHEN suffix~'^[0-9]{4}$' THEN suffix ELSE NULL END WHERE workspace_id=w AND id=i AND source_payment_id=p;END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION dashboard_billing_verified(uuid,uuid,uuid,bigint,timestamptz,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_billing_verified(uuid,uuid,uuid,bigint,timestamptz,text,text) TO ekmivo_financial_runtime;
REVOKE ALL ON FUNCTION dashboard_billing_change(uuid,uuid,text,boolean),dashboard_billing_quote(uuid,uuid,text,integer),dashboard_billing_issue(uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_billing_change(uuid,uuid,text,boolean),dashboard_billing_quote(uuid,uuid,text,integer),dashboard_billing_issue(uuid,uuid,uuid,text) TO ekmivo_financial_runtime;
COMMIT;
