package deviceevidence

import (
	"testing"
	"time"
)

func TestStrictReceiptParser(t *testing.T) {
	r := ParserRule{ID: "fixture-v1", Version: 1, Source: "fixture", Method: "bkash", Pattern: `^Received (?P<amount>[0-9.]+) from (?P<payer>\+880[0-9]+) at (?P<time>[0-9: -]+) ref (?P<reference>[A-Z0-9]+)$`, TimeLayout: "2006-01-02 15:04:05", TimeZone: "Asia/Dhaka", Precision: "second", Approved: true, SandboxOnly: true}
	valid := "Received 10.25 from +8801712345678 at 2026-10-11 12:00:00 ref SAMPLE1"
	p, e := r.Parse("fixture", "sandbox", valid)
	if e != nil || p.Amount != 1025 || p.TransactionAt.Location().String() != "Asia/Dhaka" {
		t.Fatal("exact receipt not parsed", e)
	}
	for _, test := range []struct{ source, realm, body string }{{"fixture", "live", valid}, {"wrong", "sandbox", valid}, {"fixture", "sandbox", "OTP 123456"}, {"fixture", "sandbox", "Sent 10.25 from +8801712345678 at 2026-10-11 12:00:00 ref SAMPLE1"}} {
		if _, e = r.Parse(test.source, test.realm, test.body); e == nil {
			t.Fatal("unsafe receipt accepted")
		}
	}
	if !p.TransactionAt.Before(time.Now().AddDate(10, 0, 0)) {
		t.Fatal("unexpected time")
	}
}
