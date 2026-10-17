package receiptnotice

import (
	"strings"
	"testing"
	"time"
)

func TestMessageUsesStableIDAndRejectsUnsafeOrUnconsentedRecipient(t *testing.T) {
	now := time.Unix(1700000000, 0)
	c := SMTPConfig{From: "receipts@example.com"}
	m := Message{Recipient: Recipient{Workspace: "a", Environment: "sandbox", Email: "user@example.com", ConsentedAt: now, VerifiedAt: now}, Workspace: "a", Environment: "sandbox", MessageID: "persisted-outbox-id", Subject: "Payment receipt", Text: "Verified amount\nSandbox — no real money"}
	body, err := EncodeMessage(c, m, now)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), "Message-ID: <persisted-outbox-id@example.com>") || !strings.Contains(string(body), "\r\nSandbox") {
		t.Fatal("wrong message encoding")
	}
	m.Subject = "receipt\r\nBcc: victim@example.com"
	if _, err = EncodeMessage(c, m, now); err == nil {
		t.Fatal("header injection")
	}
	m.Subject = "receipt"
	m.Recipient.WithdrawnAt = now
	if _, err = EncodeMessage(c, m, now); err == nil {
		t.Fatal("withdrawn consent accepted")
	}
}

func TestInvoiceHTMLAlternativeIsEncodedAndLegacyReceiptsRemainPlain(t *testing.T) {
	now := time.Unix(1700000000,0)
	config := SMTPConfig{From:"receipts@example.com"}
	m := Message{MerchantRequestedDocument:true,Recipient:Recipient{Workspace:"workspace",Environment:"sandbox",Email:"payer@example.com",ConsentedAt:now},
	 Workspace:"workspace",Environment:"sandbox",MessageID:"invoice-message-12345",Subject:"Invoice INV-0001",Text:"Invoice text",HTML:"<p>Invoice &amp; pay</p>"}
	body, err := EncodeMessage(config,m,now)
	if err != nil {t.Fatal(err)}
	if !strings.Contains(string(body),"multipart/alternative")||!strings.Contains(string(body),"Content-Type: text/html; charset=UTF-8")||!strings.Contains(string(body),"Content-Transfer-Encoding: base64") {t.Fatal("HTML alternative not encoded")}
	m.HTML=""
	body,err=EncodeMessage(config,m,now)
	if err!=nil {t.Fatal(err)}
	if strings.Contains(string(body),"multipart/alternative")||!strings.Contains(string(body),"Content-Type: text/plain") {t.Fatal("text-only notices must remain unchanged")}
}
