import {currentUser} from "../../../../../lib/server/auth";
import {database} from "../../../../../lib/server/db";
import {boundedBody} from "../../../../../lib/server/bounded-body";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function handle(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return reply({code:"NOT_FOUND"},404);
 const user=await currentUser();if(!user)return reply({code:"UNAUTHENTICATED"},401);
 const db=database();const members=await db`SELECT role FROM workspace_members WHERE workspace_id=${id}::uuid AND user_id=${user.id}::uuid`;
 if(!members.length)return reply({code:"NOT_FOUND"},404);
 let hidden:boolean|null=null;
 if(request.method==="PATCH"){
  const url=new URL(request.url);url.host=request.headers.get("host")||url.host;
  if(request.headers.get("origin")!==url.origin)return reply({code:"ORIGIN_DENIED"},403);
  const raw=await boundedBody(request,1024);if(raw===null)return reply({code:"BODY_TOO_LARGE"},413);
  let body;try{body=JSON.parse(raw)}catch{return reply({code:"INVALID_BODY"},422)}
  if(!body||typeof body.hide_customer_numbers!=="boolean"||Object.keys(body).some(k=>k!=="hide_customer_numbers"))return reply({code:"INVALID_BODY"},422);
  hidden=members[0].role==="viewer"?true:body.hide_customer_numbers;
 }
 try{const [row]=await db`SELECT dashboard_preferences(${id}::uuid,${user.id}::uuid,${hidden}::boolean) AS body`;return reply(row.body)}catch{return reply({code:"PREFERENCE_UNAVAILABLE"},503)}
}
export const GET=handle;export const PATCH=handle;
