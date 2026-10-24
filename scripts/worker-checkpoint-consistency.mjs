// Forward-only release checkpoint reconciliation. Never changes accepted artwork.
const HASH=/^[a-f0-9]{64}$/;
export function verifyFinalImageCheckpoint({edition,worker,release,manifest,aar}){
 if(edition<'2026-10-25')return {result:'HISTORICAL_NOT_GATED'};
 const rows=worker?.accepted_images,hashes=worker?.accepted_hashes;
 const released=release?.images,accepted=manifest?.images,reviewed=aar?.images;
 const actual=aar?.production?.actual_generation_count;
 const bad=reason=>({result:'MISMATCH',reason});
 if(worker?.phase!=='PUBLISHED_COMPLETE'||worker.lease_status!=='RELEASED'||
    worker.job_sha256!==manifest?.job_sha256)
   return bad('worker_not_closed_for_exact_job');
 if(!Number.isSafeInteger(actual)||actual<6||worker.actual_generation_count!==actual||
    !Number.isSafeInteger(aar?.production?.accepted_count)||aar.production.accepted_count!==6||
    aar.production.rejected_count!==actual-6)
   return bad('generation_count_or_rejected_count_disagrees_with_aar');
 if(![rows,hashes,released,accepted,reviewed].every(a=>Array.isArray(a)&&a.length===6)||
    new Set(hashes).size!==6||hashes.some(h=>!HASH.test(h)))
   return bad('six_complete_hash_and_story_lists_required');
 const byId=new Map(released.map(x=>[x.story_id,x.sha256]));
 if(byId.size!==6||new Set(released.map(x=>x.sha256)).size!==6||
    [...byId.values()].some(h=>!HASH.test(h)))
   return bad('release_identity_or_hash_invalid');
 for(const list of [rows,accepted,reviewed]){
   if(new Set(list.map(x=>x.story_id)).size!==6||
      list.some(x=>byId.get(x.story_id)!==x.sha256))
     return bad('accepted_story_to_hash_binding_mismatch');
 }
 if(hashes.some(h=>![...byId.values()].includes(h)))
   return bad('worker_checkpoint_hash_not_released');
 const attempts=reviewed.map(x=>x.generation_attempts);
 if(attempts.some(n=>!Number.isSafeInteger(n)||n<1)||
    attempts.reduce((a,b)=>a+b,0)!==actual)
   return bad('per_story_generation_attempts_disagree');
 return {result:'PASS',accepted_images:6,actual_generations:actual,
   content_changed:false,first_party_scheduler_attested:false};
}
