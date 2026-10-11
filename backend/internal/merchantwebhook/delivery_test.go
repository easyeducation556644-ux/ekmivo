package merchantwebhook

import (
	"strconv"
	"testing"
	"time"
)

func TestSignatureAndSSRF(t *testing.T) {
	now := time.Now()
	epoch := strconv.FormatInt(now.Unix(), 10)
	key := []byte("a-secret-for-only-this-test")
	body := []byte(`{"id":"stable"}`)
	signature := Sign(key, body, epoch, "stable")
	if !Verify(key, body, epoch, "stable", signature, now) {
		t.Fatal("valid signature rejected")
	}
	if Verify(key, []byte(`{ "id":"stable"}`), epoch, "stable", signature, now) {
		t.Fatal("changed bytes accepted")
	}
	if Verify(key, body, epoch, "stable", signature, now.Add(6*time.Minute)) {
		t.Fatal("stale delivery accepted")
	}
	for _, raw := range []string{"http://example.com", "https://127.0.0.1", "https://[::1]", "https://169.254.169.254", "https://example.com:8443", "https://user:pass@example.com"} {
		if _, e := ValidateURL(raw); e == nil {
			t.Fatal("unsafe URL accepted", raw)
		}
	}
}
