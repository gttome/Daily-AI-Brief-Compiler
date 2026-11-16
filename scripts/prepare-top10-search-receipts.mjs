#!/usr/bin/env node
// Bounded recovery of an edition's Top 10 search DISPOSITIONS, not research.
// Preserves genuine same-edition observations only; never promotes a generic
// query or an empty search landing page into claimed editorial search.
import fs from 'node:fs';
import path from 'node:path';
import {initializeTrendSearchCoverage} from '../operations/editorial-research-plan.mjs';

const [inputFile, priorFile, outputFile, draftBundleFile]=process.argv.slice(2);
if(!inputFile||!priorFile||!outputFile)throw Error(
 'Usage: prepare-top10-search-receipts.mjs <verified-trend-input.json> <existing-coverage.json|-> <output.json> [draft-bundle.json]');
const load=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const input=load(inputFile);
const expected=initializeTrendSearchCoverage(input.edition_date,input);
const prior=priorFile==='-'?null:load(priorFile);
const bundle=draftBundleFile?load(draftBundleFile):null;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&
 /^\d{4}-\d\d-\d\dT/.test(x);
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const bareSearchLanding=x=>{
 try {
  const u=new URL(x),host=u.hostname.replace(/^www\./,'').toLowerCase();
  return (host==='google.com'&&u.pathname==='/search'&&!u.searchParams.get('q'))||
    (host==='youtube.com'&&u.pathname==='/results'&&!u.searchParams.get('search_query'));
 } catch {return true;}
};
const allowed=new Set(['searched','selected','rejected','qualified_not_selected','not_found','unavailable']);
const validPrior=prior?.edition_date===input.edition_date&&prior.cycle_date===input.cycle_date&&
 prior.report_sha256===input.report_sha256&&prior.source_commit===input.source_commit;
const previous=validPrior&&Array.isArray(prior.searches)?prior.searches:[];
const lockedAt=bundle?.editorial_provenance?.selection_locked_at;
const limit=stamp(lockedAt)?Date.parse(lockedAt):Infinity;
const used=new Set();
let preserved=0,discarded=0;
expected.searches=expected.searches.map(slot=>{
 const key=slot.topic_id+':'+slot.format;
 const options=previous.filter(r=>r?.topic_id+':'+r?.format===key);
 const valid=options.filter(r=>r.query===slot.query&&allowed.has(r.outcome)&&
  stamp(r.attempted_at)&&Date.parse(r.attempted_at)>=Date.parse(input.retrieved_at)&&
  Date.parse(r.attempted_at)<=limit&&Array.isArray(r.source_urls)&&
  r.source_urls.length>0&&r.source_urls.every(u=>https(u)&&!bareSearchLanding(u))&&
  Array.isArray(r.candidate_ids)&&r.candidate_ids.every(x=>typeof x==='string'&&x.trim())&&
  typeof r.reason==='string'&&r.reason.trim());
 discarded+=options.length-valid.length;
 if(valid.length!==1||used.has(key)){discarded+=valid.length;return slot;}
 used.add(key);preserved++;
 return {...valid[0],topic_id:slot.topic_id,format:slot.format,query:slot.query};
});
discarded+=previous.filter(r=>!expected.searches.some(s=>s.topic_id===r?.topic_id&&s.format===r?.format)).length;
const attemptedKeys=new Set(expected.searches.filter(s=>s.outcome!=='not_attempted').map(s=>s.topic_id+':'+s.format));
const selected_mappings=validPrior&&Array.isArray(prior?.selected_mappings)&&bundle?
 prior.selected_mappings.filter(m=>{
  if(!attemptedKeys.has(m?.topic_id+':'+m?.format))return false;
  const records=bundle[m.format==='article'?'stories':m.format==='video'?'videos':'podcasts'];
  return Array.isArray(records)&&records.some(r=>(r?.source?.url??r?.url)===m.url&&
   (r?.id??(r?.source?.url??r?.url))===m.item_id);
 }):[];
const output={...expected,searches:expected.searches,selected_mappings,
 receipt_recovery:{schema_version:'bounded-top10-recovery-v1',
   source:'exact_consumed_report',genuine_attempts_preserved:preserved,
   invalid_or_duplicate_rows_discarded:discarded,
   remaining_real_searches:expected.searches.length-preserved,
   status:preserved===expected.searches.length?'OBSERVED_EXACT_SOURCE':'NEEDS_REAL_SEARCH',
   no_fabricated_attempts:true}};
fs.mkdirSync(path.dirname(outputFile),{recursive:true});
fs.writeFileSync(outputFile,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.receipt_recovery));
