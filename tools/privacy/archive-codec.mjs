import {createDecipheriv} from 'node:crypto';
const scope=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function decryptPrivacyArchive(bytes,key,{request,workspace,realm}){
 if(!Buffer.isBuffer(bytes)||bytes.length>536870912||!Buffer.isBuffer(key)||key.length!==32||!scope.test(request||'')||!scope.test(workspace||'')||!['control','live','sandbox'].includes(realm))throw Error('Invalid archive bounds or scope');
 if(bytes.subarray(0,8).toString()==='EKMPRIV1'){
  if(bytes.length<36)throw Error('Truncated archive');const d=createDecipheriv('aes-256-gcm',key,bytes.subarray(8,20));d.setAuthTag(bytes.subarray(-16));const raw=Buffer.concat([d.update(bytes.subarray(20,-16)),d.final()]);
  const rows=raw.toString('utf8').trimEnd().split('\n').map(line=>JSON.parse(line));const manifest=rows[0],footer=rows.at(-1);
  if(manifest.kind!=='manifest'||manifest.request_id!==request||manifest.workspace_id!==workspace||manifest.store!==(realm==='control'?'control':`financial_${realm}`)||footer.kind!=='complete_store_snapshot')throw Error('Incomplete or wrong-scope SQL archive');return rows;
 }
 if(bytes.subarray(0,8).toString()!=='EKMOBJ1\n'||realm==='control')throw Error('Unsupported archive');
 const lines=bytes.subarray(8).toString('utf8').trimEnd().split('\n'),rows=[];let decoded=0;
 for(const line of lines){if(Buffer.byteLength(line)>9437184)throw Error('Object frame too large');const frame=JSON.parse(line),nonce=Buffer.from(frame.nonce||'','base64'),sealed=Buffer.from(frame.ciphertext||'','base64');if(nonce.length!==12||sealed.length<16||sealed.length>7340032)throw Error('Invalid object frame');const d=createDecipheriv('aes-256-gcm',key,nonce);d.setAAD(Buffer.from(`EKMOBJ1|${request}|${workspace}|${realm}`));d.setAuthTag(sealed.subarray(-16));const raw=Buffer.concat([d.update(sealed.subarray(0,-16)),d.final()]);decoded+=raw.length;if(decoded>536870912)throw Error('Decoded archive too large');rows.push(JSON.parse(raw))}
 if(rows[0]?.request_id!==request||rows[0]?.workspace_id!==workspace||rows[0]?.environment!==realm||rows.at(-1)?.complete_inventory!==true||rows.at(-1)?.object_count!==rows.length-2)throw Error('Incomplete object inventory');return rows;
}
