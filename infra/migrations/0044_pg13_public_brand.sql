BEGIN;
CREATE FUNCTION pg13_public_checkout(w uuid,e text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('merchant_name',b.name,'brand',jsonb_strip_nulls(jsonb_build_object(
 'logo_url',s.body->>'logo_url','title',s.body->>'checkout_title','description',s.body->>'checkout_description',
 'support_url',s.body->>'support_url','support_email',s.body->>'support_email','legal_url',s.body->>'legal_url','locale',s.body->>'locale')))
 FROM workspaces b JOIN workspace_environments v ON v.workspace_id=b.id AND v.environment=e AND v.status='active'
 JOIN workspace_product_access p ON p.workspace_id=b.id AND p.product='payments' AND p.enabled
 LEFT JOIN pg13_business_settings s ON s.workspace_id=b.id
 WHERE b.id=w AND e IN ('live','sandbox')
$$;
REVOKE ALL ON FUNCTION pg13_public_checkout(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg13_public_checkout(uuid,text) TO ekmivo_financial_runtime;
COMMIT;
