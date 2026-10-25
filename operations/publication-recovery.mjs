// Pure per-stage recovery decision for the sole existing authorized editorial producer.
// A decision does not itself create a new AI worker or perform semantic editing.
const plans={
 VIDEO_PLAYBACK:{correction:'REPLACE_INVALID_VIDEO_ONLY',next_action:'Use truly publisher-reviewed nonreused instructional alternatives, verify signed-out duration-matched playback, reseal just affected videos and re-run protected gates.'},
 MEDIA_HISTORY:{correction:'REPLACE_REUSED_CONTENT_ONLY',next_action:'Replace only exact repeated articles/media with genuinely independently sourced verified alternatives; retain unrelated research, immutable images and publication history.'},
 READER_COMPATIBILITY:{correction:'REPAIR_READER_SCHEMA_AND_REVALIDATE',next_action:'Complete only required legacy Watchlist fields from genuine same-topic evidence and repeat the exact reader gate.'},
 DISPATCH_FAILED:{correction:'RETRY_IDEMPOTENT_DISPATCH',next_action:'Retry only exact sealed bundle digest and branch through existing workflow; do not bypass main protection.'},
 IMAGE_HANDOFF:{correction:'REPAIR_SAME_SOURCE_IMAGE_JOB',next_action:'Reconstruct only the exact verified six-story image job from reader release receipts, then compare SHA256s; never regenerate any accepted image.'},
 PUBLICATION_PIPELINE:{correction:'REPAIR_FIRST_PROTECTED_STAGE',next_action:'Identify actual failed gate and replay only safe idempotent dependent steps.'},
 SOURCE_READY:{correction:'RESTORE_EXACT_BUNDLE_READINESS',next_action:'Resume the same shadow edition without allocating another producer.'}
};
export function publicationRecoveryDecision({editionDate,state=null,health=null,imageIndex=null,ownerIntervention=null,activePrimary=false}){
 if(!/^20\d\d-\d\d-\d\d$/.test(editionDate))throw new Error('Invalid edition date');
 const current=imageIndex?.editions?.find(x=>x.edition_date===editionDate);
 if(state?.edition_date===editionDate&&state.state==='SHADOW_VERIFIED'&&current?.status==='PUBLISHED_PENDING')
   return {result:'PUBLIC_READER_READY_FOR_IMAGE_WORKER',next_action:'Only existing image task consumes this immutable job at 21:15 Central.',requires_new_producer:false};
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
