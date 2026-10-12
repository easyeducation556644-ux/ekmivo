package financial

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

func RecordWorkerHealth(pool *pgxpool.Pool, kind, realm string, healthy bool) {
	if pool==nil{return}
 ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, _ = pool.Exec(ctx, "SELECT pg15_heartbeat($1,$2,$3)", kind, realm, healthy)
}
