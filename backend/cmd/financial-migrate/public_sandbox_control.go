package main

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

func migratePublicSandboxControl(ctx context.Context, dsn, filename string) error {
	if filepath.Base(filename) != "0059_public_sandbox.sql" {
		return errors.New("explicit 0059 control migration file required")
	}
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()
	var owner, installed bool
	err = pool.QueryRow(ctx, `SELECT to_regclass('public.financial_realm') IS NULL AND (SELECT relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) FROM pg_class WHERE oid='public.workspaces'::regclass),to_regclass('public.public_sandbox_config') IS NOT NULL`).Scan(&owner, &installed)
	if err != nil || !owner {
		return errors.New("0059 requires the control-plane migration owner")
	}
	if installed {
		return nil
	}
	body, err := os.ReadFile(filepath.Clean(filename))
	if err != nil {
		return err
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	_, err = conn.Conn().PgConn().Exec(ctx, string(body)).ReadAll()
	return err
}
