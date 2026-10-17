-- Financial databases only. Preserve immutable financial records and accepted intents.
BEGIN;
DO $migration$
DECLARE definition text;
BEGIN
 PERFORM 1 FROM financial_realm;
 definition:=pg_get_functiondef('pg10_write(uuid,text,text,uuid,text,jsonb,text,text,text,uuid)'::regprocedure);
 IF position('dashboard link controls v1' IN definition)=0 THEN
  IF position('ELSIF action=''archive'' AND res=''payment-links''' IN definition)=0 THEN
   RAISE EXCEPTION 'Unknown document writer; inspect before applying migration';
  END IF;
  definition:=replace(definition,'action IN (''publish'',''archive'',''issue'',''cancel'')','action IN (''publish'',''archive'',''issue'',''cancel'',''disable'',''delete'')');
  definition:=replace(definition,'d.status IN (''draft'',''active'')','d.status IN (''draft'',''active'',''disabled'')');
  definition:=replace(definition,'ELSIF action=''archive'' AND res=''payment-links''',
   '-- dashboard link controls v1'||chr(10)||
   'ELSIF action IN (''disable'',''delete'') AND res=''payment-links'' AND d.status<>''deleted'' THEN
    UPDATE pg10_documents SET status=CASE WHEN action=''delete'' THEN ''deleted'' ELSE ''disabled'' END,version=version+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;
    ELSIF action=''archive'' AND res=''payment-links''');
  -- Archived/deleted links cannot be edited back into an enabled state.
  definition:=replace(definition,'IF action=''edit'' AND ((res=''invoices''',
   'IF res=''payment-links'' AND d.status=''deleted'' THEN RAISE EXCEPTION ''deleted link is immutable'' USING ERRCODE=''23514'';END IF;
    IF action=''edit'' AND ((res=''invoices''');
  EXECUTE definition;
 END IF;
END $migration$;
COMMIT;
