import {NextRequest,NextResponse} from "next/server";
import {verifiedAdmin} from "../../../../lib/server/platform-admin";
import {database} from "../../../../lib/server/db";

export const dynamic="force-dynamic";
const enc=(value:unknown)=>{
 const raw=String(value??"");
 const safe=/^[ \t]*[=+@\-]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replaceAll('"','""').replace(/[\r\n\t]/g," ")+'"';
};
function csv(rows:unknown[][]){return "\ufeff"+rows.map(row=>row.map(enc).join(",")).join("\r\n")+"\r\n";}
export async function GET(request:NextRequest,{params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="en"&&locale!=="bn")return NextResponse.json({error:"NOT_FOUND"},{status:404});
 const admin=await verifiedAdmin();
 if(!admin||admin.role!=="super_admin")return NextResponse.json({error:"ACCESS_DENIED"},{status:403,headers:{"Cache-Control":"no-store"}});
 const kind=request.nextUrl.searchParams.get("kind");
 if(!["workspaces","users","audit","staff"].includes(kind||""))return NextResponse.json({error:"INVALID_EXPORT"},{status:400});
 const q=(request.nextUrl.searchParams.get("q")||"").trim().slice(0,80),term="%"+q+"%";
 let rows:unknown[][];
 if(kind==="workspaces"){
  const r=await database()`SELECT w.id,w.name,w.created_at,(SELECT u.email FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w.id AND m.role='owner' LIMIT 1) AS owner,
    EXISTS(SELECT 1 FROM workspace_product_access p WHERE p.workspace_id=w.id AND p.product='payments' AND p.enabled) AS pay,
    EXISTS(SELECT 1 FROM workspace_product_access p WHERE p.workspace_id=w.id AND p.product='ai' AND p.enabled) AS ai
    FROM workspaces w WHERE (${q}='' OR w.name ILIKE ${term} OR w.id::text ILIKE ${term}) ORDER BY w.created_at DESC LIMIT 5000`;
  rows=[["Workspace ID","Name","Owner email","Payments enabled","AI enabled","Created at"],...r.map(x=>[x.id,x.name,x.owner,x.pay,x.ai,x.created_at])];
 }else if(kind==="users"||kind==="staff"){
  const r=await database()`SELECT u.id,u.display_name,u.email,u.email_verified_at,u.disabled_at,u.created_at,p.role FROM app_users u LEFT JOIN platform_administrators p ON p.user_id=u.id
   WHERE (${q}='' OR u.display_name ILIKE ${term} OR u.email ILIKE ${term} OR u.id::text ILIKE ${term})
   AND (${kind}='users' OR p.user_id IS NOT NULL) ORDER BY u.created_at DESC LIMIT 5000`;
  rows=[["User ID","Name","Email","Verified","Disabled","Admin role","Created at"],...r.map(x=>[x.id,x.display_name,x.email,!!x.email_verified_at,!!x.disabled_at,x.role,x.created_at])];
 }else{
  const r=await database()`SELECT a.id,a.actor_id,a.action,a.subject_id,a.description,a.occurred_at,u.email FROM platform_admin_audit a LEFT JOIN app_users u ON u.id=a.actor_id
   WHERE (${q}='' OR a.action ILIKE ${term} OR u.email ILIKE ${term}) ORDER BY a.occurred_at DESC,a.id DESC LIMIT 5000`;
  rows=[["Audit ID","Time","Actor ID","Actor email","Action","Subject ID","Description"],...r.map(x=>[x.id,x.occurred_at,x.actor_id,x.email,x.action,x.subject_id,x.description])];
 }
 // Record the filter and size, never exported personal records, in the protected audit trail.
 await database()`INSERT INTO platform_admin_audit(actor_id,action,description)
  VALUES (${admin.user.id}::uuid,'admin.csv_export',${"Export "+kind+" | filter="+q.slice(0,80)+" | rows="+String(Math.max(0,rows.length-1))})`;
 return new NextResponse(csv(rows),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="ekmivo-admin-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
