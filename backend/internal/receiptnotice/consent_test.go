package receiptnotice

import (
	"strings"
	"testing"
	"time"
)

func TestEligibilityRejectsUnverifiedCrossScopeAndWithdrawn(t *testing.T) {
	now := time.Unix(1700000000, 0)
	r := Recipient{Workspace: "tenant-a", Environment: "sandbox", Email: "Customer@example.com", ConsentedAt: now, VerifiedAt: now}
	if !r.Eligible("tenant-a", "sandbox", now) {
		t.Fatal("valid recipient rejected")
	}
	if r.Eligible("tenant-b", "sandbox", now) || r.Eligible("tenant-a", "live", now) {
		t.Fatal("scope leak")
	}
	r.VerifiedAt = time.Time{}
	if r.Eligible("tenant-a", "sandbox", now) {
		t.Fatal("unverified contact accepted")
	}
	r.VerifiedAt = now
	r.WithdrawnAt = now
	if r.Eligible("tenant-a", "sandbox", now) {
		t.Fatal("withdrawal ignored")
	}
}

func TestEmailRejectsHeaderInjectionAndDisplayNames(t *testing.T) {
	for _, email := range []string{"User <user@example.com>", "user@example.com\r\nBcc: other@example.com", "invalid"} {
		if _, err := NormalizeEmail(email); err == nil {
			t.Fatalf("accepted unsafe recipient %q", email)
		}
	}
	if got, err := NormalizeEmail("User@EXAMPLE.COM"); err != nil || got != "User@example.com" {
		t.Fatal("normalization failed")
	}
}

func TestCapabilitiesCannotCrossPurposeRealmOrTenant(t *testing.T) {
	key := []byte(strings.Repeat("k", 32))
	token := strings.Repeat("t", 43)
	base, err := TokenDigest(key, "verify", "a", "sandbox", token)
	if err != nil {
		t.Fatal(err)
	}
	for _, scope := range [][3]string{{"withdraw", "a", "sandbox"}, {"verify", "b", "sandbox"}, {"verify", "a", "live"}} {
		other, err := TokenDigest(key, scope[0], scope[1], scope[2], token)
		if err != nil || other == base {
			t.Fatal("capability domain separation failed")
		}
	}
}
