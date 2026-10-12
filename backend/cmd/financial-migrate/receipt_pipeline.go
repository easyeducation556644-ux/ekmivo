package main

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

// Extends the existing coordinator. Never runs from API/worker startup.
func migrateReceiptPipeline(ctx context.Context, realm, dsn, filename string) error {
	if filename == "" {
		return errors.New("PG06_PIPELINE_MIGRATION_FILE must explicitly point to 0014_pg06_pg09_receipt_pipeline.sql")
	}
	pool, e := pgxpool.New(ctx, dsn)
	if e != nil {
		return e
	}
	defer pool.Close()
	conn, e := pool.Acquire(ctx)
	if e != nil {
		return e
	}
	defer conn.Release()
	var actual string
	var installed, prior bool
	e = conn.QueryRow(ctx, `SELECT environment,to_regprocedure('pg07_pending()') IS NOT NULL,to_regprocedure('pg05_lock_payer(text,text,text,text)') IS NOT NULL FROM financial_realm WHERE singleton`).Scan(&actual, &installed, &prior)
	if e != nil || actual != realm || !prior {
		return errors.New("receipt migration requires isolated realm and PG05 prerequisites")
	}
	if installed {
		return nil
	}
	var owner bool
	if e = conn.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.financial_realm'::regclass AND relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user))`).Scan(&owner); e != nil || !owner {
		return errors.New("existing migration owner role required")
	}
	body, e := os.ReadFile(filepath.Clean(filename))
	if e != nil {
		return e
	}
	_, e = conn.Conn().PgConn().Exec(ctx, string(body)).ReadAll()
	return e
}
