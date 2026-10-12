package receiptnotice

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Fail closed on an intermediate schema; an installed older draft must be
// upgraded additively by the operator, never silently overwritten on startup.
func CheckSchema(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return errors.New("notice database unavailable")
	}
	var complete bool
	err := pool.QueryRow(ctx, `SELECT
 to_regprocedure('pg08_notice_register(uuid,text,uuid,bytea,text,text,text,text)') IS NOT NULL AND
 to_regprocedure('pg08_notice_read(uuid,text,uuid)') IS NOT NULL AND
 to_regprocedure('pg08_notice_retry(uuid,text,uuid,text)') IS NOT NULL AND
 to_regprocedure('pg08_notice_due()') IS NOT NULL AND
 to_regprocedure('pg08_notice_claim(uuid,bigint)') IS NOT NULL AND
 to_regprocedure('pg08_notice_finish(uuid,uuid,text)') IS NOT NULL AND
 EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.pg08_notice_contacts') AND attname='locale' AND NOT attisdropped)`).Scan(&complete)
	if err != nil || !complete {
		return errors.New("complete notice migration required; preserve applied schema")
	}
	return nil
}
