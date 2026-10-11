package authz

import (
 "context"
 "database/sql"
 "fmt"
)

// ProbeReadOnlyBoundary checks the runtime identity and ensures that tenant
// tables disclose no rows without an authenticated transaction context.
// The probe uses only a read-only transaction and never handles credentials.
func (r *Repository) ProbeReadOnlyBoundary(ctx context.Context) error {
 if err := r.ValidateRuntimeRole(ctx); err != nil {
  return err
 }
 tx, err := r.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
 if err != nil {
  return fmt.Errorf("%w: read-only transaction failed", ErrUnavailable)
 }
 defer tx.Rollback()
 for _, name := range []string{"ekmivo.user_id","ekmivo.workspace_id","ekmivo.environment"} {
  if _, err := tx.ExecContext(ctx, "SELECT set_config($1,'',true)", name); err != nil {
   return fmt.Errorf("%w: transaction scope reset failed", ErrUnavailable)
  }
 }
 var environments, settings int
 if err := tx.QueryRowContext(ctx, "SELECT count(*) FROM workspace_environments").Scan(&environments); err != nil {
  return fmt.Errorf("%w: scoped environments query failed", ErrUnavailable)
 }
 if err := tx.QueryRowContext(ctx, "SELECT count(*) FROM workspace_environment_settings").Scan(&settings); err != nil {
  return fmt.Errorf("%w: scoped settings query failed", ErrUnavailable)
 }
 if environments != 0 || settings != 0 {
  return fmt.Errorf("%w: unscoped tenant data visible", ErrForbidden)
 }
 if err := tx.Commit(); err != nil {
  return fmt.Errorf("%w: probe commit failed", ErrUnavailable)
 }
 return nil
}
