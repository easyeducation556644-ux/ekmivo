import {createHash} from "node:crypto";
import {currentUser} from "../../../../../lib/server/auth";
import {database} from "../../../../../lib/server/db";
import {boundedBody} from "../../../../../lib/server/bounded-body";
import {validCheckoutTheme} from "../../../../../lib/checkout-theme";
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return reply({code:'NOT_FOUND'},404);
 const user=await currentUser();if(!user)return reply({code:'UNAUTHENTICATED'},401);
 try{
  const db=database();
  if(request.method==='GET'){const rows=await db`SELECT dashboard_checkout_theme_read(${id}::uuid,${user.id}::uuid) AS value`;return reply(rows[0].value)}
  const url=new URL(request.url);url.host=request.headers.get('host')||url.host;if(request.headers.get('origin')!==url.origin)return reply({code:'ORIGIN_DENIED'},403);
  const raw=await boundedBody(request,1502000);if(raw===null)return reply({code:'BODY_TOO_LARGE'},413);
  let input;try{input=JSON.parse(raw)}catch{return reply({code:'INVALID_BODY'},422)}
  if(!validCheckoutTheme(input?.body)||!Number.isInteger(input.version)||input.version<0)return reply({code:'INVALID_THEME'},422);
  const body=input.body;let hash:string|null=null,png:Buffer|null=null;
  if(body.store.logo){
   if(body.store.logo.startsWith('data:image/png;base64,')){
    png=Buffer.from(body.store.logo.slice(22),'base64');if(png.length>1048576||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return reply({code:'INVALID_LOGO'},422);
    hash=createHash('sha256').update(png).digest('hex');body.store.logo='/api/checkout-logos/'+hash;
   }else if(!/^\/api\/checkout-logos\/[a-f0-9]{64}$/.test(body.store.logo))return reply({code:'INVALID_LOGO'},422);
  }
  const rows=await db`SELECT dashboard_checkout_theme_write(${id}::uuid,${user.id}::uuid,${db.json(body)},${input.version},${hash},${png}) AS value`;
  return reply(rows[0].value);
 }catch(e){const code=e&&typeof e==='object'&&'code' in e?e.code:'';return reply({code:code==='23505'?'VERSION_CONFLICT':code==='42501'?'ACCESS_DENIED':'THEME_UNAVAILABLE'},code==='23505'?409:code==='42501'?403:503)}
}
export const GET=handle;export const PUT=handle;
