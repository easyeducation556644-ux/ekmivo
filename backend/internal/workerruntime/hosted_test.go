package workerruntime

import (
	"context"
	"errors"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func testEnv() map[string]string {
	return map[string]string{
		"API_BACKGROUND_WORKERS_ENABLED": "true", "PG06_PIPELINE_ENABLED": "true", "PG10_EXTENSIONS_ENABLED": "true",
		"API_SANDBOX_WORKER_DATABASE_URL":    "postgres://ekmivo_financial_worker_sandbox:secret@isolated.example/sandbox",
		"API_LIVE_WORKER_DATABASE_URL":       "postgres://ekmivo_financial_worker_live:secret@isolated.example/live",
		"PG04_WORKER_CONTROL_PROJECTION_URL": "postgres://projection:secret@isolated.example/control",
	}
}
func TestHostedConfigsRejectWrongIdentityAndPartialStartup(t *testing.T) {
	for _, key := range []string{"API_SANDBOX_WORKER_DATABASE_URL", "API_LIVE_WORKER_DATABASE_URL", "PG04_WORKER_CONTROL_PROJECTION_URL", "PG06_PIPELINE_ENABLED", "PG10_EXTENSIONS_ENABLED"} {
		t.Run(key, func(t *testing.T) {
			e := testEnv()
			delete(e, key)
			c, err := HostedConfigs(func(k string) string { return e[k] })
			if err == nil || c != nil {
				t.Fatal("partial/unconfigured worker group accepted")
			}
		})
	}
	e := testEnv()
	e["API_LIVE_WORKER_DATABASE_URL"] = e["API_SANDBOX_WORKER_DATABASE_URL"]
	if _, err := HostedConfigs(func(k string) string { return e[k] }); err == nil {
		t.Fatal("cross-realm worker credential accepted")
	}
	e = testEnv()
	e["API_SANDBOX_WORKER_DATABASE_URL"] = "postgres://owner:do-not-leak@isolated.example/sandbox"
	if _, err := HostedConfigs(func(k string) string { return e[k] }); err == nil || strings.Contains(err.Error(), "do-not-leak") {
		t.Fatal("privileged credential accepted or disclosed")
	}
	e = testEnv()
	c, err := HostedConfigs(func(k string) string { return e[k] })
	if err != nil || len(c) != 2 || c[0].Realm != "sandbox" || c[1].Realm != "live" {
		t.Fatal("independent realm group missing")
	}
	c, err = HostedConfigs(func(string) string { return "" })
	if err != nil || len(c) != 0 {
		t.Fatal("opt-in default changed")
	}
}
func TestSupervisorRetriesStartupAndStopsDuringBackoff(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var calls atomic.Int32
	done := make(chan struct{})
	go func() {
		defer close(done)
		supervise(ctx, Config{Realm: "sandbox"}, time.Millisecond, func(ctx context.Context, _ Config) error {
			if calls.Add(1) == 1 {
				return errors.New("transient connection failure")
			}
			cancel()
			return nil
		})
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("supervisor did not stop")
	}
	if calls.Load() != 2 {
		t.Fatal("startup was not retried")
	}
	ctx, cancel = context.WithCancel(context.Background())
	done = make(chan struct{})
	entered := make(chan struct{})
	go func() {
		defer close(done)
		supervise(ctx, Config{Realm: "live"}, time.Minute, func(context.Context, Config) error { close(entered); return errors.New("unavailable") })
	}()
	<-entered
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("shutdown waited for retry delay")
	}
}
func TestRuntimeInvalidConfigDoesNotTerminateHost(t *testing.T) {
	for _, c := range []Config{{}, {Realm: "live"}, {Realm: "live", DatabaseURL: "postgres://owner:do-not-leak@host/db"}} {
		err := Run(context.Background(), c)
		if err == nil || strings.Contains(err.Error(), "do-not-leak") {
			t.Fatal("invalid runtime did not fail safely")
		}
	}
}
