package checkout

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"
	"time"
)

func newUUID() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		return ""
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	h := hex.EncodeToString(b[:])
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}
func scanFile(ctx context.Context, content []byte) error {
	addr := os.Getenv("PRIVATE_UPLOAD_CLAMD_ADDRESS")
	if addr == "" {
		return errors.New("malware scanner unavailable")
	}
	c, e := (&net.Dialer{Timeout: 5 * time.Second}).DialContext(ctx, "tcp", addr)
	if e != nil {
		return errors.New("malware scanner unavailable")
	}
	defer c.Close()
	_ = c.SetDeadline(time.Now().Add(15 * time.Second))
	stop := context.AfterFunc(ctx, func() { _ = c.Close() })
	defer stop()
	if _, e = c.Write([]byte("zINSTREAM\x00")); e != nil {
		return errors.New("scan failed")
	}
	for offset := 0; offset < len(content); {
		end := offset + 32768
		if end > len(content) {
			end = len(content)
		}
		var n [4]byte
		binary.BigEndian.PutUint32(n[:], uint32(end-offset))
		if _, e = c.Write(n[:]); e != nil {
			return errors.New("scan failed")
		}
		if _, e = c.Write(content[offset:end]); e != nil {
			return errors.New("scan failed")
		}
		offset = end
	}
	if _, e = c.Write([]byte{0, 0, 0, 0}); e != nil {
		return errors.New("scan failed")
	}
	response := make([]byte, 512)
	n, e := c.Read(response)
	if e != nil || strings.TrimRight(string(response[:n]), "\x00\r\n") != "stream: OK" {
		return errors.New("file rejected or scan unconfirmed")
	}
	return nil
}
func s3HMAC(key []byte, text string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(text))
	return m.Sum(nil)
}

// Private S3-compatible object transport. Endpoint and credentials are operator
// configuration; a merchant cannot choose a destination or a signing target.
func objectRequest(ctx context.Context, method, key string, content []byte) ([]byte, error) {
	endpoint, e := url.Parse(os.Getenv("PRIVATE_S3_ENDPOINT"))
	region, bucket, access, secret := os.Getenv("PRIVATE_S3_REGION"), os.Getenv("PRIVATE_S3_BUCKET"), os.Getenv("PRIVATE_S3_ACCESS_KEY"), os.Getenv("PRIVATE_S3_SECRET_KEY")
	if e != nil || endpoint.Scheme != "https" || endpoint.Host == "" || endpoint.User != nil || endpoint.RawQuery != "" || region == "" || bucket == "" || access == "" || secret == "" || strings.ContainsAny(bucket, "/\\ \r\n") || strings.Contains(key, "..") {
		return nil, errors.New("private storage unavailable")
	}
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + "/" + bucket + "/" + key
	endpoint.RawPath = ""
	payload := sha256.Sum256(content)
	hash := hex.EncodeToString(payload[:])
	now := time.Now().UTC()
	date := now.Format("20060102")
	stamp := now.Format("20060102T150405Z")
	scope := date + "/" + region + "/s3/aws4_request"
	canonical := method + "\n" + endpoint.EscapedPath() + "\n\n" + "host:" + endpoint.Host + "\nx-amz-content-sha256:" + hash + "\nx-amz-date:" + stamp + "\n\nhost;x-amz-content-sha256;x-amz-date\n" + hash
	ch := sha256.Sum256([]byte(canonical))
	toSign := "AWS4-HMAC-SHA256\n" + stamp + "\n" + scope + "\n" + hex.EncodeToString(ch[:])
	derived := s3HMAC(s3HMAC(s3HMAC(s3HMAC([]byte("AWS4"+secret), date), region), "s3"), "aws4_request")
	signature := hex.EncodeToString(s3HMAC(derived, toSign))
	req, e := http.NewRequestWithContext(ctx, method, endpoint.String(), bytes.NewReader(content))
	if e != nil {
		return nil, e
	}
	req.Header.Set("X-Amz-Date", stamp)
	req.Header.Set("X-Amz-Content-Sha256", hash)
	req.Header.Set("Authorization", "AWS4-HMAC-SHA256 Credential="+access+"/"+scope+", SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature="+signature)
	client := http.Client{Timeout: 20 * time.Second, Transport: &http.Transport{Proxy: nil, TLSHandshakeTimeout: 5 * time.Second}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	defer client.CloseIdleConnections()
	res, e := client.Do(req)
	if e != nil {
		return nil, errors.New("private object outcome unconfirmed")
	}
	defer res.Body.Close()
	if method == "DELETE" && res.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, errors.New("private object unavailable")
	}
	data, e := io.ReadAll(io.LimitReader(res.Body, 5242881))
	if e != nil || len(data) > 5242880 {
		return nil, errors.New("object limit exceeded")
	}
	return data, nil
}
func (s *Service) HandlePublicFile(w http.ResponseWriter, r *http.Request) {
	if !s.pipelineReady() || !originAllowed(r) {
		fail(w, 403, "UPLOAD_UNAVAILABLE")
		return
	}
	cap := r.PathValue("token")
	if !tokenPattern.MatchString(cap) {
		fail(w, 404, "NOT_FOUND")
		return
	}
	if !s.budget(w, "upload:"+digest(cap), 5) {
		return
	}
	_, raw, e := s.publicDocument(r, cap)
	if e != nil || len(raw) == 0 {
		fail(w, 404, "NOT_FOUND")
		return
	}
	var d struct {
		ID          string       `json:"id"`
		Workspace   string       `json:"workspace_id"`
		Environment string       `json:"environment"`
		Body        DocumentBody `json:"body"`
	}
	_ = json.Unmarshal(raw, &d)
	if _, e = s.publicBusiness(r, raw); e != nil {
		fail(w, 503, "MERCHANT_UNAVAILABLE")
		return
	}
	hasFile := false
	for _, f := range d.Body.Fields {
		if f.Type == "file" {
			hasFile = true
		}
	}
	if !hasFile {
		fail(w, 422, "FILE_FIELD_NOT_CONFIGURED")
		return
	}
	content, e := io.ReadAll(http.MaxBytesReader(w, r.Body, 5242880))
	if e != nil || len(content) == 0 {
		fail(w, 413, "FILE_LIMIT_EXCEEDED")
		return
	}
	typ := http.DetectContentType(content)
	if typ != "image/jpeg" && typ != "image/png" && typ != "application/pdf" {
		fail(w, 422, "UNSUPPORTED_FILE_TYPE")
		return
	}
	if strings.HasPrefix(typ, "image/") {
		config, _, err := image.DecodeConfig(bytes.NewReader(content))
		if err != nil || config.Width <= 0 || config.Height <= 0 || int64(config.Width)*int64(config.Height) > 20000000 {
			fail(w, 422, "INVALID_IMAGE")
			return
		}
	}
	if scanFile(r.Context(), content) != nil {
		fail(w, 503, "FILE_SCAN_UNCONFIRMED")
		return
	}
	id := newUUID()
	if id == "" {
		fail(w, 503, "UPLOAD_UNAVAILABLE")
		return
	}
	key := d.Environment + "/" + d.Workspace + "/" + id
	e = s.pipelineScoped(r.Context(), d.Workspace, d.Environment, func(tx pgx.Tx) error {
		_, err := tx.Exec(r.Context(), "SELECT pg10_upload_reserve($1::uuid,$2,$3::uuid,$4,$5)", d.Workspace, d.Environment, id, key, len(content))
		return err
	})
	if e != nil {
		mapped(w, e)
		return
	}
	if _, e = objectRequest(r.Context(), "PUT", key, content); e != nil {
		fail(w, 503, "PRIVATE_STORAGE_UNAVAILABLE")
		return
	}
	name := uploadFilename(r.Header)
	if name == "." || name == "/" || len(name) == 0 || len(name) > 160 || strings.ContainsAny(name, "\r\n\x00") {
		name = "attachment"
	}
	sum := sha256.Sum256(content)
	e = s.pipelineScoped(r.Context(), d.Workspace, d.Environment, func(tx pgx.Tx) error {
		_, err := tx.Exec(r.Context(), "SELECT pg10_file_save($1::uuid,$2,$3::uuid,$4::uuid,$5,$6,$7,$8,$9)", d.Workspace, d.Environment, d.ID, id, key, name, typ, len(content), hex.EncodeToString(sum[:]))
		if err != nil {
			return err
		}
		_, err = tx.Exec(r.Context(), "SELECT pg10_upload_commit($1::uuid,$2,$3::uuid)", d.Workspace, d.Environment, id)
		return err
	})
	if e != nil {
		_, _ = objectRequest(r.Context(), "DELETE", key, nil)
		mapped(w, e)
		return
	}
	write(w, 201, map[string]any{"file_id": id, "name": name, "size_bytes": len(content), "scan_status": "clean"})
}
func (s *Service) HandleFile(w http.ResponseWriter, r *http.Request) {
	ws, realm, id := r.PathValue("workspaceID"), explicitRealm(r), r.PathValue("fileID")
	if !s.pipelineReady() || !uuidPattern.MatchString(ws) || !uuidPattern.MatchString(id) {
		fail(w, 404, "NOT_FOUND")
		return
	}
	_, role, e := s.documentActor(r, ws, realm, "payments", false)
	if e != nil {
		authError(w, e)
		return
	}
	if role != "owner" && role != "admin" {
		fail(w, 403, "ACCESS_DENIED")
		return
	}
	var raw []byte
	e = s.pipelineScoped(r.Context(), ws, realm, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), "SELECT pg10_file_read($1::uuid,$2,$3::uuid)", ws, realm, id).Scan(&raw)
	})
	if e != nil {
		mapped(w, e)
		return
	}
	var f struct {
		Key  string `json:"object_key"`
		Name string `json:"name"`
		Mime string `json:"mime"`
	}
	if json.Unmarshal(raw, &f) != nil || f.Key == "" {
		fail(w, 404, "NOT_FOUND")
		return
	}
	data, e := objectRequest(r.Context(), "GET", f.Key, nil)
	if e != nil {
		fail(w, 503, "PRIVATE_STORAGE_UNAVAILABLE")
		return
	}
	w.Header().Set("Content-Type", f.Mime)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.Name}))
	w.Header().Set("Content-Security-Policy", "sandbox")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-store")
	_, _ = w.Write(data)
}

// uploadFilename accepts explicit URI-component encoding for Unicode filenames.
func uploadFilename(headers http.Header) string {
	name := headers.Get("X-Filename")
	if headers.Get("X-Filename-Encoding") == "uri-component" {
		decoded, err := url.PathUnescape(name)
		if err != nil {
			return "attachment"
		}
		name = decoded
	}
	name = path.Base(strings.ReplaceAll(name, "\\", "/"))
	if name == "." || name == "/" || len(name) == 0 || len(name) > 160 || strings.ContainsAny(name, "\r\n\x00") {
		return "attachment"
	}
	return name
}
