package financial

import (
	"testing"
	"time"
)

func TestOriginalTimeWindow(t *testing.T) {
	start := time.Date(2026, 10, 11, 0, 0, 0, 0, time.UTC)
	a := MatchFields{Payer: "full", Account: "account", Method: "bkash", Currency: "BDT", Amount: 100, Start: start, End: start.Add(time.Minute)}
	r := a
	r.Incoming = true
	r.Precision = "minute"
	r.At = start
	if len(MatchReasons(r, a)) != 0 {
		t.Fatal("contained minute rejected")
	}
	r.At = start.Add(time.Second)
	if len(MatchReasons(r, a)) == 0 {
		t.Fatal("partially contained minute accepted")
	}
	r.Precision = "second"
	r.At = a.End
	if len(MatchReasons(r, a)) == 0 {
		t.Fatal("exclusive end accepted")
	}
	r.At = start
	a.Cancelled = true
	if len(MatchReasons(r, a)) == 0 {
		t.Fatal("cancelled intent accepted")
	}
}

func TestExactMatchRejectsEveryIndependentFieldAndIncompleteReceipt(t *testing.T) {
	start := time.Date(2026, 10, 11, 10, 0, 0, 0, time.UTC)
	attempt := MatchFields{Payer: "verified-full-payer-hmac", Account: "registered-account",
		Method: "bkash", Currency: "BDT", Amount: 5500,
		Start: start, End: start.Add(2 * time.Minute)}
	complete := attempt
	complete.At = start.Add(30 * time.Second)
	complete.Precision = "second"
	complete.Incoming = true
	if got := MatchReasons(complete, attempt); len(got) != 0 {
		t.Fatalf("complete fixture unexpectedly mismatched: %v", got)
	}
	cases := []struct {
		name, reason string
		change       func(*MatchFields)
	}{
		{"wrong payer", "payer_mismatch", func(m *MatchFields) { m.Payer = "different" }},
		{"missing or masked payer", "payer_mismatch", func(m *MatchFields) { m.Payer = "" }},
		{"wrong account", "account_mismatch", func(m *MatchFields) { m.Account = "other" }},
		{"wrong method", "method_mismatch", func(m *MatchFields) { m.Method = "nagad" }},
		{"underpaid", "amount_mismatch", func(m *MatchFields) { m.Amount-- }},
		{"overpaid", "amount_mismatch", func(m *MatchFields) { m.Amount++ }},
		{"currency mismatch", "currency_mismatch", func(m *MatchFields) { m.Currency = "USD" }},
		{"debit is not receipt", "not_incoming", func(m *MatchFields) { m.Incoming = false }},
		{"original timestamp missing", "missing_original_time", func(m *MatchFields) { m.At = time.Time{} }},
		{"unknown timestamp precision", "missing_original_time", func(m *MatchFields) { m.Precision = "unknown" }},
		{"receipt at exclusive end", "outside_original_window", func(m *MatchFields) { m.At = attempt.End }},
		{"receipt before start", "outside_original_window", func(m *MatchFields) { m.At = attempt.Start.Add(-time.Nanosecond) }},
		{"minute straddles end", "outside_original_window", func(m *MatchFields) {
			m.At = attempt.End.Add(-30 * time.Second)
			m.Precision = "minute"
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := complete
			tc.change(&r)
			reasons := MatchReasons(r, attempt)
			found := false
			for _, reason := range reasons {
				if reason == tc.reason {
					found = true
				}
			}
			if !found {
				t.Fatalf("expected %s, got %v", tc.reason, reasons)
			}
		})
	}
	t.Run("cancelled", func(t *testing.T) {
		other := attempt
		other.Cancelled = true
		reasons := MatchReasons(complete, other)
		if len(reasons) != 1 || reasons[0] != "cancelled_intent" {
			t.Fatalf("cancelled intent must not auto-verify: %v", reasons)
		}
	})
	t.Run("full contained minute", func(t *testing.T) {
		r := complete
		r.At = start
		r.Precision = "minute"
		if reasons := MatchReasons(r, attempt); len(reasons) != 0 {
			t.Fatalf("exact minute containment rejected: %v", reasons)
		}
	})
}
