-- Financial databases. Contact details are never payment proof or payer identity.
BEGIN;
CREATE TABLE checkout_customer_details(workspace_id uuid NOT NULL,environment text NOT NULL,intent_id uuid NOT NULL,body jsonb NOT NULL CHECK(jsonb_typeof(body)='object' AND pg_column_size(body)<=12288),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(workspace_id,environment,intent_id),FOREIGN KEY(workspace_id,environment,intent_id) REFERENCES payment_intents(workspace_id,environment,id));
ALTER TABLE checkout_customer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_customer_details FORCE ROW LEVEL SECURITY;
CREATE POLICY checkout_customer_details_owner ON checkout_customer_details TO CURRENT_USER USING(true) WITH CHECK(true);
REVOKE ALL ON checkout_customer_details FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker,ekmivo_financial_runtime;
CREATE FUNCTION pg75_checkout_details(cap text,b jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t pg05_checkout_tokens;old jsonb;BEGIN
 SELECT * INTO t FROM pg05_checkout_tokens WHERE token_digest=cap AND environment=(SELECT environment FROM financial_realm WHERE singleton);
 IF t.intent_id IS NULL OR jsonb_typeof(b)<>'object' OR pg_column_size(b)>12288 THEN RAISE EXCEPTION 'invalid contact details' USING ERRCODE='22023';END IF;
 INSERT INTO checkout_customer_details(workspace_id,environment,intent_id,body) VALUES(t.workspace_id,t.environment,t.intent_id,b) ON CONFLICT DO NOTHING;
 SELECT body INTO old FROM checkout_customer_details WHERE workspace_id=t.workspace_id AND environment=t.environment AND intent_id=t.intent_id;
 IF old<>b THEN RAISE EXCEPTION 'contact details already submitted' USING ERRCODE='23505';END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION pg75_checkout_details(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg75_checkout_details(text,jsonb) TO ekmivo_finance_reader,ekmivo_financial_runtime;
COMMIT;
