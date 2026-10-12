package checkout

import (
	"github.com/jackc/pgx/v5/pgconn"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDocumentStateErrorsAreDistinct(t *testing.T) {
	for _, c := range []struct {
		message, code string
		status        int
	}{
		{"live source unavailable", "RECEIVING_SOURCE_UNAVAILABLE", 503},
		{"link expired", "PAYMENT_LINK_EXPIRED", 410},
		{"link use limit", "PAYMENT_LINK_LIMIT_REACHED", 409},
		{"other internal constraint", "LOCKED_OR_EXPIRED", 409},
	} {
		t.Run(c.code, func(t *testing.T) {
			w := httptest.NewRecorder()
			mapped(w, &pgconn.PgError{Code: "23514", Message: c.message})
			if w.Code != c.status || !strings.Contains(w.Body.String(), c.code) {
				t.Fatalf("unexpected status/code: %d %s", w.Code, w.Body.String())
			}
			if strings.Contains(w.Body.String(), c.message) {
				t.Fatal("internal database message leaked")
			}
		})
	}
}
