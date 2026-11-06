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
 const editorial=bundle?.source_discovery_audit?.index_review;
 // Video source evidence is separate from the enabled editorial index census.
 const videoSweep=bundle?.video_source_sweep;
 const videoRoster=Array.isArray(videoSweep?.registry_snapshot)?videoSweep.registry_snapshot:[];
 const videoRows=Array.isArray(videoSweep?.observations)?videoSweep.observations:[];
 const videoIds=new Set(videoRoster.map(r=>r.resource_id));
 const attemptedVideoRows=videoRows.filter(r=>videoIds.has(r?.resource_id)&&
   r.outcome!=='NOT_ATTEMPTED'&&stamp(r.attempted_at)&&typeof r.checked_url==='string'&&
   r.checked_url.startsWith('https://'));
 const videoCounts=Object.fromEntries([...new Set(videoRows.map(r=>r.outcome))].filter(Boolean)
   .map(outcome=>[outcome,videoRows.filter(r=>r.outcome===outcome).length]));
 const videoSweepCompleteness=videoRoster.length>0&&
   videoRows.length===videoRoster.length&&
   new Set(videoRows.map(r=>r.resource_id)).size===videoRows.length&&
   attemptedVideoRows.length===videoRoster.length;
 const eligible=rows.length||editorial?.eligible||null;
 const editorialCount=Number.isSafeInteger(editorial?.inspected)&&editorial.inspected>=0&&editorial.inspected<=eligible?editorial.inspected:null;
 const explicitUnreviewed=Array.isArray(editorial?.unreviewed)?editorial.unreviewed:null;
 const editorialInaccessible=Array.isArray(editorial?.inaccessible_ids)?editorial.inaccessible_ids:null;
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
  source_index_coverage:eligible?{eligible,inspected:editorialCount,inaccessible:editorialInaccessible?.length??null,
   unreviewed:explicitUnreviewed?.length??null,not_editorially_inspected:editorialCount===null?null:eligible-editorialCount,
   unclassified_editorial_ids:editorialCount===null||!explicitUnreviewed?null:Math.max(0,eligible-editorialCount-explicitUnreviewed.length-(editorialInaccessible?.length??0)),
   inspected_percent:editorialCount===null?null:Number((editorialCount/eligible*100).toFixed(1)),
   inspected_ids:Array.isArray(editorial?.inspected_ids)?editorial.inspected_ids:null,
   inaccessible_ids:editorialInaccessible,unreviewed_ids:explicitUnreviewed,
   automated_index_scan:census?{processed:inspected.length,inaccessible:inaccessible.length,not_attempted:unreviewed.length,
    created_at:stamp(census.created_at),post_editorial_selection:stamp(census.created_at)&&stamp(bundle?.source_discovery_audit?.reviewed_at)?Date.parse(census.created_at)>Date.parse(bundle.source_discovery_audit.reviewed_at):null}:null,
   scope:'Editorial counts are recorded claims from the selection audit. Automated index parsing is separate and never proves editorial inspection or fallback search completeness.'}:null,
  video_source_sweep:videoSweep?{
   registered:videoSweep.registered_count??null,enabled:videoSweep.enabled_count??null,
   qualification_only:videoSweep.qualification_only_count??null,
   attempted:attemptedVideoRows.length,unattempted:Math.max(0,videoRoster.length-attemptedVideoRows.length),
   candidate_sources:videoRows.filter(r=>r.outcome==='CANDIDATES_FOUND').length,
   outcomes:videoCounts,completeness:videoSweepCompleteness?'REPORTED_ALL_ATTEMPTED':'INCOMPLETE',
   source_outcomes:videoRows.map(r=>({resource_id:r.resource_id,outcome:r.outcome,
     attempted_at:stamp(r.attempted_at),checked_url:r.checked_url})),
   caveat:'Declared source attempt ledger only. The editorial release gate validates its structure; this AAR does not independently prove retrieval, content review or signed-out playback.'
  }:{registered:null,enabled:null,qualification_only:null,attempted:null,unattempted:null,
   candidate_sources:null,outcomes:null,completeness:'NOT_RECORDED'},
  fallback_search_evidence:receipt?fallbacks:null,
  image_capability_preflight_recorded:route?.result==='CAPABILITY_ROUTE_PROVEN'&&Array.isArray(route.blockers)&&route.blockers.length===0,
  image_scheduler_origin_attested:false,
  image_efficiency:{measurement_window:edition>='2026-11-03'&&edition<='2026-11-05',first_pass_accepted:attemptsValid?attempts.filter(x=>x.attempts===1).length:null,total_attempts:attemptsValid?attempts.reduce((n,x)=>n+x.attempts,0):null,per_image:attemptsValid?attempts:null,target_first_pass:3,target_max_attempts_per_image:2,quality_floor_unchanged:true},
  image_review:{semantic_review_completed_at:stamp(review?.reviewed_at??review?.completed_at),
   review_record_commit_at:stamp(timing?.events?.final_live_review_approved_commit),
   review_merge_at:stamp(timing?.events?.final_live_review_merge_at)},
  usage_percent:null,usage_caveat:'No inferred usage or cost; use independently provided usage evidence only.'};
}
