import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { randomUUID, createHash, randomBytes } from "node:crypto";
const url=new URL(process.env.PG00_TEST_DATABASE_URL||"http://invalid");
if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname))throw Error("Disposable CI database only");
const sql=postgres(url.toString(),{max:1,prepare:false});
const user=randomUUID();
try {
 const migration=await readFile(new URL("../../../infra/migrations/0006_pg01_mfa_recovery.sql",import.meta.url),"utf8");
 await sql.unsafe(migration);await sql.unsafe(migration);
 await sql`INSERT INTO app_users(id,email,display_name,password_hash) VALUES(${user},${user+"@example.invalid"},'Recovery schema fixture','not-a-login')`;
 const code=randomBytes(24).toString("base64url"),digest=createHash("sha256").update(user+":"+code).digest("hex");
 await sql`INSERT INTO platform_admin_recovery_codes(user_id,code_hash) VALUES(${user},${digest})`;
 const outcomes=await Promise.all(Array.from({length:2},()=>sql`UPDATE platform_admin_recovery_codes SET consumed_at=now() WHERE user_id=${user} AND code_hash=${digest} AND consumed_at IS NULL RETURNING user_id`));
 if(outcomes.reduce((sum,rows)=>sum+rows.length,0)!==1)throw Error("Recovery code reused");
 const stored=await sql`SELECT code_hash FROM platform_admin_recovery_codes WHERE user_id=${user}`;
 if(stored[0].code_hash===code||stored[0].code_hash!==digest)throw Error("Secret storage violation");
 await sql`SET ROLE ekmivo_financial_runtime`;
 try {
  let denied=false;
  try {await sql`SELECT code_hash FROM platform_admin_recovery_codes`;}catch(error){denied=error.code==="42501";}
  if(!denied)throw Error("Financial runtime can read recovery material");
 } finally {await sql`RESET ROLE`;}
 console.log("PG01 recovery schema: repeat migration, hash-only storage, single-use consume PASS");
} finally {await sql`DELETE FROM app_users WHERE id=${user}`;await sql.end();}
