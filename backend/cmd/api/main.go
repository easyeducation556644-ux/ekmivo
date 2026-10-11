package main

import (
 "context"
 "database/sql"
 "encoding/json"
 "errors"
 "log"
 "net/http"
 "os"
 "time"

 "github.com/masharzy/ekmivo/backend/internal/authz"
 _ "github.com/jackc/pgx/v5/stdlib"
)

type responseError struct {
 Code string `json:"code"`
 Message string `json:"message"`
}
func writeJSON(w http.ResponseWriter,status int,payload any){
 w.Header().Set("Content-Type","application/json")
 w.Header().Set("Cache-Control","no-store")
 w.WriteHeader(status)
 _=json.NewEncoder(w).Encode(payload)
}
func authFailure(w http.ResponseWriter,err error){
 switch {
 case errors.Is(err,authz.ErrUnauthorized):
  writeJSON(w,http.StatusUnauthorized,responseError{Code:"UNAUTHENTICATED",Message:"Sign in required"})
 case errors.Is(err,authz.ErrMFANeeded):
  writeJSON(w,http.StatusForbidden,responseError{Code:"MFA_REQUIRED",Message:"Administrator verification required"})
 case errors.Is(err,authz.ErrForbidden):
  writeJSON(w,http.StatusForbidden,responseError{Code:"ACCESS_DENIED",Message:"Not authorized"})
 default:
  writeJSON(w,http.StatusServiceUnavailable,responseError{Code:"AUTH_SERVICE_UNAVAILABLE",Message:"Authorization unavailable"})
 }
}
func newHandler()http.Handler{return newHandlerWithRepository(nil)}
func newHandlerWithRepository(repo *authz.Repository)http.Handler{
 mux:=http.NewServeMux()
 mux.HandleFunc("GET /healthz",func(w http.ResponseWriter,_ *http.Request){
  writeJSON(w,http.StatusOK,map[string]string{"status":"ok","service":"ekmivo-api"})
 })
 // The financial API, workers and jobs are intentionally not ready before PG03/PG04.
 mux.HandleFunc("GET /readyz",func(w http.ResponseWriter,_ *http.Request){
  writeJSON(w,http.StatusServiceUnavailable,map[string]string{"status":"not_ready","reason":"financial_services_not_implemented"})
 })
 identify:=func(r *http.Request)(authz.Principal,error){
  if repo==nil{return authz.Principal{},authz.ErrUnavailable}
  cookie,err:=r.Cookie("ekmivo-session")
  if err!=nil{return authz.Principal{},authz.ErrUnauthorized}
  return repo.Authenticate(r.Context(),cookie.Value)
 }
 mux.HandleFunc("GET /v1/session",func(w http.ResponseWriter,r *http.Request){
  user,err:=identify(r)
  if err!=nil{authFailure(w,err);return}
  writeJSON(w,http.StatusOK,map[string]any{"user_id":user.UserID,"email_verified":user.EmailVerified})
 })
 mux.HandleFunc("GET /v1/workspaces/{workspaceID}/access",func(w http.ResponseWriter,r *http.Request){
  user,err:=identify(r)
  if err!=nil{authFailure(w,err);return}
  env:=authz.Environment(r.URL.Query().Get("environment"))
  capability:=authz.Capability(r.URL.Query().Get("capability"))
  allowed,err:=repo.AuthorizeWorkspace(r.Context(),user,r.PathValue("workspaceID"),env,capability)
  if err!=nil{authFailure(w,err);return}
  writeJSON(w,http.StatusOK,map[string]any{
   "workspace_id":allowed.WorkspaceID,
   "environment":allowed.Environment,
   "role":allowed.Role,
   "capability":allowed.Capability,
  })
 })
 mux.HandleFunc("GET /v1/platform/access",func(w http.ResponseWriter,r *http.Request){
  user,err:=identify(r)
  if err!=nil{authFailure(w,err);return}
  role,err:=repo.AuthorizePlatform(r.Context(),user,true)
  if err!=nil{authFailure(w,err);return}
  writeJSON(w,http.StatusOK,map[string]string{"role":role})
 })
 return mux
}
func main(){
 var repo *authz.Repository
 if connection:=os.Getenv("AUTHZ_DATABASE_URL");connection!=""{
  db,err:=sql.Open("pgx",connection)
  if err!=nil{log.Fatal("authz database driver initialization failed")}
  db.SetMaxOpenConns(8)
  db.SetMaxIdleConns(4)
  db.SetConnMaxLifetime(10*time.Minute)
  ctx,cancel:=context.WithTimeout(context.Background(),8*time.Second)
  err=db.PingContext(ctx)
  if err==nil{repo=&authz.Repository{DB:db};err=repo.ValidateRuntimeRole(ctx)}
  cancel()
  if err!=nil{log.Fatal("authorization runtime role validation failed; refusing privileged connection")}
  defer db.Close()
 }
 port:=os.Getenv("PORT")
 if port==""{port="8080"}
 log.Printf("ekmivo-api listening on :%s",port)
 log.Fatal(http.ListenAndServe(":"+port,newHandlerWithRepository(repo)))
}
