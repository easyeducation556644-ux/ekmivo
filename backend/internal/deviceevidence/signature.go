package deviceevidence

import (
 "crypto/ecdsa"
 "crypto/elliptic"
 "crypto/sha256"
 "crypto/x509"
 "errors"
 "fmt"
 "regexp"
 "strconv"
 "strings"
 "time"
)

var (
 validMethod=regexp.MustCompile(`^[A-Z]{3,10}$`)
 validTimestamp=regexp.MustCompile(`^[0-9]{10,16}$`)
 validEventID=regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)
)
const allowedTransportSkew=5*time.Minute

// CanonicalRequest implements the same raw-body signature input as
// DeviceSignatureCanonicalizer in the native Kotlin client.
// Enrollment, tenant/environment/account binding and receipt parsing MUST
// be validated separately. A verified device signature is not a paid event.
func CanonicalRequest(method,path,transportTimestamp,eventID string,rawBody []byte)([]byte,error){
 if !validMethod.MatchString(method) {return nil,errors.New("invalid request method")}
 if !strings.HasPrefix(path,"/")||strings.ContainsAny(path,"\r\n"){return nil,errors.New("invalid request path")}
 if !validTimestamp.MatchString(transportTimestamp){return nil,errors.New("invalid transport timestamp")}
 if !validEventID.MatchString(eventID){return nil,errors.New("invalid event ID")}
 digest:=sha256.Sum256(rawBody)
 return []byte(fmt.Sprintf("%s\n%s\n%s\n%s\n%x",method,path,transportTimestamp,eventID,digest)),nil
}

// TimestampWithinSkew checks the transport signature's freshness, not the
// historical receipt transaction time. Offline replay must re-sign at send time.
func TimestampWithinSkew(timestamp string, now time.Time)bool{
 if !validTimestamp.MatchString(timestamp){return false}
 seconds,err:=strconv.ParseInt(timestamp,10,64)
 if err!=nil{return false}
 t:=time.Unix(seconds,0)
 delta:=now.Sub(t)
 return delta>=-allowedTransportSkew && delta<=allowedTransportSkew
}

// VerifyP256DER checks a Keystore SHA256withECDSA (DER) signature against an
// enrolled public X.509 SubjectPublicKeyInfo key. It does not determine which
// tenant, source, receiving account or financial intent is authorized.
func VerifyP256DER(publicKeySPKI,canonical,signatureDER []byte)bool{
 if len(publicKeySPKI)==0||len(canonical)==0||len(signatureDER)==0{return false}
 generic,err:=x509.ParsePKIXPublicKey(publicKeySPKI)
 if err!=nil{return false}
 key,ok:=generic.(*ecdsa.PublicKey)
 if !ok||key.Curve.Params().Name!=elliptic.P256().Params().Name{return false}
 digest:=sha256.Sum256(canonical)
 return ecdsa.VerifyASN1(key,digest[:],signatureDER)
}
