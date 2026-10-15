package main

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

func migrateWorkspaceTeamRole(ctx context.Context, dsn, filename string) error {
	if filepath.Base(filename) != "0065_workspace_team_role.sql" {
		return errors.New("explicit 0065 control migration required")
	}
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()
	var allowed bool
	err = pool.QueryRow(ctx, `SELECT to_regclass('public.auth_sessions') IS NOT NULL AND to_regclass('public.financial_realm') IS NULL AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('pg13_workspace_read(uuid,uuid,text)') AND proowner=(SELECT oid FROM pg_roles WHERE rolname=current_user))`).Scan(&allowed)
	if err != nil || !allowed {
		return errors.New("workspace read migration requires control function owner")
	}
	content, err := os.ReadFile(filepath.Clean(filename))
	if err != nil {
		return err
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	if _, err = conn.Conn().PgConn().Exec(ctx, string(content)).ReadAll(); err != nil {
		return err
	}
	if err = pool.QueryRow(ctx, `SELECT position('DECLARE actor_role text' IN pg_get_functiondef('pg13_workspace_read(uuid,uuid,text)'::regprocedure))>0`).Scan(&allowed); err != nil || !allowed {
		return errors.New("workspace team role patch verification failed")
	}
	return nil
}
