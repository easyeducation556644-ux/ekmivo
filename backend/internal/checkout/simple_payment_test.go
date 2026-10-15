package checkout

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSimplePaymentStatusIsAuthoritative(t *testing.T) {
	for state, want := range map[string]string{"completed": "COMPLETED", "requires_payer": "PENDING", "awaiting_payment": "PENDING", "processing": "PENDING", "cancelled": "CANCELLED", "expired": "EXPIRED", "exception": "FAILED", "forwarded": "PENDING", "durable": "PENDING", "": "PENDING"} {
		if got := publicPaymentStatus(state); got != want {
			t.Fatalf("%s: %s, want %s", state, got, want)
		}
	}
}
func TestAutomaticSigningIsStableAndScopeBound(t *testing.T) {
	s := &Service{TokenKey: []byte(strings.Repeat("a", 32))}
	first := s.automaticSigningSecret("workspace-a", "sandbox")
	if first != s.automaticSigningSecret("workspace-a", "sandbox") || len(first) != 43 {
		t.Fatal("unstable or short signing secret")
	}
	for _, other := range []string{s.automaticSigningSecret("workspace-b", "sandbox"), s.automaticSigningSecret("workspace-a", "live"), s.token("workspace-a", "sandbox", "irrelevant")} {
		if first == other {
			t.Fatal("signing secret crossed authority or purpose")
		}
	}
}
func TestSimpleVerifyRejectsInvalidInvoiceAndExtraFields(t *testing.T) {
	for _, body := range []string{`{}`, `{"invoice_id":"not-an-id"}`, `{"invoice_id":"11111111-1111-4111-8111-111111111111","status":"COMPLETED"}`, `{"invoice_id":"11111111-1111-4111-8111-111111111111"} {}`} {
		r := httptest.NewRequest("POST", "/v1/payment/verify", strings.NewReader(body))
		w := httptest.NewRecorder()
		(&Service{}).HandleSimpleVerify(w, r)
		if w.Code != 422 {
			t.Fatalf("invalid body accepted: %s -> %d", body, w.Code)
		}
	}
}
