package main

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

func migratePublicSandboxReceiver(ctx context.Context, dsn, file, workspace string) error {
	if filepath.Base(file) != "0060_public_sandbox_receiver.sql" || workspace == "" {
		return errors.New("explicit 0060 receiver file and public workspace required")
	}
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()
	var allowed, installed bool
	err = pool.QueryRow(ctx, `SELECT environment='sandbox' AND (SELECT relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) FROM pg_class WHERE oid='financial_realm'::regclass),to_regprocedure('pg60_receiver_read(uuid,uuid)') IS NOT NULL FROM financial_realm WHERE singleton`).Scan(&allowed, &installed)
	if err != nil || !allowed {
		return errors.New("0060 receiver requires the Sandbox migration owner")
	}
	if !installed {
		body, e := os.ReadFile(filepath.Clean(file))
		if e != nil {
			return e
		}
		conn, e := pool.Acquire(ctx)
		if e != nil {
			return e
		}
		_, e = conn.Conn().PgConn().Exec(ctx, string(body)).ReadAll()
		conn.Release()
		if e != nil {
			return e
		}
	}
	_, err = pool.Exec(ctx, `INSERT INTO pg60_public_workspace(workspace_id) VALUES($1::uuid) ON CONFLICT(singleton) DO NOTHING`, workspace)
	if err != nil {
		return err
	}
	var same bool
	err = pool.QueryRow(ctx, `SELECT workspace_id=$1::uuid FROM pg60_public_workspace WHERE singleton`, workspace).Scan(&same)
	if err != nil || !same {
		return errors.New("public test workspace binding differs")
	}
	return nil
}
