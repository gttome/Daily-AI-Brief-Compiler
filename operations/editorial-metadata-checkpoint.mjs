// Bind observed publisher metadata and honest fallback comparisons before lock.
export const EDITORIAL_METADATA_EFFECTIVE='2026-11-21';
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const stamp=s=>typeof s==='string'&&/T/.test(s)&&Number.isFinite(Date.parse(s));
const text=(s,n=30)=>typeof s==='string'&&s.trim().length>=n;
const norm=s=>String(s||'').normalize('NFC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const day=s=>/^20\d\d-\d\d-\d\d$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fail=s=>{throw Error('editorial_metadata_checkpoint:'+s);};
export function validateObservedSourceMetadata(bundle){
 if(bundle?.edition_date<EDITORIAL_METADATA_EFFECTIVE)return {status:'HISTORICAL_UNCHANGED'};
 const rows=bundle?.editorial_provenance?.source_metadata;
 if(!Array.isArray(rows))return {status:'NOT_RECORDED',matched:0,required:bundle?.stories?.length??6};
 const lock=Date.parse(bundle.editorial_provenance.selection_locked_at||'');
 const seen=new Set();
 for(const r of rows){
  const s=bundle.stories?.find(s=>s.id===r?.story_id);
  if(!s||seen.has(r.story_id)||r.source_url!==s.source.url||!https(r.evidence_url)||
   !text(r.original_title,8)||!day(r.original_date)||
   !['day','timestamp'].includes(r.date_precision)||!stamp(r.observed_at)||
   !Number.isFinite(lock)||Date.parse(r.observed_at)>lock||
   norm(r.original_title)!==norm(s.source.title)||
   r.original_date!==s.source.published_at?.slice(0,10))fail('original_title_date_or_observation_mismatch:'+r?.story_id);
  if(r.date_precision==='timestamp'&&(!stamp(r.original_timestamp)||r.original_timestamp!==s.source.published_at))
   fail('timestamp_precision_not_supported:'+r.story_id);
  seen.add(r.story_id);
 }
 return {status:seen.size===bundle.stories.length?'OBSERVED_METADATA_MATCH':'INCOMPLETE',
  matched:seen.size,required:bundle.stories.length,source_truth_not_inferred:true};
}
export function validateSpecificFallbackComparisons(bundle){
 if(bundle?.edition_date<EDITORIAL_METADATA_EFFECTIVE)return {status:'HISTORICAL_UNCHANGED'};
 const candidates=bundle.source_discovery_audit?.candidates||[];
 const decisions=bundle.source_discovery_audit?.fallback_decisions||[];
 const results=[];
 for(const s of bundle.stories||[]){
  if(Date.parse(bundle.edition_date+'T12:00:00Z')-Date.parse(s.source.published_at)<=86400000)continue;
  const d=decisions.find(d=>d.story_id===s.id);
  if(!d)continue; // Existing source-discovery gate already requires the decision.
  if(d.newer_sources_considered?.includes(s.source.url))fail('self_comparison:'+s.id);
  if(!Array.isArray(d.comparisons)){results.push({story_id:s.id,status:'NOT_RECORDED'});continue;}
  for(const c of d.comparisons){
   const original=candidates.find(x=>x.url===c.url);
   if(!original||c.url===s.source.url||c.focus!==s.focus||!day(c.original_date)||
    c.original_date!==original.original_date||Date.parse(c.original_date)<=Date.parse(s.source.published_at)||
    !text(c.substantive_rejection_reason,60)||!stamp(c.reviewed_at)||
    !stamp(bundle.editorial_provenance?.selection_locked_at)||
    Date.parse(c.reviewed_at)>Date.parse(bundle.editorial_provenance.selection_locked_at))
      fail('unbound_newer_lane_comparison:'+s.id);
  }
  const gap=d.search_gap;
  const gapValid=gap&&text(gap.query,8)&&Array.isArray(gap.checked_urls)&&gap.checked_urls.length&&
   gap.checked_urls.every(https)&&text(gap.reason,60)&&stamp(gap.attempted_at)&&
   Date.parse(gap.attempted_at)<=Date.parse(bundle.editorial_provenance?.selection_locked_at||'');
  results.push({story_id:s.id,status:d.comparisons.length?'SPECIFIC_COMPARISON':gapValid?'SEARCH_GAP_DISCLOSED':'INCOMPLETE'});
 }
 return {status:'REVIEWED',stories:results,quality_target_not_quota:true};
}
