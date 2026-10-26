// Source-disposition worklist for the next natural Brief. This is not a web
// retriever or a source-activation mechanism. Unknowns remain unknown.
export const QUALIFICATION_SCHEMA='daily-compiler-source-qualification-oct28-v1';
const VALID=new Set(['UNREVIEWED','VERIFIED_ACTIVE','DUPLICATE','STALE_OR_INACTIVE',
  'ACCESS_UNAVAILABLE','IRRELEVANT','NEEDS_MORE_EVIDENCE']);
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&
 /^\d{4}-\d{2}-\d{2}T/.test(value);
const https=value=>{try{return new URL(value).protocol==='https:';}catch{return false;}};
const fail=x=>{throw new Error('SOURCE_QUALIFICATION_'+x);};
export function buildDisabledSourceWorklist(registry,{edition_date='2026-10-27',
 execution_id='unknown',created_at}={}){
 if(!iso(created_at)||!/^(?:20)\d{2}-\d{2}-\d{2}$/.test(edition_date)||!execution_id)
  fail('INVALID_IDENTITY');
 const rows=registry.resources.filter(r=>!r.enabled).map(r=>({
  resource_id:r.resource_id,source_name:r.name,url:r.url,
  content_types:[...r.content_types],status:'UNREVIEWED',reviewed_at:null,
  indexed_source_url:null,original_item_url:null,original_item_date:null,
  publisher_identity:null,canonical_duplicate_id:null,why:null
 }));
 const worklist={schema_version:QUALIFICATION_SCHEMA,edition_date,execution_id,
  created_at,policy:'EVIDENCE_REQUIRED_NO_BULK_ENABLE',resources:rows};
 return updateTotals(worklist);
}
export function updateTotals(ledger){
 const rows=ledger.resources||[],reviewed=rows.filter(x=>x.status!=='UNREVIEWED');
 ledger.disabled_sources_total=rows.length;
 ledger.reviewed_disabled_count=reviewed.length;
 ledger.unreviewed_disabled_count=rows.length-reviewed.length;
 ledger.verified_source_ids=rows.filter(x=>x.status==='VERIFIED_ACTIVE')
  .map(x=>x.resource_id);
 ledger.disposition_counts=Object.fromEntries([...VALID].map(k=>[k,rows.filter(x=>x.status===k).length]));
 return ledger;
}
export function recordDisabledSourceDisposition(ledger,result){
 const row=ledger.resources?.find(x=>x.resource_id===result?.resource_id);
 if(!row||row.status!=='UNREVIEWED'||!VALID.has(result.status)||
  result.status==='UNREVIEWED'||!iso(result.reviewed_at)||
  typeof result.why!=='string'||result.why.trim().length<45)
  fail('UNSUPPORTED_DISPOSITION');
 if(result.status==='VERIFIED_ACTIVE'){
  if(!https(result.indexed_source_url)||!https(result.original_item_url)||
   !iso(result.original_item_date)||!result.publisher_identity||
   typeof result.publisher_identity!=='string'||result.publisher_identity.length<4||
   Date.parse(result.original_item_date)>Date.parse(result.reviewed_at)+86400000)
   fail('MISSING_ORIGINAL_DATED_SOURCE_EVIDENCE');
 }
 if(result.status==='DUPLICATE'){
  if(typeof result.canonical_duplicate_id!=='string'||
   !result.canonical_duplicate_id.trim()||
   result.canonical_duplicate_id===row.resource_id)
   fail('MISSING_CANONICAL_DUPLICATE_ID');
 }
 const keys=['status','reviewed_at','indexed_source_url','original_item_url',
  'original_item_date','publisher_identity','canonical_duplicate_id','why'];
 for(const k of keys)row[k]=result[k]??null;
 updateTotals(ledger);
 return ledger;
}
export function validateDisabledSourceWorklist(registry,ledger,{requireAllReviewed=false}={}){
 if(ledger?.schema_version!==QUALIFICATION_SCHEMA||
   ledger?.policy!=='EVIDENCE_REQUIRED_NO_BULK_ENABLE'||!iso(ledger.created_at))
  fail('INVALID_VERSION');
 const expected=buildDisabledSourceWorklist(registry,{edition_date:ledger.edition_date,
  execution_id:ledger.execution_id,created_at:ledger.created_at});
 if(!Array.isArray(ledger.resources)||ledger.resources.length!==expected.resources.length)
  fail('MISSING_DISABLED_SOURCE_ROWS');
 for(let i=0;i<ledger.resources.length;i++){
  const row=ledger.resources[i],original=expected.resources[i];
  if(row.resource_id!==original.resource_id||row.url!==original.url||
   row.source_name!==original.source_name||
   JSON.stringify(row.content_types)!==JSON.stringify(original.content_types))
   fail('DISABLED_SOURCE_IDENTITY_MISMATCH');
  if(row.status!=='UNREVIEWED')recordDisabledSourceDisposition(expected,row);
  else if(JSON.stringify(row)!==JSON.stringify(original))fail('FALSIFIED_UNREVIEWED_ROW');
  if(row.status==='DUPLICATE'&&!registry.resources.some(r=>
   r.resource_id===row.canonical_duplicate_id))fail('DUPLICATE_TARGET_NOT_REGISTERED');
 }
 const clone=JSON.parse(JSON.stringify(ledger));updateTotals(clone);
 for(const k of ['disabled_sources_total','reviewed_disabled_count',
  'unreviewed_disabled_count','verified_source_ids','disposition_counts'])
  if(JSON.stringify(clone[k])!==JSON.stringify(ledger[k]))fail('INCONSISTENT_DISPOSITION_COUNTS');
 if(requireAllReviewed&&ledger.unreviewed_disabled_count>0)fail('DISABLED_SOURCES_UNREVIEWED');
 return {result:ledger.unreviewed_disabled_count===0?'ALL_QUALIFICATIONS_ACCOUNTED':'PENDING',
  disabled_sources_total:ledger.disabled_sources_total,
  reviewed:ledger.reviewed_disabled_count,pending:ledger.unreviewed_disabled_count,
  verified:ledger.verified_source_ids.length,
  caveat:'QUALIFICATION_EVIDENCE_IS_A_RESEARCH_REPORT_NOT_INDEPENDENT_HTTP_PROOF'};
}
