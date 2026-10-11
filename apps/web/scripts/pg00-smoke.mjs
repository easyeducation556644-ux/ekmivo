// PG00: migration and transaction safety smoke against a fresh, disposable LOCAL PostgreSQL database only.
// Never point this at Neon production or a shared database. No real accounts, sessions or receipt data.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const urlText=process.env.PG00_TEST_DATABASE_URL;
if(!urlText)throw Error("PG00_TEST_DATABASE_URL is required (localhost-only)");
const url=new URL(urlText);
if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname))
 throw Error("PG00 smoke refuses non-loopback database targets");
if(!url.pathname || url.pathname==="/" || /prod/i.test(url.pathname))
 throw Error("PG00 test database must have a specific non-production name");

const migrations=[
 "../../infra/migrations/0001_auth_workspaces.sql",
 "../../infra/migrations/0002_account_recovery_admin.sql",
];
const sql=postgres(urlText,{max:1,prepare:false,connect_timeout:8,ssl:false});
const testId=randomUUID();
try {
 for (const relative of migrations) {
  const filename=fileURLToPath(new URL(relative,import.meta.url));
  const body=await readFile(filename,"utf8");
  await sql.unsafe(body);
 }
 const tableRows=await sql`SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN
  ('app_users','auth_sessions','auth_attempts','workspaces','workspace_members',
  'platform_administrators','platform_auth_settings','auth_one_time_codes','platform_admin_audit')`;
 if(tableRows.length!==9) throw Error("PG00 migration schema incomplete");
 const flags=await sql`SELECT email_verification_enabled FROM platform_auth_settings WHERE singleton=true`;
 if(flags.length!==1 || flags[0].email_verification_enabled!==false)
  throw Error("Email verification must default OFF");

 const rollbackSignal=new Error("PG00_ROLLBACK_INTENTIONAL");
 try {
  await sql.begin(async tx=>{
   await tx`INSERT INTO app_users(id,email,display_name,password_hash)
    VALUES (${testId}::uuid,${"pg00-"+testId+"@example.invalid"},'PG00 Test User','test-only-unusable-hash')`;
   await tx`INSERT INTO workspaces(name,service_mode,created_by)
    VALUES ('PG00 ephemeral','commerce',${testId}::uuid)`;
   const joined=await tx`SELECT count(*)::int AS n FROM workspaces WHERE created_by=${testId}::uuid`;
   if(joined[0].n!==1)throw Error("PG00 workspace insert failed");
   throw rollbackSignal;
  });
 }catch(error) { if(error!==rollbackSignal)throw error; }

 const after=await sql`SELECT count(*)::int AS n FROM app_users WHERE id=${testId}::uuid`;
 if(after[0].n!==0)throw Error("Rollback leaked an uncommitted user");
 const workspaces=await sql`SELECT count(*)::int AS n FROM workspaces WHERE created_by=${testId}::uuid`;
 if(workspaces[0].n!==0)throw Error("Rollback leaked uncommitted workspace");

 console.log("PG00 OK: local PostgreSQL 17; migrations 0001/0002; 9 tables; verification OFF; transaction rollback");
} catch(error) {
 console.error("PG00 FAILED:",error instanceof Error?error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g,"[redacted]"):"unknown error");
 process.exitCode=1;
} finally {
 await sql.end({timeout:3});
}
