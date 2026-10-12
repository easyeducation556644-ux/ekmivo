package financial

import "time"

// ExactMatch is shared by the candidate explanation layer. PostgreSQL repeats
// these checks under locks before committing any verified funds.
type MatchFields struct {
	Payer, Account, Method, Currency, Precision string
	Amount                                      int64
	At, Start, End                              time.Time
	Incoming, Cancelled                         bool
}

func MatchReasons(receipt, attempt MatchFields) []string {
	reasons := []string{}
	if !receipt.Incoming {
		reasons = append(reasons, "not_incoming")
	}
	if receipt.Payer == "" || receipt.Payer != attempt.Payer {
		reasons = append(reasons, "payer_mismatch")
	}
	if receipt.Account == "" || receipt.Account != attempt.Account {
		reasons = append(reasons, "account_mismatch")
	}
	if receipt.Method == "" || receipt.Method != attempt.Method {
		reasons = append(reasons, "method_mismatch")
	}
	if receipt.Amount <= 0 || receipt.Amount != attempt.Amount {
		reasons = append(reasons, "amount_mismatch")
	}
	if receipt.Currency != attempt.Currency {
		reasons = append(reasons, "currency_mismatch")
	}
	if attempt.Cancelled {
		reasons = append(reasons, "cancelled_intent")
	}
	if receipt.At.IsZero() || (receipt.Precision != "second" && receipt.Precision != "minute") {
		reasons = append(reasons, "missing_original_time")
	} else if receipt.At.Before(attempt.Start) || !receipt.At.Before(attempt.End) || receipt.Precision == "minute" && receipt.At.Add(time.Minute).After(attempt.End) {
		reasons = append(reasons, "outside_original_window")
	}
	return reasons
}
