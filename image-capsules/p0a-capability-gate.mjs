export const P0A_CAPABILITY_GATE_SCHEMA='daily-compiler-d0-p0-a-capability-gate-v1';

export const P0A_RETRYABLE_BLOCKERS=new Set([
  'STANDALONE_STORY_ONLY_TASK_TEMPORARILY_UNAVAILABLE',
  'NATIVE_IMAGE_GENERATION_TEMPORARILY_UNAVAILABLE',
  'STANDALONE_TASK_RESULT_IMAGE_NOT_PROGRAMMATICALLY_RETRIEVABLE',
  'CLEAN_CAPSULE_SAME_INVOCATION_PERSISTENCE_HOOK_UNAVAILABLE'
]);

export function evaluateP0ACapability({
  fresh_story_only_context_proven=false,
  generated_output_programmatically_retrievable=false,
  output_visual_inspection_proven=false,
  same_invocation_exact_byte_persistence_compatible=false,
  prohibited_dependency_used=false,
  blocker_code=null
}={}){
  if(prohibited_dependency_used) return {status:'FAIL',retry_allowed:false,reason:'prohibited_dependency_used'};
  if(blocker_code){
    return P0A_RETRYABLE_BLOCKERS.has(blocker_code)
      ? {status:'BLOCKED_RETRYABLE',retry_allowed:false,reason:blocker_code}
      : {status:'FAIL',retry_allowed:false,reason:blocker_code};
  }
  if(!fresh_story_only_context_proven) return {status:'BLOCKED_RETRYABLE',retry_allowed:false,reason:'STORY_ONLY_CONTEXT_NOT_YET_PROVEN'};
  if(!generated_output_programmatically_retrievable) return {status:'BLOCKED_RETRYABLE',retry_allowed:false,reason:'STANDALONE_TASK_RESULT_IMAGE_NOT_PROGRAMMATICALLY_RETRIEVABLE'};
  if(!output_visual_inspection_proven) return {status:'BLOCKED_RETRYABLE',retry_allowed:false,reason:'P0A_OUTPUT_VISUAL_INSPECTION_NOT_PROVEN'};
  if(!same_invocation_exact_byte_persistence_compatible) return {status:'BLOCKED_RETRYABLE',retry_allowed:false,reason:'CLEAN_CAPSULE_SAME_INVOCATION_PERSISTENCE_HOOK_UNAVAILABLE'};
  return {status:'READY_FOR_FORMAL_P0A',retry_allowed:true,reason:null};
}

export function shouldGenerateP0ARetry(input={}){
  const gate=evaluateP0ACapability(input);
  return gate.status==='READY_FOR_FORMAL_P0A'&&gate.retry_allowed===true;
}
