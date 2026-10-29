// Public GitHub evidence is not a first-party task scheduler attestation.
// Accept genuine timestamps/refs as recorded observations and never infer Work/GitHub/Image access.
const isTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
export function summarizeTaskOriginEvidence(receipt,editionDate,lane){
  if(!receipt||receipt.edition_date!==editionDate||receipt.lane!==lane)
    return {status:'UNPROVEN',scheduler:'UNPROVEN',route_preflight:'NOT_RECORDED',
      evidence_gaps:['NO_EDITION_SCOPED_TASK_ORIGIN_RECEIPT',
        'NO_INDEPENDENT_FIRST_PARTY_SCHEDULER_ATTESTATION',
        'NO_SAME_INVOCATION_CAPABILITY_PREFLIGHT'],
      repository_record_is_not_authentication:true};
  const claimedScheduler=receipt.scheduler?.source==='first_party_scheduler'&&
    typeof receipt.scheduler?.invocation_id==='string'&&receipt.scheduler.invocation_id.length>=8&&
    isTime(receipt.scheduler?.invoked_at)&&typeof receipt.scheduler?.receipt_ref==='string'&&
    receipt.scheduler.receipt_ref.length>=12;
  const observed=isTime(receipt.task_entry_observed_at);
  const preflight=receipt.capability_preflight;
  const checked=isTime(preflight?.checked_at)&&observed&&
    Date.parse(preflight.checked_at)>=Date.parse(receipt.task_entry_observed_at)&&
    (!isTime(receipt.first_native_generation_observed_at)||
      Date.parse(preflight.checked_at)<=Date.parse(receipt.first_native_generation_observed_at));
  const route=checked&&preflight?.result==='CAPABILITY_ROUTE_PROVEN'&&
    typeof preflight?.evidence_ref==='string'&&preflight.evidence_ref.length>=12;
  const evidence_gaps=[];
  if(!observed)evidence_gaps.push('NO_IN_SESSION_TASK_ENTRY_OBSERVATION');
  if(!claimedScheduler)evidence_gaps.push('NO_RECORDED_FIRST_PARTY_SCHEDULER_CLAIM');
  // A matching repository-held claim still cannot authenticate a ChatGPT
  // scheduler event. Report the missing independent trust boundary truthfully.
  evidence_gaps.push('NO_INDEPENDENT_FIRST_PARTY_SCHEDULER_ATTESTATION');
  if(!route)evidence_gaps.push('NO_SAME_INVOCATION_CAPABILITY_PREFLIGHT');
  return {status:observed?'TASK_ENTRY_RECORDED':'UNPROVEN',
    evidence_gaps,
    scheduler:claimedScheduler?'FIRST_PARTY_CLAIM_IN_RECEIPT_NOT_INDEPENDENTLY_ATTESTED':'UNPROVEN',
    route_preflight:route?'SAME_INVOCATION_ROUTE_RECORDED':'UNPROVEN',
    task_entry_observed_at:observed?receipt.task_entry_observed_at:null,
    scheduler_invocation_ref:claimedScheduler?receipt.scheduler.receipt_ref:null,
    missing_first_party_verification:true,
    repository_record_is_not_authentication:true};
}
