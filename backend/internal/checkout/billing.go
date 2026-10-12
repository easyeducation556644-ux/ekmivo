package checkout

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5"
	"net/http"
	"os"
	"time"
)

func (s *Service) billingAllowsNew(ctx context.Context, workspace, realm string) bool {
	if realm == "sandbox" {
		return true
	}
	if realm != "live" || s == nil || s.Auth == nil {
		return false
	}
	if workspace == os.Getenv("PLATFORM_BILLING_WORKSPACE_ID") {
		return true
	}
	var allowed bool
	err := s.Auth.DB.QueryRowContext(ctx, "SELECT pg13_billing_allowed($1::uuid)", workspace).Scan(&allowed)
	return err == nil && allowed
}

func (s *Service) HandleBilling(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.Auth == nil {
		fail(w, 503, "BILLING_UNAVAILABLE")
		return
	}
	cookie, e := r.Cookie("ekmivo-session")
	if e != nil {
		fail(w, 401, "UNAUTHENTICATED")
		return
	}
	actor, e := s.Auth.Authenticate(r.Context(), cookie.Value)
	if e != nil {
		authError(w, e)
		return
	}
	ws := r.PathValue("workspaceID")
	if !uuidPattern.MatchString(ws) {
		fail(w, 404, "NOT_FOUND")
		return
	}
	var raw []byte
	if r.Method == "GET" {
		e = s.Auth.DB.QueryRowContext(r.Context(), "SELECT pg13_billing_read($1::uuid,$2::uuid)", ws, actor.UserID).Scan(&raw)
		if e != nil {
			mapped(w, e)
			return
		}
		var d any
		_ = json.Unmarshal(raw, &d)
		write(w, 200, d)
		return
	}
	if !originAllowed(r) {
		fail(w, 403, "ORIGIN_DENIED")
		return
	}
	platform := os.Getenv("PLATFORM_BILLING_WORKSPACE_ID")
	if !s.pipelineReady() || s.Pipeline.Live == nil || !uuidPattern.MatchString(platform) || platform == ws {
		fail(w, 503, "PLATFORM_RECEIVING_UNAVAILABLE")
		return
	}
	// Read itself verifies current membership before any invoice lookup or reconcile.
	e = s.Auth.DB.QueryRowContext(r.Context(), "SELECT pg13_billing_read($1::uuid,$2::uuid)", ws, actor.UserID).Scan(&raw)
	if e != nil {
		mapped(w, e)
		return
	}
	var invoice struct {
		ID     string `json:"id"`
		Amount int64  `json:"amount_minor"`
		Status string `json:"status"`
	}
	if r.PathValue("billingAction") == "reconcile" {
		id := r.PathValue("invoiceID")
		var history struct {
			Invoices []struct {
				ID     string `json:"id"`
				Amount int64  `json:"amount_minor"`
				Status string `json:"status"`
			} `json:"invoices"`
		}
		_ = json.Unmarshal(raw, &history)
		for _, i := range history.Invoices {
			if i.ID == id {
				invoice = i
			}
		}
		if invoice.ID == "" {
			fail(w, 404, "NOT_FOUND")
			return
		}
		cap := s.token(platform, "live", "billing:"+invoice.ID)
		var proofRaw []byte
		e = s.Pipeline.Live.QueryRow(r.Context(), "SELECT pg13_platform_payment($1)", digest(cap)).Scan(&proofRaw)
		var proof struct {
			ID        string    `json:"id"`
			Amount    int64     `json:"amount_minor"`
			Workspace string    `json:"workspace_id"`
			At        time.Time `json:"verified_at"`
		}
		_ = json.Unmarshal(proofRaw, &proof)
		if e != nil || proof.Workspace != platform || proof.Amount != invoice.Amount || !uuidPattern.MatchString(proof.ID) {
			fail(w, 409, "VERIFIED_PLATFORM_PAYMENT_REQUIRED")
			return
		}
		var saved bool
		e = s.Auth.DB.QueryRowContext(r.Context(), "SELECT pg13_billing_verified($1::uuid,$2::uuid,$3::uuid,$4,$5)", ws, invoice.ID, proof.ID, proof.Amount, proof.At).Scan(&saved)
		if e != nil {
			mapped(w, e)
			return
		}
		write(w, 200, map[string]any{"renewed": saved})
		return
	}
	var b struct {
		Plan string `json:"plan_id"`
	}
	key := r.Header.Get("Idempotency-Key")
	if decodeBounded(w, r, &b, 1024) != nil || !keyPattern.MatchString(key) {
		fail(w, 422, "INVALID_BILLING_REQUEST")
		return
	}
	e = s.Auth.DB.QueryRowContext(r.Context(), "SELECT pg13_billing_issue($1::uuid,$2::uuid,$3,$4)", ws, actor.UserID, b.Plan, key).Scan(&raw)
	if e != nil {
		mapped(w, e)
		return
	}
	_ = json.Unmarshal(raw, &invoice)
	cap := s.token(platform, "live", "billing:"+invoice.ID)
	e = s.pipelineScoped(r.Context(), platform, "live", func(tx pgx.Tx) error {
		var result []byte
		return tx.QueryRow(r.Context(), "SELECT pg10_intent($1::uuid,'live',$2,$3,60,$4,$5,$6)", platform, "SAAS-"+invoice.ID, invoice.Amount, "billing:"+invoice.ID, digest(cap), digest(invoice.ID)).Scan(&result)
	})
	if e != nil {
		mapped(w, e)
		return
	}
	write(w, 201, map[string]any{"invoice_id": invoice.ID, "checkout_token": cap, "amount_minor": invoice.Amount, "currency": "BDT"})
}
