package financial

import (
	"context"
	"testing"
)

func TestPublicSandboxWorkerRejectsOutsideItsScopeBeforeControlAccess(t *testing.T) {
	worker := PipelineWorker{Realm: "sandbox", OnlyWorkspace: "public-test"}
	for _, operation := range []pendingOperation{{Workspace: "merchant", Realm: "sandbox"}, {Workspace: "public-test", Realm: "live"}} {
		if worker.authorized(context.Background(), operation) {
			t.Fatal("outside public sandbox scope authorized")
		}
	}
	worker.Realm = "live"
	if worker.authorized(context.Background(), pendingOperation{Workspace: "public-test", Realm: "live"}) {
		t.Fatal("public-test drain enabled in Live")
	}
}
