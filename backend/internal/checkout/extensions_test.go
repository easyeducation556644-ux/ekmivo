package checkout

import (
	"net/http/httptest"
	"testing"
)

func TestInvoiceFinancialBounds(t *testing.T) {
	valid := func() DocumentBody {
		return DocumentBody{Reference: "test-invoice", Items: []DocumentItem{{Title: "Physical goods", Quantity: 2, Unit: 5000}}, Tax: 500, Shipping: 200, Discount: 100}
	}
	if err := func() error { b := valid(); return b.validate("invoices") }(); err != nil {
		t.Fatal(err)
	}
	cases := map[string]func(*DocumentBody){
		"overflowing item":     func(b *DocumentBody) { b.Items[0].Quantity = 9999; b.Items[0].Unit = 100000000000 },
		"negative price":       func(b *DocumentBody) { b.Items[0].Unit = -1 },
		"negative tax":         func(b *DocumentBody) { b.Tax = -1 },
		"discount wipes total": func(b *DocumentBody) { b.Discount = 10700 },
		"fractional quantity cannot fit integer contract": func(b *DocumentBody) { b.Items[0].Quantity = 0 },
		"unidentified item": func(b *DocumentBody) { b.Items[0].Title = " " },
		"unsafe return URL": func(b *DocumentBody) { b.ReturnURL = "http://127.0.0.1/private" },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			b := valid()
			change(&b)
			if b.validate("invoices") == nil {
				t.Fatal("invalid financial terms accepted")
			}
		})
	}
}

func TestCustomFieldsCannotOverrideQuantityOrHaveAmbiguousOptions(t *testing.T) {
	for _, field := range []CustomField{
		{ID: "_quantity", Label: "Quantity", Type: "text"},
		{ID: "choice", Label: "Choice", Type: "radio", Options: []string{"one", "one"}},
		{ID: "choice", Label: "Choice", Type: "checkbox", Options: []string{" "}},
		{ID: "choice", Label: "Choice", Type: "select"},
	} {
		b := DocumentBody{Reference: "test-link", Amount: 100, Fields: []CustomField{field}}
		if b.validate("payment-links") == nil {
			t.Fatal("unsafe custom field accepted")
		}
	}
	b := DocumentBody{Reference: "test-link", Amount: 100, Fields: []CustomField{{ID: "choice", Label: "Choice", Type: "radio", Options: []string{"one", "two"}}}}
	if b.validate("payment-links") != nil {
		t.Fatal("valid radio rejected")
	}
}

func TestRefundRequiresRealContactAndBoundedAmount(t *testing.T) {
	base := RefundRequest{Amount: 100, Name: "Customer", Phone: "01712345678", Reason: "Incorrect item received"}
	if !base.valid() || base.Phone != "+8801712345678" {
		t.Fatal("valid contact not normalized")
	}
	for _, change := range []func(*RefundRequest){func(b *RefundRequest) { b.Amount = 0 }, func(b *RefundRequest) { b.Amount = 100000000001 }, func(b *RefundRequest) { b.Phone = "017****5678" }, func(b *RefundRequest) { b.Phone = ""; b.Email = "" }, func(b *RefundRequest) { b.Reason = "short" }} {
		b := base
		change(&b)
		if b.valid() {
			t.Fatal("invalid refund accepted")
		}
	}
}

func TestOperationFiltersRejectMalformedCrossScopePivots(t *testing.T) {
	for _, query := range []string{"cursor=not-a-uuid", "account=../../other", "status=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"} {
		if validOperationFilters(httptest.NewRequest("GET", "/?"+query, nil)) {
			t.Fatal("malformed filter accepted")
		}
	}
	if !validOperationFilters(httptest.NewRequest("GET", "/?cursor=1d7c6c81-987e-4a44-a7a0-51b5a4c81234&status=linked", nil)) {
		t.Fatal("valid filter rejected")
	}
}
