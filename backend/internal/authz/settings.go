package authz

import (
	"context"
	"database/sql"
	"errors"
)

// UpdateCheckoutExpiry is a real protected mutation. RLS rechecks current
// membership at the write, and all context is transaction-local.
func (r *Repository) UpdateCheckoutExpiry(ctx context.Context, p Principal, workspace string, env Environment, minutes int) error {
	if minutes < 5 || minutes > 60 {
		return ErrForbidden
	}
	if _, err := r.AuthorizeWorkspace(ctx, p, workspace, env, WorkspaceSettings); err != nil {
		return err
	}
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrUnavailable
	}
	defer tx.Rollback()
	var valid int
	err = tx.QueryRowContext(ctx, `SELECT 1 FROM auth_sessions s JOIN app_users u ON u.id=s.user_id
 WHERE s.id=$1::uuid AND s.user_id=$2::uuid AND s.revoked_at IS NULL AND s.expires_at>now()
 AND u.disabled_at IS NULL AND (u.email_verified_at IS NOT NULL OR NOT EXISTS
 (SELECT 1 FROM platform_auth_settings WHERE singleton AND email_verification_enabled))`, p.SessionID, p.UserID).Scan(&valid)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrUnauthorized
	}
	if err != nil {
		return ErrUnavailable
	}
	if _, err = tx.ExecContext(ctx, `SELECT set_config('ekmivo.user_id',$1,true),set_config('ekmivo.workspace_id',$2,true),set_config('ekmivo.environment',$3,true)`, p.UserID, workspace, string(env)); err != nil {
		return ErrUnavailable
	}
	result, err := tx.ExecContext(ctx, `UPDATE workspace_environment_settings SET checkout_expiry_minutes=$1,updated_at=now()
 WHERE workspace_id=$2::uuid AND environment=$3`, minutes, workspace, string(env))
	if err != nil {
		return ErrUnavailable
	}
	count, err := result.RowsAffected()
	if err != nil {
		return ErrUnavailable
	}
	if count != 1 {
		return ErrForbidden
	}
	if err = tx.Commit(); err != nil {
		return ErrUnavailable
	}
	return nil
}
