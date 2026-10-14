package checkout

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"github.com/jackc/pgx/v5"
	"log"
	"net/http"
	"strings"
	"time"
)

// Reads use the existing financial scope and session authorization. Keys cannot
// read admin audit or export metadata, even when they have payments:read.
func (s *Service) HandleActivity(w http.ResponseWriter, r *http.Request) {
	ws, realm, kind := r.PathValue("workspaceID"), explicitRealm(r), r.PathValue("activityKind")
	if !s.pipelineReady() || !uuidPattern.MatchString(ws) || s.pipelinePool(realm) == nil {
		fail(w, 503, "ACTIVITY_UNAVAILABLE")
		return
	}
	actor, role, err := s.documentActor(r, ws, realm, "payments", false)
	if err != nil {
		authError(w, err)
		return
	}
	if actor == "" || (role != "owner" && role != "admin") {
		fail(w, 403, "ACCESS_DENIED")
		return
	}
	cursor, q := r.URL.Query().Get("cursor"), strings.TrimSpace(r.URL.Query().Get("q"))
	if !map[string]bool{"audit": true, "api": true, "exports": true}[kind] || (cursor != "" && !uuidPattern.MatchString(cursor)) || len([]rune(q)) > 96 {
		fail(w, 422, "INVALID_ACTIVITY_FILTERS")
		return
	}
	var raw []byte
	err = s.pipelineScoped(r.Context(), ws, realm, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), "SELECT pg58_activity_read($1::uuid,$2,$3,$4::uuid,$5::uuid,$6)", ws, realm, kind, actor, nullableID(cursor), nullableID(q)).Scan(&raw)
	})
	if err != nil {
		mapped(w, err)
		return
	}
	write(w, 200, json.RawMessage(raw))
}

type activityResponse struct {
	http.ResponseWriter
	status int
}

func (w *activityResponse) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
		w.ResponseWriter.WriteHeader(status)
	}
}
func (w *activityResponse) Write(p []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(p)
}
func (w *activityResponse) Unwrap() http.ResponseWriter { return w.ResponseWriter }

var activitySlots = make(chan struct{}, 16)

// Start only AFTER authorization. Log route templates, never actual URLs, IDs,
// headers, bodies, query strings or key material. Observability cannot delay or
// change a financial response. Bounded, best-effort logs are not financial audit.
func (s *Service) observeAPI(w http.ResponseWriter, r *http.Request, ws, realm string) (http.ResponseWriter, func()) {
	var entropy [12]byte
	if _, err := rand.Read(entropy[:]); err != nil {
		return w, func() {}
	}
	correlation := hex.EncodeToString(entropy[:])
	w.Header().Set("X-Correlation-ID", correlation)
	out := &activityResponse{ResponseWriter: w}
	started := time.Now()
	route := r.Pattern
	return out, func() {
		status := out.status
		if status == 0 {
			status = 200
		}
		if id := out.Header().Get("X-Correlation-ID"); len(id) == 24 {
			if _, err := hex.DecodeString(id); err == nil {
				correlation = id
			}
		}
		elapsed := time.Since(started).Milliseconds()
		if route == "" || len(route) > 160 {
			return
		}
		select {
		case activitySlots <- struct{}{}:
		default:
			log.Print("API activity capacity reached; observability record skipped")
			return
		}
		go func() {
			defer func() { <-activitySlots }()
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			err := s.pipelineScoped(ctx, ws, realm, func(tx pgx.Tx) error {
				_, err := tx.Exec(ctx, "SELECT pg58_record_api($1::uuid,$2,$3,$4,$5,$6,$7)", ws, realm, r.Method, route, status, elapsed, correlation)
				return err
			})
			if err != nil {
				log.Print("API activity storage unavailable; financial response unchanged")
			}
		}()
	}
}
