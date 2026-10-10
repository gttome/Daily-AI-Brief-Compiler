import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluateScheduledWrite,C3_PRIMARY_ID} from '../compiler/admission/scheduled-write.mjs';
const text='C3 synthetic non-publishing proof fixture\\n';
const hash=createHash('sha256').update(text).digest('hex');
const record={task_id:C3_PRIMARY_ID,invocation_id:'scheduled-invocation-fixture',origin:'scheduled',
 repository:'gttome/Daily-AI-Brief-Compiler',branch:'proof/compiler-c3-rehearsal',
 path:'proof/c3-rehearsal.txt',create_commit:'a'.repeat(40),update_commit:'b'.repeat(40),
 final_blob_sha:'c'.repeat(40),expected_text:text,expected_sha256:hash};
const host={verified:true,authority:'first_party_scheduled_runtime',task_id:C3_PRIMARY_ID,
 invocation_id:record.invocation_id,trigger:'scheduled',mode:'ordinary_chat',
 work_used:false,codex_used:false};
const git={verified:true,repository:record.repository,branch:record.branch,path:record.path,
 create_commit:record.create_commit,update_commit:record.update_commit,
 blob_sha:record.final_blob_sha,text};
const opts={verifyScheduledOrigin:async()=>host,readGitHubProof:async()=>git};
test('C3: no authenticated scheduled verifier stays UNPROVEN',async()=>{
 assert.equal((await evaluateScheduledWrite(record)).status,'UNPROVEN');
});
test('C3: injected synthetic fixture checks byte and blob contract only',async()=>{
 const r=await evaluateScheduledWrite(record,opts);
 assert.equal(r.status,'PASS');assert.equal(r.sha256,hash);
});
test('C3: an interactive proof and unprotected or edition target never qualify',async()=>{
 for(const m of [{origin:'interactive'},{branch:'shadow/2026-10-11'},
  {path:'shadow-runs/2026-10-11/edition-bundle.json'}]){
  assert.equal((await evaluateScheduledWrite({...record,...m},opts)).status,'UNPROVEN');
 }
});
test('C3: a readback byte mismatch fails closed',async()=>{
 const r=await evaluateScheduledWrite(record,{...opts,
  readGitHubProof:async()=>({...git,text:'tampered'})});
 assert.equal(r.status,'FAIL');
});
test('C3: Work, Codex, or a mismatched invocation cannot prove same context',async()=>{
 for(const p of [{mode:'work'},{mode:'codex'},{invocation_id:'other-invocation'}]){
  const r=await evaluateScheduledWrite(record,{...opts,
    verifyScheduledOrigin:async()=>({...host,...p})});
  assert.equal(r.status,'UNPROVEN');
 }
});
test('C3: rollback of optional probe remains UNPROVEN, never automatic GO',async()=>{
 assert.equal((await evaluateScheduledWrite(record,{...opts,selector:'off'})).status,'UNPROVEN');
});
