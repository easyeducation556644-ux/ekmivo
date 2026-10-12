package checkout

import (
	"context"
	"encoding/json"
	"os"
	"time"
)

func (s *Service) OperationalReadiness(ctx context.Context) bool {
	if !s.pipelineReady() || s.Auth == nil || (s.Pipeline.Live == nil && os.Getenv("PG14_SANDBOX_TOOLS_ENABLED") != "true") {
		return false
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var controlReady bool
	if s.Auth.DB.QueryRowContext(ctx, "SELECT to_regprocedure('pg13_capability_override(uuid,uuid,text)') IS NOT NULL AND to_regprocedure('pg13_pending_billing()') IS NOT NULL AND to_regprocedure('pg13_reauth_hash(uuid,uuid)') IS NOT NULL AND to_regprocedure('pg10_invoice_send_authorized(uuid,uuid)') IS NOT NULL AND to_regprocedure('pg13_invite_resend(uuid,uuid,uuid,text)') IS NOT NULL AND to_regprocedure('pg13_privacy_request(uuid,uuid,text,text)') IS NOT NULL AND to_regprocedure('pg13_public_checkout(uuid,text)') IS NOT NULL").Scan(&controlReady) != nil || !controlReady {
		return false
	}
	if s.Auth.DB.PingContext(ctx) != nil {
		return false
	}
	realms := []string{"sandbox", "live"}
	if s.Pipeline.Live == nil {
		realms = []string{"sandbox"}
	}
	for _, realm := range realms {
		p := s.pipelinePool(realm)
		if p == nil {
			return false
		}
		var schemaReady bool
		if p.QueryRow(ctx, "SELECT to_regprocedure('pg10_read(uuid,text,text,uuid,uuid,text)') IS NOT NULL AND to_regprocedure('pg11_emit_expiry()') IS NOT NULL AND to_regprocedure('pg10_invoice_delivery(uuid,text,uuid)') IS NOT NULL AND to_regprocedure('pg15_file_claim()') IS NOT NULL AND to_regclass('pg14_sandbox_runs') IS NOT NULL AND to_regprocedure('pg10_import(uuid,text,uuid,text,text,jsonb)') IS NOT NULL AND to_regprocedure('pg15_prune_receipt_evidence()') IS NOT NULL AND to_regprocedure('pg15_orphan_claim()') IS NOT NULL AND to_regprocedure('pg11_page(uuid,text,text,uuid,uuid,text,uuid)') IS NOT NULL").Scan(&schemaReady) != nil || !schemaReady {
			return false
		}
		var raw []byte
		if p.QueryRow(ctx, "SELECT pg15_health()").Scan(&raw) != nil {
			return false
		}
		var h struct {
			Critical      bool   `json:"critical_ready"`
			Export        bool   `json:"export_ready"`
			Notice        bool   `json:"notice_ready"`
			Maintenance   bool   `json:"maintenance_ready"`
			InvoiceNotice bool   `json:"invoice_notice_ready"`
			Realm         string `json:"environment"`
		}
		if json.Unmarshal(raw, &h) != nil || h.Realm != realm || !h.Critical || !h.Export || !h.Maintenance || s.NoticeSMTP != nil && (!h.Notice || !h.InvoiceNotice) {
			return false
		}
	}
	return true
}
