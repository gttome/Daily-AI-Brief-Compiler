// Canonical prospectively observed Top 10 receipts; never reconstruct a past search.
// These helpers only shape/validate an observation supplied by the actual editorial worker.
const formats=new Set(['article','video','podcast']);
const outcomes=new Set(['searched','selected','rejected','qualified_not_selected','not_found','unavailable']);
const time=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const fail=why=>{throw Error('TREND_RECEIPT_'+why);};
const asText=s=>typeof s==='string'&&s.trim().length>0;
const verifiedIdentity=(coverage,input)=>coverage?.schema_version==='daily-ai-topic-top10-search-coverage-v1'&&
  input?.schema_version==='daily-ai-topic-top10-input-v1'&&
  coverage.edition_date===input.edition_date&&coverage.cycle_date===input.cycle_date&&
  coverage.source_commit===input.source_commit&&coverage.report_sha256===input.report_sha256;
const selectionTime=record=>record?.editorial_provenance?.selection_locked_at;

export function recordTrendSearch(coverage,input,observation,{selectionLockedAt=null}={}){
 if(!verifiedIdentity(coverage,input))fail('UNBOUND_REPORT');
 if(!formats.has(observation?.format)||!asText(observation?.topic_id))fail('FORMAT_OR_TOPIC');
 const existing=coverage.searches?.filter(s=>s.topic_id===observation.topic_id&&s.format===observation.format);
 if(existing?.length!==1||existing[0].outcome!=='not_attempted')fail('UNKNOWN_OR_ALREADY_OBSERVED_PAIR');
 if(!outcomes.has(observation.outcome))fail('NONCANONICAL_OUTCOME');
 if(!time(input.retrieved_at)||!time(observation.attempted_at)||
   Date.parse(observation.attempted_at)<Date.parse(input.retrieved_at)||
   (selectionLockedAt&&(!time(selectionLockedAt)||Date.parse(observation.attempted_at)>Date.parse(selectionLockedAt))))
    fail('UNPROVEN_SEARCH_CHRONOLOGY');
 const urls=observation.source_urls,ids=observation.candidate_ids;
 if(!Array.isArray(urls)||urls.length===0||!urls.every(https)||
    new Set(urls).size!==urls.length||!Array.isArray(ids)||!ids.every(asText)||
    new Set(ids).size!==ids.length||!asText(observation.reason)||
    observation.reason.trim().length<25||
    !asText(observation.query)||observation.query!==existing[0].query)
    fail('MISSING_GENUINE_SOURCE_OR_QUERY_EVIDENCE');
 if((observation.outcome==='not_found'||observation.outcome==='unavailable')&&ids.length)
   fail('NO_RESULT_CANNOT_HAVE_CANDIDATES');
 if((observation.outcome==='selected'||observation.outcome==='qualified_not_selected')&&!ids.length)
   fail('QUALIFIED_OUTCOME_WITHOUT_CANDIDATE');
 const output=structuredClone(coverage);
 const idx=output.searches.findIndex(s=>s.topic_id===observation.topic_id&&s.format===observation.format);
 output.searches[idx]={topic_id:observation.topic_id,format:observation.format,query:observation.query,
  attempted_at:observation.attempted_at,source_urls:[...urls],candidate_ids:[...ids],
  outcome:observation.outcome,reason:observation.reason};
 return output;
}
export function recordSelectedTrendMapping(coverage,input,bundle,mapping){
 if(!verifiedIdentity(coverage,input)||bundle?.edition_date!==coverage.edition_date)fail('UNBOUND_SELECTION');
 if(!formats.has(mapping?.format)||!asText(mapping.topic_id)||!asText(mapping.item_id)||
    !https(mapping.url)||!asText(mapping.reason)||mapping.reason.trim().length<30)
  fail('INVALID_CANONICAL_MAPPING');
 const searched=coverage.searches?.find(s=>s.topic_id===mapping.topic_id&&s.format===mapping.format&&
   s.outcome!=='not_attempted'&&s.source_urls.includes(mapping.url));
 if(!searched)fail('SELECTED_URL_NOT_IN_ACTUAL_SEARCH');
 const selected=bundle[mapping.format==='article'?'stories':mapping.format==='video'?'videos':'podcasts'];
 if(!Array.isArray(selected)||!selected.some(x=>
   (x.id??(x.source?.url??x.url))===mapping.item_id&&(x.source?.url??x.url)===mapping.url))
   fail('SELECTION_NOT_IN_BUNDLE');
 if(coverage.selected_mappings?.some(x=>x.format===mapping.format&&x.item_id===mapping.item_id))
   fail('DUPLICATE_SELECTION');
 const copy=structuredClone(coverage);
 copy.selected_mappings.push({topic_id:mapping.topic_id,format:mapping.format,
  item_id:mapping.item_id,url:mapping.url,reason:mapping.reason});
 return copy;
}
