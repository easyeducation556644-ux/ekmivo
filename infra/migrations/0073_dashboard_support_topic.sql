-- Control database: preserve support bodies/replies while recording the topic.
BEGIN;
ALTER TABLE pg13_support ADD COLUMN topic text NOT NULL DEFAULT 'other' CHECK(topic IN ('payments','sms','refunds','account','other'));
DO $$ DECLARE definition text;BEGIN
 definition:=pg_get_functiondef('pg13_workspace_write(uuid,uuid,text,jsonb,uuid)'::regprocedure);
 IF position('INSERT INTO pg13_support(workspace_id,actor_id,subject,message)' IN definition)=0 THEN RAISE EXCEPTION 'unknown support writer';END IF;
 definition:=replace(definition,'INSERT INTO pg13_support(workspace_id,actor_id,subject,message) VALUES(w,a,b->>''subject'',b->>''message'')','INSERT INTO pg13_support(workspace_id,actor_id,subject,message,topic) VALUES(w,a,b->>''subject'',b->>''message'',coalesce(b->>''topic'',''other''))');
 EXECUTE definition;
END $$;
COMMIT;
