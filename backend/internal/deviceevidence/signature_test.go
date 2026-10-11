package deviceevidence

import (
 "bytes"
 "crypto/ecdsa"
 "crypto/elliptic"
 "crypto/rand"
 "crypto/sha256"
 "crypto/x509"
 "strings"
 "testing"
 "time"
)

func TestCanonicalWireContract(t *testing.T){
 canonical,err:=CanonicalRequest("POST","/v1/device-events","1791600000","evt_001",[]byte("{}"))
 if err!=nil{t.Fatal(err)}
 parts:=strings.Split(string(canonical),"\n")
 if len(parts)!=5||parts[0]!="POST"||parts[1]!="/v1/device-events"||parts[2]!="1791600000"||parts[3]!="evt_001"||len(parts[4])!=64{
  t.Fatalf("unexpected canonical request: %q",canonical)
 }
 changed,err:=CanonicalRequest("POST","/v1/device-events","1791600000","evt_001",[]byte("{ }"))
 if err!=nil||bytes.Equal(canonical,changed){t.Fatal("tampered bytes must alter signature input")}
 if _,err:=CanonicalRequest("POST","/v1/device-events\nX:1","1791600000","evt_001",nil);err==nil{
  t.Fatal("newline injection must be rejected")
 }
 if _,err:=CanonicalRequest("POST","/v1/device-events","1791600000","evt\n001",nil);err==nil{
  t.Fatal("invalid event identifier must be rejected")
 }
}
func TestEnrolledP256SignatureAndTampering(t *testing.T){
 privateKey,err:=ecdsa.GenerateKey(elliptic.P256(),rand.Reader)
 if err!=nil{t.Fatal(err)}
 public,err:=x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
 if err!=nil{t.Fatal(err)}
 canonical,err:=CanonicalRequest("POST","/v1/device-events","1791600000","evt_001",[]byte("{}"))
 if err!=nil{t.Fatal(err)}
 digest:=sha256.Sum256(canonical)
 der,err:=ecdsa.SignASN1(rand.Reader,privateKey,digest[:])
 if err!=nil{t.Fatal(err)}
 if !VerifyP256DER(public,canonical,der){t.Fatal("valid P256 signature denied")}
 if VerifyP256DER(public,append(bytes.Clone(canonical),byte('x')),der){t.Fatal("tampered body accepted")}
 if VerifyP256DER(public,canonical,[]byte("invalid")){t.Fatal("malformed signature accepted")}
}
func TestTransportFreshnessIsIndependentFromOriginalTransactionTime(t *testing.T){
 now:=time.Unix(1791600000,0)
 if !TimestampWithinSkew("1791600000",now){t.Fatal("current send timestamp denied")}
 if !TimestampWithinSkew("1791599700",now){t.Fatal("exact negative skew bound denied")}
 if TimestampWithinSkew("1791599699",now){t.Fatal("too-old send timestamp accepted")}
 if TimestampWithinSkew("1791600301",now){t.Fatal("future-dated send timestamp accepted")}
 if TimestampWithinSkew("not-a-timestamp",now){t.Fatal("invalid timestamp accepted")}
}
