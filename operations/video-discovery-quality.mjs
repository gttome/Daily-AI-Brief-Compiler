// Discovery planning and recorded content review. Neither certifies playback.
export const VIDEO_DISCOVERY_QUALITY_EFFECTIVE='2026-11-21';
export const VIDEO_DISCOVERY_TARGETS=Object.freeze({substantive_candidates:12,
 original_publisher_families:6,non_news_candidates:8,preferred_selected_non_news:2,
 advisory:true,publication_blocker:false});
export const VIDEO_CONTENT_KINDS=Object.freeze(['research_talk','technical_demonstration',
 'practical_explanation','independent_explainer','substantive_interview','news_reporting']);
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const stamp=s=>typeof s==='string'&&/T/.test(s)&&Number.isFinite(Date.parse(s));
const text=(s,n=30)=>typeof s==='string'&&s.trim().length>=n;
const day=s=>/^20\d\d-\d\d-\d\d$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fail=s=>{throw Error('video_candidate_discovery:'+s);};
export function buildVideoDiscoveryWorklist({editionDate,registry}){
 const routes=registry.resources.filter(r=>r.content_types?.includes('video'));
 const priority=r=>r.video_discovery_class==='independent_explainer'?0:
  r.video_discovery_class==='research_talk'?1:r.video_discovery_class?2:3;
 const ordered=[...routes].sort((a,b)=>priority(a)-priority(b)||a.resource_id.localeCompare(b.resource_id));
 // Interleave independently identified families so two MIT routes cannot
 // masquerade as two original publishers or monopolize the first batch.
 const out=[];let last=null;
 while(ordered.length){let at=ordered.findIndex(r=>(r.original_publisher_family||r.publisher)!==last);
  if(at<0)at=0;const r=ordered.splice(at,1)[0];last=r.original_publisher_family||r.publisher;
  out.push({order:out.length+1,resource_id:r.resource_id,url:r.url,
   original_publisher_family:last,discovery_class:r.video_discovery_class||'review_item_before_classification',
   enabled:r.enabled,inspection_status:'NOT_ATTEMPTED'});
 }
 return {schema_version:'daily-video-discovery-worklist-v1',edition_date:editionDate,
  targets:{...VIDEO_DISCOVERY_TARGETS},registered_routes:routes.length,routes:out,
  rule:'Review the non-news roster first, then broaden exact program discovery. Aim for twelve substantive candidates across six publisher families, eight non-news. Prefer two qualified non-news selections. A genuine unavailable or inadequate pool requires exact evidence, not invented candidates or weaker playback. Every registered route still receives its own attempt.'};
}
export function recordVideoCandidate(ledger,bundle,observation,{now=new Date().toISOString()}={}){
 if(ledger?.schema_version!=='daily-video-candidate-discovery-v1'||
    ledger.edition_date!==bundle?.edition_date||!Array.isArray(ledger.candidates))fail('wrong_edition');
 if(bundle.editorial_provenance?.selection_locked_at)fail('selection_locked_no_backfill');
 const o=observation;
 if(!o||!https(o.program_url)||!https(o.source_evidence_url)||
  !text(o.original_publisher_family,2)||!text(o.title,8)||!VIDEO_CONTENT_KINDS.includes(o.content_kind)||
  !['FULL_PROGRAM','COMPLETE_TRANSCRIPT'].includes(o.review_scope)||!text(o.editorial_value_basis,80)||
  !stamp(o.reviewed_at)||!stamp(now)||Date.parse(o.reviewed_at)>Date.parse(now)||
  !Number.isFinite(o.duration_minutes)||o.duration_minutes<=0||
  !day(o.original_date)||
  !['low','medium','high'].includes(o.promotional_risk)||
  !['considered','qualified','rejected','unavailable'].includes(o.disposition))fail('substantive_program_evidence_required');
 if(ledger.candidates.some(x=>x.program_url===o.program_url))fail('duplicate_program');
 if(o.disposition==='qualified'&&(o.duration_minutes<3||o.duration_minutes>20||o.promotional_risk==='high'))
  fail('qualified_program_outside_existing_duration_or_promotion_rules');
 const copy=structuredClone(ledger);copy.candidates.push(structuredClone(o));return copy;
}
export function summarizeVideoCandidateDiscovery(bundle){
 const ledger=bundle?.video_candidate_discovery,selected=bundle?.videos||[];
 if(!ledger||ledger.schema_version!=='daily-video-candidate-discovery-v1'||ledger.edition_date!==bundle.edition_date)
  return {status:'NOT_RECORDED',substantive_candidates:null,non_news_candidates:null,
   publisher_families:null,selected_non_news:null,selected_news:null,targets:{...VIDEO_DISCOVERY_TARGETS}};
 const lock=Date.parse(bundle.editorial_provenance?.selection_locked_at||'');
 const rows=Array.isArray(ledger.candidates)?ledger.candidates:[];
 const valid=rows.filter(o=>https(o?.program_url)&&https(o.source_evidence_url)&&
  VIDEO_CONTENT_KINDS.includes(o.content_kind)&&text(o.original_publisher_family,2)&&
  ['FULL_PROGRAM','COMPLETE_TRANSCRIPT'].includes(o.review_scope)&&text(o.editorial_value_basis,80)&&
  stamp(o.reviewed_at)&&Number.isFinite(lock)&&Date.parse(o.reviewed_at)<=lock);
 const unique=[...new Map(valid.map(o=>[o.program_url,o])).values()];
 const choices=selected.map(s=>unique.find(o=>o.program_url===s.url));
 return {status:valid.length===rows.length&&unique.length===rows.length?'RECORDED':'INVALID',
  substantive_candidates:unique.length,non_news_candidates:unique.filter(o=>o.content_kind!=='news_reporting').length,
  publisher_families:new Set(unique.map(o=>o.original_publisher_family)).size,
  selected_non_news:choices.every(Boolean)?choices.filter(o=>o.content_kind!=='news_reporting').length:null,
  selected_news:choices.every(Boolean)?choices.filter(o=>o.content_kind==='news_reporting').length:null,
  source_ids:[...new Set(unique.map(o=>o.resource_id).filter(Boolean))],
  fallback_exception:ledger.news_fallback_exception??null,targets:{...VIDEO_DISCOVERY_TARGETS},
  no_full_program_playback_inferred:true};
}
