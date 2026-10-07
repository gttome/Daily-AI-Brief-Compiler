export const D0_STORY_STATES=Object.freeze([
  'PACKET_READY','CAPSULE_ADMITTED','RAW_PERSISTED','FINAL_NORMALIZED',
  'REVIEW_PASS_PENDING_SET','REJECTED_QUALITY','ACCEPTED_LOCKED','BLOCKED_INFRASTRUCTURE'
]);
export const D0_GLOBAL_STATES=Object.freeze(['PLANNED','IN_PROGRESS','SET_REVIEW_READY','SET_PASS','ACCEPTED']);

export const INFRASTRUCTURE_FAILURES=new Set([
  'IMAGE_CAPSULE_ISOLATION_UNAVAILABLE',
  'NATIVE_IMAGE_GENERATION_TEMPORARILY_UNAVAILABLE',
  'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE',
  'STANDALONE_SCHEDULED_RUN_TEMPORARILY_UNAVAILABLE',
  'PLUGIN_FILE_HANDOFF_TEMPORARILY_UNAVAILABLE',
  'PLUGIN_DOWNLOAD_URL_TEMPORARILY_UNAVAILABLE',
  'GIT_PERSISTENCE_TEMPORARILY_UNAVAILABLE',
  'CAPABILITY_BLOCKED_NATIVE_SAME_INVOCATION_CAPTURE',
  'RAW_BYTES_NOT_EXPOSED_BEFORE_CAPSULE_END',
  'GIT_DIRECT_BLOB_PAYLOAD_BLOCKED',
  'CHUNK_BRIDGE_RECONSTRUCTION_FAILED',
  'RAW_READBACK_MISMATCH',
  'NORMALIZATION_FAILED',
  'FINAL_READBACK_MISMATCH',
  'VISUAL_REVIEW_RUNTIME_UNAVAILABLE'
]);

const INCOMPLETE_GENERATED=new Set(['CAPSULE_ADMITTED','RAW_PERSISTED','FINAL_NORMALIZED','REVIEW_PASS_PENDING_SET']);

export function countsAsQualityAttempt(code){
  return !INFRASTRUCTURE_FAILURES.has(code);
}

export function validateAttemptHistory(attempts=[]){
  const errors=[];
  if(!Array.isArray(attempts)) return ['attempt_history_array_required'];
  const numbers=new Set(),contexts=new Set(),invocations=new Set();
  for(const a of attempts){
    if(!Number.isInteger(a?.attempt)||a.attempt<1||a.attempt>4) errors.push('attempt_number_invalid');
    if(numbers.has(a?.attempt)) errors.push('attempt_number_duplicate');
    numbers.add(a?.attempt);
    if(!D0_STORY_STATES.includes(a?.state)) errors.push('attempt_state_invalid');
    if(typeof a?.context_id==='string'){
      if(contexts.has(a.context_id)) errors.push('context_id_reused');
      contexts.add(a.context_id);
    }
    if(typeof a?.invocation_id==='string'){
      if(invocations.has(a.invocation_id)) errors.push('invocation_id_reused');
      invocations.add(a.invocation_id);
    }
    if(a?.state==='BLOCKED_INFRASTRUCTURE'&&a?.quality_attempt_consumed!==false) errors.push('infrastructure_must_not_consume_attempt');
    if(a?.state==='REJECTED_QUALITY'&&a?.quality_attempt_consumed!==true) errors.push('quality_rejection_must_consume_attempt');
  }
  if(attempts.filter(a=>a?.state==='ACCEPTED_LOCKED').length>1) errors.push('multiple_accepted_locked');
  return [...new Set(errors)];
}

export function nextD0ImageOperation(attempts=[]){
  const errors=validateAttemptHistory(attempts);
  if(errors.length) throw new Error(errors.join(';'));
  const accepted=attempts.find(a=>a.state==='ACCEPTED_LOCKED');
  if(accepted) return {action:'REUSE_ACCEPTED_LOCKED',attempt:accepted.attempt};
  const incomplete=attempts.find(a=>INCOMPLETE_GENERATED.has(a.state));
  if(incomplete) return {action:'RESUME_EXISTING_CANDIDATE',attempt:incomplete.attempt,state:incomplete.state};
  const qualityAttempts=attempts.filter(a=>a.quality_attempt_consumed===true).length;
  if(qualityAttempts>=4) return {action:'FAIL_ATTEMPT_LIMIT',attempt:null};
  return {action:'ALLOCATE_FRESH_CAPSULE',attempt:qualityAttempts+1};
}

export function assertAcceptedImageImmutable(attempts=[]){
  if(attempts.some(a=>a?.state==='ACCEPTED_LOCKED')) throw new Error('accepted_image_regeneration_forbidden');
  return true;
}
