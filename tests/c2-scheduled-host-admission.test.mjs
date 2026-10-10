import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateScheduledHost, COMPILER_PRIMARY_ID} from '../compiler/admission/scheduled-host.mjs';
const obs={task_id:COMPILER_PRIMARY_ID,invocation_id:'authentic-invocation-42',trigger:'scheduled'};
const proof={authority:'first_party_scheduled_runtime',verified:true,
  task_id:COMPILER_PRIMARY_ID,invocation_id:obs.invocation_id,trigger:'scheduled',
  evidence_id:'platform-task-evidence-42',mode:'ordinary_chat',work_used:false,codex_used:false};
test('C2: a prompt self-claim or no platform observer stays UNPROVEN',async()=>{
 assert.equal((await evaluateScheduledHost({...obs,mode:'ordinary_chat'})).status,'UNPROVEN');
});
test('C2: synthetic injected FIRST-PARTY fixture exercises only decision logic',async()=>{
 assert.equal((await evaluateScheduledHost(obs,{verifyFirstPartyInvocation:async()=>proof})).status,'PASS');
});
test('C2: Work and Codex never qualify',async()=>{
 for(const mode of ['work','codex']) {
  const r=await evaluateScheduledHost(obs,{verifyFirstPartyInvocation:async()=>({...proof,mode})});
  assert.equal(r.status,'FAIL');
 }
});
test('C2: interactive, run-now, wrong task and mismatched attestation do not qualify',async()=>{
 for(const value of [{...obs,trigger:'interactive'},{...obs,trigger:'run_now'},{...obs,task_id:'obsolete-task-id'}]){
  assert.equal((await evaluateScheduledHost(value,{verifyFirstPartyInvocation:async()=>proof})).status,'UNPROVEN');
 }
 assert.equal((await evaluateScheduledHost(obs,{verifyFirstPartyInvocation:async()=>({...proof,invocation_id:'other-invocation'})})).status,'UNPROVEN');
});
test('C2: disabling ONLY diagnostic never turns into unattended PASS',async()=>{
 assert.equal((await evaluateScheduledHost(obs,{selector:'off',verifyFirstPartyInvocation:async()=>proof})).status,'UNPROVEN');
});
