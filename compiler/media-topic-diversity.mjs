// Prospective Nov 15+ event-level editorial review. This is not video playback,
// independent source verification or a forced Top 10/media selection quota.
export const MEDIA_TOPIC_DIVERSITY_EFFECTIVE='2026-11-15';
const fail=s=>{throw Error('media_topic_diversity:'+s);};
const prose=(s,min=30)=>typeof s==='string'&&s.trim().length>=min;
const iso=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const pair=(a,b)=>[a,b].sort().join(' | ');

// Distinct publisher and URLs are already checked elsewhere. Different
// publishers may nevertheless cover one event with no incremental value.
export function validateMediaTopicDiversity(bundle){
 if(!bundle||bundle.edition_date<MEDIA_TOPIC_DIVERSITY_EFFECTIVE)
   return {result:'SKIPPED_HISTORICAL'};
 const media=[...(bundle.videos||[]).map(x=>({...x,format:'video'})),
   ...(bundle.podcasts||[]).map(x=>({...x,format:'podcast'}))];
 if(media.length!==4||media.filter(x=>x.format==='video').length!==2||
    media.filter(x=>x.format==='podcast').length!==2)
   fail('four_selected_video_podcast_programs_required');
 const audit=bundle.media_topic_review;
 const lock=bundle.editorial_provenance?.selection_locked_at;
 if(audit?.schema_version!=='daily-brief-media-topic-review-v1'||
    !iso(audit.reviewed_at)||!iso(lock)||
    Date.parse(audit.reviewed_at)>Date.parse(lock)||
    !prose(audit.reviewer,3)||!Array.isArray(audit.programs)||audit.programs.length!==4||
    !Array.isArray(audit.comparisons)||audit.comparisons.length!==6)
   fail('genuine_preselection_cross_media_review_required');
 const selected=new Map();
 for(const item of media){
   if(!https(item.url)||selected.has(item.url))fail('media_program_url_invalid_or_repeated');
   selected.set(item.url,item);
 }
 const events=new Map(),seen=new Set();
 for(const review of audit.programs){
   const item=selected.get(review?.program_url);
   if(!item||seen.has(review.program_url)||review.format!==item.format||
      !/^20\d{2}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)+$/.test(review.event_id||'')||
      !https(review.source_evidence_url)||!prose(review.source_scope,45)||
      !prose(review.reader_question,25)||!prose(review.distinct_contribution,45)||
      !iso(review.reviewed_at)||Date.parse(review.reviewed_at)>Date.parse(audit.reviewed_at))
     fail('program_event_evidence_missing_or_unbound');
   if(events.has(review.event_id))fail('same_original_event_selected_more_than_once:'+review.event_id);
   seen.add(review.program_url);
   events.set(review.event_id,review.program_url);
 }
 if(seen.size!==selected.size)fail('selected_media_not_completely_reviewed');
 const compared=new Set();
 for(const review of audit.comparisons){
   const left=review?.left_url,right=review?.right_url;
   if(!selected.has(left)||!selected.has(right)||left===right||
      review.same_event!==false||!prose(review.distinct_event_evidence,45))
     fail('unresolved_or_unsubstantiated_media_event_overlap');
   const key=pair(left,right);
   if(compared.has(key))fail('duplicate_pair_review');
   compared.add(key);
 }
 const urls=[...selected.keys()];
 for(let i=0;i<urls.length;i++)for(let j=i+1;j<urls.length;j++)
   if(!compared.has(pair(urls[i],urls[j])))fail('missing_pairwise_event_review');
 return {result:'PASS',selected_programs:4,distinct_documented_events:4,
   pairwise_reviews:6,independent_semantic_truth_not_inferred:true,
   playback_and_publisher_gates_still_required:true};
}
