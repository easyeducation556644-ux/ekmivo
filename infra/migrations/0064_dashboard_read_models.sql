-- Read-only dashboard projections. No payment or historical document rewrite.
BEGIN;
CREATE VIEW pg64_document_catalog AS
 SELECT d.* FROM pg10_documents d
 UNION ALL
 SELECT i.id,i.workspace_id,i.environment,'invoices'::text,
 'INV-'||i.id::text,
 CASE WHEN pg05_intent_state(i.workspace_id,i.environment,i.id)='cancelled' THEN 'cancelled' ELSE 'issued' END,
 1::bigint,
 jsonb_build_object('source','automatic_checkout','description',i.merchant_reference,
  'name',coalesce(o.customer_name,''),'email',coalesce(o.customer_email,''),
  'phone',coalesce(o.customer_phone,''),'due_at',i.expires_at,
  'items',jsonb_build_array(jsonb_build_object('title',i.merchant_reference,'quantity',1,'unit_amount_minor',i.amount_minor))),
 i.amount_minor,(SELECT ('64'||substr(md5(a.workspace_id::text||':'||a.environment||':'||a.payer_hmac),3))::uuid FROM payment_attempts a JOIN financial_payments p ON p.attempt_id=a.id AND p.workspace_id=a.workspace_id AND p.environment=a.environment WHERE a.intent_id=i.id AND a.workspace_id=i.workspace_id AND a.environment=i.environment ORDER BY p.verified_at LIMIT 1),NULL::text,NULL::text,NULL::jsonb,i.created_at,i.created_at
 FROM payment_intents i
 LEFT JOIN pg62_intent_options o ON o.intent_id=i.id AND o.workspace_id=i.workspace_id AND o.environment=i.environment
 WHERE NOT EXISTS(SELECT 1 FROM pg10_document_intents l JOIN pg10_documents d ON d.id=l.document_id AND d.workspace_id=l.workspace_id AND d.environment=l.environment
 WHERE l.intent_id=i.id AND l.workspace_id=i.workspace_id AND l.environment=i.environment AND d.kind='invoices')
 UNION ALL
 SELECT ('64'||substr(md5(a.workspace_id::text||':'||a.environment||':'||a.payer_hmac),3))::uuid,
 a.workspace_id,a.environment,'customers'::text,
 'PAYER-'||substr(md5(a.workspace_id::text||':'||a.environment||':'||a.payer_hmac),1,20),
 'active'::text,1::bigint,
 jsonb_build_object('source','checkout_payer','name','Payer · ••••'||max(a.payer_suffix),
 'phone','••••'||max(a.payer_suffix),'payment_count',count(*),'verified_minor',sum(p.verified_amount_minor),
 'last_payment_at',max(p.verified_at)),
 NULL::bigint,NULL::uuid,NULL::text,NULL::text,NULL::jsonb,min(p.verified_at),max(p.verified_at)
 FROM payment_attempts a JOIN financial_payments p ON p.attempt_id=a.id AND p.workspace_id=a.workspace_id AND p.environment=a.environment
 GROUP BY a.workspace_id,a.environment,a.payer_hmac;
REVOKE ALL ON pg64_document_catalog FROM PUBLIC,ekmivo_finance_reader,ekmivo_financial_worker;
CREATE OR REPLACE FUNCTION pg10_read(w uuid,e text,res text,item uuid,after_id uuid,search text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg06_scope(w,e);IF after_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg64_document_catalog WHERE workspace_id=w AND environment=e AND kind=res AND id=after_id) THEN RAISE EXCEPTION 'invalid document cursor' USING ERRCODE='22023';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM (
 SELECT d.id,d.kind,d.reference,d.status,d.version,CASE WHEN item IS NOT NULL THEN d.body ELSE jsonb_strip_nulls(jsonb_build_object('source',d.body->'source','payment_count',d.body->'payment_count','verified_minor',d.body->'verified_minor','last_payment_at',d.body->'last_payment_at','name',d.body->'name','description',d.body->'description','email',d.body->'email','phone',d.body->'phone','due_at',d.body->'due_at','expires_at',d.body->'expires_at')) END body,d.amount_minor,d.customer_id,d.capability_key,CASE WHEN item IS NOT NULL THEN d.issued_snapshot END issued_snapshot,d.created_at,d.updated_at,
 CASE WHEN d.body->>'source'='automatic_checkout' THEN (SELECT coalesce(sum(a.amount_minor),0) FROM financial_allocations a WHERE a.workspace_id=w AND a.environment=e AND a.intent_id=d.id) ELSE coalesce((SELECT sum(a.amount_minor) FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=l.workspace_id AND a.environment=l.environment WHERE l.document_id=d.id),0) END paid_minor,
 CASE WHEN item IS NULL THEN '[]'::jsonb WHEN d.body->>'source'='automatic_checkout' THEN jsonb_build_array(jsonb_build_object('intent_id',d.id,'state',pg05_intent_state(w,e,d.id))) ELSE (SELECT coalesce(jsonb_agg(jsonb_build_object('intent_id',l.intent_id,'state',pg05_intent_state(w,e,l.intent_id))), '[]') FROM pg10_document_intents l WHERE l.document_id=d.id) END payments,
 CASE WHEN item IS NULL THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.version),'[]') FROM pg10_versions v WHERE v.document_id=d.id) END history
 FROM pg64_document_catalog d WHERE d.workspace_id=w AND d.environment=e AND d.kind=res AND (item IS NULL OR d.id=item)
 AND (search IS NULL OR d.reference ILIKE '%'||search||'%' OR d.body->>'name' ILIKE '%'||search||'%')
 AND (after_id IS NULL OR (d.created_at,d.id)<(SELECT x.created_at,x.id FROM pg64_document_catalog x WHERE x.workspace_id=w AND x.environment=e AND x.kind=res AND x.id=after_id))
 ORDER BY d.created_at DESC,d.id DESC LIMIT 50) t;
 RETURN jsonb_build_object('items',result,'next_cursor',CASE WHEN jsonb_array_length(result)=50 THEN result->49->>'id' ELSE NULL END);
END $$;



CREATE OR REPLACE FUNCTION pg10_customer_activity(w uuid,e text,customer uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg06_scope(w,e);
 IF NOT EXISTS(SELECT 1 FROM pg64_document_catalog WHERE workspace_id=w AND environment=e AND id=customer AND kind='customers') THEN RAISE EXCEPTION 'customer missing' USING ERRCODE='P0002';END IF;
 RETURN jsonb_build_object('invoices',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'reference',d.reference,'status',d.status,'amount_minor',d.amount_minor,
 'paid_minor',CASE WHEN d.body->>'source'='automatic_checkout' THEN (SELECT coalesce(sum(a.amount_minor),0) FROM financial_allocations a WHERE a.workspace_id=w AND a.environment=e AND a.intent_id=d.id)
 ELSE coalesce((SELECT sum(a.amount_minor) FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=w AND a.environment=e WHERE l.document_id=d.id AND l.workspace_id=w AND l.environment=e),0) END))
 FROM pg64_document_catalog d WHERE d.workspace_id=w AND d.environment=e AND d.customer_id=customer AND d.kind='invoices'),'[]'::jsonb));
END $$;

-- Ciphertext reaches only the authenticated Go boundary, never a browser.
CREATE FUNCTION pg64_sms_evidence(w uuid,e text,ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg06_scope(w,e);
 IF cardinality(ids)>50 THEN RAISE EXCEPTION 'bounded receipt page required' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',f.id,'phone_id',f.phone_id,'event_id',f.event_id,
 'sender',f.sender,'device_name',p.name,'cipher_b64',encode(f.ciphertext,'base64')))
 FROM pg06_phone_forwarded f JOIN pg06_phones p ON p.id=f.phone_id AND p.workspace_id=w AND p.environment=e
 WHERE f.workspace_id=w AND f.environment=e AND f.id=ANY(ids)),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION pg64_sms_evidence(uuid,text,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pg64_sms_evidence(uuid,text,uuid[]) TO ekmivo_finance_reader;
COMMIT;
