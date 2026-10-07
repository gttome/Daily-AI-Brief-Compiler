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
function blockedRoutes(){
  return {
    schema_version:'daily-compiler-d0-p0a-route-matrix-v1',
    routes:[{
      route_id:'scheduled',status:'BLOCKED',
      native_chatgpt_images:true,fresh_context:true,story_prompt_exactly_bindable:true,
      generated_asset_programmatically_retrievable:false,exact_bytes_available_before_context_end:false,
      post_generation_persistence_available:false,autonomous_invocation:true,
      owner_intervention:false,work:false,codex:false,paid_model_api:false,paid_image_service:false,
      billable_overage:false,new_paid_infrastructure:false,alternate_account:false,proposal1r_reader_fallback:false
    }]
  };
}
function readyRoutes(){
  return {
    schema_version:'daily-compiler-d0-p0a-route-matrix-v1',
    routes:[{
      route_id:'native-clean-handoff',status:'AVAILABLE',
      native_chatgpt_images:true,fresh_context:true,story_prompt_exactly_bindable:true,
      generated_asset_programmatically_retrievable:true,exact_bytes_available_before_context_end:true,
      post_generation_persistence_available:true,autonomous_invocation:true,
      owner_intervention:false,work:false,codex:false,paid_model_api:false,paid_image_service:false,
      billable_overage:false,new_paid_infrastructure:false,alternate_account:false,proposal1r_reader_fallback:false
    }]
  };
}

test('initial fused proof waits instead of spending a generation while P0-A route is blocked',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m,{updatedAt:'2026-10-07T00:00:00Z'});
  assert.deepEqual(validateFusedProofExecution(s,{manifest:m}),[]);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:blockedRoutes()}),{
    action:'WAIT_FOR_P0A_ROUTE',story_id:'s0',attempt:1,stress_case:true,
    reason:'BLOCKED_NO_ZERO_COST_NATIVE_ROUTE',ready_routes:[]
  });
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m}),{
    action:'WAIT_FOR_P0A_ROUTE',story_id:'s0',attempt:1,stress_case:true,reason:'route_matrix_required'
  });
});

test('READY zero-cost route authorizes only the first incomplete fresh capsule',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:readyRoutes()}),{
    action:'ALLOCATE_FRESH_CAPSULE',attempt:1,story_id:'s0',stress_case:true,ready_routes:['native-clean-handoff']
  });
  s.candidates[0].attempts=[lockedAttempt(0)];
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:readyRoutes()}),{
    action:'ALLOCATE_FRESH_CAPSULE',attempt:1,story_id:'s1',stress_case:true,ready_routes:['native-clean-handoff']
  });
});

test('incomplete persisted candidate is resumed even while new-generation route is blocked',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  s.candidates[0].attempts=[{attempt:1,state:'RAW_PERSISTED',context_id:'ctx0',invocation_id:'inv0',quality_attempt_consumed:false}];
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:blockedRoutes()}),{
    action:'RESUME_EXISTING_CANDIDATE',attempt:1,state:'RAW_PERSISTED',story_id:'s0',stress_case:true
  });
});

test('six accepted candidates advance to set review without needing a new-generation route',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  s.candidates.forEach((c,i)=>c.attempts=[lockedAttempt(i)]);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:blockedRoutes()}),{action:'MARK_SET_REVIEW_READY'});
  s.status='SET_REVIEW_READY';
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:blockedRoutes()}),{action:'RUN_SET_REVIEW'});
  s.status='COMPLETE';
  s.formal_proofs={p0_a:'PASS',p0_d:'PASS',p0_e:'PASS',p0_f:'PASS'};
  assert.deepEqual(validateFusedProofExecution(s,{manifest:m}),[]);
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:blockedRoutes()}),{action:'EXIT_COMPLETE'});
});

test('four quality failures fail closed without considering route availability',()=>{
  const m=manifest(),s=buildInitialFusedProofExecution(m);
  s.candidates[0].attempts=Array.from({length:4},(_,i)=>({attempt:i+1,state:'REJECTED_QUALITY',context_id:'ctx'+i,invocation_id:'inv'+i,quality_attempt_consumed:true}));
  assert.deepEqual(nextFusedProofOperation(s,{manifest:m,routeMatrix:readyRoutes()}),{action:'FAIL_ATTEMPT_LIMIT',story_id:'s0',attempt:null});
});
