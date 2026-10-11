import assert from "node:assert/strict";
import { draftStorageKey,parseSavedDraft,encodeSavedDraft } from "../src/lib/onboarding-draft.mjs";
const actor1="11111111-1111-4111-a111-111111111111";
const actor2="22222222-2222-4222-a222-222222222222";
assert.notEqual(draftStorageKey(actor1),draftStorageKey(actor2));
assert.equal(draftStorageKey(actor1.toUpperCase()),draftStorageKey(actor1));
assert.throws(()=>draftStorageKey("../somebody"));
const value={name:"বাংলা ব্যবসা",mode:"commerce"};
assert.deepEqual(parseSavedDraft(encodeSavedDraft(value)),value);
for(const raw of [null,"","[1]","{broken",JSON.stringify({name:"x",mode:"live"}),JSON.stringify({name:"x".repeat(101),mode:"ai"}),JSON.stringify({name:47,mode:"both"}),"x".repeat(600)]){
 assert.equal(parseSavedDraft(raw),null);
}
assert.throws(()=>encodeSavedDraft({name:"valid",mode:"live"}));
assert.equal(parseSavedDraft(encodeSavedDraft({name:"",mode:"both"})).mode,"both");
console.log("PG02 PASS: account scope, schema roundtrip, Bangla, malformed values and forbidden draft modes");
