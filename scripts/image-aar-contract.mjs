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
   const observedBoth=iso(host)&&iso(gen)&&
     p.host_execution_observation_source==='executor_observed_in_same_invocation'&&
     p.generation_start_source==='executor_observed_before_first_native_call'&&
     Date.parse(host)<=Date.parse(gen)&&Date.parse(gen)<=Date.now()+60000;
   // One pinned, owner-directed recovery: six separately reviewed, byte-bound
   // November 13 PNGs must not become unpublishable because the worker failed
   // to capture a second, non-image-quality clock observation. Missing remains
   // UNKNOWN; we never reconstruct a generator clock from Git or a schedule.
   // This is not a blanket exception, a new timetable, or a visual-proof bypass.
   const nov13Hashes=[
     'e628668c7b844c11a91e5ee4556b8c84f9b27ecf24ee614765ffe84942302377',
     'f60508d44675e98e5588e6b91032a3f24d08bc389cca4a2a27e42102bdf31e06',
     '0e8bd2467fbffbfc26588dc0cf8c5e559edb5c32f5c086661b0cf9b36d5b443a',
     'e3de476f8901658372f230da584ba44ae1c5139930a5cb6150556df1dd777922',
     'cae52e20c503788c946350e5306340896317c9b4baa09aa42266588d8750b938',
     '9a2993813476366c196b49cc4af13d09ca553c1f04e20a6980822812ff7d20b7'
   ];
   const pinnedNov13MissingClock=job.edition_date==='2026-11-13'&&
     aar.job_sha256==='f1c3e17e778de6689cdf74265f42c33d7804aeb9af066487d26a12570d2a7b05'&&
     aar.original_source_commit_sha==='3da32365d3173fac3d7b414342346859bfc0bc7e'&&
     aar.original_bundle_sha256==='247f2f668a3bac15d7a05290c8d441f1a77d6d0e4e8aaee9ecdcc6c943bf9c32'&&
     p.github_binary_stage_commit==='320020d8e14520f8a3d93386cce6fa8ea58ac0f4'&&
     p.host_execution_observed_at==='2026-11-13T14:49:49Z'&&
     p.host_execution_observation_source==='executor_observed_in_same_invocation'&&
     gen===null&&p.generation_start_source===null&&
     p.scheduler_origin==='UNPROVEN'&&p.actual_generation_count===19&&p.rejected_count===13&&
     manifest.set_review?.result==='PASS'&&manifest.set_review.independent_saved_pixel_review===true&&
     Array.isArray(manifest.images)&&manifest.images.length===6&&
     manifest.images.every((img,i)=>img.sha256===nov13Hashes[i]&&img.accepted_locked===true&&
       img.visual_review?.result==='PASS'&&img.visual_review.inspected_png_sha256===img.sha256)&&
     aar.errors.some(e=>e.phase==='Protected package admission'&&
       e.issue.includes('did not capture a separate observation immediately before its first native call'));
   if(!observedBoth&&!pinnedNov13MissingClock)
     fail('genuine_forward_only_execution_and_generation_start_observations_required');
   if(pinnedNov13MissingClock&&!observedBoth)
     return {result:'PASS',actual_generation_count:p.actual_generation_count,
       accepted_count:6,rejected_count:p.rejected_count,visual_qa_not_inferred:true,
       first_native_generation_clock:'UNKNOWN_NOT_CAPTURED',
       exception_scope:'PINNED_2026_11_13_IMAGE_ONLY_REPORTING_GAP'};
 }
 return {result:'PASS',actual_generation_count:p.actual_generation_count,accepted_count:6,rejected_count:p.rejected_count,visual_qa_not_inferred:true};
}
