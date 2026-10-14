package checkout

import (
	"encoding/hex"
	"encoding/json"
	"github.com/jackc/pgx/v5"
	"github.com/masharzy/ekmivo/backend/internal/authz"
	"github.com/masharzy/ekmivo/backend/internal/deviceevidence"
	"net/http"
	"os"
)

var sandboxScenarios = []string{"exact-unique", "wrong-payer", "under-amount", "over-amount", "before-window", "after-window", "missing-time", "outgoing", "missing-payer", "missing-amount", "unknown-direction", "wrong-account", "wrong-method"}

func (s *Service) HandleSandboxTools(w http.ResponseWriter, r *http.Request) {
	if !s.pipelineReady() || s.Pipeline.Live != nil || os.Getenv("PG14_SANDBOX_TOOLS_ENABLED") != "true" || explicitRealm(r) != "sandbox" {
		fail(w, 404, "NOT_FOUND")
		return
	}
	ws, action := r.PathValue("workspaceID"), r.PathValue("sandboxAction")
	if !uuidPattern.MatchString(ws) {
		fail(w, 404, "NOT_FOUND")
		return
	}
	actor, role, e := s.documentActor(r, ws, "sandbox", "payments", r.Method != "GET")
	if e != nil {
		authError(w, e)
		return
	}
	publicKey := role == "merchant_key" && ws == os.Getenv("PG14_PUBLIC_SANDBOX_WORKSPACE") && uuidPattern.MatchString(ws)
	if publicKey {
		if action == "reset" {
			fail(w, 403, "PUBLIC_SANDBOX_RESET_FORBIDDEN")
			return
		}
		scope := "payments:read"
		if r.Method != "GET" {
			scope = "payments:write"
		}
		credential, err := s.Auth.AuthenticateMerchant(r.Context(), r.Header.Get("Authorization"), authz.Environment("sandbox"), scope)
		if err != nil {
			authError(w, err)
			return
		}
		// Fixture audit records the credential ID, never impersonates an admin.
		actor = credential.KeyID
	}
	if !publicKey && (actor == "" || (role != "owner" && role != "admin")) {
		fail(w, 403, "SANDBOX_DEVELOPER_SESSION_REQUIRED")
		return
	}
	if r.Method != "GET" && !publicKey {
		cookie, err := r.Cookie("ekmivo-session")
		if err != nil {
			authError(w, authz.ErrUnauthorized)
			return
		}
		principal, err := s.Auth.Authenticate(r.Context(), cookie.Value)
		if err == nil {
			_, err = s.Auth.AuthorizeWorkspace(r.Context(), principal, ws, authz.Environment("sandbox"), authz.PaymentsManage)
		}
		if err != nil {
			authError(w, err)
			return
		}
	}
	if !s.budget(w, "sandbox-tools:"+ws, 30) {
		return
	}
	if action == "scenarios" && r.Method == "GET" {
		write(w, 200, map[string]any{"simulation": true, "items": sandboxScenarios, "provider_sandbox": false, "real_device_verified": false})
		return
	}
	var raw []byte
	if r.Method == "GET" {
		e = s.pipelineScoped(r.Context(), ws, "sandbox", func(tx pgx.Tx) error { return tx.QueryRow(r.Context(), "SELECT pg14_runs($1::uuid)", ws).Scan(&raw) })
	} else {
		if !originAllowed(r) {
			fail(w, 403, "ORIGIN_DENIED")
			return
		}
		var b struct {
			Scenario string `json:"scenario"`
			Password string `json:"current_password"`
			Confirm  bool   `json:"confirm_archive_reset"`
		}
		if decodeBounded(w, r, &b, 2048) != nil {
			fail(w, 422, "INVALID_SCENARIO")
			return
		}
		if action == "reset" {
			if !b.Confirm {
				fail(w, 422, "RESET_CONFIRMATION_REQUIRED")
				return
			}
			cookie, _ := r.Cookie("ekmivo-session")
			if cookie == nil {
				fail(w, 401, "UNAUTHENTICATED")
				return
			}
			principal, err := s.Auth.Authenticate(r.Context(), cookie.Value)
			if err == nil {
				err = s.Auth.ConfirmPassword(r.Context(), principal, b.Password)
			}
			if err != nil {
				authError(w, err)
				return
			}
			var n int64
			e = s.pipelineScoped(r.Context(), ws, "sandbox", func(tx pgx.Tx) error {
				return tx.QueryRow(r.Context(), "SELECT pg14_reset($1::uuid,$2::uuid)", ws, actor).Scan(&n)
			})
			raw, _ = json.Marshal(map[string]any{"archived": n, "financial_history_retained": true, "simulation": true})
		} else if action == "runs" {
			key := r.Header.Get("Idempotency-Key")
			if !keyPattern.MatchString(key) {
				fail(w, 400, "IDEMPOTENCY_KEY_REQUIRED")
				return
			}
			valid := false
			for _, scenario := range sandboxScenarios {
				if b.Scenario == scenario {
					valid = true
				}
			}
			if !valid {
				fail(w, 422, "UNSUPPORTED_SCENARIO")
				return
			}
			evidence, _ := json.Marshal(map[string]any{"simulation": true, "scenario": b.Scenario, "source": "sandbox_fixture"})
			cipher, err := deviceevidence.Encrypt(s.Pipeline.Key, evidence, ws+"|sandbox")
			if err != nil {
				fail(w, 503, "SIMULATION_UNAVAILABLE")
				return
			}
			payer := hex.EncodeToString(mac(s.PayerKey, "sandbox-fixture|"+ws+key))
			e = s.pipelineScoped(r.Context(), ws, "sandbox", func(tx pgx.Tx) error {
				return tx.QueryRow(r.Context(), "SELECT pg14_run($1::uuid,$2::uuid,$3,$4,$5,$6)", ws, actor, b.Scenario, key, payer, cipher).Scan(&raw)
			})
		} else {
			fail(w, 404, "NOT_FOUND")
			return
		}
	}
	if e != nil {
		mapped(w, e)
		return
	}
	var data any
	if json.Unmarshal(raw, &data) != nil {
		fail(w, 503, "SIMULATION_UNAVAILABLE")
		return
	}
	write(w, 200, data)
}
