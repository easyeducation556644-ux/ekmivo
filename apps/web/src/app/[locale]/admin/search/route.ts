import {NextRequest,NextResponse} from "next/server";
import {verifiedAdmin} from "../../../../lib/server/platform-admin";
import {database} from "../../../../lib/server/db";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="en"&&locale!=="bn")return NextResponse.json({error:"NOT_FOUND"},{status:404});
 const admin=await verifiedAdmin();
 if(!admin||admin.role!=="super_admin")return NextResponse.json({error:"ACCESS_DENIED"},{status:403,headers:{"Cache-Control":"no-store"}});
 const q=(request.nextUrl.searchParams.get("q")||"").trim().slice(0,80);
 if(q.length<2)return NextResponse.json({items:[]},{headers:{"Cache-Control":"private, no-store"}});
 const term="%"+q+"%";
 const [workspaces,users]=await Promise.all([
  database()`SELECT id,name FROM workspaces WHERE name ILIKE ${term} OR id::text ILIKE ${term} ORDER BY name ASC LIMIT 8`,
  database()`SELECT id,display_name,email FROM app_users WHERE display_name ILIKE ${term} OR email ILIKE ${term} OR id::text ILIKE ${term} ORDER BY display_name ASC LIMIT 8`
 ]);
 const items=[...workspaces.map(x=>({id:String(x.id),kind:"workspace",label:String(x.name),path:"workspaces/"+String(x.id)})),
 ...users.map(x=>({id:String(x.id),kind:"user",label:String(x.display_name)+" · "+String(x.email),path:"users/"+String(x.id)}))];
 return NextResponse.json({items},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
