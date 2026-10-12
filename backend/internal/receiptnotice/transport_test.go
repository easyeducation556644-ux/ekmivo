package receiptnotice

import (
	"bufio"
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestSMTPRealTLSAcceptanceAndUnknownDataResponse(t *testing.T) {
	for _, unknown := range []bool{false, true} {
		t.Run(fmt.Sprint(unknown), func(t *testing.T) {
			certServer := httptest.NewTLSServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
			certificate := certServer.TLS.Certificates[0]
			roots := x509.NewCertPool()
			roots.AddCert(certServer.Certificate())
			certServer.Close()
			listener, err := tls.Listen("tcp", "127.0.0.1:0", &tls.Config{Certificates: []tls.Certificate{certificate}, MinVersion: tls.VersionTLS12})
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			transcript := make(chan string, 1)
			go func() {
				conn, err := listener.Accept()
				if err != nil {
					transcript <- ""
					return
				}
				defer conn.Close()
				_ = conn.SetDeadline(time.Now().Add(4 * time.Second))
				r := bufio.NewReader(conn)
				fmt.Fprint(conn, "220 localhost ESMTP\r\n")
				for {
					line, err := r.ReadString('\n')
					if err != nil {
						transcript <- ""
						return
					}
					switch {
					case strings.HasPrefix(line, "EHLO"):
						fmt.Fprint(conn, "250-localhost\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n")
					case strings.HasPrefix(line, "AUTH"):
						fmt.Fprint(conn, "235 authenticated\r\n")
					case strings.HasPrefix(line, "MAIL"), strings.HasPrefix(line, "RCPT"):
						fmt.Fprint(conn, "250 ok\r\n")
					case strings.HasPrefix(line, "DATA"):
						fmt.Fprint(conn, "354 send data\r\n")
						var b strings.Builder
						for {
							line, err = r.ReadString('\n')
							if err != nil {
								transcript <- ""
								return
							}
							if line == ".\r\n" {
								break
							}
							b.WriteString(line)
						}
						transcript <- b.String()
						if unknown {
							return
						}
						fmt.Fprint(conn, "250 accepted\r\n")
					case strings.HasPrefix(line, "QUIT"):
						fmt.Fprint(conn, "221 closing\r\n")
						return
					default:
						fmt.Fprint(conn, "500 unsupported\r\n")
					}
				}
			}()
			host, portString, _ := net.SplitHostPort(listener.Addr().String())
			port, _ := strconv.Atoi(portString)
			now := time.Now()
			m := Message{Workspace: "w", Environment: "sandbox", MessageID: "durable-message-123", Subject: "রসিদ", Text: "SANDBOX receipt", Recipient: Recipient{Workspace: "w", Environment: "sandbox", Email: "user@example.com", ConsentedAt: now, VerifiedAt: now}}
			err = SendSMTP(context.Background(), SMTPConfig{Host: host, Port: port, Username: "test", Password: "test", From: "receipts@example.com", RootCAs: roots, Timeout: 3 * time.Second}, m)
			if unknown {
				if err != ErrOutcomeUnknown {
					t.Fatalf("expected unknown DATA outcome, got %v", err)
				}
			} else if err != nil {
				t.Fatal(err)
			}
			select {
			case body := <-transcript:
				if !strings.Contains(body, "durable-message-123") || !strings.Contains(body, "=?UTF-8?") {
					t.Fatal("missing stable ID or Bengali MIME encoding")
				}
			case <-time.After(4 * time.Second):
				t.Fatal("SMTP transcript missing")
			}
		})
	}
}
