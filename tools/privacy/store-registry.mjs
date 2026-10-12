// Store coverage is explicit. Tenant tables discovered from the catalog are
// included; child-only tables require reviewed parent joins below.
const credential=/(?:encrypted|cipher|password|secret|token|cookie|authorization|private_key|recovery_code|key_hash|key_cipher|number_cipher|payer_cipher|body_cipher|raw_cipher|evidence_cipher|capability_digest|capability_key|pair_digest|recovery_digest)/i;
export function redactExportRow(value){
 if(Array.isArray(value))return value.map(redactExportRow);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!credential.test(key)).map(([key,item])=>[key,redactExportRow(item)]));
 return value;
}
export function scopedExportTables(columns,store){
 const tables=new Map();for(const item of columns){if(!/^[a-z][a-z0-9_]*$/.test(item.table_name))throw Error('Unreviewed table identifier');const list=tables.get(item.table_name)||[];list.push(item.column_name);tables.set(item.table_name,list)}
 const result=[];for(const [name,fields]of tables){if(fields.includes('workspace_id'))result.push({name,scope:'workspace_id'});else if(store==='control'&&name==='workspaces')result.push({name,scope:'id'})}
 if(store==='control'&&!result.some(t=>t.name==='workspaces')||store!=='control'&&!result.some(t=>t.name==='financial_workspace_registry'))throw Error('Store tenant boundary missing');
 return result;
}
export function childExportQueries(store){
 return store==='control'?[
 ['workspace_member_profiles','SELECT jsonb_build_object(\'id\',u.id,\'display_name\',u.display_name,\'email\',u.email) AS row FROM app_users u WHERE EXISTS(SELECT 1 FROM workspace_members m WHERE m.user_id=u.id AND m.workspace_id=$1::uuid)'],
 ['pg13_support_replies','SELECT to_jsonb(r) AS row FROM pg13_support_replies r JOIN pg13_support s ON s.id=r.ticket_id WHERE s.workspace_id=$1::uuid'],
 ['pg13_privacy_stores','SELECT to_jsonb(s) AS row FROM pg13_privacy_stores s JOIN pg13_privacy_requests r ON r.id=s.request_id WHERE r.workspace_id=$1::uuid'],
 ['pg13_privacy_observations','SELECT to_jsonb(s) AS row FROM pg13_privacy_observations s JOIN pg13_privacy_requests r ON r.id=s.request_id WHERE r.workspace_id=$1::uuid']
 ]:[['pg13_notification_reads','SELECT to_jsonb(r) AS row FROM pg13_notification_reads r JOIN pg13_notifications n ON n.id=r.notification_id WHERE n.workspace_id=$1::uuid']];
}
