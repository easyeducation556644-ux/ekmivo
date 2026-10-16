package workerruntime

import (
	"context"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestHostedProjectionConfig(t *testing.T) {
	env := map[string]string{"API_BACKGROUND_PROJECTION_ENABLED": "true", "PG04_WORKER_CONTROL_PROJECTION_URL": "postgres://ekmivo_financial_projection_operator:secret@host/control", "PG04_PROVISIONER_SANDBOX_URL": "postgres://ekmivo_financial_provisioner_sandbox:secret@host/sandbox", "PG04_PROVISIONER_LIVE_URL": "postgres://ekmivo_financial_provisioner_live:secret@host/live"}
	get := func(k string) string { return env[k] }
	if c, e := HostedProjectionConfig(get); e != nil || c == nil {
		t.Fatal("valid restricted projection rejected")
	}
	for _, key := range []string{"PG04_WORKER_CONTROL_PROJECTION_URL", "PG04_PROVISIONER_SANDBOX_URL", "PG04_PROVISIONER_LIVE_URL"} {
		old := env[key]
		env[key] = "postgres://owner:do-not-leak@host/db"
		if c, e := HostedProjectionConfig(get); e == nil || c != nil || strings.Contains(e.Error(), "do-not-leak") {
			t.Fatal("unsafe or partial projection accepted")
		}
		env[key] = old
	}
	env["PG04_PROVISIONER_LIVE_URL"] = env["PG04_PROVISIONER_SANDBOX_URL"]
	if _, e := HostedProjectionConfig(get); e == nil {
		t.Fatal("cross realm credential accepted")
	}
	if c, e := HostedProjectionConfig(func(string) string { return "" }); e != nil || c != nil {
		t.Fatal("disabled projection started")
	}
}

func TestNeonHostedProjectionConverges(t *testing.T) {
	host := os.Getenv("WORKER_RUNTIME_TEST_HOST")
	if host == "" {
		t.Skip("explicit isolated Neon branch required")
	}
	c := ProjectionConfig{os.Getenv("WORKER_RUNTIME_TEST_CONTROL_URL"), os.Getenv("PROJECTION_TEST_SANDBOX_URL"), os.Getenv("PROJECTION_TEST_LIVE_URL")}
	for _, dsn := range []string{c.Control, c.Sandbox, c.Live} {
		u, e := url.Parse(dsn)
		if e != nil || u.Hostname() != host {
			t.Fatal("isolated branch boundary required")
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	control, e := pgxpool.New(ctx, c.Control)
	if e != nil {
		t.Fatal(e)
	}
	defer control.Close()
	type target struct {
		ws, realm string
		version   int64
		active    bool
	}
	targets := []target{}
	rows, e := control.Query(ctx, `SELECT DISTINCT ON (p.environment) p.workspace_id::text,p.environment,r.source_version,r.active FROM list_financial_projections() p CROSS JOIN LATERAL resolve_financial_projection(p.workspace_id,p.environment) r WHERE r.source_version>1 ORDER BY p.environment,r.source_version DESC,p.workspace_id`)
	if e != nil {
		t.Fatal(e)
	}
	for rows.Next() {
		var x target
		if e := rows.Scan(&x.ws, &x.realm, &x.version, &x.active); e != nil {
			t.Fatal(e)
		}
		targets = append(targets, x)
	}
	rows.Close()
	if rows.Err() != nil || len(targets) != 2 {
		t.Fatal("actual control fixtures required")
	}
	// Create the real regression on the isolated branch: each realm is one
	// version behind its authoritative control row before the hosted loop starts.
	for _, x := range targets {
		owner := os.Getenv("PROJECTION_TEST_SANDBOX_OWNER_URL")
		if x.realm == "live" {
			owner = os.Getenv("PROJECTION_TEST_LIVE_OWNER_URL")
		}
		u, e := url.Parse(owner)
		if e != nil || u.Hostname() != host {
			t.Fatal("isolated fixture owner required")
		}
		p, e := pgxpool.New(ctx, owner)
		if e != nil {
			t.Fatal(e)
		}
		_, e = p.Exec(ctx, `UPDATE financial_workspace_registry SET entitlement_version=$3 WHERE workspace_id=$1::uuid AND environment=$2`, x.ws, x.realm, x.version-1)
		p.Close()
		if e != nil {
			t.Fatal(e)
		}
	}
	result := make(chan error, 1)
	runCtx, stop := context.WithCancel(ctx)
	defer stop()
	go func() { result <- RunProjection(runCtx, c) }()
	for _, x := range targets {
		// The provisioner has no registry read privilege. Verify as the existing isolated owner.
		owner := os.Getenv("PROJECTION_TEST_SANDBOX_OWNER_URL")
		if x.realm == "live" {
			owner = os.Getenv("PROJECTION_TEST_LIVE_OWNER_URL")
		}
		u, e := url.Parse(owner)
		if e != nil || u.Hostname() != host {
			t.Fatal("isolated verification owner required")
		}
		p, e := pgxpool.New(ctx, owner)
		if e != nil {
			t.Fatal(e)
		}
		matched := false
		for i := 0; i < 100; i++ {
			var version int64
			var active bool
			e = p.QueryRow(ctx, `SELECT entitlement_version,status='active' FROM financial_workspace_registry WHERE workspace_id=$1::uuid AND environment=$2`, x.ws, x.realm).Scan(&version, &active)
			if e == nil && version == x.version && active == x.active {
				matched = true
				break
			}
			select {
			case err := <-result:
				t.Fatalf("projection exited: %v", err)
			case <-time.After(100 * time.Millisecond):
			}
		}
		p.Close()
		if !matched {
			t.Fatal("authoritative projection did not converge")
		}
	}
	stop()
	select {
	case e := <-result:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("projection failed to stop")
	}
}
