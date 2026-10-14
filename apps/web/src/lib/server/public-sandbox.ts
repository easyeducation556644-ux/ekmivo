import "server-only";
import {database} from "./db";

export async function publicSandboxConfig(){
 const rows=await database()`SELECT c.workspace_id,c.published_test_key,c.api_origin,c.enabled,c.updated_at,k.revoked_at,k.expires_at
 FROM public_sandbox_config c JOIN merchant_api_keys k ON k.id=c.key_id
 WHERE c.singleton AND k.workspace_id=c.workspace_id AND k.environment='sandbox'
 AND EXISTS(SELECT 1 FROM workspace_environments e WHERE e.workspace_id=c.workspace_id AND e.environment='sandbox' AND e.status='active')
 AND NOT EXISTS(SELECT 1 FROM workspace_environments e WHERE e.workspace_id=c.workspace_id AND e.environment='live' AND e.status='active')`;
 if(!rows.length)return null;
 const r=rows[0];return {workspaceId:String(r.workspace_id),testKey:String(r.published_test_key),apiOrigin:r.api_origin?String(r.api_origin):null,
 enabled:r.enabled===true&&!r.revoked_at&&new Date(r.expires_at)>new Date(),updatedAt:new Date(r.updated_at).toISOString()};
}
