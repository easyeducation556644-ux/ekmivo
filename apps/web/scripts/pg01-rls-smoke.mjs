// PG01 real PostgreSQL three-tenant + sandbox/live RLS acceptance test.
// Disposable localhost PostgreSQL ONLY. No Neon connection or secrets.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const raw=process.env.PG00_TEST_DATABASE_URL;
if(!raw)throw Error("PG00_TEST_DATABASE_URL is required");
const parsed=new URL(raw);
if(!["localhost","127.0.0.1","[::1]"].includes(parsed.hostname))throw Error("PG01 refuses non-loopback database");
if(/prod/i.test(parsed.pathname))throw Error("PG01 refuses production-named database");
const sql=postgres(raw,{max:1,prepare:false});
async function run(){
 const version=await sql`SELECT to_regclass('public.platform_auth_settings') IS NOT NULL AS ready`;
 if(!version[0]?.ready)throw Error("PG00 0001/0002 must run first");
 await sql.unsafe("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ekmivo_financial_runtime') THEN CREATE ROLE ekmivo_financial_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$");
 await sql.unsafe(await readFile(fileURLToPath(new URL("../../../infra/migrations/0003_pg01_admin_mfa.sql",import.meta.url)),"utf8"));
 await sql.unsafe(await readFile(fileURLToPath(new URL("../../../infra/migrations/0004_pg01_environment_rls.sql",import.meta.url)),"utf8"));
 const roles=await sql`SELECT rolcanlogin,rolsuper,rolbypassrls FROM pg_roles WHERE rolname='ekmivo_financial_runtime'`;
 if(roles.length!==1||roles[0].rolcanlogin||roles[0].rolsuper||roles[0].rolbypassrls)throw Error("RLS runtime role is privileged");
 const force=await sql`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('workspace_environments','workspace_environment_settings')`;
 if(force.length!==2||force.some(r=>!r.relrowsecurity||!r.relforcerowsecurity))throw Error("Tenant tables must FORCE RLS");
 const fixtures=Array.from({length:3},(_,index)=>({user:randomUUID(),workspace:randomUUID(),email:`pg01-test-${index}-${randomUUID()}@example.invalid`}));
 try{
  await sql.begin(async tx=>{
   for(const f of fixtures){
    await tx`INSERT INTO app_users(id,email,display_name,password_hash) VALUES (${f.user}::uuid,${f.email},'PG01 Isolated Tester','not-a-credential')`;
    await tx`INSERT INTO workspaces(id,name,service_mode,created_by) VALUES (${f.workspace}::uuid,'PG01 Tenant','commerce',${f.user}::uuid)`;
    await tx`INSERT INTO workspace_members(workspace_id,user_id,role) VALUES (${f.workspace}::uuid,${f.user}::uuid,'owner')`;
    const seeded=await tx`SELECT count(*)::int AS n FROM workspace_environments WHERE workspace_id=${f.workspace}::uuid`;
    if(seeded[0].n!==2)throw Error("New workspace did not automatically seed sandbox and live contexts");
   }
   const first=fixtures[0],second=fixtures[1],third=fixtures[2];
   async function asRuntime(user,workspace,env,run){
    await tx`SET LOCAL ROLE ekmivo_financial_runtime`;
    try {
     await tx`SELECT set_config('ekmivo.user_id',${user},true),
      set_config('ekmivo.workspace_id',${workspace},true),
      set_config('ekmivo.environment',${env},true)`;
     return await run();
    }finally{
     await tx`RESET ROLE`;
     await tx`SELECT set_config('ekmivo.user_id','',true),
      set_config('ekmivo.workspace_id','',true),
      set_config('ekmivo.environment','',true)`;
    }
   }
   for(const f of fixtures){
    for(const env of ["sandbox","live"]){
     await asRuntime(f.user,f.workspace,env,async()=>{
      const rows=await tx`SELECT workspace_id,environment FROM workspace_environment_settings`;
      if(rows.length!==1||rows[0].workspace_id!==f.workspace||rows[0].environment!==env)
       throw Error("PG01 tenant+environment RLS isolation failed");
      const scoped=await tx`SELECT count(*)::int AS n FROM workspace_environments`;
      if(scoped[0].n!==1)throw Error("Environment scope leaked");
     });
    }
   }
   await asRuntime(first.user,second.workspace,"sandbox",async()=>{
    const rows=await tx`SELECT * FROM workspace_environment_settings`;
    if(rows.length)throw Error("Cross-tenant actor leaked settings");
   });
   await asRuntime(first.user,first.workspace,"live",async()=>{
    const updated=await tx`UPDATE workspace_environment_settings SET checkout_expiry_minutes=33
      WHERE workspace_id=${first.workspace}::uuid AND environment='sandbox' RETURNING *`;
    if(updated.length)throw Error("Sandbox updated from live context");
   });
   await asRuntime(first.user,first.workspace,"sandbox",async()=>{
    const updated=await tx`UPDATE workspace_environment_settings SET checkout_expiry_minutes=33
      WHERE workspace_id=${first.workspace}::uuid AND environment='sandbox' RETURNING *`;
    if(updated.length!==1||updated[0].checkout_expiry_minutes!==33)throw Error("Authorized owner update denied");
   });
   await tx`UPDATE workspace_members SET role='viewer' WHERE workspace_id=${first.workspace}::uuid AND user_id=${first.user}::uuid`;
   await asRuntime(first.user,first.workspace,"sandbox",async()=>{
    const updated=await tx`UPDATE workspace_environment_settings SET checkout_expiry_minutes=55
     WHERE workspace_id=${first.workspace}::uuid AND environment='sandbox' RETURNING *`;
    if(updated.length)throw Error("Viewer gained environment edit privilege");
   });
   await tx`DELETE FROM workspace_members WHERE workspace_id=${second.workspace}::uuid AND user_id=${second.user}::uuid`;
   await asRuntime(second.user,second.workspace,"live",async()=>{
    if((await tx`SELECT * FROM workspace_environments`).length)throw Error("Removed member retained access");
   });
   await tx`UPDATE app_users SET disabled_at=now() WHERE id=${third.user}::uuid`;
   await asRuntime(third.user,third.workspace,"live",async()=>{
    if((await tx`SELECT * FROM workspace_environments`).length)throw Error("Disabled user retained access");
   });
   await tx`SET LOCAL ROLE ekmivo_financial_runtime`;
   const empty=await tx`SELECT * FROM workspace_environment_settings`;
   if(empty.length)throw Error("Missing context leaked rows");
   await tx`RESET ROLE`;
   throw Error("INTENTIONAL_PG01_ROLLBACK");
  });
 }catch(e){if(e.message!=="INTENTIONAL_PG01_ROLLBACK")throw e;}
 const left=await sql`SELECT count(*)::int AS n FROM app_users WHERE id=${fixtures[0].user}::uuid`;
 if(left[0].n!==0)throw Error("Rollback leaked user fixture");
 // Context reset after rollback must not carry across pooled requests.
 await sql`SET ROLE ekmivo_financial_runtime`;
 try {
  const rows=await sql`SELECT * FROM workspace_environment_settings`;
  if(rows.length)throw Error("Pooled connection leaked transaction context");
 }finally{await sql`RESET ROLE`;}
 await sql.unsafe("ALTER ROLE ekmivo_financial_runtime LOGIN PASSWORD 'pg01-ci-only-password'");
 console.log("PG01 PASS: 3 tenants x 2 environments; FORCE RLS; missing context; removed/disabled/viewer; cross-env; rollback/pool cleanup");
}
try{await run();}catch(e){console.error("PG01 FAIL:",e instanceof Error?e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g,"[redacted]"):"unknown");process.exitCode=1;}finally{await sql.end({timeout:3});}
