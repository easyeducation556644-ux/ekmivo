package checkout

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestActivityResponsePreservesFirstStatusAndBody(t *testing.T) {
	rr := httptest.NewRecorder()
	w := &activityResponse{ResponseWriter: rr}
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(409)
	w.WriteHeader(200)
	_, _ = w.Write([]byte(`{"error":{"code":"STATE_CONFLICT"}}`))
	if w.status != 409 || rr.Code != 409 || rr.Body.String() != `{"error":{"code":"STATE_CONFLICT"}}` || rr.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatal("observability changed response semantics")
	}
	if w.Unwrap() != rr {
		t.Fatal("response controller unwrap unavailable")
	}
}
func TestActivityResponseImplicitSuccess(t *testing.T) {
	rr := httptest.NewRecorder()
	w := &activityResponse{ResponseWriter: rr}
	_, _ = w.Write([]byte("ok"))
	if w.status != 200 || rr.Code != 200 {
		t.Fatal("implicit write status incorrect")
	}
}
func TestActivityUnavailableIsNotEmpty(t *testing.T) {
	var s *Service
	r := httptest.NewRequest(http.MethodGet, "/v1/workspaces/11111111-1111-4111-8111-111111111111/activity/audit?environment=live", nil)
	r.SetPathValue("workspaceID", "11111111-1111-4111-8111-111111111111")
	r.SetPathValue("activityKind", "audit")
	rr := httptest.NewRecorder()
	s.HandleActivity(rr, r)
	if rr.Code != 503 {
		t.Fatalf("expected unavailable, got %d", rr.Code)
	}
}
