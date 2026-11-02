// Advisory reporting only. Evidence gaps never become invented search coverage.
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;
const seconds=(a,b)=>stamp(a)&&stamp(b)&&Date.parse(b)>=Date.parse(a)?(Date.parse(b)-Date.parse(a))/1000:null;
export function summarizeNov02Evidence(edition,e={}){
 const scoped=k=>e[k]?.edition_date===edition?e[k]:null;
 const state=scoped('compiler-state'), milestones=scoped('execution-milestones');
 const census=scoped('source-item-census'),bundle=scoped('edition-bundle');
 const rows=Array.isArray(census?.resources)?census.resources:[];
 const inspected=rows.filter(x=>['CANDIDATES_FOUND','NO_ELIGIBLE_ITEMS'].includes(x.outcome));
 const inaccessible=rows.filter(x=>['ACCESS_BLOCKED','SOURCE_ERROR'].includes(x.outcome));
 const unreviewed=rows.filter(x=>!inspected.includes(x)&&!inaccessible.includes(x));
 const receipt=scoped('fallback-search-evidence');
 const selected=bundle?.stories||[],selectedUrls=new Set(selected.map(x=>x.source?.url));
 const fallbacks=(receipt?.fallbacks||[]).map(row=>{
  const story=selected.find(x=>x.id===row.story_id);
  const candidates=(row.newer_rejected_candidates||[]).filter(c=>story&&
   c.focus===story.focus&&typeof c.rejection_reason==='string'&&c.rejection_reason.trim().length>10&&
   /^https:\/\//.test(c.url||'')&&!selectedUrls.has(c.url)&&stamp(c.inspected_at)&&
   stamp(c.original_date)&&stamp(story.source?.published_at)&&
   Date.parse(c.original_date)>Date.parse(story.source.published_at)&&
   Date.parse(c.original_date)<=Date.parse(c.inspected_at)&&
   Array.isArray(row.searches)&&row.searches.some(s=>stamp(s.attempted_at)&&s.query&&s.source_url&&
    Array.isArray(s.candidate_urls)&&s.candidate_urls.includes(c.url)));
  return {story_id:row.story_id,valid_newer_rejections:candidates.length,
   status:candidates.length?'RECORDED_LANE_RELEVANT_REJECTIONS':'FRESHNESS_LIMITATION_NO_SUPPORTED_NEWER_REJECTION',
   scope:'Within recorded inspected sources only; never exhaustive universe proof'};
 });
 const route=scoped('image-route-preflight'), review=scoped('image-context-reviews'),timing=scoped('image-timing');
 const initial=milestones?.schema_version==='daily-compiler-execution-milestones-v1'&&milestones.execution_id===state?.execution_id?stamp(milestones.initial_execution_observed_at):null;
 const imageAar=scoped('image-after-action'),attempts=(imageAar?.images||[]).map(i=>({story_id:i.story_id,attempts:i.generation_attempts}));
 const attemptsValid=attempts.length===6&&new Set(attempts.map(x=>x.story_id)).size===6&&attempts.every(x=>Number.isSafeInteger(x.attempts)&&x.attempts>=1);
 const seal=stamp(state?.started_at),finished=stamp(state?.updated_at);
 return {schema_version:'nov02-approved-evidence-summary-v1',edition_date:edition,
  compiler_timing:{initial_execution_observed_at:initial,initial_execution_elapsed_seconds:seconds(initial,finished),
   final_seal_window_started_at:seal,public_verification_at:finished,final_seal_window_seconds:seconds(seal,finished),
   timing_caveat:initial?'Observed execution and final seal windows are distinct.':'Initial execution start not established; final seal window is not total runtime.'},
  source_index_coverage:census?{eligible:rows.length,inspected:inspected.length,inaccessible:inaccessible.length,
   unreviewed:unreviewed.length,inspected_percent:rows.length?Number((inspected.length/rows.length*100).toFixed(1)):null,
   inspected_ids:inspected.map(x=>x.resource_id),inaccessible_ids:inaccessible.map(x=>x.resource_id),unreviewed_ids:unreviewed.map(x=>x.resource_id),
   scope:'Publisher index inspection is not full article review; inaccessible is not no eligible item.'}:null,
  fallback_search_evidence:receipt?fallbacks:null,
  image_capability_preflight_recorded:route?.result==='CAPABILITY_ROUTE_PROVEN'&&Array.isArray(route.blockers)&&route.blockers.length===0,
  image_scheduler_origin_attested:false,
  image_efficiency:{measurement_window:edition>='2026-11-03'&&edition<='2026-11-05',first_pass_accepted:attemptsValid?attempts.filter(x=>x.attempts===1).length:null,total_attempts:attemptsValid?attempts.reduce((n,x)=>n+x.attempts,0):null,per_image:attemptsValid?attempts:null,target_first_pass:3,target_max_attempts_per_image:2,quality_floor_unchanged:true},
  image_review:{semantic_review_completed_at:stamp(review?.reviewed_at??review?.completed_at),
   review_record_commit_at:stamp(timing?.events?.final_live_review_approved_commit),
   review_merge_at:stamp(timing?.events?.final_live_review_merge_at)},
  usage_percent:null,usage_caveat:'No inferred usage or cost; use independently provided usage evidence only.'};
}
