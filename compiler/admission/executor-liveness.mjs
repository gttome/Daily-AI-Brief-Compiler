// C4: observation-only projection. Never changes compiler-state, task or publisher.
export const C4_LIVENESS_VERSION='c4-executor-projection-v1';
export const C4_PRIMARY_ID='6ac9868490b88191ac91f84d5f555994';
const nonterminal = new Set(['ALLOCATED','PRODUCING','BUNDLE_READY','COMPILING','PREVIEW_READY']);
const result=(executor_state,reason,extra={})=>Object.freeze({schema_version:C4_LIVENESS_VERSION,executor_state,reason,...extra});
export function projectExecutorLiveness({
 task=null,semantic_state=null,invocation=null,last_substantive_progress=null,observed_at=null
}={}, {selector='v1',maximum_progress_age_minutes=20}={}){
 if(selector==='off') return result('EXECUTOR_UNKNOWN','C4_REPORTING_DISABLED');
 if(selector!=='v1') return result('EXECUTOR_UNKNOWN','UNKNOWN_C4_SELECTOR');
 if(!task || task.authority!=='live_chatgpt_automation' || task.id!==C4_PRIMARY_ID ||
    typeof task.is_enabled!=='boolean'){
   return result('EXECUTOR_UNKNOWN','CURRENT_SCHEDULER_STATE_NOT_PROVEN');
 }
 if(task.is_enabled===false)
   return nonterminal.has(semantic_state)
     ? result('STALLED_TASK_DISABLED','SEMANTIC_PROGRESS_NOT_EXECUTOR_LIVENESS')
     : result('PRODUCTION_PAUSED','ONLY_PRIMARY_DISABLED');
 if(!invocation || invocation.authority!=='first_party_scheduled_runtime' ||
    invocation.task_id!==task.id || invocation.running!==true ||
    typeof invocation.invocation_id!=='string' || !invocation.invocation_id){
   return result('ENABLED_NO_ACTIVE_EXECUTOR_VERIFIED','SCHEDULE_ENABLED_DOES_NOT_MEAN_RUNNING');
 }
 const t=Date.parse(observed_at),p=Date.parse(last_substantive_progress?.at);
 if(!Number.isFinite(t)||!Number.isFinite(p)||p>t||
    last_substantive_progress?.kind!=='semantic_checkpoint' ||
    last_substantive_progress?.invocation_id!==invocation.invocation_id){
   return result('EXECUTOR_UNKNOWN','NO_BOUND_SUBSTANTIVE_PROGRESS');
 }
 const ageMinutes=(t-p)/60000;
 if(ageMinutes>maximum_progress_age_minutes)
  return result('STALLED_NO_RECENT_PROGRESS','SUBSTANTIVE_PROGRESS_TOO_OLD',{age_minutes:ageMinutes});
 return result('RUNNING_VERIFIED','ACTUAL_INVOCATION_AND_RECENT_SEMANTIC_CHECKPOINT',
  {age_minutes:ageMinutes,invocation_id:invocation.invocation_id});
}
