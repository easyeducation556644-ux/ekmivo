// Only documented structural event fields are shown/exported. Unknown fields
// stay hidden: an upstream payload extension must not accidentally expose PII.
const fields=new Set(['id','event_id','type','schema_version','workspace_id','environment','occurred_at','data','payment_id','intent_id','invoice_id','refund_id','observation_id','amount_minor','currency','status','method','verification_method','original_transaction_at','verified_at','payer_suffix','merchant_reference']);
export function safeIntegrationPayload(value:unknown,depth=0):unknown{
 if(depth>5)return '[redacted]';
 if(Array.isArray(value))return value.slice(0,50).map(v=>safeIntegrationPayload(v,depth+1));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>fields.has(k)).map(([k,v])=>[k,safeIntegrationPayload(v,depth+1)]));
 if(typeof value==='string')return value.slice(0,256);
 if(typeof value==='number'||typeof value==='boolean'||value===null)return value;
 return null;
}
