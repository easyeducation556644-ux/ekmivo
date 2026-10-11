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
