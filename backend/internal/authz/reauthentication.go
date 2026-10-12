package authz

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"golang.org/x/crypto/scrypt"
	"strings"
)

// Uses the existing self-hosted scrypt-v1 format, without returning hashes or
// passwords through HTTP. The restricted definer also checks the live session
// and bounds guesses across API instances in PostgreSQL.
func (r *Repository) ConfirmPassword(ctx context.Context, p Principal, password string) error {
	if r == nil || r.DB == nil || len(password) < 1 || len(password) > 1024 {
		return ErrUnauthorized
	}
	var stored sql.NullString
	if r.DB.QueryRowContext(ctx, "SELECT pg13_reauth_hash($1::uuid,$2::uuid)", p.UserID, p.SessionID).Scan(&stored) != nil {
		return ErrUnavailable
	}
	if !stored.Valid {
		return ErrForbidden
	}
	bits := strings.Split(stored.String, ":")
	if len(bits) != 3 || bits[0] != "scrypt-v1" || len(bits[1]) != 48 || len(bits[2]) != 128 {
		return ErrUnauthorized
	}
	salt, e := hex.DecodeString(bits[1])
	if e != nil {
		return ErrUnauthorized
	}
	expected, e := hex.DecodeString(bits[2])
	if e != nil {
		return ErrUnauthorized
	}
	actual, e := scrypt.Key([]byte(password), salt, 16384, 8, 1, 64)
	if e != nil {
		return ErrUnavailable
	}
	if subtle.ConstantTimeCompare(actual, expected) != 1 {
		return ErrUnauthorized
	}
	if _, e = r.DB.ExecContext(ctx, "SELECT pg13_reauth_success($1::uuid,$2::uuid)", p.UserID, p.SessionID); e != nil {
		return ErrUnavailable
	}
	return nil
}
