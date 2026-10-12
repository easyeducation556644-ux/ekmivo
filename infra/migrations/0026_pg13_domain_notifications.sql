BEGIN;
CREATE FUNCTION pg13_domain_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF NEW.event_type='payment.verified' THEN INSERT INTO pg13_notifications(workspace_id,environment,type,resource_id,body) VALUES(NEW.workspace_id,NEW.environment,NEW.event_type,NEW.payment_id,jsonb_build_object('payment_id',NEW.payment_id,'amount_minor',NEW.payload->'data'->'amount_minor'));END IF;RETURN NEW;
END $$;
CREATE TRIGGER pg13_domain_notice AFTER INSERT ON pg07_events FOR EACH ROW EXECUTE FUNCTION pg13_domain_notification();
CREATE UNIQUE INDEX pg10_invoice_paid_once ON pg07_events((payload->'data'->>'invoice_id')) WHERE event_type='invoice.paid';
CREATE FUNCTION pg10_invoice_paid_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE d pg10_documents;paid bigint;BEGIN
 SELECT doc.* INTO d FROM pg10_document_intents l JOIN pg10_documents doc ON doc.id=l.document_id WHERE l.workspace_id=NEW.workspace_id AND l.environment=NEW.environment AND l.intent_id=NEW.intent_id AND doc.kind='invoices';
 IF d.id IS NULL THEN RETURN NEW;END IF;PERFORM pg_advisory_xact_lock(hashtextextended(d.id::text||':invoice',0));
 SELECT coalesce(sum(a.amount_minor),0) INTO paid FROM pg10_document_intents l JOIN financial_allocations a ON a.intent_id=l.intent_id AND a.workspace_id=l.workspace_id AND a.environment=l.environment WHERE l.document_id=d.id;
 IF paid>=d.amount_minor AND NOT EXISTS(SELECT 1 FROM pg07_events WHERE event_type='invoice.paid' AND payload->'data'->>'invoice_id'=d.id::text) THEN
  PERFORM pg11_event(d.workspace_id,d.environment,NEW.payment_id,'invoice.paid',jsonb_build_object('invoice_id',d.id,'reference',d.reference,'amount_minor',d.amount_minor,'currency','BDT','version',d.version));
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER pg10_invoice_paid AFTER INSERT ON financial_allocations FOR EACH ROW EXECUTE FUNCTION pg10_invoice_paid_event();
REVOKE ALL ON FUNCTION pg13_domain_notification(),pg10_invoice_paid_event() FROM PUBLIC;
COMMIT;
