import test from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest,validateCohort,requiredChecks} from './evidence.mjs';
import {containsCredentials,validObservationTime,validCalendarDate} from './safe-evidence.mjs';

const commit='a'.repeat(40), sha='b'.repeat(64);
const cohort=()=>({days:Array.from({length:7},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,real_transaction_count:1,evidence_file:`fixtures/day-${i}.json`,sha256:sha,operator:'fictional-test'}))});
// All records here are fictional unit fixtures, never retained release evidence.
test('a green build alone cannot satisfy financial/device release gates',()=>{
 const errors=validateManifest({schema_version:1,source_commit:commit,environment:'production',checks:[]},{release:true});
 for(const id of requiredChecks)assert.ok(errors.some(x=>x.includes(id)));
});
test('PASS cannot omit evidence and simulated devices cannot close a gate',()=>{
 const errors=validateManifest({schema_version:1,source_commit:commit,environment:'staging',checks:[{id:'real-device-bkash',status:'pass',simulated:true}]});
 assert.ok(errors.some(x=>x.includes('lacks retained evidence')));
 assert.ok(errors.some(x=>x.includes('Simulation')));
});
test('calendar normalization, gaps, duplicate dates and simulation are rejected',()=>{
 const invalid=cohort();invalid.days[0].date='2026-02-30';assert.ok(validateCohort(invalid).length);
 const gap=cohort();gap.days[6].date='2026-10-09';assert.ok(validateCohort(gap).some(x=>x.includes('consecutive')));
 const duplicate=cohort();duplicate.days[6].date=duplicate.days[0].date;assert.ok(validateCohort(duplicate).some(x=>x.includes('Duplicate')));
 const fake=cohort();fake.days[2].simulated=true;assert.ok(validateCohort(fake).some(x=>x.includes('Simulated')));
});
test('an unresolved financial incident prevents cohort acceptance',()=>{
 const record=cohort();record.open_incidents=[{severity:'high'}];assert.ok(validateCohort(record).some(x=>x.includes('incident')));
});
test('mismatched deployed commit and owner decision prevent release',()=>{
 const manifest={schema_version:1,source_commit:commit,environment:'production',checks:requiredChecks.map(id=>({id,status:'pass',evidence_file:'fictional.json',sha256:sha,observed_at:'2026-10-12T00:00:00Z',verifier:'fictional-test'})),cohort:cohort(),deployment:{url:'https://example.invalid',commit:'c'.repeat(40)},owner_release_approval:{owner:'fictional',observed_at:'2026-10-12T00:00:00Z',source_commit:commit}};
 assert.ok(validateManifest(manifest,{release:true}).some(x=>x.includes('Matching deployment')));
});

test('quoted JSON and nested credential fields cannot enter evidence',()=>{
 for(const value of [{notes:{password:'fictional-secret'}},[{access_token:'fictional-token'}],'{"authorization": "Bearer fictional"}',"cookie='fictional'",'postgresql://fictional:secret@example.invalid/db'])assert.equal(containsCredentials(value),true);
 assert.equal(containsCredentials({check:'session-revocation',status:'pass',notes:'Password recovery checked without retaining credentials'}),false);
});

test('observation times cannot be invalid or fabricated in the future',()=>{
 const now=Date.parse('2026-10-12T10:00:00Z');
 assert.equal(validObservationTime('2026-10-12T09:59:00Z',now),true);
 assert.equal(validObservationTime('2026-10-13T10:00:00Z',now),false);
 assert.equal(validObservationTime('not-a-date',now),false);
 assert.equal(validCalendarDate('2026-02-30'),false);
 assert.equal(validCalendarDate('2024-02-29'),true);
});
