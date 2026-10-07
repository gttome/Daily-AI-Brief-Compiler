import {nonempty} from './util.mjs';
import {nextD0ImageOperation,validateAttemptHistory} from './state.mjs';
import {evaluateP0ARouteMatrix} from './p0a-route-evaluator.mjs';

export const FUSED_PROOF_EXECUTION_SCHEMA='daily-compiler-d0-fused-proof-execution-v1';
export const FUSED_PROOF_STATUSES=Object.freeze(['PLANNED','IN_PROGRESS','SET_REVIEW_READY','COMPLETE','BLOCKED']);

export function validateFusedProofExecution(state,{manifest=null}={}){
  const errors=[];
  if(state?.schema_version!==FUSED_PROOF_EXECUTION_SCHEMA) errors.push('fused_execution_schema');
  if(!nonempty(state?.rehearsal_id)||!nonempty(state?.branch)||!FUSED_PROOF_STATUSES.includes(state?.status)) errors.push('fused_execution_identity');
  if(!Array.isArray(state?.candidates)||state.candidates.length!==6) errors.push('fused_execution_six_candidates');
  const ids=new Set();
  let locked=0;
  for(const c of state?.candidates||[]){
    if(!nonempty(c?.story_id)||ids.has(c.story_id)) errors.push('fused_execution_story_identity');
    ids.add(c?.story_id);
    if(typeof c?.stress_case!=='boolean') errors.push('fused_execution_stress_flag');
    const attemptErrors=validateAttemptHistory(c?.attempts);
    if(attemptErrors.length) errors.push(...attemptErrors.map(x=>c.story_id+':'+x));
    if((c?.attempts||[]).some(a=>a.state==='ACCEPTED_LOCKED')) locked++;
  }
  if((state?.candidates||[]).filter(c=>c?.stress_case===true).length<2) errors.push('fused_execution_two_stress_cases');
  if(!Number.isInteger(state?.native_generations)||state.native_generations<0) errors.push('fused_execution_generation_count');
  if(state?.status==='SET_REVIEW_READY'&&locked!==6) errors.push('fused_execution_set_review_requires_six_locked');
  if(state?.status==='COMPLETE'){
    if(locked!==6) errors.push('fused_execution_complete_requires_six_locked');
    for(const key of ['p0_a','p0_d','p0_e','p0_f']) if(state?.formal_proofs?.[key]!=='PASS') errors.push('fused_execution_formal_'+key);
  }
  if(manifest){
    if(state.rehearsal_id!==manifest.rehearsal_id||state.branch!==manifest.branch) errors.push('fused_execution_manifest_identity');
    const m=new Map((manifest.candidates||[]).map(x=>[x.story_id,x]));
    for(const c of state?.candidates||[]){
      const x=m.get(c.story_id);
      if(!x||c.stress_case!==x.stress_case||c.packet_sha256!==x.packet_sha256||c.prompt_sha256!==x.prompt_sha256) errors.push('fused_execution_manifest_binding:'+String(c.story_id));
    }
  }
  return [...new Set(errors)];
}

export function nextFusedProofOperation(state,{manifest=null,routeMatrix=null}={}){
  const errors=validateFusedProofExecution(state,{manifest});
  if(errors.length) throw new Error(errors.join(';'));
  if(state.status==='COMPLETE') return {action:'EXIT_COMPLETE'};
  if(state.status==='BLOCKED') return {action:'EXIT_BLOCKED'};
  for(const c of state.candidates){
    const op=nextD0ImageOperation(c.attempts);
    if(op.action==='REUSE_ACCEPTED_LOCKED') continue;
    if(op.action==='FAIL_ATTEMPT_LIMIT') return {action:'FAIL_ATTEMPT_LIMIT',story_id:c.story_id,attempt:null};
    if(op.action==='ALLOCATE_FRESH_CAPSULE'){
      if(!routeMatrix) return {action:'WAIT_FOR_P0A_ROUTE',story_id:c.story_id,attempt:op.attempt,stress_case:c.stress_case,reason:'route_matrix_required'};
      const route=evaluateP0ARouteMatrix(routeMatrix);
      if(!route.retry_allowed) return {action:'WAIT_FOR_P0A_ROUTE',story_id:c.story_id,attempt:op.attempt,stress_case:c.stress_case,reason:route.result,ready_routes:route.ready_routes};
      return {...op,story_id:c.story_id,stress_case:c.stress_case,ready_routes:route.ready_routes};
    }
    return {...op,story_id:c.story_id,stress_case:c.stress_case};
  }
  if(state.status==='SET_REVIEW_READY') return {action:'RUN_SET_REVIEW'};
  return {action:'MARK_SET_REVIEW_READY'};
}

export function buildInitialFusedProofExecution(manifest,{updatedAt=new Date().toISOString()}={}){
  if(manifest?.schema_version!=='daily-compiler-d0-fused-rehearsal-manifest-v1'||!Array.isArray(manifest?.candidates)||manifest.candidates.length!==6) throw new Error('fused_manifest_invalid');
  const state={
    schema_version:FUSED_PROOF_EXECUTION_SCHEMA,
    rehearsal_id:manifest.rehearsal_id,
    branch:manifest.branch,
    status:'PLANNED',
    native_generations:0,
    candidates:manifest.candidates.map(c=>({
      story_id:c.story_id,stress_case:c.stress_case,
      packet_sha256:c.packet_sha256,prompt_sha256:c.prompt_sha256,attempts:[]
    })),
    formal_proofs:{p0_a:'BLOCKED',p0_d:'BLOCKED',p0_e:'BLOCKED',p0_f:'BLOCKED'},
    updated_at:updatedAt
  };
  const errors=validateFusedProofExecution(state,{manifest});
  if(errors.length) throw new Error(errors.join(';'));
  return state;
}
