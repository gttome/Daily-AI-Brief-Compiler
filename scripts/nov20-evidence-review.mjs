// Standalone observational AAR helper, also copied by the existing report job.
// No network, source mutation, publication or implicit owner approval.
const stamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const https=s=>{try{return new URL(s).protocol==='https:';}catch{return false;}};
const weights={novelty:20,evidence:25,independence:15,momentum:15,relevance:15,durability:10};
export function summarizeNov20Evidence(edition,e={}){
 const b=e['edition-bundle']?.edition_date===edition?e['edition-bundle']:null;
 const p=b?.producer_receipt;
 const prohibited=p?['work_used','codex_used'].filter(k=>p[k]===true):[];
 const runtime={status:!p?'NOT_RECORDED':p.paid_model_api_used===true?'DECLARED_PAID_MODEL_API_USAGE':prohibited.length?'DECLARED_RESTRICTED_EDITORIAL_RUNTIME':
  ['work_used','codex_used','paid_model_api_used'].every(k=>p[k]===false)?'DECLARED_CONFORMING_NOT_INDEPENDENTLY_ATTESTED':'UNKNOWN',
  declared_flags:p?{work_used:p.work_used,codex_used:p.codex_used,paid_model_api_used:p.paid_model_api_used}:null,
  requires_reconciliation:prohibited,actual_billing:null,scheduler_origin:'UNPROVEN',
  caveat:'Producer declarations do not establish actual execution or charges; preserve conflicting historical evidence. Image-lane authorization is separate.'};
 const topics=e['published-watchlist']?.edition_date===edition?e['published-watchlist'].topics:[];
 const watch=(topics||[]).filter(t=>t.first_detected===edition).map(t=>{
  const valid=Object.keys(weights).every(k=>t.rubric?.[k]&&
   (t.rubric[k].score===null||Number.isInteger(t.rubric[k].score)&&t.rubric[k].score>=0&&t.rubric[k].score<=5));
  const score=valid?Math.round(Object.entries(weights).reduce((sum,[k,w])=>sum+(t.rubric[k].score??0)/5*w,0)):null;
  return {topic_id:t.topic_id,name:t.name,published_score:t.research_score??null,
   calculated_score:score,score_matches:score===null?null:score===t.research_score,
   original_evidence_urls:(t.evidence||[]).map(x=>x.url).filter(https)};
 });
 const census=e['source-item-census']?.edition_date===edition?e['source-item-census']:null;
 const rows=census?.resources||[];
 const failureGroups={};
 for(const row of rows.filter(r=>['SOURCE_ERROR','ACCESS_BLOCKED'].includes(r.outcome))){
  const kind=row.failure_kind||(row.outcome==='ACCESS_BLOCKED'?'ACCESS_BLOCKED':
   /exceeds|size limit/i.test(row.reason||'')?'RESPONSE_SIZE_LIMIT':
   /abort|timeout|network|fetch failed/i.test(row.reason||'')?'TRANSIENT_NETWORK':'PARSER_OR_OTHER');
  failureGroups[kind]=(failureGroups[kind]||0)+1;
 }
 const ledger=b?.video_candidate_discovery;
 const candidates=Array.isArray(ledger?.candidates)&&ledger.edition_date===edition?ledger.candidates:null;
 const lock=Date.parse(b?.editorial_provenance?.selection_locked_at||'');
 const kinds=['research_talk','technical_demonstration','practical_explanation','independent_explainer','substantive_interview','news_reporting'];
 const genuine=candidates?.filter(c=>https(c?.program_url)&&https(c.source_evidence_url)&&
  kinds.includes(c.content_kind)&&['FULL_PROGRAM','COMPLETE_TRANSCRIPT'].includes(c.review_scope)&&
  typeof c.editorial_value_basis==='string'&&c.editorial_value_basis.length>=80&&
  stamp(c.reviewed_at)&&Date.parse(c.reviewed_at)<=lock&&typeof c.original_publisher_family==='string');
 const selected=(b?.videos||[]).map(v=>genuine?.find(c=>c.program_url===v.url));
 const candidateStatus=!candidates?'NOT_RECORDED':genuine.length===candidates.length&&
  new Set(genuine.map(c=>c.program_url)).size===genuine.length?'RECORDED':'INVALID';
 const video={status:candidateStatus,substantive_candidates:candidates?genuine.length:null,
  non_news_candidates:candidates?genuine.filter(c=>c.content_kind!=='news_reporting').length:null,
  publisher_families:candidates?new Set(genuine.map(c=>c.original_publisher_family)).size:null,
  selected_non_news:selected.length===2&&selected.every(Boolean)?selected.filter(c=>c.content_kind!=='news_reporting').length:null,
  selected_news:selected.length===2&&selected.every(Boolean)?selected.filter(c=>c.content_kind==='news_reporting').length:null,
  news_fallback_exception:ledger?.news_fallback_exception??null,
  target:{substantive_candidates:12,publisher_families:6,non_news_candidates:8,selected_non_news:2,advisory:true},
  playback_not_inferred:true};
 const paperWindow=edition>='2026-11-17'?3:7;
 const paper=e['scientific-paper-coverage'];
 return {schema_version:'nov20-approved-aar-evidence-v1',edition_date:edition,
  runtime_policy:runtime,watchlist_score_reconciliation:watch,source_failure_categories:failureGroups,
  video_candidate_discovery:video,paper_window_editions:paperWindow,
  scientific_paper_review_timing:paper?.review_timing??'NOT_RECORDED',
  source_metadata_observations:b?.editorial_provenance?.source_metadata??null,
  source_metadata_postpublication_review:e['postpublication-source-metadata']??null,
  image_efficiency_target:{first_pass:4,maximum_calls:8,advisory:true,attempt_limit:null},
  image_three_edition_evaluation:{change_ids:'IMG19-01 through IMG19-08',
   eligible_editions:['2026-11-20','2026-11-21','2026-11-22'],review_due:'2026-11-22',
   owner_artwork_acceptance:'UNKNOWN',implementation_is_not_efficacy:true}};
}
export function renderNov20Evidence(r){
 const cell=x=>String(x??'Not recorded').replace(/[|\r\n]/g,' ');
 const v=r.video_candidate_discovery;
 return ['## Approved November 20 improvement evidence','',
  `Editorial runtime declarations: **${r.runtime_policy.status}**. Actual billing and scheduled origin remain unknown.`,
  '',`Video candidate evidence: **${v.status}**; substantive candidates ${cell(v.substantive_candidates)}, non-news ${cell(v.non_news_candidates)}, original publisher families ${cell(v.publisher_families)}, selected non-news ${cell(v.selected_non_news)}. Targets 12 / 8 / 6 / 2 are advisory; unchanged duration, promotion, novelty and full-program playback checks still apply.`,
  '',`Source failure categories: ${Object.entries(r.source_failure_categories).map(([k,n])=>k+' '+n).join(', ')||'Not recorded'}. Empty, blocked, oversized and unreviewed sources are distinct.`,
  '',`Original-paper cadence: one qualified paper within ${r.paper_window_editions} editions when available. Current review timing ${cell(r.scientific_paper_review_timing)}; postpublication review is not evidence of preselection reading.`,
  '',...r.watchlist_score_reconciliation.map(t=>`- ${cell(t.name)}: published ${cell(t.published_score)}, unchanged-rubric calculation ${cell(t.calculated_score)}, retained original source links ${t.original_evidence_urls.length}.`),
  '', 'IMG19 artistic changes retain their existing November 22 three-eligible-edition evaluation. Missing pixels, owner feedback and usage remain unknown; no retrospective source, query or artwork acceptance is invented.',''].join('\n');
}
