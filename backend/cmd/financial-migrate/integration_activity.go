package main

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

func migrateIntegrationActivity(ctx context.Context, realm, dsn, filename string) error {
	if filepath.Base(filename) != "0058_integration_activity.sql" {
		return errors.New("explicit 0058 financial migration file required")
	}
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	var actual string
	var installed, prerequisites, owner bool
	err = conn.QueryRow(ctx, `SELECT environment,
 to_regprocedure('public.pg58_activity_read(uuid,text,text,uuid,uuid,text)') IS NOT NULL AND to_regprocedure('public.pg58_delivery_history(uuid,text,uuid)') IS NOT NULL,
 to_regclass('public.pg09_audit') IS NOT NULL AND to_regclass('public.pg10_exports') IS NOT NULL AND to_regclass('public.pg08_deliveries') IS NOT NULL,
 (SELECT relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) FROM pg_class WHERE oid='public.financial_realm'::regclass)
 FROM financial_realm WHERE singleton`).Scan(&actual, &installed, &prerequisites, &owner)
	if err != nil || actual != realm || !prerequisites || !owner {
		return errors.New("0058 requires the isolated financial migration-owner realm")
	}
	if installed {
		return nil
	}
	body, err := os.ReadFile(filepath.Clean(filename))
	if err != nil {
		return err
	}
	_, err = conn.Conn().PgConn().Exec(ctx, string(body)).ReadAll()
	if err != nil {
		return err
	}
	var applied bool
	err = conn.QueryRow(ctx, `SELECT to_regprocedure('public.pg58_activity_read(uuid,text,text,uuid,uuid,text)') IS NOT NULL AND to_regprocedure('public.pg58_record_api(uuid,text,text,text,integer,bigint,text)') IS NOT NULL`).Scan(&applied)
	if err != nil {
		return err
	}
	if !applied {
		return errors.New("0058 function unavailable after migration")
	}
	return nil
}
