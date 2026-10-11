// PG02 product-access + audit + FORCE RLS integration on disposable local PG.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {fileURLToPath} from "node:url";
import postgres from "postgres";
const url=process.env.PG00_TEST_DATABASE_URL;
if(!url)throw Error("PG02 requires PG00_TEST_DATABASE_URL");
const parsed=new URL(url);
if(!["localhost","127.0.0.1","[::1]"].includes(parsed.hostname)||/prod/i.test(parsed.pathname))throw Error("Refusing remote/production database");
const sql=postgres(url,{max:1,prepare:false});
const migration=fileURLToPath(new URL("../../../infra/migrations/0005_pg02_product_access.sql",import.meta.url));
try{
 await sql.unsafe(await readFile(migration,"utf8"));
 const roles=await sql`SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='workspace_product_access'`;
 assert.equal(roles.length,1);assert.ok(roles[0].relrowsecurity&&roles[0].relforcerowsecurity);
 const ids=[randomUUID(),randomUUID()],workspaces=[randomUUID(),randomUUID()];
 try{
  await sql.begin(async tx=>{
   for(let i=0;i<2;i++){
    await tx`INSERT INTO app_users(id,email,display_name,password_hash)
     VALUES(${ids[i]}::uuid,${"pg02-product-"+ids[i]+"@example.invalid"},'PG02 Tester','not-a-password')`;
    await tx`INSERT INTO workspaces(id,name,service_mode,created_by)
     VALUES(${workspaces[i]}::uuid,'Isolated Product Workspace',${i===0?"both":"ai"},${ids[i]}::uuid)`;
    await tx`INSERT INTO workspace_members(workspace_id,user_id,role)
     VALUES(${workspaces[i]}::uuid,${ids[i]}::uuid,'owner')`;
   }
   const initial=await tx`SELECT product,enabled FROM workspace_product_access WHERE workspace_id=${workspaces[0]}::uuid ORDER BY product`;
   assert.deepEqual(initial.map(r=>[r.product,r.enabled]),[["ai",true],["payments",true]]);
   const second=await tx`SELECT product,enabled FROM workspace_product_access WHERE workspace_id=${workspaces[1]}::uuid ORDER BY product`;
   assert.deepEqual(second.map(r=>[r.product,r.enabled]),[["ai",true],["payments",false]]);
   await tx`UPDATE workspace_product_access SET enabled=false WHERE workspace_id=${workspaces[0]}::uuid`;
   const off=await tx`SELECT bool_or(enabled) AS any_enabled FROM workspace_product_access WHERE workspace_id=${workspaces[0]}::uuid`;
   assert.equal(off[0].any_enabled,false,"Both-off unavailable");
   const before=await tx`SELECT enabled FROM workspace_product_access WHERE workspace_id=${workspaces[1]}::uuid AND product='payments'`;
   const actorRows=await tx`SELECT role FROM workspace_members WHERE workspace_id=${workspaces[1]}::uuid AND user_id=${ids[0]}::uuid FOR UPDATE`;
   assert.equal(actorRows.length,0,"Cross-tenant actor could authorize update");
   const after=await tx`SELECT enabled FROM workspace_product_access WHERE workspace_id=${workspaces[1]}::uuid AND product='payments'`;
   assert.equal(after[0].enabled,before[0].enabled,"Cross-tenant product state mutated");
   await tx`INSERT INTO workspace_product_access_audit(workspace_id,actor_id,product,previous_enabled,new_enabled)
    VALUES(${workspaces[0]}::uuid,${ids[0]}::uuid,'payments',true,false)`;
   assert.equal((await tx`SELECT count(*)::int AS n FROM workspace_product_access_audit WHERE workspace_id=${workspaces[0]}::uuid`)[0].n,1);
   await tx`SET LOCAL ROLE ekmivo_financial_runtime`;
   assert.equal((await tx`SELECT count(*)::int AS n FROM workspace_product_access`)[0].n,0,"Missing context disclosed business products");
   await tx`SELECT set_config('ekmivo.user_id',${ids[0]},true),
    set_config('ekmivo.workspace_id',${workspaces[0]},true),set_config('ekmivo.environment','sandbox',true)`;
   const visible=await tx`SELECT product FROM workspace_product_access ORDER BY product`;
   assert.deepEqual(visible.map(x=>x.product),["ai","payments"]);
   await tx`SELECT set_config('ekmivo.workspace_id',${workspaces[1]},true)`;
   assert.equal((await tx`SELECT count(*)::int AS n FROM workspace_product_access`)[0].n,0,"Forged cross-business context read product rows");
   await tx`RESET ROLE`;
   throw Error("INTENTIONAL_PG02_PRODUCT_ROLLBACK");
  });
 }catch(e){if(e.message!=="INTENTIONAL_PG02_PRODUCT_ROLLBACK")throw e;}
 assert.equal((await sql`SELECT count(*)::int AS n FROM app_users WHERE id=${ids[0]}::uuid`)[0].n,0,"Rollback failed");
 console.log("PG02 PASS: seed both states, AI-only, both-off, audited toggles, cross-tenant deny, FORCE RLS and rollback");
}catch(e){
 console.error("PG02 product FAIL:",e instanceof Error?e.message:"unknown");process.exitCode=1;
}finally{await sql.end({timeout:3});}
