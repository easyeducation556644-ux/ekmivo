-- Control plane: shared membership/support/settings; no merchant funds stored.
BEGIN;
CREATE TABLE pg13_business_settings(workspace_id uuid PRIMARY KEY REFERENCES workspaces(id),body jsonb NOT NULL DEFAULT '{}',version bigint NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE pg13_invites(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id),email text NOT NULL,role text NOT NULL CHECK(role IN ('admin','editor','viewer')),token_digest text NOT NULL UNIQUE,expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',revoked_at timestamptz,accepted_at timestamptz,created_by uuid NOT NULL REFERENCES app_users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX pg13_one_pending_invite ON pg13_invites(workspace_id,email) WHERE revoked_at IS NULL AND accepted_at IS NULL;
CREATE TABLE pg13_support(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id),actor_id uuid NOT NULL REFERENCES app_users(id),subject text NOT NULL CHECK(length(subject) BETWEEN 3 AND 160),message text NOT NULL CHECK(length(message) BETWEEN 10 AND 4000),status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','resolved')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE pg13_control_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id),actor_id uuid NOT NULL REFERENCES app_users(id),action text NOT NULL,resource_id uuid,created_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['pg13_business_settings','pg13_invites','pg13_support','pg13_control_audit'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);EXECUTE format('CREATE POLICY %I ON %I TO %I USING(true) WITH CHECK(true)',t||'_owner',t,current_user);EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,ekmivo_financial_runtime',t);
 END LOOP;END $$;
CREATE FUNCTION pg13_actor(w uuid,a uuid,manage boolean) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE role text;BEGIN
 SELECT m.role INTO role FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w AND m.user_id=a AND u.disabled_at IS NULL;
 IF role IS NULL OR (manage AND role NOT IN ('owner','admin')) THEN RAISE EXCEPTION 'workspace access denied' USING ERRCODE='42501';END IF;RETURN role;
END $$;
CREATE FUNCTION pg13_workspace_read(w uuid,a uuid,resource text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE role text;BEGIN
 role:=pg13_actor(w,a,false);
 IF resource='team' THEN RETURN jsonb_build_object('members',coalesce((SELECT jsonb_agg(jsonb_build_object('id',u.id,'name',u.display_name,'email',CASE WHEN role IN ('owner','admin') OR u.id=a THEN u.email END,'role',m.role,'joined_at',m.joined_at)) FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w),'[]'),'invitations',CASE WHEN role IN ('owner','admin') THEN coalesce((SELECT jsonb_agg(to_jsonb(i)-'token_digest') FROM pg13_invites i WHERE workspace_id=w AND accepted_at IS NULL AND revoked_at IS NULL),'[]') ELSE '[]'::jsonb END);
 ELSIF resource='settings' THEN RETURN coalesce((SELECT jsonb_build_object('body',body,'version',version,'updated_at',updated_at) FROM pg13_business_settings WHERE workspace_id=w),'{"body":{},"version":0}'::jsonb);
 ELSIF resource='help' THEN RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM(SELECT * FROM pg13_support WHERE workspace_id=w AND(actor_id=a OR role IN ('owner','admin')) ORDER BY created_at DESC LIMIT 100)s),'[]'));
 ELSE RAISE EXCEPTION 'unknown workspace resource' USING ERRCODE='22023';END IF;
END $$;
CREATE FUNCTION pg13_workspace_write(w uuid,a uuid,resource text,b jsonb,target uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE role text;id uuid;current_version bigint;target_role text;BEGIN
 role:=pg13_actor(w,a,resource<>'help');PERFORM pg_advisory_xact_lock(hashtextextended('pg13:control:'||w::text,0));
 IF resource='settings' THEN
  INSERT INTO pg13_business_settings(workspace_id) VALUES(w) ON CONFLICT DO NOTHING;
  SELECT s.version INTO current_version FROM pg13_business_settings s WHERE workspace_id=w FOR UPDATE;
  IF coalesce((b->>'expected_version')::bigint,0)<>current_version AND NOT(current_version=1 AND coalesce((b->>'expected_version')::bigint,0)=0) THEN RAISE EXCEPTION 'settings changed' USING ERRCODE='23505';END IF;
  UPDATE pg13_business_settings SET body=b->'body',version=pg13_business_settings.version+1,updated_at=now() WHERE workspace_id=w;
  IF length(btrim(b->'body'->>'name')) BETWEEN 2 AND 100 THEN UPDATE workspaces SET name=b->'body'->>'name',updated_at=now() WHERE workspaces.id=w;END IF;
 ELSIF resource='help' THEN INSERT INTO pg13_support(workspace_id,actor_id,subject,message) VALUES(w,a,b->>'subject',b->>'message') RETURNING pg13_support.id INTO id;
 ELSIF resource='invite' THEN
  IF b->>'role' NOT IN ('admin','editor','viewer') OR (role='admin' AND b->>'role'='admin') THEN RAISE EXCEPTION 'invite role forbidden' USING ERRCODE='42501';END IF;
  INSERT INTO pg13_invites(workspace_id,email,role,token_digest,created_by) VALUES(w,b->>'email',b->>'role',b->>'token_digest',a) RETURNING pg13_invites.id INTO id;
 ELSIF resource='revoke-invite' THEN
  UPDATE pg13_invites SET revoked_at=now() WHERE workspace_id=w AND pg13_invites.id=target AND accepted_at IS NULL AND revoked_at IS NULL RETURNING pg13_invites.id INTO id;
  IF id IS NULL THEN RAISE EXCEPTION 'invite missing' USING ERRCODE='P0002';END IF;
 ELSIF resource IN ('remove-member','change-role') THEN
  SELECT m.role INTO target_role FROM workspace_members m WHERE workspace_id=w AND user_id=target FOR UPDATE;
  IF target_role IS NULL THEN RAISE EXCEPTION 'member missing' USING ERRCODE='P0002';END IF;
  IF role<>'owner' AND(target_role IN ('owner','admin') OR b->>'role' IN ('owner','admin')) THEN RAISE EXCEPTION 'owner required' USING ERRCODE='42501';END IF;
  IF target_role='owner' AND (SELECT count(*) FROM workspace_members WHERE workspace_id=w AND workspace_members.role='owner')<=1 THEN RAISE EXCEPTION 'last owner protected' USING ERRCODE='23514';END IF;
  IF resource='remove-member' THEN DELETE FROM workspace_members WHERE workspace_id=w AND user_id=target;
  ELSE IF b->>'role' NOT IN ('owner','admin','editor','viewer') THEN RAISE EXCEPTION 'invalid role' USING ERRCODE='22023';END IF;UPDATE workspace_members SET role=b->>'role' WHERE workspace_id=w AND user_id=target;END IF;id:=target;
 ELSE RAISE EXCEPTION 'unknown workspace action' USING ERRCODE='22023';END IF;
 INSERT INTO pg13_control_audit(workspace_id,actor_id,action,resource_id) VALUES(w,a,resource,id);
 RETURN jsonb_build_object('id',id,'saved',true);
END $$;
CREATE FUNCTION pg13_invite_accept(a uuid,cap text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE i pg13_invites;email text;verified timestamptz;BEGIN
 SELECT * INTO i FROM pg13_invites WHERE token_digest=cap;
 IF i.id IS NULL THEN RAISE EXCEPTION 'invite unavailable' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg13:control:'||i.workspace_id::text,0));
 SELECT * INTO i FROM pg13_invites WHERE token_digest=cap FOR UPDATE;
 SELECT u.email,u.email_verified_at INTO email,verified FROM app_users u WHERE id=a AND disabled_at IS NULL;
 IF i.id IS NULL OR i.email IS DISTINCT FROM email OR verified IS NULL OR i.expires_at<=now() OR i.revoked_at IS NOT NULL OR i.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite unavailable' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pg13:control:'||i.workspace_id::text,0));
 INSERT INTO workspace_members(workspace_id,user_id,role) VALUES(i.workspace_id,a,i.role) ON CONFLICT(workspace_id,user_id) DO NOTHING;
 UPDATE pg13_invites SET accepted_at=now() WHERE id=i.id;INSERT INTO pg13_control_audit(workspace_id,actor_id,action,resource_id) VALUES(i.workspace_id,a,'invite-accepted',i.id);RETURN i.workspace_id;
END $$;
REVOKE ALL ON FUNCTION pg13_actor(uuid,uuid,boolean),pg13_workspace_read(uuid,uuid,text),pg13_workspace_write(uuid,uuid,text,jsonb,uuid),pg13_invite_accept(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_workspace_read(uuid,uuid,text),pg13_workspace_write(uuid,uuid,text,jsonb,uuid),pg13_invite_accept(uuid,text) TO ekmivo_financial_runtime;
COMMIT;
