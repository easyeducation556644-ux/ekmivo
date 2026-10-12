// Records an operator-observed PG16 case; never generates simulated money.
import {createHash} from 'node:crypto';
import {readFile,realpath,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {containsCredentials,validObservationTime,validCalendarDate} from './safe-evidence.mjs';
const [kind,source,output]=process.argv.slice(2);
if(!['device','cohort','incident'].includes(kind)||!source||!output)throw Error('Usage: record-observation.mjs device|cohort|incident source.json output.json');
const bytes=await readFile(source);const d=JSON.parse(bytes);
if(containsCredentials(d))throw Error('Observation contains possible credentials');
if(d.simulated||!d.operator||!validObservationTime(d.observed_at))throw Error('Actual observation, operator and valid observed time required');
if(kind==='device'){
 if(!['bkash','nagad','rocket'].includes(d.method)||!d.consented||!d.device_alias||!['pass','fail'].includes(d.result))throw Error('Consented device/source/result required');
 for(const field of ['payer_match','original_time_match','amount_match','receiving_account_match','method_match','payment_confirmed','signed_webhook_received','duplicate_settled_once'])if(typeof d[field]!=='boolean'||d.result==='pass'&&!d[field])throw Error(`Unproven device assertion: ${field}`);
 if(!d.evidence_file)throw Error('Retained safe evidence required');
}else if(kind==='cohort'){
 if(!validCalendarDate(d.date)||!Number.isInteger(d.real_transaction_count)||d.real_transaction_count<0||!Number.isInteger(d.exceptions)||d.exceptions<0||!d.evidence_file)throw Error('Observed day counts and evidence required');
}else if(!['low','medium','high','critical'].includes(d.severity)||!d.summary||!d.owner||!['open','resolved'].includes(d.status))throw Error('Incident severity, owner and disposition required');
let evidenceHash;
if(d.evidence_file){const root=await realpath(path.dirname(path.resolve(source)));const file=await realpath(path.resolve(root,d.evidence_file));if(!file.startsWith(root+path.sep))throw Error('Evidence path escapes source directory');const data=await readFile(file);if(containsCredentials(data.toString()))throw Error('Evidence contains credentials');evidenceHash=createHash('sha256').update(data).digest('hex')}
await writeFile(output,JSON.stringify({...d,schema_version:1,kind,recorded_at:new Date().toISOString(),evidence_sha256:evidenceHash},null,2)+'\n',{flag:'wx'});
