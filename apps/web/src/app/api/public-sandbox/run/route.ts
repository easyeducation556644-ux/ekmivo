import {publicSandboxConfig} from "../../../../lib/server/public-sandbox";
import {boundedBody} from "../../../../lib/server/bounded-body";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const url=new URL(request.url);url.host=request.headers.get("host")||url.host;
 if(request.headers.get("origin")!==url.origin)return Response.json({code:"ORIGIN_DENIED"},{status:403});
 try{
  const config=await publicSandboxConfig();if(!config?.enabled||!config.apiOrigin)return Response.json({code:"SANDBOX_NOT_READY",simulation:true},{status:503});
  const input=await boundedBody(request,8192);if(input===null)return Response.json({code:"REQUEST_TOO_LARGE"},{status:413});
  let data:{action?:string;intentId?:string;body?:unknown;idempotencyKey?:string};try{data=JSON.parse(input);if(!data||typeof data!=="object")throw new Error()}catch{return Response.json({code:"INVALID_JSON"},{status:400})}
  const routes:Record<string,{path:string;method:string}>={create:{path:"payment-intents",method:"POST"},status:{path:`payment-intents/${data.intentId}`,method:"GET"},scenarios:{path:"sandbox/scenarios",method:"GET"},simulate:{path:"sandbox/runs",method:"POST"},runs:{path:"sandbox/runs",method:"GET"},webhooks:{path:"operations/webhooks",method:"POST"}};
  const route=routes[data.action||""];if(!route||(data.action==="status"&&!/^[0-9a-f-]{36}$/i.test(data.intentId||"")))return Response.json({code:"INVALID_SANDBOX_ACTION"},{status:422});
  const target=new URL(`/v1/workspaces/${config.workspaceId}/${route.path}`,config.apiOrigin);target.searchParams.set("environment","sandbox");
  const headers:Record<string,string>={Authorization:`Bearer ${config.testKey}`,"Content-Type":"application/json"};
  if(route.method==="POST"){if(!/^[A-Za-z0-9_-]{16,128}$/.test(data.idempotencyKey||""))return Response.json({code:"IDEMPOTENCY_KEY_REQUIRED"},{status:422});headers["Idempotency-Key"]=data.idempotencyKey!}
  const response=await fetch(target,{method:route.method,headers,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000),...(route.method==="POST"?{body:JSON.stringify(data.body??{})}:{})});
  const raw=await boundedBody(response,65536);
  if(raw===null)return Response.json({code:"SANDBOX_RESPONSE_TOO_LARGE"},{status:502});
  return Response.json({httpStatus:response.status,response:JSON.parse(raw),simulation:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({code:"SANDBOX_REQUEST_UNRESOLVED",simulation:true},{status:503})}
}
