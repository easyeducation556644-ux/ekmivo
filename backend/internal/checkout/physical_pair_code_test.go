package checkout

import (
 "testing"
)

func TestPhysicalPairingCodeShape(t *testing.T) {
 seen := make(map[string]struct{}, 2500)
 for i:=0;i<2500;i++ {
  code,err:=randomPhysicalPairingCode()
  if err!=nil { t.Fatal(err) }
  if !physicalPairingCodePattern.MatchString(code) {t.Fatalf("invalid code %q",code)}
  if _,exists:=seen[code];exists { t.Fatalf("duplicate generated code %q",code) }
  seen[code]=struct{}{}
 }
}
