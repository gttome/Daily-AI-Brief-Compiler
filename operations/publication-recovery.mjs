// Pure per-stage recovery decision for the sole existing authorized editorial producer.
// A decision does not itself create a new AI worker or perform semantic editing.
const plans={
 VIDEO_PLAYBACK:{correction:'REPLACE_INVALID_VIDEO_ONLY',next_action:'Use publisher-reviewed nonreused relevant alternatives, verify signed-out duration-matched playback, reseal just affected videos and re-run protected gates.'},
 MEDIA_HISTORY:{correction:'DIAGNOSE_MEDIA_GATE_AND_REPAIR_ONLY_CAUSE',next_action:'Read the original failed job and exact error: this stage checks duplicates, channel identity, reviewed candidate pools and podcast source-character evidence. Correct only the observed failure with genuine evidence; replace media only when needed. Preserve unrelated research and accepted images.'},
 READER_COMPATIBILITY:{correction:'DIAGNOSE_READER_GATE_AND_REVALIDATE',next_action:'Read the original failed job and exact error before editing. Check source dates and 24/72/168-hour fallback comparisons as well as reader and Watchlist schema. Repair only the evidenced cause, then repeat the same protected validator; never invent timestamps or references.'},
 SEMANTIC_PREFLIGHT:{correction:'REPAIR_EXACT_PRESEAL_VALIDATION_FAILURE',next_action:'Read the exact semantic validator failure, repair only that same-edition evidence or content, recalculate the bundle digest and repeat the existing full validator. Do not change publication rules or historical editions.'},
 DISPATCH_FAILED:{correction:'RETRY_IDEMPOTENT_DISPATCH',next_action:'Retry only exact sealed bundle digest and branch through existing workflow; do not bypass main protection.'},
 IMAGE_HANDOFF:{correction:'REPAIR_SAME_SOURCE_IMAGE_JOB',next_action:'Reconstruct only the exact verified six-story image job from reader release receipts, then compare SHA256s; never regenerate any accepted image.'},
 PUBLICATION_PIPELINE:{correction:'REPAIR_FIRST_PROTECTED_STAGE',next_action:'Identify actual failed gate and replay only safe idempotent dependent steps.'},
 SOURCE_READY:{correction:'RESTORE_EXACT_BUNDLE_READINESS',next_action:'Read the original SOURCE_READY failure and revalidate the same edition stage, identity and exact bundle bytes before signaling again.'}
};
export function publicationRecoveryDecision({editionDate,state=null,health=null,imageIndex=null,ownerIntervention=null,activePrimary=false}){
 if(!/^20\d\d-\d\d-\d\d$/.test(editionDate))throw new Error('Invalid edition date');
 const current=imageIndex?.editions?.find(x=>x.edition_date===editionDate);
 if(state?.edition_date===editionDate&&state.state==='SHADOW_VERIFIED'&&current?.status==='RELEASED_VERIFIED')
   return {result:'PUBLICATION_AND_IMAGES_RELEASED',next_action:'Read-only independent verification; preserve accepted assets and immutable job.',requires_new_producer:false};
 if(state?.edition_date===editionDate&&state.state==='SHADOW_VERIFIED'&&current?.status==='PUBLISHED_PENDING')
   return {result:'PUBLIC_READER_READY_FOR_IMAGE_WORKER',next_action:'Only the existing image worker may consume this immutable job, including during its bounded recheck window.',requires_new_producer:false};
 if(state?.edition_date===editionDate&&state.state==='SHADOW_VERIFIED')
   return {result:'BLOCKED_IMAGE_HANDOFF',correction:plans.IMAGE_HANDOFF.correction,next_action:plans.IMAGE_HANDOFF.next_action,requires_new_producer:false};
 if(health?.edition_date===editionDate&&health.status==='BLOCKED_PUBLICATION'){
   const p=plans[health.outstanding_blocker?.stage]||plans.PUBLICATION_PIPELINE;
   return {result:activePrimary?'RESUME_SAME_EDITION_NOW':'BLOCKED_REQUIRES_EXISTING_PRIMARY_EXECUTOR',
     correction:p.correction,next_action:p.next_action,
     owner_intervention_observed:ownerIntervention===true,
     unattended_recovery_proven:false,requires_new_producer:false,
     runtime_limitation:activePrimary?null:'GitHub Actions cannot resume ChatGPT semantic research after its invocation has ended; do not claim a background AI recovery actor exists.'};
 }
 if(state?.edition_date===editionDate&&state.state==='BUNDLE_READY')
   return {result:'AWAITING_PROTECTED_SIGNAL',next_action:'Read actual GitHub Action job and correct same edition if it fails.',requires_new_producer:false};
 return {result:'NOT_YET_PRODUCED',next_action:'Use the sole existing scheduled 19:15 Central editorial Primary; do not preallocate or run a competing worker.',requires_new_producer:false};
}

// Admission for the existing Recovery Guard, not a second producer. Every write
// must still use expectedHead as the compare-and-swap lease in the GitHub API.
export function recoveryGuardDecision({editionDate,state,health,imageIndex,ownership,expectedHead,observedHead,attempts=0,observedAt=new Date().toISOString()}){
 const base=publicationRecoveryDecision({editionDate,state,health,imageIndex});
 const readonly=result=>({...base,result,write_allowed:false,unattended_recovery_proven:false});
 if(base.result==='PUBLICATION_AND_IMAGES_RELEASED'||base.result==='PUBLIC_READER_READY_FOR_IMAGE_WORKER')return readonly(base.result);
 if(!ownership||ownership.primary_active!==false||ownership.pending_publication_pr!==false||
    ownership.healthy_image_lease!==false||ownership.recent_semantic_progress!==false||
    ownership.writer!=='existing_recovery_guard'||!Number.isFinite(Date.parse(ownership.checked_at))||
    !Number.isFinite(Date.parse(observedAt))||Date.parse(observedAt)<Date.parse(ownership.checked_at)||
    Date.parse(observedAt)-Date.parse(ownership.checked_at)>300000)
   return readonly('YIELD_WRITER_OWNERSHIP_UNPROVEN');
 if(!/^[a-f0-9]{40}$/.test(expectedHead||'')||expectedHead!==observedHead)return readonly('YIELD_SOURCE_HEAD_CHANGED');
 if(attempts!==0)return readonly('BOUNDED_ATTEMPT_ALREADY_USED');
 if(health?.edition_date!==editionDate||health.status!=='BLOCKED_PUBLICATION')return readonly('NO_FAILED_STAGE_TO_REPAIR');
 return {...base,result:'ONE_BOUNDED_RECOVERY_ALLOWED',write_allowed:true,expected_head:expectedHead,
  requires_new_producer:false,unattended_recovery_proven:false};
}
