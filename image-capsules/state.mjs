export const D0_STRATEGY='d0_native_image_capsules';
export const D0_GLOBAL_STAGES=['PLANNED','IN_PROGRESS','SET_REVIEW_READY','SET_PASS','ACCEPTED','BLOCKED_INFRASTRUCTURE'];
export const D0_ATTEMPT_STATES=['PACKET_READY','CAPSULE_ADMITTED','RAW_PERSISTED','FINAL_NORMALIZED','REVIEW_PASS_PENDING_SET','REJECTED_QUALITY','ACCEPTED_LOCKED','BLOCKED_INFRASTRUCTURE'];

const INFRA_FAILURES=new Set([
  'IMAGE_CAPSULE_ISOLATION_UNAVAILABLE',
  'NATIVE_IMAGE_GENERATION_TEMPORARILY_UNAVAILABLE',
  'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE',
  'CAPABILITY_BLOCKED_NATIVE_SAME_INVOCATION_CAPTURE',
  'RAW_BYTES_NOT_EXPOSED_BEFORE_CAPSULE_END',
  'GIT_DIRECT_BLOB_PAYLOAD_BLOCKED',
  'CHUNK_BRIDGE_RECONSTRUCTION_FAILED',
  'RAW_READBACK_MISMATCH',
  'NORMALIZATION_FAILED',
  'FINAL_READBACK_MISMATCH',
  'VISUAL_REVIEW_RUNTIME_UNAVAILABLE'
]);

export function isD0Images(state){return state?.images?.strategy===D0_STRATEGY;}

export function d0StateComplete(state){
  return isD0Images(state)&&
    state.images?.stage_state==='ACCEPTED'&&
    state.images?.acceptance?.status==='ACCEPTED_LOCKED'&&
    state.images?.set_review?.status==='PASS'&&
    Array.isArray(state.images?.accepted)&&
    state.images.accepted.length===6&&
    new Set(state.images.accepted).size===6;
}

export function consumesQualityAttempt(code){return !INFRA_FAILURES.has(code);}

export function nextQualityAttempt(attempts=[]){
  const unresolved=attempts.some(x=>['CAPSULE_ADMITTED','RAW_PERSISTED','FINAL_NORMALIZED','REVIEW_PASS_PENDING_SET'].includes(x?.state));
  if(unresolved) return null;
  if(attempts.some(x=>x?.state==='ACCEPTED_LOCKED')) return null;
  const consumed=attempts.filter(x=>x?.quality_attempt_consumed===true).length;
  return consumed>=4?null:consumed+1;
}

export function assertAttemptHistory(attempts=[]){
  const errors=[];
  if(!Array.isArray(attempts)) return ['attempt_history_required'];
  const numbers=new Set(),contexts=new Set();
  let accepted=0;
  for(const a of attempts){
    if(!Number.isInteger(a?.attempt)||a.attempt<1||a.attempt>4) errors.push('attempt_number_invalid');
    if(numbers.has(a?.attempt)) errors.push('duplicate_attempt_number');
    numbers.add(a?.attempt);
    if(!D0_ATTEMPT_STATES.includes(a?.state)) errors.push('attempt_state_invalid');
    if(a?.state==='ACCEPTED_LOCKED') accepted++;
    if(a?.context_id){
      if(contexts.has(a.context_id)) errors.push('reused_capsule_context');
      contexts.add(a.context_id);
    }
  }
  if(accepted>1) errors.push('multiple_accepted_attempts');
  if(attempts.filter(x=>x?.quality_attempt_consumed===true).length>4) errors.push('quality_attempt_limit_exceeded');
  return [...new Set(errors)];
}
