-- Control DB only; no money/receiving secrets copied here.
BEGIN;
CREATE FUNCTION pg10_public_business(w uuid,e text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT b.name FROM workspaces b JOIN workspace_environments v ON v.workspace_id=b.id AND v.environment=e AND v.status='active'
 JOIN workspace_product_access p ON p.workspace_id=b.id AND p.product='payments' AND p.enabled WHERE b.id=w AND e IN ('sandbox','live') LIMIT 1
$$;
REVOKE ALL ON FUNCTION pg10_public_business(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg10_public_business(uuid,text) TO ekmivo_financial_runtime;
COMMIT;
