import test from 'node:test';
import assert from 'node:assert/strict';
import {safeIntegrationPayload} from '../src/lib/integration-safe-payload.ts';
test('event metadata is preserved but receipt/customer/credential fields are omitted recursively',()=>{
 const result=safeIntegrationPayload({type:'payment.verified',schema_version:1,data:{payment_id:'fixture',amount_minor:12500,currency:'BDT',payer_number:'private',email:'private',raw_sms:'private',password:'private',secret:'private'},signing_secret:'private',raw_response:'private'});
 assert.deepEqual(result,{type:'payment.verified',schema_version:1,data:{payment_id:'fixture',amount_minor:12500,currency:'BDT'}});
});
test('unknown fields and deep/unbounded payloads cannot create an unbounded inspector',()=>{assert.deepEqual(safeIntegrationPayload({unexpected:{secret:'private'}}),{});assert.equal(safeIntegrationPayload('x'.repeat(1000)).length,256);assert.equal(safeIntegrationPayload(Array(100).fill('a')).length,50)});
