// C5: observational projection only; never a publisher admission gate.
// Owner withdrew chat-type and C2/C3 runtime identity requirements on Oct 11.
// This projection checks one owner task, edition identity and actual protected/public evidence.
export const C5_VERSION='c5-release-readiness-v1';
export const REQUIRED_PRIMARY='6ac9868490b88191ac91f84d5f555994';
const sha40=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);
const report=(status,blockers,extra={})=>Object.freeze({
 schema_version:C5_VERSION,status,blockers:[...new Set(blockers)],...extra
});
export function normalizeReadinessReceipt(record=null){
 if(!record || typeof record!=='object')return report('UNATTENDED_NO_GO',['RECEIPT_MISSING']);
 if(record.schema_version===C5_VERSION){
  const known=['PRE_RUN_GO','UNATTENDED_NO_GO'];
  return report(known.includes(record.status)?record.status:'UNATTENDED_NO_GO',
   Array.isArray(record.blockers)?record.blockers:['UNVERIFIABLE_C5_RECORD'],
   {record_kind:'C5_REPORT'});
 }
 if(record.schema_version==='compiler-readiness-proposed-v1'){
  return report('UNATTENDED_NO_GO',['LEGACY_RECEIPT_UNPROVEN'],{
   record_kind:'LEGACY_READ_COMPATIBLE',
   prior_status:typeof record.status==='string'?record.status:null
  });
 }
 return report('UNATTENDED_NO_GO',['UNKNOWN_RECEIPT_VERSION']);
}
export function evaluateCompilerReadiness(input={}, {selector='v1'}={}){
 if(selector==='off')return report('UNATTENDED_NO_GO',['C5_REPORT_DISABLED']);
 if(selector!=='v1')return report('UNATTENDED_NO_GO',['UNRECOGNIZED_C5_VERSION']);
 const blockers=[];
 const task=input.task||{}, scheduler=input.scheduler||{};
 const requestedEdition=input.target_edition;
 if(task.authority!=='live_chatgpt_automation' ||
    task.id!==REQUIRED_PRIMARY || task.is_enabled!==true ||
    task.timezone!=='America/Chicago' ||
    !String(task.rrule||'').includes('FREQ=DAILY') ||
    !String(task.rrule||'').includes('BYHOUR=19;BYMINUTE=15') ||
    task.target_rule!=='NEXT_LOCAL_CALENDAR_DAY')
    blockers.push('C1_SCHEDULER_NOT_PROVEN');
 if(scheduler.exactly_one_enabled_primary!==true || scheduler.legacy_tasks_disabled!==true)
    blockers.push('ONE_PRODUCER_NOT_PROVEN');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(requestedEdition||'') ||
    input.same_date_guard?.unique!==true || input.same_date_guard?.authority!=='live_repo_branch_readback' ||
    input.same_date_guard?.target_edition!==requestedEdition)
    blockers.push('SAME_DATE_GUARD_UNPROVEN');
 // Chat type, runtime mode, scheduler invocation ID and C2/C3 diagnostic proof
 // are never prerequisites for real GitHub editorial or image production.
 const git=input.github||{},history=input.history||{};
 if(!sha40(git.main_sha)||git.protected_main!==true||
    git.exact_head_ci!=='PASS'||git.ci_commit_sha!==git.main_sha ||
    git.publisher_workflows_preserved!==true)
    blockers.push('EXACT_HEAD_PROTECTED_GITHUB_NOT_PROVEN');
 if(history.authority!=='postdeploy_live_hash_readback'||history.status!=='PASS'||
    history.oct8_protected_count!==17||!sha40(history.pages_history_sha)||
    history.last_public_edition_verified!==true)
    blockers.push('HISTORICAL_INTEGRITY_UNPROVEN');
 return report(blockers.length?'UNATTENDED_NO_GO':'PRE_RUN_GO',blockers,{
  edition_date:requestedEdition||null,main_sha:git.main_sha||null,
  record_kind:'OBSERVATIONAL_ADMISSION_PROJECTION',
  authoritativeness:'EVIDENCE_REQUIRED_NOT_INFERRED',
  publication_status:'NOT_PROVEN_BY_PRE_RUN_ADMISSION',
  chat_type_admission_required:false,
  c2_c3_diagnostic_proofs_required:false
 });
}
