// Package receiptnotice owns customer notification eligibility, independently
// of financial confirmation. Notification failure must never undo a payment.
package receiptnotice

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/mail"
	"strings"
	"time"
)

// Recipient is scoped to one business and physical financial environment.
// Customer contact is never substituted for the actual payment sender.
type Recipient struct {
	Workspace, Environment, Email        string
	ConsentedAt, VerifiedAt, WithdrawnAt time.Time
}

func NormalizeEmail(raw string) (string, error) {
	if len(raw) > 254 || strings.ContainsAny(raw, "\r\n") {
		return "", errors.New("invalid recipient")
	}
	raw = strings.TrimSpace(raw)
	a, err := mail.ParseAddress(raw)
	if err != nil || a.Address != raw || !strings.Contains(raw, "@") {
		return "", errors.New("invalid recipient")
	}
	// Preserve local-part case; only the DNS domain is case insensitive.
	i := strings.LastIndexByte(raw, '@')
	return raw[:i+1] + strings.ToLower(raw[i+1:]), nil
}

func (r Recipient) Eligible(workspace, environment string, now time.Time) bool {
	_, err := NormalizeEmail(r.Email)
	return err == nil && workspace != "" && r.Workspace == workspace &&
		(environment == "sandbox" || environment == "live") && r.Environment == environment &&
		!r.ConsentedAt.IsZero() && !r.VerifiedAt.IsZero() && r.WithdrawnAt.IsZero() &&
		!r.ConsentedAt.After(now) && !r.VerifiedAt.After(now)
}

// TokenDigest stores only a purpose/scoped keyed digest of a random capability.
// Verification/withdrawal tokens must be independently generated, not reused.
func TokenDigest(key []byte, purpose, workspace, environment, token string) (string, error) {
	if len(key) != 32 || (purpose != "verify" && purpose != "withdraw") || workspace == "" ||
		(environment != "sandbox" && environment != "live") || len(token) < 32 || len(token) > 256 {
		return "", errors.New("invalid notice capability")
	}
	for _, v := range []string{workspace, token} {
		if strings.ContainsRune(v, '\x00') {
			return "", errors.New("invalid notice capability")
		}
	}
	m := hmac.New(sha256.New, key)
	m.Write([]byte("receipt-notice\x00" + purpose + "\x00" + workspace + "\x00" + environment + "\x00" + token))
	return hex.EncodeToString(m.Sum(nil)), nil
}
