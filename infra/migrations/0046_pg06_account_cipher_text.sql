-- Additive repair: display_suffix is char(4), while the API function returns text.
BEGIN;
CREATE OR REPLACE FUNCTION pg06_phone_account_cipher(w uuid,e text) RETURNS TABLE(
 account_id uuid,method text,display_suffix text,account_label text,number_cipher bytea,disabled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg06_scope(w,e);
 RETURN QUERY SELECT a.id,a.method,a.display_suffix::text,c.label,c.number_cipher,c.disabled_at
 FROM financial_receiving_accounts a JOIN pg06_account_configuration c ON c.account_id=a.id
 WHERE a.workspace_id=w AND a.environment=e;
END $$;
REVOKE ALL ON FUNCTION pg06_phone_account_cipher(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg06_phone_account_cipher(uuid,text) TO ekmivo_finance_reader;
COMMIT;
