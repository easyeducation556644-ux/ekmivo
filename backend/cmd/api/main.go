package main

import (
 "encoding/json"
 "log"
 "net/http"
 "os"
)

func newHandler() http.Handler {
 mux := http.NewServeMux()
 mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  _ = json.NewEncoder(w).Encode(map[string]string{"status":"ok","service":"ekmivo-api"})
 })
 // PG00 deliberately returns 503: financial database, jobs and readiness are not wired yet.
 // A configured DATABASE_URL alone is not evidence that the payment API is ready.
 mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(http.StatusServiceUnavailable)
  _ = json.NewEncoder(w).Encode(map[string]string{"status":"not_ready","reason":"financial_services_not_implemented"})
 })
 return mux
}

func main() {
 port := os.Getenv("PORT")
 if port=="" { port="8080" }
 log.Printf("ekmivo-api listening on :%s",port)
 log.Fatal(http.ListenAndServe(":"+port,newHandler()))
}
