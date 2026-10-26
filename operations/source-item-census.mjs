import crypto from 'node:crypto';
import {validateResourceRegistry} from './resources.mjs';

export const ITEM_COVERAGE_VERSION='daily-compiler-editorial-source-census-v1';
const ROLES=['article','video','podcast'];
const TERMINAL=new Set(['CANDIDATES_FOUND','NO_ELIGIBLE_ITEMS','ACCESS_BLOCKED','SOURCE_ERROR']);
const fail=s=>{throw new Error('EDITORIAL_SOURCE_CENSUS_'+s);};
const okDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&/\d{4}-\d{2}-\d{2}T/.test(s);
const https=s=>{try{return new URL(s).protocol==='https:';}catch{return false;}};
const hostname=u=>new URL(u).hostname.toLowerCase().replace(/^www\./,'');
const digest=r=>crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex');
export function itemCensusCounts(ledger){
 const list=ledger.resources||[];
 const checked=list.filter(r=>TERMINAL.has(r.outcome));
 const roleCounts={};
 for(const role of ROLES){
  roleCounts[role]={eligible:list.filter(r=>r.roles.includes(role)).length,
    attempted:checked.filter(r=>r.roles.includes(role)).length};
 }
 return {eligible:list.length,attempted:checked.length,not_attempted:list.length-checked.length,
   candidates_found:checked.filter(r=>r.outcome==='CANDIDATES_FOUND').length,
   no_eligible_items:checked.filter(r=>r.outcome==='NO_ELIGIBLE_ITEMS').length,
   blocked_or_error:checked.filter(r=>['ACCESS_BLOCKED','SOURCE_ERROR'].includes(r.outcome)).length,
   role_counts:roleCounts,all_sources_attempted:checked.length===list.length};
}
export function buildEditorialSourceCensus(registry,{edition_date,execution_id,created_at}={}){
 if(validateResourceRegistry(registry).length)fail('INVALID_REGISTRY');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(edition_date||'')||!execution_id||!okDate(created_at))
  fail('INVALID_IDENTITY');
 const resources=registry.resources.filter(r=>r.enabled && r.content_types.some(t=>ROLES.includes(t))).map(r=>({
  resource_id:r.resource_id,url:r.url,roles:r.content_types.filter(t=>ROLES.includes(t)),
  outcome:'NOT_VISITED',checked_at:null,source_index_url:null,evidence_method:null,
  items:[],reason:null
 }));
 const result={schema_version:ITEM_COVERAGE_VERSION,edition_date,execution_id,created_at,
  registry_digest:digest(registry),scope:'ALL_ENABLED_ARTICLE_VIDEO_PODCAST_SOURCE_IDS',
  caveat:'ITEM_CANDIDATE_NOT_PUBLICATION_VERIFIED',
  resources};
 result.counts=itemCensusCounts(result);
 return result;
}
export function recordEditorialSourceObservation(ledger,o){
 const r=ledger.resources?.find(r=>r.resource_id===o?.resource_id);
 if(!r||r.outcome!=='NOT_VISITED')fail('MISSING_OR_REPEATED_RESOURCE');
 if(!TERMINAL.has(o.outcome)||!okDate(o.checked_at)||!https(o.source_index_url)||
  !['publisher_index','publisher_article','rss_or_atom','video_channel','podcast_show','independent_source_index'].includes(o.evidence_method)||
  !Array.isArray(o.items)||typeof o.reason!=='string'||o.reason.length<25)
  fail('MISSING_VISIT_EVIDENCE');
 // A different publisher/index hostname needs an independently verified index
 // receipt; it cannot silently be accepted as a visit to this original source.
 if(hostname(o.source_index_url)!==hostname(r.url)&&
    o.evidence_method!=='independent_source_index')fail('UNBOUND_PUBLISHER_INDEX');
 if(o.outcome==='CANDIDATES_FOUND'){
  if(o.items.length===0||o.items.length>15)fail('CANDIDATE_COUNT_INVALID');
  for(const item of o.items){
   if(!https(item.url)||!item.title||typeof item.title!=='string'||item.title.length<8||
      !okDate(item.original_date)||Date.parse(item.original_date)>Date.parse(o.checked_at)+86400000)fail('CANDIDATE_ORIGINAL_EVIDENCE');
  }
 }else if(o.items.length)fail('NO_ELIGIBLE_BUT_HAS_ITEMS');
 Object.assign(r,{outcome:o.outcome,checked_at:o.checked_at,
  source_index_url:o.source_index_url,evidence_method:o.evidence_method,
  items:o.items,reason:o.reason});
 ledger.counts=itemCensusCounts(ledger);
 return ledger;
}
export function validateEditorialSourceCensus(registry,ledger,{requireAllVisited=false}={}){
 if(ledger?.schema_version!==ITEM_COVERAGE_VERSION||
   ledger?.scope!=='ALL_ENABLED_ARTICLE_VIDEO_PODCAST_SOURCE_IDS'||
   ledger?.caveat!=='ITEM_CANDIDATE_NOT_PUBLICATION_VERIFIED')fail('INVALID_VERSION');
 const expected=buildEditorialSourceCensus(registry,{edition_date:ledger.edition_date,
  execution_id:ledger.execution_id,created_at:ledger.created_at});
 if(expected.registry_digest!==ledger.registry_digest)fail('STALE_REGISTRY');
 if(!Array.isArray(ledger.resources)||ledger.resources.length!==expected.resources.length)
  fail('INCOMPLETE_SOURCE_SET');
 for(let i=0;i<ledger.resources.length;i++){
  const a=ledger.resources[i],b=expected.resources[i];
  if(a.resource_id!==b.resource_id||a.url!==b.url||JSON.stringify(a.roles)!==JSON.stringify(b.roles))
   fail('SOURCE_MAPPING_MISMATCH_'+i);
  if(a.outcome!=='NOT_VISITED'){
   recordEditorialSourceObservation(expected,a);
   if(JSON.stringify(a)!==JSON.stringify(expected.resources[i]))fail('UNRECOGNIZED_EVIDENCE_'+i);
  }else if(JSON.stringify(a)!==JSON.stringify(b))fail('UNVISITED_HAS_DATA_'+i);
 }
 const counts=itemCensusCounts(ledger);
 if(JSON.stringify(counts)!==JSON.stringify(ledger.counts))fail('MISSTATED_COUNTS');
 if(requireAllVisited&&!counts.all_sources_attempted)fail('SOURCES_NOT_ALL_ATTEMPTED');
 return {result:counts.all_sources_attempted?'ALL_SOURCES_ACCOUNTED':'INCOMPLETE',
  ...counts,item_publication_admission:'SEPARATE_EXISTING_GATES'};
}
