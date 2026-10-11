import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { database } from "./db";

export type CodePurpose = "verify_email" | "reset_password";
export function mailReady() {
 return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.OTP_PEPPER && process.env.OTP_PEPPER.length >= 32);
}
export async function verificationEnabled():Promise<boolean> {
 const rows=await database()`SELECT email_verification_enabled FROM platform_auth_settings WHERE singleton=true`;
 return rows.length > 0 && rows[0].email_verification_enabled === true;
}
function signature(userId:string,purpose:CodePurpose,code:string) {
 const pepper=process.env.OTP_PEPPER;
 if(!pepper || pepper.length<32) throw Error("EMAIL_CONFIG_MISSING");
 return createHmac("sha256",pepper).update(userId+":"+purpose+":"+code).digest("hex");
}
async function deliver(email:string,code:string,purpose:CodePurpose) {
 if(!mailReady()) throw Error("EMAIL_CONFIG_MISSING");
 const title=purpose==="verify_email"?"Verify your Ekmivo email":"Reset your Ekmivo password";
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",cache:"no-store",
  headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject:title,
   text:`Your Ekmivo security code: ${code}\n\nThis code expires in 10 minutes. Never share it. If this wasn't you, ignore this message.`})
 });
 if(!response.ok) throw Error("EMAIL_DELIVERY_FAILED");
}
export async function sendCode(userId:string,email:string,purpose:CodePurpose){
 if(!mailReady()) throw Error("EMAIL_CONFIG_MISSING");
 const sql=database();
 // Throttle across serverless instances. Two concurrent requests can still race:
 // this is supplemented by per-code attempt caps and should later use a DB advisory lock.
 const recent=await sql`SELECT created_at FROM auth_one_time_codes
  WHERE user_id=${userId}::uuid AND purpose=${purpose}
  ORDER BY created_at DESC LIMIT 6`;
 const now=Date.now();
 if(recent.length && now-new Date(recent[0].created_at).getTime()<60_000)
  return {ok:false,reason:"cooldown"} as const;
 if(recent.filter(r=>now-new Date(r.created_at).getTime()<3600_000).length>=5)
  return {ok:false,reason:"hourly_limit"} as const;
 const code=String(randomInt(0,1_000_000)).padStart(6,"0");
 const digest=signature(userId,purpose,code);
 const rows=await sql`INSERT INTO auth_one_time_codes(user_id,purpose,code_hash,expires_at)
 VALUES (${userId}::uuid,${purpose},${digest},now()+interval '10 minutes') RETURNING id`;
 try{await deliver(email,code,purpose);}
 catch(error){
  await sql`UPDATE auth_one_time_codes SET consumed_at=now() WHERE id=${rows[0].id}::uuid`;
  throw error;
 }
 return {ok:true} as const;
}
export async function consumeCode(userId:string,purpose:CodePurpose,code:string):Promise<boolean>{
 if(!/^\d{6}$/.test(code) || !mailReady()) return false;
 const sql=database();
 // Claim an attempt atomically and lock the matching challenge.
 return sql.begin(async tx=>{
  const rows=await tx`SELECT id,code_hash FROM auth_one_time_codes
    WHERE user_id=${userId}::uuid AND purpose=${purpose}
      AND consumed_at IS NULL AND expires_at>now() AND attempts<5
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;
  if(!rows.length)return false;
  const expected=Buffer.from(String(rows[0].code_hash),"hex");
  const supplied=Buffer.from(signature(userId,purpose,code),"hex");
  const valid=expected.length===supplied.length && timingSafeEqual(expected,supplied);
  await tx`UPDATE auth_one_time_codes SET attempts=attempts+1,
    consumed_at=CASE WHEN ${valid} OR attempts>=4 THEN now() ELSE consumed_at END
    WHERE id=${rows[0].id}::uuid`;
  return valid;
 });
}
