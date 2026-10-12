package checkout

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"strings"
	"time"
)

type PrivacyObject struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	MIME    string    `json:"mime"`
	Size    int64     `json:"size_bytes"`
	SHA256  string    `json:"sha256"`
	Expires time.Time `json:"expires_at"`
	Body    []byte    `json:"body"`
}

// ExportPrivateObjects is an operator-only library, never an HTTP action.
// Each object must come from the exact workspace/physical realm inventory.
func ExportPrivateObjects(ctx context.Context, pool *pgxpool.Pool, workspace, realm string, emit func(PrivacyObject) error) (int, error) {
	if err := privacyObjectBoundary(ctx, pool, workspace, realm); err != nil {
		return 0, err
	}
	rows, err := pool.Query(ctx, "SELECT id::text,object_key,name,mime,size_bytes,sha256,expires_at FROM pg10_files WHERE workspace_id=$1::uuid AND environment=$2 ORDER BY created_at,id", workspace, realm)
	if err != nil {
		return 0, errors.New("private inventory unavailable")
	}
	defer rows.Close()
	count := 0
	for rows.Next() {
		var item PrivacyObject
		var key string
		if rows.Scan(&item.ID, &key, &item.Name, &item.MIME, &item.Size, &item.SHA256, &item.Expires) != nil {
			return count, errors.New("private inventory invalid")
		}
		if !uuidPattern.MatchString(item.ID) || !strings.HasPrefix(key, realm+"/"+workspace+"/") || item.Size < 1 || item.Size > 5242880 {
			return count, errors.New("private object scope invalid")
		}
		body, err := objectRequest(ctx, "GET", key, nil)
		if err != nil {
			return count, errors.New("private object read unconfirmed")
		}
		sum := sha256.Sum256(body)
		if int64(len(body)) != item.Size || hex.EncodeToString(sum[:]) != item.SHA256 {
			return count, errors.New("private object integrity mismatch")
		}
		item.Body = body
		if err := emit(item); err != nil {
			return count, errors.New("encrypted private export unavailable")
		}
		count++
	}
	if rows.Err() != nil {
		return count, errors.New("private inventory incomplete")
	}
	return count, nil
}
func privacyObjectBoundary(ctx context.Context, pool *pgxpool.Pool, workspace, realm string) error {
	if pool == nil || !uuidPattern.MatchString(workspace) || (realm != "live" && realm != "sandbox") {
		return errors.New("private export scope required")
	}
	var actual string
	var owner bool
	if pool.QueryRow(ctx, "SELECT r.environment,current_user=pg_get_userbyid(c.relowner) FROM financial_realm r JOIN pg_class c ON c.oid='pg10_files'::regclass WHERE r.singleton").Scan(&actual, &owner) != nil || actual != realm || !owner {
		return errors.New("independent realm operator required")
	}
	return nil
}

// DeleteExpiredPrivateObjects preserves required retention and retries unknown
// deletes. Versioned storage requires its own reviewed version erasure executor.
func DeleteExpiredPrivateObjects(ctx context.Context, pool *pgxpool.Pool, workspace, realm string) (int, error) {
	if err := privacyObjectBoundary(ctx, pool, workspace, realm); err != nil {
		return 0, err
	}
	count := 0
	for {
		tx, err := pool.Begin(ctx)
		if err != nil {
			return count, errors.New("private deletion unavailable")
		}
		var id, key string
		err = tx.QueryRow(ctx, "SELECT id::text,object_key FROM pg10_files WHERE workspace_id=$1::uuid AND environment=$2 AND expires_at<=now() ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT 1", workspace, realm).Scan(&id, &key)
		if errors.Is(err, pgx.ErrNoRows) {
			_ = tx.Rollback(ctx)
			break
		}
		if err != nil || !strings.HasPrefix(key, realm+"/"+workspace+"/") {
			_ = tx.Rollback(ctx)
			return count, errors.New("private deletion scope unconfirmed")
		}
		if _, err = objectRequest(ctx, "DELETE", key, nil); err != nil {
			_ = tx.Rollback(ctx)
			return count, errors.New("private deletion outcome unconfirmed")
		}
		_, err = tx.Exec(ctx, "DELETE FROM pg10_files WHERE workspace_id=$1::uuid AND environment=$2 AND id=$3::uuid AND expires_at<=now()", workspace, realm, id)
		if err != nil {
			_ = tx.Rollback(ctx)
			return count, errors.New("private deletion receipt unavailable")
		}
		if tx.Commit(ctx) != nil {
			return count, errors.New("private deletion commit unconfirmed")
		}
		count++
	}
	return count, nil
}
