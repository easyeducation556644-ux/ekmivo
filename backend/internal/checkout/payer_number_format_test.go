package checkout

import "testing"

// The public checkout must canonicalize exactly as the signed-SMS pipeline
// does; matching uses the canonical full payer, never a truncated suffix.
func TestNormalizePayerCheckoutFormats(t *testing.T) {
 cases:=[]struct{name,input,want string;valid bool}{
  {"local","01712345678","+8801712345678",true},
  {"international","+8801712345678","+8801712345678",true},
  {"country_without_plus","8801712345678","+8801712345678",true},
  {"plus88_prefix","+88 01712345678","+8801712345678",true},
  {"local_spaces","017 1234 5678","+8801712345678",true},
  {"local_dashes","017-1234-5678","+8801712345678",true},
  {"bangla_digits","০১৭১২৩৪৫৬৭৮","+8801712345678",true},
  {"other_network_prefix","01912345678","+8801912345678",true},
  {"too_short","0171234567","",false},
  {"too_long","017123456789","",false},
  {"invalid_operator","01012345678","",false},
  {"invalid_prefix","02712345678","",false},
  {"foreign_phone","+9101712345678","",false},
  {"double_plus","+88+01712345678","",false},
  {"letters","01712345ABC","",false},
  {"otp_string","01712345678;1234","",false},
 }
 for _,tt:=range cases {t.Run(tt.name,func(t *testing.T){
  got,ok:=NormalizePayer(tt.input)
  if ok!=tt.valid||got!=tt.want{t.Fatalf("NormalizePayer(%q)=(%q,%v); want (%q,%v)",tt.input,got,ok,tt.want,tt.valid)}
 })}
}
