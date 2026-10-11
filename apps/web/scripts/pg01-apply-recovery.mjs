import postgres from 'postgres';
import {readFile} from 'node:fs/promises';
if(process.env.PG01_APPLY_MFA_RECOVERY!=='true')throw Error('Explicit PG01_APPLY_MFA_RECOVERY=true required');
const url=new URL(process.env.DATABASE_URL);url.hostname=url.hostname.replace('-pooler.','.');
const sql=postgres(url.toString(),{ssl:'require',max:1,prepare:false});
try{
 const before=await sql`SELECT (SELECT count(*)::int FROM app_users) AS users,(SELECT count(*)::int FROM platform_admin_mfa) AS enrollments`;
 await sql.unsafe(await readFile(new URL('../../../infra/migrations/0006_pg01_mfa_recovery.sql',import.meta.url),'utf8'));
 const after=await sql`SELECT (SELECT count(*)::int FROM app_users) AS users,(SELECT count(*)::int FROM platform_admin_mfa) AS enrollments,to_regclass('public.platform_admin_recovery_codes') IS NOT NULL AS ready`;
 if(!after[0].ready||before[0].users!==after[0].users||before[0].enrollments!==after[0].enrollments)throw Error('Migration preservation assertion failed');
 console.log('PG01 recovery migration applied; existing users and enrollments unchanged.');
}catch{console.error('Migration failed; connection details suppressed.');process.exitCode=1;}finally{await sql.end();}