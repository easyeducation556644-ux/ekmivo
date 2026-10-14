package main

import (
 "context"
 "errors"
 "os"
 "path/filepath"

 "github.com/jackc/pgx/v5/pgxpool"
)

// 0057 is read-only schema and an explicit operator-run migration.
// It is never invoked at service startup or by the financial worker.
func migrateReportPayerLedger(ctx context.Context, realm, dsn, filename string) error {
 if filepath.Base(filename)!="0057_pg13_payer_ledger.sql" {
  return errors.New("explicit 0057 financial migration file required")
 }
 pool,err:=pgxpool.New(ctx,dsn)
 if err!=nil{return err}
 defer pool.Close()
 conn,err:=pool.Acquire(ctx)
 if err!=nil{return err}
 defer conn.Release()
 var actual string
 var installed,prerequisites,owner bool
 err=conn.QueryRow(ctx,`SELECT environment,
 to_regprocedure('public.pg57_report_payer_ledger(uuid,text,timestamptz,timestamptz,uuid,uuid)') IS NOT NULL,
 to_regclass('public.pg06_phone_forwarded') IS NOT NULL
 AND to_regclass('public.financial_payments') IS NOT NULL
 AND to_regprocedure('public.pg06_scope(uuid,text)') IS NOT NULL,
 (SELECT relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
  FROM pg_class WHERE oid='public.financial_realm'::regclass)
 FROM financial_realm WHERE singleton`).Scan(&actual,&installed,&prerequisites,&owner)
 if err!=nil||actual!=realm||!prerequisites||!owner {
  return errors.New("0057 requires migrated isolated financial owner realm")
 }
 if installed{return nil}
 body,err:=os.ReadFile(filepath.Clean(filename))
 if err!=nil{return err}
 _,err=conn.Conn().PgConn().Exec(ctx,string(body)).ReadAll()
 if err!=nil{return err}
 var applied bool
 err=conn.QueryRow(ctx,`SELECT to_regprocedure('public.pg57_report_payer_ledger(uuid,text,timestamptz,timestamptz,uuid,uuid)') IS NOT NULL`).Scan(&applied)
 if err!=nil{return err}
 if !applied{return errors.New("0057 function unavailable after migration")}
 return nil
}
