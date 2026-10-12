// Assemble operator observations into a reviewable PG16 record. This does not
// create or infer transactions and never marks a release gate passed.
import {createHash} from 'node:crypto';
import {readFile,realpath,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {containsCredentials,validObservationTime,validCalendarDate} from './safe-evidence.mjs';
import {validateCohort} from './evidence.mjs';

const [output,rootArg,...files]=process.argv.slice(2);
if(!output||!rootArg||files.length===0)throw Error('Usage: compile-cohort.mjs new-output.json evidence-root observation.json ...');
const root=await realpath(rootArg);
const inside=file=>file.startsWith(root+path.sep);
const days=[],incidents=[],devices=[];
for(const fileArg of files){
 const file=await realpath(path.resolve(root,fileArg));
 if(!inside(file))throw Error('Observation path escapes evidence root');
 const record=JSON.parse(await readFile(file,'utf8'));
 if(record.schema_version!==1||record.simulated||containsCredentials(record)||!validObservationTime(record.observed_at)||!record.operator)throw Error('Actual safe operator observation required');
 if(!['cohort','incident','device'].includes(record.kind))throw Error('Unexpected observation kind');
 if(record.evidence_file){
  const evidence=await realpath(path.resolve(path.dirname(file),record.evidence_file));
  if(!inside(evidence))throw Error('Evidence path escapes root');
  const data=await readFile(evidence);
  if(containsCredentials(data.toString('utf8'))||createHash('sha256').update(data).digest('hex')!==record.evidence_sha256)throw Error('Retained safe evidence hash mismatch');
  record.evidence_file=path.relative(root,evidence).replaceAll('\\','/');
 }
 if(record.kind==='cohort'){
  if(!validCalendarDate(record.date)||!Number.isInteger(record.real_transaction_count)||record.real_transaction_count<0||!Number.isInteger(record.exceptions)||record.exceptions<0||!record.evidence_file)throw Error('Invalid observed cohort day');
  const observed=new Date(record.observed_at);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(observed).map(p=>[p.type,p.value]));
  if(`${parts.year}-${parts.month}-${parts.day}`!==record.date)throw Error('Observed time is outside the claimed Bangladesh day');
  days.push({date:record.date,real_transaction_count:record.real_transaction_count,exceptions:record.exceptions,evidence_file:record.evidence_file,sha256:record.evidence_sha256,operator:record.operator,simulated:false});
 }else if(record.kind==='incident'){
  if(!['low','medium','high','critical'].includes(record.severity)||!['open','resolved'].includes(record.status)||!record.summary||!record.owner)throw Error('Invalid incident disposition');
  if(record.status==='open')incidents.push({severity:record.severity,summary:record.summary,owner:record.owner});
 }else{
  if(!['bkash','nagad','rocket'].includes(record.method)||!record.consented||!record.device_alias||!['pass','fail'].includes(record.result)||!record.evidence_file)throw Error('Invalid consented device evidence');
  for(const field of ['payer_match','original_time_match','amount_match','receiving_account_match','method_match','payment_confirmed','signed_webhook_received','duplicate_settled_once'])if(typeof record[field]!=='boolean'||record.result==='pass'&&!record[field])throw Error('Device assertion lacks evidence');
  devices.push({method:record.method,result:record.result,evidence_file:record.evidence_file,sha256:record.evidence_sha256,operator:record.operator});
 }
}
const cohort={days:days.sort((a,b)=>a.date.localeCompare(b.date)),open_incidents:incidents};
const issues=validateCohort(cohort);
const result={schema_version:1,created_at:new Date().toISOString(),cohort,devices,review_ready:issues.length===0&&['bkash','nagad','rocket'].every(method=>devices.some(d=>d.method===method&&d.result==='pass')),issues};
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(`Recorded ${days.length} actual days and ${devices.length} device observations; review_ready=${result.review_ready}. No release approval inferred.`);
