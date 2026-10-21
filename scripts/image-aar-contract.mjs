// Structured production facts; never a substitute for saved-pixel review.
export const IMAGE_AAR_EFFECTIVE='2026-10-21';
export function validateImageAfterAction({aar,job,manifest}){
 const fail=s=>{throw Error('image_aar:'+s);};
 const p=aar?.production,ids=new Set(job.stories.map(s=>s.story_id));
 if(aar?.schema_version!=='external-image-after-action-v1'||aar.edition_date!==job.edition_date||
   aar.job_sha256!==manifest.job_sha256||aar.original_source_commit_sha!==manifest.original_source_commit_sha||
   aar.original_bundle_sha256!==manifest.original_bundle_sha256||!p||
   !Number.isSafeInteger(p.actual_generation_count)||!Number.isSafeInteger(p.rejected_count)||p.rejected_count<0||
   p.accepted_count!==6||p.actual_generation_count!==6+p.rejected_count||p.accepted_art_regenerated_after_lock!==0||
   !/^[a-f0-9]{40}$/.test(p.github_binary_stage_commit||'')||
   !Array.isArray(aar.images)||aar.images.length!==6||new Set(aar.images.map(x=>x.story_id)).size!==6||
   aar.images.some(x=>!ids.has(x.story_id)||!Number.isSafeInteger(x.generation_attempts)||x.generation_attempts<1||
    !manifest.images.some(i=>i.story_id===x.story_id&&i.sha256===x.sha256))||
   aar.images.reduce((n,x)=>n+x.generation_attempts,0)!==p.actual_generation_count||
   !Array.isArray(aar.errors)||aar.errors.some(x=>!['phase','issue','correction'].every(k=>typeof x[k]==='string'&&x[k].length>=10))||
   aar.human_readable_path!==`external-image-packages/${job.edition_date}/reviews/after-action.md`)
   fail('missing_or_inconsistent_source_bound_facts');
 // Prospective first-party task evidence: actual clock observations must be
 // recorded by the executing image session, never inferred from schedule or Git.
 if(job.edition_date>='2026-10-22'){
   const iso=x=>typeof x==='string'&&
     /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)&&
     Number.isFinite(Date.parse(x));
   const host=p.host_execution_observed_at,gen=p.generation_started_at;
   if(!iso(host)||!iso(gen)||
     p.host_execution_observation_source!=='executor_observed_in_same_invocation'||
     p.generation_start_source!=='executor_observed_before_first_native_call'||
     Date.parse(host)>Date.parse(gen)||
     Date.parse(gen)>Date.now()+60000)
     fail('genuine_forward_only_execution_and_generation_start_observations_required');
 }
 return {result:'PASS',actual_generation_count:p.actual_generation_count,accepted_count:6,rejected_count:p.rejected_count,visual_qa_not_inferred:true};
}
