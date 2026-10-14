import {publicSandboxConfig} from "../../../lib/server/public-sandbox";
export const dynamic="force-dynamic";
export async function GET(){
 try{const config=await publicSandboxConfig();if(!config)return Response.json({enabled:false,code:"SANDBOX_NOT_PROVISIONED"},{status:503});
 return Response.json({...config,simulation:true,sharedData:true,noRealMoney:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({enabled:false,code:"SANDBOX_CONFIGURATION_UNAVAILABLE"},{status:503})}
}
