package checkout

import (
 "strings"
 "testing"
)

func TestInvoiceEmailEscapesUserValuesAndUsesVerifiedBalance(t *testing.T) {
 var doc invoiceEmailData
 doc.Kind="invoices"
 doc.Status="issued"
 doc.AmountMinor=1300
 doc.DueMinor=1300
 doc.Body.Items=append(doc.Body.Items,struct {
  Title string `json:"title"`
  Quantity int64 `json:"quantity"`
  UnitMinor int64 `json:"unit_amount_minor"`
 }{Title:"Course <script>alert(1)</script>",Quantity:1,UnitMinor:1200})
 doc.Body.FeeMinor=100
 html:=renderInvoiceEmail("Merchant <unsafe>","INV-0001","user@example.com","https://example.com/bn/invoice/token","https://example.com/bn/pay/token",doc)
 if strings.Contains(html,"<script>")||!strings.Contains(html,"&lt;script&gt;")||!strings.Contains(html,"BDT 13.00") {
  t.Fatal("email did not escape markup or preserve server amount")
 }
 if !strings.Contains(html,"https://example.com/bn/pay/token"){t.Fatal("pay URL missing for due invoice")}
 doc.DueMinor=0
 doc.PaidMinor=1300
 html=renderInvoiceEmail("Merchant","INV-0001","user@example.com","https://example.com/bn/invoice/token","https://example.com/bn/pay/token",doc)
 if strings.Contains(html,"https://example.com/bn/pay/token")||!strings.Contains(html,"Payment verified"){t.Fatal("verified paid invoice still offers pay")}
}
