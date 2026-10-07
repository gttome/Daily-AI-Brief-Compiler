import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInitialFusedProofExecution,nextFusedProofOperation,validateFusedProofExecution} from '../image-capsules/fused-proof-state.mjs';

function manifest(){
  return {
    schema_version:'daily-compiler-d0-fused-rehearsal-manifest-v1',
    rehearsal_id:'r1',branch:'rehearsal/r1',
    candidates:Array.from({length:6},(_,i)=>({story_id:'s'+i,stress_case:i<2,packet_sha256:(i+1).toString(16).repeat(64).slice(0,64),prompt_sha256:(i+7).toString(16).repeat(64).slice(0,64)}))
  };
}
function lockedAttempt(i){
  return {attempt:1,state:'ACCEPTED_LOCKED',context_id:'ctx'+i,invocation_id:'inv'+i,quality_attempt_consumed:true};
}

test('initial fused proof execution resumes from first story without duplicating work',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m,{updatedAt:'2026-10-07T00:00:00Z'});
  assert.deepEqual(validateFusedProofExecution(s,{manifest:m}),[]);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'ALLOCATE_FRESH_CAPSULE',attempt:1,story_id:'s0',stress_case:true});
  s.candidates[0].attempts=[lockedAttempt(0)];
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'ALLOCATE_FRESH_CAPSULE',attempt:1,story_id:'s1',stress_case:true});
});

test('incomplete persisted candidate is resumed before any fresh generation',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  s.candidates[0].attempts=[{attempt:1,state:'RAW_PERSISTED',context_id:'ctx0',invocation_id:'inv0',quality_attempt_consumed:false}];
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'RESUME_EXISTING_CANDIDATE',attempt:1,state:'RAW_PERSISTED',story_id:'s0',stress_case:true});
});

test('six accepted candidates advance to set review and complete state requires promoted proofs',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  s.candidates.forEach((c,i)=>c.attempts=[lockedAttempt(i)]);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'MARK_SET_REVIEW_READY'});
  s.status='SET_REVIEW_READY';
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'RUN_SET_REVIEW'});
  s.status='COMPLETE';
  s.formal_proofs={p0_a:'PASS',p0_d:'PASS',p0_e:'PASS',p0_f:'PASS'};
  assert.deepEqual(validateFusedProofExecution(s,{manifest:m}),[]);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'EXIT_COMPLETE'});
});

test('four quality failures fail closed',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  s.candidates[0].attempts=Array.from({length:4},(_,i)=>({attempt:i+1,state:'REJECTED_QUALITY',context_id:'ctx'+i,invocation_id:'inv'+i,quality_attempt_consumed:true}));
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{action:'FAIL_ATTEMPT_LIMIT',story_id:'s0',attempt:null});
});
