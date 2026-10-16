package main

import (
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"path/filepath"
)

// A targeted mode of the existing coordinator. It never traverses older DDL.
func migrateManagedPlans(ctx context.Context) error {
	control, sandbox, live := os.Getenv("PG04_CONTROL_MIGRATION_DATABASE_URL"), os.Getenv("PG04_SANDBOX_MIGRATION_DATABASE_URL"), os.Getenv("PG04_LIVE_MIGRATION_DATABASE_URL")
	c, _, e := inspectDSN(control)
	if e != nil {
		return e
	}
	s, _, e := inspectDSN(sandbox)
	if e != nil {
		return e
	}
	l, _, e := inspectDSN(live)
	if e != nil {
		return e
	}
	if c == s || c == l || s == l {
		return errors.New("three separate named databases required")
	}
	for _, target := range []struct{ realm, dsn, file, marker string }{
		{"control", control, os.Getenv("PAYMENT_PLANS_CONTROL_FILE"), "payment_plan_versions"},
		{"sandbox", sandbox, os.Getenv("PAYMENT_PLANS_FINANCIAL_FILE"), "payment_allowance_slots"},
		{"live", live, os.Getenv("PAYMENT_PLANS_FINANCIAL_FILE"), "payment_allowance_slots"},
	} {
		expected := "0068_payment_allowance.sql"
		if target.realm == "control" {
			expected = "0067_managed_payment_plans.sql"
		}
		if filepath.Base(target.file) != expected {
			return errors.New("explicit reviewed managed-plan migration files required")
		}
		pool, err := pgxpool.New(ctx, target.dsn)
		if err != nil {
			return err
		}
		err = func() error {
			defer pool.Close()
			var auth, finance, owner, installed bool
			if e := pool.QueryRow(ctx, `SELECT to_regclass('public.auth_sessions') IS NOT NULL,to_regclass('public.financial_realm') IS NOT NULL,
    EXISTS(SELECT 1 FROM pg_class WHERE oid=CASE WHEN $1='control' THEN to_regclass('public.pg13_plans') ELSE to_regclass('public.financial_realm') END AND relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)),to_regclass('public.'||$2) IS NOT NULL`, target.realm, target.marker).Scan(&auth, &finance, &owner, &installed); e != nil {
				return e
			}
			if !owner || target.realm == "control" && (!auth || finance) || target.realm != "control" && (auth || !finance) {
				return errors.New("wrong schema or non-owner migration connection")
			}
			if target.realm != "control" {
				var realm string
				if e := pool.QueryRow(ctx, "SELECT environment FROM financial_realm WHERE singleton").Scan(&realm); e != nil || realm != target.realm {
					return errors.New("wrong financial realm")
				}
			}
			if installed {
				var ready bool
				if target.realm == "control" {
					if e := pool.QueryRow(ctx, `SELECT to_regprocedure('payment_plan_admin(uuid,text,jsonb)') IS NOT NULL AND to_regprocedure('payment_plan_claim_free(uuid,uuid,text)') IS NOT NULL AND EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='payment_plan_version_immutable' AND NOT tgisinternal)`).Scan(&ready); e != nil {
						return e
					}
				} else {
					if e := pool.QueryRow(ctx, `SELECT to_regprocedure('payment_allowance_usage(uuid,text,timestamptz,timestamptz)') IS NOT NULL AND (SELECT count(*)=6 FROM pg_trigger WHERE tgname IN ('payment_allowance_reservation','payment_allowance_completion','payment_allowance_cancellation','payment_plan_phone_limit','payment_plan_account_limit','payment_plan_account_reenable_limit') AND NOT tgisinternal)`).Scan(&ready); e != nil {
						return e
					}
				}
				if !ready {
					return errors.New("incomplete managed-plan migration; investigate before deployment")
				}
				return nil
			}
			b, e := os.ReadFile(filepath.Clean(target.file))
			if e != nil {
				return e
			}
			conn, e := pool.Acquire(ctx)
			if e != nil {
				return e
			}
			defer conn.Release()
			_, e = conn.Conn().PgConn().Exec(ctx, string(b)).ReadAll()
			return e
		}()
		if err != nil {
			return fmt.Errorf("managed plans %s: %w", target.realm, err)
		}
	}
	return nil
}
