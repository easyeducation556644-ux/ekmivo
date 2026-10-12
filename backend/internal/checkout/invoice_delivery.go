package checkout

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masharzy/ekmivo/backend/internal/deviceevidence"
	"github.com/masharzy/ekmivo/backend/internal/financial"
	"github.com/masharzy/ekmivo/backend/internal/merchantwebhook"
	"github.com/masharzy/ekmivo/backend/internal/receiptnotice"
	"github.com/riverqueue/river"
	"net/http"
	"os"
	"time"
)

func (s *Service) sendInvoice(w http.ResponseWriter, r *http.Request, ws, realm, id, actor, role, action string) {
	if actor == "" || (role != "owner" && role != "admin") {
		fail(w, 403, "SELLER_SESSION_REQUIRED")
		return
	}
	var authorized bool
	if s.Auth.DB.QueryRowContext(r.Context(), "SELECT pg10_invoice_send_authorized($1::uuid,$2::uuid)", ws, actor).Scan(&authorized) != nil {
		fail(w, 503, "INVOICE_EMAIL_UNAVAILABLE")
		return
	}
	if !authorized {
		fail(w, 403, "ACCESS_DENIED")
		return
	}
	if s.NoticeSMTP == nil {
		fail(w, 503, "INVOICE_EMAIL_UNAVAILABLE")
		return
	}
	var b struct {
		Version int64 `json:"expected_version"`
		Consent bool  `json:"consent_to_contact"`
	}
	key := r.Header.Get("Idempotency-Key")
	if decodeBounded(w, r, &b, 1024) != nil || !b.Consent || !keyPattern.MatchString(key) {
		fail(w, 422, "EXPLICIT_CONTACT_CONSENT_REQUIRED")
		return
	}
	var raw []byte
	if e := s.pipelineScoped(r.Context(), ws, realm, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), "SELECT pg10_invoice_contact($1::uuid,$2,$3::uuid)", ws, realm, id).Scan(&raw)
	}); e != nil {
		mapped(w, e)
		return
	}
	var contact struct {
		Email   string `json:"email"`
		Version int64  `json:"version"`
	}
	if json.Unmarshal(raw, &contact) != nil {
		fail(w, 503, "CONTACT_UNAVAILABLE")
		return
	}
	email, e := receiptnotice.NormalizeEmail(contact.Email)
	if e != nil {
		fail(w, 422, "CUSTOMER_EMAIL_REQUIRED")
		return
	}
	if contact.Version != b.Version {
		fail(w, 409, "INVOICE_VERSION_CHANGED")
		return
	}
	cipher, e := deviceevidence.Encrypt(s.Pipeline.Key, []byte(email), ws+"|"+realm+"|invoice-email")
	if e != nil {
		fail(w, 503, "INVOICE_EMAIL_UNAVAILABLE")
		return
	}
	var queued string
	e = s.pipelineScoped(r.Context(), ws, realm, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), "SELECT pg10_invoice_send($1::uuid,$2,$3::uuid,$4::uuid,$5,$6,$7,$8)", ws, realm, id, actor, action, cipher, key, b.Version).Scan(&queued)
	})
	if e != nil {
		mapped(w, e)
		return
	}
	write(w, 202, map[string]any{"id": queued, "status": "queued", "delivery_confirmed": false, "contact_independently_verified": false})
}

type InvoiceNoticeArgs struct {
	Environment string `json:"environment"`
}

func (InvoiceNoticeArgs) Kind() string { return "invoice_delivery" }

type InvoiceNoticeWorker struct {
	river.WorkerDefaults[InvoiceNoticeArgs]
	Pool, Control *pgxpool.Pool
	Realm         string
	Key, TokenKey []byte
	SMTP          *receiptnotice.SMTPConfig
}

func (*InvoiceNoticeWorker) Timeout(*river.Job[InvoiceNoticeArgs]) time.Duration {
	return 30 * time.Second
}
func (w *InvoiceNoticeWorker) Work(ctx context.Context, job *river.Job[InvoiceNoticeArgs]) (workErr error) {
	defer func() { financial.RecordWorkerHealth(w.Pool, "invoice_notice", w.Realm, workErr == nil) }()
	if job.Args.Environment != w.Realm || w.SMTP == nil {
		return errors.New("invoice delivery unavailable")
	}
	var raw []byte
	if w.Pool.QueryRow(ctx, "SELECT pg10_invoice_notice_claim()").Scan(&raw) != nil {
		return errors.New("invoice delivery queue unavailable")
	}
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	var n struct {
		ID        string    `json:"id"`
		Lease     string    `json:"lease_id"`
		Actor     string    `json:"actor_id"`
		Workspace string    `json:"workspace_id"`
		Realm     string    `json:"environment"`
		Cipher    string    `json:"recipient_cipher"`
		Key       string    `json:"capability_key"`
		Reference string    `json:"reference"`
		Created   time.Time `json:"created_at"`
	}
	if json.Unmarshal(raw, &n) != nil || n.Realm != w.Realm {
		return errors.New("invoice notice scope invalid")
	}
	finish := func(result string) error {
		var ok bool
		if w.Pool.QueryRow(ctx, "SELECT pg10_invoice_notice_finish($1::uuid,$2::uuid,$3)", n.ID, n.Lease, result).Scan(&ok) != nil || !ok {
			return errors.New("invoice delivery result unconfirmed")
		}
		return nil
	}
	var allowed bool
	if w.Control.QueryRow(ctx, "SELECT pg10_invoice_send_authorized($1::uuid,$2::uuid)", n.Workspace, n.Actor).Scan(&allowed) != nil {
		return errors.New("notice authority unavailable")
	}
	if !allowed {
		return finish("cancelled")
	}
	cipher, e := base64.StdEncoding.DecodeString(n.Cipher)
	if e != nil {
		return finish("failed")
	}
	email, e := merchantwebhook.Decrypt(w.Key, cipher, n.Workspace+"|"+w.Realm+"|invoice-email")
	if e != nil {
		return finish("failed")
	}
	origin := os.Getenv("PUBLIC_WEB_ORIGIN")
	if _, e := merchantwebhook.ValidateURL(origin); e != nil {
		return finish("failed")
	}
	s := &Service{TokenKey: w.TokenKey}
	token := s.token(n.Workspace, w.Realm, "document:invoices:"+n.Key)
	message := receiptnotice.Message{MerchantRequestedDocument: true, Workspace: n.Workspace, Environment: w.Realm, MessageID: n.ID, Subject: "Invoice / ইনভয়েস " + n.Reference, Text: "Invoice / ইনভয়েস: " + origin + "/bn/invoice/" + token + "\nPayment is verified only by the server. / সার্ভার যাচাই ছাড়া পরিশোধ নিশ্চিত নয়।", Recipient: receiptnotice.Recipient{Workspace: n.Workspace, Environment: w.Realm, Email: string(email), ConsentedAt: n.Created}}
	e = receiptnotice.SendSMTP(ctx, *w.SMTP, message)
	if errors.Is(e, receiptnotice.ErrOutcomeUnknown) {
		return finish("unknown")
	}
	if e != nil {
		return finish("failed")
	}
	return finish("accepted")
}
