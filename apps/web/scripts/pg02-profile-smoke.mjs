// PG02 account/session state test against disposable localhost PostgreSQL.
// Uses no real identities and rolls back all fixtures.
import assert from "node:assert/strict";
import {createHash,randomUUID,randomBytes} from "node:crypto";
import postgres from "postgres";
const raw=process.env.PG00_TEST_DATABASE_URL;
if(!raw)throw Error("PG02 needs PG00_TEST_DATABASE_URL");
const u=new URL(raw);
if(!["localhost","127.0.0.1","[::1]"].includes(u.hostname)||/prod/i.test(u.pathname))throw Error("PG02 cannot run on production database");
const sql=postgres(raw,{max:1,prepare:false});
const ids=[randomUUID(),randomUUID()];
const hex=()=>createHash("sha256").update(randomBytes(32)).digest("hex");
const tokens=[hex(),hex(),hex()];
try {
 try{
  await sql.begin(async tx=>{
   for(let i=0;i<2;i++){
    await tx`INSERT INTO app_users(id,email,display_name,password_hash)
     VALUES(${ids[i]}::uuid,${"pg02-profile-"+ids[i]+"@example.invalid"},'PG02 Isolated','invalid-fixture')`;
   }
   for(const [i,actor] of [ids[0],ids[0],ids[1]].entries()){
    await tx`INSERT INTO auth_sessions(user_id,token_hash,expires_at)
     VALUES(${actor}::uuid,${tokens[i]},now()+interval '1 day')`;
   }
   const name="বাংলা দোকান";
   const update=await tx`UPDATE app_users SET display_name=${name},updated_at=now()
    WHERE id=${ids[0]}::uuid AND disabled_at IS NULL RETURNING id`;
   assert.equal(update.length,1);
   const names=await tx`SELECT id,display_name FROM app_users WHERE id IN (${ids[0]}::uuid,${ids[1]}::uuid) ORDER BY id`;
   assert.equal(names.find(x=>x.id===ids[0]).display_name,name,"Profile update not persisted");
   assert.equal(names.find(x=>x.id===ids[1]).display_name,"PG02 Isolated","Other account mutated");
   const revoked=await tx`UPDATE auth_sessions SET revoked_at=now()
    WHERE user_id=${ids[0]}::uuid AND token_hash<>${tokens[0]}
    AND revoked_at IS NULL AND expires_at>now() RETURNING id`;
   assert.equal(revoked.length,1,"Only other sessions of this actor must revoke");
   const sessions=await tx`SELECT user_id,token_hash,revoked_at FROM auth_sessions WHERE user_id IN (${ids[0]}::uuid,${ids[1]}::uuid)`;
   assert.equal(sessions.filter(x=>x.revoked_at===null).length,2,"Actor current and other user's session retained");
   assert.equal(sessions.find(x=>x.token_hash.trim()===tokens[0]).revoked_at,null,"Current session revoked");
   assert.equal(sessions.find(x=>x.token_hash.trim()===tokens[1]).revoked_at!==null,true,"Other session still active");
   assert.equal(sessions.find(x=>x.token_hash.trim()===tokens[2]).revoked_at,null,"Other tenant session revoked");
   const duplicate=await tx`UPDATE auth_sessions SET revoked_at=now()
    WHERE user_id=${ids[0]}::uuid AND token_hash<>${tokens[0]}
    AND revoked_at IS NULL AND expires_at>now() RETURNING id`;
   assert.equal(duplicate.length,0,"Revocation should be idempotent");
   throw Error("INTENTIONAL_PG02_PROFILE_ROLLBACK");
  });
 }catch(error){if(error.message!=="INTENTIONAL_PG02_PROFILE_ROLLBACK")throw error;}
 const rows=await sql`SELECT count(*)::int AS n FROM app_users WHERE id=${ids[0]}::uuid`;
 assert.equal(rows[0].n,0,"Profile fixture rollback failed");
 console.log("PG02 PASS: profile write is actor-scoped, other-session revoke idempotent, current and other actor retained, rollback");
}catch(error){
 console.error("PG02 profile FAIL:",error instanceof Error?error.message:"unknown");
 process.exitCode=1;
}finally{await sql.end({timeout:3});}
