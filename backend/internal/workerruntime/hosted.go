package workerruntime

import (
	"context"
	"errors"
	"log"
	"net/url"
	"sync"
	"time"
)

// HostedConfigs never borrows HTTP reader/owner credentials for queue work.
func HostedConfigs(env func(string) string) ([]Config, error) {
	if env("API_BACKGROUND_WORKERS_ENABLED") != "true" {
		return nil, nil
	}
	if env("PG06_PIPELINE_ENABLED") != "true" || env("PG10_EXTENSIONS_ENABLED") != "true" {
		return nil, errors.New("hosted workers require the payment pipeline and extensions")
	}
	source := env("PG04_WORKER_CONTROL_PROJECTION_URL")
	if source == "" {
		return nil, errors.New("hosted worker control projection credential missing")
	}
	configs := make([]Config, 0, 2)
	for _, r := range []string{"sandbox", "live"} {
		key := "API_SANDBOX_WORKER_DATABASE_URL"
		if r == "live" {
			key = "API_LIVE_WORKER_DATABASE_URL"
		}
		dsn := env(key)
		u, err := url.Parse(dsn)
		if err != nil || u == nil || u.User == nil || u.Host == "" || u.Path == "" || ValidateWorkerRole(u.User.Username(), r) != nil {
			return nil, errors.New("hosted worker requires a dedicated realm worker credential: " + r)
		}
		configs = append(configs, Config{Realm: r, DatabaseURL: dsn, ControlURL: source})
	}
	return configs, nil
}

// Each realm has its own River client and small connection pools. River retains
// leases and idempotent delivery state across API restarts and rolling deploys.
func StartHosted(ctx context.Context, configs []Config) *sync.WaitGroup {
	group := &sync.WaitGroup{}
	for _, cfg := range configs {
		group.Add(1)
		go func(c Config) { defer group.Done(); supervise(ctx, c, 5*time.Second, Run) }(cfg)
	}
	return group
}

func supervise(ctx context.Context, cfg Config, delay time.Duration, run func(context.Context, Config) error) {
	for ctx.Err() == nil {
		err := run(ctx, cfg)
		if ctx.Err() != nil {
			return
		}
		// Run returns sanitized startup errors, never credential-bearing DSNs.
		log.Printf("API hosted worker %s stopped (%v); retrying after %s", cfg.Realm, err, delay)
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
		if delay < 30*time.Second {
			delay *= 2
			if delay > 30*time.Second {
				delay = 30 * time.Second
			}
		}
	}
}
