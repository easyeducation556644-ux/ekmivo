BEGIN;
CREATE TABLE pg12_integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,environment text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('website','custom-bot','woocommerce','shopify')),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 120),
 origin text NOT NULL CHECK(origin ~ '^https://'),webhook_id uuid,
 status text NOT NULL DEFAULT 'configured' CHECK(status IN ('configured','disabled')),
 version bigint NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,environment,id),UNIQUE(workspace_id,environment,kind,origin),
 FOREIGN KEY(workspace_id,environment) REFERENCES financial_workspace_registry(workspace_id,environment),
 FOREIGN KEY(workspace_id,environment,webhook_id) REFERENCES pg08_endpoints(workspace_id,environment,id)
);
ALTER TABLE pg12_integrations ENABLE ROW LEVEL SECURITY;ALTER TABLE pg12_integrations FORCE ROW LEVEL SECURITY;
CREATE POLICY pg12_owner ON pg12_integrations TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON pg12_integrations FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE FUNCTION pg12_read(w uuid,e text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg06_scope(w,e);
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT i.*,jsonb_build_object('endpoint_configured',i.webhook_id IS NOT NULL,'endpoint_active',coalesce(ep.active,false),'rotation_pending',coalesce(ep.pending_secret IS NOT NULL,false),'delivered_events',(SELECT count(*) FROM pg08_deliveries d WHERE d.workspace_id=w AND d.environment=e AND d.endpoint_id=i.webhook_id AND d.status='delivered'),'failed_events',(SELECT count(*) FROM pg08_deliveries d WHERE d.workspace_id=w AND d.environment=e AND d.endpoint_id=i.webhook_id AND d.status='failed'),'latest_delivery_at',(SELECT max(d.completed_at) FROM pg08_deliveries d WHERE d.workspace_id=w AND d.environment=e AND d.endpoint_id=i.webhook_id)) AS diagnostics FROM pg12_integrations i LEFT JOIN pg08_endpoints ep ON ep.workspace_id=i.workspace_id AND ep.environment=i.environment AND ep.id=i.webhook_id WHERE i.workspace_id=w AND i.environment=e ORDER BY i.created_at DESC LIMIT 100)t),'[]'),
 'connection_definition','Configured is not a tested/live connector. Merchant uses scoped API keys and signed webhook consumer.',
 'receiving',pg09_read(w,e,'gateways',NULL,NULL));
END $$;
CREATE FUNCTION pg12_save(w uuid,e text,item uuid,kind text,label text,origin text,endpoint uuid,action text,expected bigint,actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE r pg12_integrations;BEGIN
 PERFORM pg06_scope(w,e);PERFORM pg_advisory_xact_lock(hashtextextended('pg12:'||w::text||e,0));
 IF item IS NULL THEN
  SELECT * INTO r FROM pg12_integrations WHERE workspace_id=w AND environment=e AND pg12_integrations.kind=pg12_save.kind AND pg12_integrations.origin=pg12_save.origin;
  IF FOUND THEN IF r.name<>label OR r.webhook_id IS DISTINCT FROM endpoint THEN RAISE EXCEPTION 'connection already exists with different configuration' USING ERRCODE='23505';END IF;RETURN to_jsonb(r);END IF;
  INSERT INTO pg12_integrations(workspace_id,environment,kind,name,origin,webhook_id) VALUES(w,e,kind,label,origin,endpoint) RETURNING * INTO r;
 ELSE
  SELECT * INTO r FROM pg12_integrations WHERE workspace_id=w AND environment=e AND id=item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'connection missing' USING ERRCODE='P0002';END IF;
  IF r.version<>expected OR action NOT IN ('disable','enable','edit') THEN RAISE EXCEPTION 'connection changed' USING ERRCODE='23505';END IF;
  IF action='edit' THEN
   IF kind NOT IN ('website','custom-bot','woocommerce','shopify') OR length(btrim(label)) NOT BETWEEN 2 AND 120 OR origin !~ '^https://' THEN RAISE EXCEPTION 'invalid configuration' USING ERRCODE='22023';END IF;
   UPDATE pg12_integrations SET kind=pg12_save.kind,name=label,origin=pg12_save.origin,webhook_id=endpoint,version=version+1,updated_at=now() WHERE id=r.id RETURNING * INTO r;
  ELSE
  UPDATE pg12_integrations SET status=CASE action WHEN 'disable' THEN 'disabled' ELSE 'configured' END,version=version+1,updated_at=now() WHERE id=r.id RETURNING * INTO r;
  END IF;
 END IF;
 INSERT INTO pg09_audit(workspace_id,environment,actor_id,resource,resource_id,action) VALUES(w,e,actor,'integrations',r.id,coalesce(action,'configure'));
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION pg12_read(uuid,text),pg12_save(uuid,text,uuid,text,text,text,uuid,text,bigint,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg12_read(uuid,text),pg12_save(uuid,text,uuid,text,text,text,uuid,text,bigint,uuid) TO ekmivo_finance_reader;
COMMIT;
