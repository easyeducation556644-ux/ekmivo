-- Control database. Theme state is independent from temporary preview controls.
BEGIN;
CREATE TABLE checkout_theme_settings(workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'),version bigint NOT NULL DEFAULT 1,updated_by uuid REFERENCES app_users(id),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE checkout_theme_logos(digest text PRIMARY KEY CHECK(digest~'^[a-f0-9]{64}$'),png bytea NOT NULL CHECK(octet_length(png)<=1048576),created_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['checkout_theme_settings','checkout_theme_logos'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_financial_runtime,ekmivo_financial_projection',t);
 END LOOP;
END $$;
CREATE FUNCTION dashboard_checkout_theme_read(w uuid,a uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 PERFORM pg13_actor(w,a,false);
 RETURN coalesce((SELECT jsonb_build_object('body',body,'version',version) FROM checkout_theme_settings WHERE workspace_id=w),jsonb_build_object('body',NULL,'version',0));
END $$;
CREATE FUNCTION dashboard_checkout_theme_write(w uuid,a uuid,b jsonb,v bigint,logo_hash text DEFAULT NULL,logo_png bytea DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE old_version bigint;BEGIN
 PERFORM pg13_actor(w,a,true);
 IF pg13_capability_override(w,a,'workspace:settings') IS FALSE THEN RAISE EXCEPTION 'access denied' USING ERRCODE='42501';END IF;
 IF b->>'theme' NOT IN ('official','receipt','studio','sheet','hero','rail','journal','dial','night') OR length(b->'store'->>'name') NOT BETWEEN 1 AND 40 OR jsonb_typeof(b->'info')<>'boolean' OR (b->'store'->>'size')::integer NOT BETWEEN 24 AND 96 THEN RAISE EXCEPTION 'invalid theme settings' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('checkout-theme:'||w::text,0));
 SELECT version INTO old_version FROM checkout_theme_settings WHERE workspace_id=w;
 IF coalesce(old_version,0)<>v THEN RAISE EXCEPTION 'theme changed' USING ERRCODE='23505';END IF;
 IF logo_hash IS NOT NULL THEN
  IF logo_png IS NULL OR encode(digest(logo_png,'sha256'),'hex')<>logo_hash THEN RAISE EXCEPTION 'invalid logo';END IF;
  INSERT INTO checkout_theme_logos VALUES(logo_hash,logo_png,now()) ON CONFLICT(digest) DO NOTHING;
 END IF;
 INSERT INTO checkout_theme_settings VALUES(w,b,1,a,now()) ON CONFLICT(workspace_id) DO UPDATE SET body=excluded.body,version=checkout_theme_settings.version+1,updated_by=a,updated_at=now();
 INSERT INTO pg13_control_audit(workspace_id,actor_id,action,resource_id) VALUES(w,a,'checkout-theme.saved',w);
 RETURN dashboard_checkout_theme_read(w,a);
END $$;
CREATE FUNCTION dashboard_checkout_logo(d text) RETURNS bytea LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT png FROM checkout_theme_logos WHERE digest=d AND EXISTS(SELECT 1 FROM checkout_theme_settings s WHERE s.body->'store'->>'logo'='/api/checkout-logos/'||d) $$;
CREATE OR REPLACE FUNCTION pg13_public_checkout(w uuid,e text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('merchant_name',coalesce(t.body->'store'->>'name',b.name),'brand',jsonb_strip_nulls(jsonb_build_object(
 'logo_url',s.body->>'logo_url','title',s.body->>'checkout_title','description',s.body->>'checkout_description',
 'support_url',s.body->>'support_url','support_email',s.body->>'support_email','legal_url',s.body->>'legal_url','locale',s.body->>'locale','checkout_theme',t.body::text)))
 FROM workspaces b JOIN workspace_environments v ON v.workspace_id=b.id AND v.environment=e AND v.status='active'
 JOIN workspace_product_access p ON p.workspace_id=b.id AND p.product='payments' AND p.enabled
 LEFT JOIN pg13_business_settings s ON s.workspace_id=b.id LEFT JOIN checkout_theme_settings t ON t.workspace_id=b.id
 WHERE b.id=w AND e IN ('live','sandbox')
$$;
REVOKE ALL ON FUNCTION dashboard_checkout_theme_read(uuid,uuid),dashboard_checkout_theme_write(uuid,uuid,jsonb,bigint,text,bytea),dashboard_checkout_logo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_checkout_theme_read(uuid,uuid),dashboard_checkout_theme_write(uuid,uuid,jsonb,bigint,text,bytea),dashboard_checkout_logo(text) TO ekmivo_financial_runtime;
COMMIT;
