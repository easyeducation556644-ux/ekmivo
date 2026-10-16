package workerruntime

import (
	"context"
	"net/url"
	"os"
	"testing"
	"time"
)

// Actual River startup/leadership/stop with restricted credentials on the named
// isolated test branch. Audit queues only: no HTTP/SMTP/object-store actions.
func TestNeonTwoRealmRuntimeLifecycle(t *testing.T) {
	host := os.Getenv("WORKER_RUNTIME_TEST_HOST")
	if host == "" {
		t.Skip("explicit isolated Neon test branch required")
	}
	t.Setenv("PG06_PIPELINE_ENABLED", "false")
	t.Setenv("PG10_EXTENSIONS_ENABLED", "false")
	control := os.Getenv("WORKER_RUNTIME_TEST_CONTROL_URL")
	check := func(dsn string) {
		t.Helper()
		u, e := url.Parse(dsn)
		if e != nil || u == nil || u.Hostname() != host {
			t.Fatal("test cannot cross the isolated branch boundary")
		}
	}
	check(control)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ready := make(chan string, 2)
	result := make(chan error, 2)
	for _, realm := range []string{"sandbox", "live"} {
		dsn := os.Getenv("WORKER_RUNTIME_TEST_SANDBOX_URL")
		if realm == "live" {
			dsn = os.Getenv("WORKER_RUNTIME_TEST_LIVE_URL")
		}
		check(dsn)
		c := Config{Realm: realm, DatabaseURL: dsn, ControlURL: control, OnStarted: func() { ready <- realm }}
		go func() { result <- Run(ctx, c) }()
	}
	for i := 0; i < 2; i++ {
		select {
		case r := <-ready:
			t.Log("River client started for", r)
		case e := <-result:
			t.Fatalf("runtime startup failed: %v", e)
		case <-time.After(30 * time.Second):
			t.Fatal("worker startup timeout")
		}
	}
	cancel()
	for i := 0; i < 2; i++ {
		select {
		case e := <-result:
			if e != nil {
				t.Fatal(e)
			}
		case <-time.After(20 * time.Second):
			t.Fatal("worker shutdown did not drain")
		}
	}
}
