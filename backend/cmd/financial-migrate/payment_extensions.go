package main

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

// Runs inside the existing reviewed migration coordinator. Each independently
// provisioned realm is checked before any additive DDL is executed.
func migratePaymentExtensions(ctx context.Context, raw, realm, dir string) error {
	pool, err := pgxpool.New(ctx, raw)
	if err != nil {
		return errors.New("extension migration connection unavailable")
	}
	defer pool.Close()
	var owner bool
	var actual string
	if realm == "control" {
		var auth, finance bool
		err = pool.QueryRow(ctx, `SELECT current_user=pg_get_userbyid(c.relowner),to_regclass('auth_sessions') IS NOT NULL,to_regclass('financial_realm') IS NOT NULL FROM pg_class c WHERE c.oid='auth_sessions'::regclass`).Scan(&owner, &auth, &finance)
		if err != nil || !owner || !auth || finance {
			return errors.New("control owner boundary failed")
		}
	} else {
		err = pool.QueryRow(ctx, `SELECT r.environment,current_user=pg_get_userbyid(c.relowner) FROM financial_realm r JOIN pg_class c ON c.oid='financial_realm'::regclass`).Scan(&actual, &owner)
		if err != nil || !owner || actual != realm {
			return errors.New("financial owner/realm boundary failed")
		}
	}
	entries := []struct{ name, marker string }{
		{"0016_pg10_documents.sql", "to_regclass('pg10_documents') IS NOT NULL"},
		{"0017_pg11_operations.sql", "to_regclass('pg11_refunds') IS NOT NULL"},
		{"0018_pg10_live_checkout.sql", "to_regprocedure('pg10_checkout_view(text)') IS NOT NULL"},
		{"0020_pg10_private_files.sql", "to_regprocedure('pg10_file_read(uuid,text,uuid)') IS NOT NULL"},
		{"0021_pg12_integrations.sql", "to_regclass('pg12_integrations') IS NOT NULL"},
		{"0022_pg13_reporting.sql", "to_regprocedure('pg13_reports(uuid,text,timestamptz,timestamptz,uuid)') IS NOT NULL"},
		{"0025_pg13_platform_payment.sql", "to_regprocedure('pg13_platform_payment(text)') IS NOT NULL"},
		{"0026_pg13_domain_notifications.sql", "to_regprocedure('pg13_domain_notification()') IS NOT NULL"},
		{"0027_pg10_async_exports.sql", "to_regclass('pg10_export_jobs') IS NOT NULL"},
		{"0029_pg10_linked_invoice.sql", "to_regprocedure('pg10_invoice_intent(uuid,text,uuid,text,integer,text,text,text)') IS NOT NULL"},
		{"0030_pg15_worker_health.sql", "to_regprocedure('pg15_health()') IS NOT NULL"}, {"0033_pg15_retention.sql", "to_regprocedure('pg15_file_claim()') IS NOT NULL"}, {"0035_pg10_document_policies.sql", "to_regprocedure('pg10_return_allowed(uuid,text,text)') IS NOT NULL"}, {"0036_pg10_invoice_delivery.sql", "to_regclass('pg10_invoice_notices') IS NOT NULL"}, {"0037_pg14_sandbox_tools.sql", "to_regclass('pg14_sandbox_runs') IS NOT NULL"}, {"0038_pg11_domain_events.sql", "to_regprocedure('pg11_emit_expiry()') IS NOT NULL"}, {"0040_pg15_receipt_retention.sql", "to_regprocedure('pg15_prune_receipt_evidence()') IS NOT NULL"}, {"0041_pg10_upload_recovery.sql", "to_regprocedure('pg15_orphan_claim()') IS NOT NULL"}, {"0042_pg11_paged_operations.sql", "to_regprocedure('pg11_page(uuid,text,text,uuid,uuid,text,uuid)') IS NOT NULL"},
	}
	if realm == "control" {
		entries = []struct{ name, marker string }{{"0019_pg10_control_public.sql", "to_regprocedure('pg10_public_business(uuid,text)') IS NOT NULL"}, {"0023_pg13_workspace.sql", "to_regclass('pg13_business_settings') IS NOT NULL"}, {"0024_pg13_billing.sql", "to_regclass('pg13_platform_invoices') IS NOT NULL"}, {"0028_pg10_export_authority.sql", "to_regprocedure('pg10_export_authorized(uuid,uuid)') IS NOT NULL"}, {"0031_pg13_reauthentication.sql", "to_regprocedure('pg13_reauth_hash(uuid,uuid)') IS NOT NULL"}, {"0032_pg13_grants_transfer.sql", "to_regclass('pg13_member_grants') IS NOT NULL"}, {"0034_pg13_billing_reconciliation.sql", "to_regprocedure('pg13_pending_billing()') IS NOT NULL"}, {"0039_pg13_support_resend.sql", "to_regprocedure('pg13_invite_resend(uuid,uuid,uuid,text)') IS NOT NULL"}, {"0043_pg13_privacy_requests.sql", "to_regprocedure('pg13_privacy_request(uuid,uuid,text,text)') IS NOT NULL"}, {"0044_pg13_public_brand.sql", "to_regprocedure('pg13_public_checkout(uuid,text)') IS NOT NULL"}}
	}
	for _, entry := range entries {
		var exists bool
		if err = pool.QueryRow(ctx, "SELECT "+entry.marker).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		body, e := os.ReadFile(filepath.Join(dir, entry.name))
		if e != nil {
			return errors.New("reviewed extension source missing")
		}
		conn, e := pool.Acquire(ctx)
		if e != nil {
			return e
		}
		_, e = conn.Conn().PgConn().Exec(ctx, string(body)).ReadAll()
		conn.Release()
		if e != nil {
			return e
		}
	}
	return nil
}
