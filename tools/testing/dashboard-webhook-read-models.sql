-- Run ONLY on a disposable Neon child branch. All fictional fixtures roll back.
DO $test$
DECLARE w uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); intent uuid; second uuid;
 endpoint uuid; duplicate_endpoint uuid; manual_endpoint uuid; event uuid; default_event uuid;
 response jsonb; readback jsonb; n integer;
BEGIN
 BEGIN
  PERFORM financial_sync_workspace(w,'sandbox',1,true);
  PERFORM financial_sync_workspace(other,'sandbox',1,true);
  PERFORM set_config('ekmivo.workspace_id',w::text,true);
  PERFORM set_config('ekmivo.environment','sandbox',true);
  response:=pg05_create_intent(w,'sandbox','FICTIONAL-DASHBOARD-1',150000,30,
   'fictional-dashboard-payment-1',repeat('1',64),repeat('2',64));
  intent:=(response->>'id')::uuid;
  response:=pg05_create_intent(w,'sandbox','FICTIONAL-DASHBOARD-2',12500,30,
   'fictional-dashboard-payment-2',repeat('3',64),repeat('4',64));
  second:=(response->>'id')::uuid;
  endpoint:=pg63_bind_payment_endpoint(w,'sandbox',intent,'https://merchant.example/webhook',decode(repeat('01',48),'hex'));
  duplicate_endpoint:=pg63_bind_payment_endpoint(w,'sandbox',intent,'https://merchant.example/webhook',decode(repeat('02',48),'hex'));
  IF endpoint<>duplicate_endpoint THEN RAISE EXCEPTION 'ASSERT: retry duplicated endpoint';END IF;
  BEGIN
   PERFORM pg63_bind_payment_endpoint(w,'sandbox',intent,'https://changed.example/webhook',decode(repeat('01',48),'hex'));
   RAISE EXCEPTION 'ASSERT: changed retry accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
   PERFORM pg63_bind_payment_endpoint(other,'sandbox',intent,'https://merchant.example/webhook',decode(repeat('01',48),'hex'));
   RAISE EXCEPTION 'ASSERT: cross tenant binding accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM pg63_bind_payment_endpoint(w,'live',intent,'https://merchant.example/webhook',decode(repeat('01',48),'hex'));
   RAISE EXCEPTION 'ASSERT: cross realm binding accepted';
  EXCEPTION WHEN insufficient_privilege OR invalid_parameter_value THEN NULL; END;
  PERFORM pg62_store_intent_options(w,'sandbox',intent,'https://merchant.example/success','',
   'https://merchant.example/webhook','','','','{}');
  PERFORM pg62_store_intent_options(w,'sandbox',intent,'https://merchant.example/success','',
   'https://merchant.example/webhook','','','','{}');
  IF (SELECT count(*) FROM pg08_endpoints WHERE workspace_id=w AND auto_intent_id=intent)<>1 THEN RAISE EXCEPTION 'ASSERT: duplicate automatic endpoint';END IF;
  INSERT INTO pg08_endpoints(workspace_id,environment,url,secret) VALUES(w,'sandbox','https://legacy.example/webhook',decode(repeat('03',48),'hex')) RETURNING id INTO manual_endpoint;
  INSERT INTO pg07_events(workspace_id,environment,event_type,payload)
   VALUES(w,'sandbox','payment.expired',jsonb_build_object('data',jsonb_build_object('intent_id',intent))) RETURNING id INTO event;
  INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id)
   SELECT w,'sandbox',id,event FROM pg08_endpoints WHERE workspace_id=w;
  IF (SELECT count(*) FROM pg08_deliveries WHERE event_id=event)<>1 OR NOT EXISTS(SELECT 1 FROM pg08_deliveries WHERE event_id=event AND endpoint_id=endpoint) THEN RAISE EXCEPTION 'ASSERT: explicit callback did not select only its endpoint';END IF;
  INSERT INTO pg07_events(workspace_id,environment,event_type,payload)
   VALUES(w,'sandbox','payment.expired',jsonb_build_object('data',jsonb_build_object('intent_id',second))) RETURNING id INTO default_event;
  INSERT INTO pg08_deliveries(workspace_id,environment,endpoint_id,event_id)
   SELECT w,'sandbox',id,default_event FROM pg08_endpoints WHERE workspace_id=w;
  IF (SELECT count(*) FROM pg08_deliveries WHERE event_id=default_event)<>1 OR NOT EXISTS(SELECT 1 FROM pg08_deliveries WHERE event_id=default_event AND endpoint_id=manual_endpoint) THEN RAISE EXCEPTION 'ASSERT: default broadcast leaked into automatic endpoint';END IF;
  readback:=pg10_read(w,'sandbox','invoices',intent,NULL,NULL);
  IF jsonb_array_length(readback->'items')<>1 OR readback->'items'->0->'body'->>'source'<>'automatic_checkout' OR (readback->'items'->0->>'paid_minor')::bigint<>0 THEN RAISE EXCEPTION 'ASSERT: automatic unpaid invoice missing or fabricated paid';END IF;
  readback:=pg10_read(w,'sandbox','invoices',NULL,intent,NULL);
  IF NOT (readback ? 'items') THEN RAISE EXCEPTION 'ASSERT: automatic invoice cursor invalid';END IF;
  IF (SELECT count(*) FROM pg10_documents WHERE workspace_id=w)<>0 THEN RAISE EXCEPTION 'ASSERT: read model rewrote documents';END IF;
  IF has_table_privilege('ekmivo_finance_reader','pg64_document_catalog','SELECT') THEN RAISE EXCEPTION 'ASSERT: direct projection bypasses scope';END IF;
  IF has_table_privilege('ekmivo_finance_reader','pg62_intent_options','SELECT') THEN RAISE EXCEPTION 'ASSERT: options bypass scope';END IF;
  PERFORM set_config('ekmivo.workspace_id',other::text,true);
  BEGIN
   PERFORM pg10_read(w,'sandbox','invoices',intent,NULL,NULL);
   RAISE EXCEPTION 'ASSERT: cross tenant invoice read accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE EXCEPTION 'ROLLBACK_FICTIONAL_DASHBOARD_FIXTURES';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
  IF SQLERRM<>'ROLLBACK_FICTIONAL_DASHBOARD_FIXTURES' THEN RAISE; END IF;
 END;
END $test$;
