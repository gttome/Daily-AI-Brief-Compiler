import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUnattendedCertification,PRIMARY_TASK_ID} from '../compiler/unattended-certification.mjs';
const host={authority:'first_party_scheduled_runtime',verified:true,task_id:PRIMARY_TASK_ID,
 trigger:'scheduled',mode:'ordinary_chat',work_used:false,codex_used:false,
 invocation_id:'authentic-scheduled-invocation-123',evidence_id:'host-platform-evidence-123'};
const github={authority:'scheduled_same_context_github_readback',verified:true,
 task_id:PRIMARY_TASK_ID,invocation_id:host.invocation_id,
 evidence_id:'github-readback-123',blob_sha:'a'.repeat(40),
 sha256:'b'.repeat(64),proof_branch:'proof/compiler-c3-20261011'};
test('an owner-directed interactive real publication stays valid but NOT_SCHEDULED',()=>{
 const r=assessUnattendedCertification({scheduled_execution:false,owner_intervention:false,
  c2_scheduled_mode:'PASS',c3_same_context_scheduled_write:'PASS'});
 assert.equal(r.status,'NOT_SCHEDULED');assert.equal(r.proven,false);
});
test('missing execution provenance fails closed even without owner intervention',()=>{
 const r=assessUnattendedCertification({owner_intervention:false});
 assert.equal(r.status,'UNPROVEN');assert.equal(r.proven,false);
});
test('a self-attested scheduled bundle cannot elevate its own C2/C3 claims',()=>{
 const r=assessUnattendedCertification({scheduled_execution:true,owner_intervention:false,
  c2_scheduled_mode:'PASS',c3_same_context_scheduled_write:'PASS',
  unattended_host_mode_attested:true});
 assert.equal(r.status,'UNPROVEN');assert.equal(r.proven,false);
});
test('C2 alone, C3 alone, mismatched invocation or prohibited Work mode never pass',()=>{
 const producer={scheduled_execution:true,owner_intervention:false};
 const cases=[{c2:host},{c3:github},{c2:host,c3:{...github,invocation_id:'other-invocation'}},
  {c2:{...host,mode:'work',work_used:true},c3:github},
  {c2:host,c3:{...github,sha256:'invalid'}},
  {c2:{...host,authority:'producer_attestation'},c3:github}];
 for(const evidence of cases){
  const r=assessUnattendedCertification(producer,evidence);
  assert.equal(r.proven,false,JSON.stringify(evidence));
 }
});
test('synthetic independently verified same-context proof is structurally eligible (not actual host evidence)',()=>{
 const r=assessUnattendedCertification({scheduled_execution:true}, {c2:host,c3:github});
 assert.equal(r.status,'PASS');assert.equal(r.proven,true);
});
