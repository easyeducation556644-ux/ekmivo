-- Financial databases: workspace account count and durable receipt count.
BEGIN;
DO $$ DECLARE definition text;BEGIN
 definition:=pg_get_functiondef('pg06_phone_list(uuid,text)'::regprocedure);
 IF position('receipt_count' IN definition)=0 THEN
  IF position('''model'',p.model' IN definition)=0 THEN RAISE EXCEPTION 'unknown phone read model';END IF;
  definition:=replace(definition,'''model'',p.model',
   '''account_count'',(SELECT count(*) FROM financial_receiving_accounts a LEFT JOIN pg06_account_configuration c ON c.account_id=a.id WHERE a.workspace_id=w AND a.environment=e AND c.disabled_at IS NULL),
    ''receipt_count'',(SELECT count(*) FROM pg06_phone_forwarded f WHERE f.workspace_id=w AND f.environment=e AND f.phone_id=p.id),
    ''model'',p.model');
  EXECUTE definition;
 END IF;
END $$;
COMMIT;
