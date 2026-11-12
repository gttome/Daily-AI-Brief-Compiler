// Prospective, deterministic evidence assembly only. Never changes published bundles.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enabledEditorialResources} from '../operations/resources.mjs';

const validTime=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))&&
 /^20\d\d-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(s);
const unique=rows=>new Set(rows).size===rows.length;
const fail=code=>{throw Error('EDITORIAL_INDEX_BINDING_'+code);};

function https(value) {
 try {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
 } catch {
  return false;
 }
}

export function validateEditorialIndexReview({registry,indexReview}){
 if(!indexReview||!Array.isArray(registry?.resources))fail('INVALID_INPUT');
 if(indexReview.schema_version!=='daily-compiler-index-review-v1'||
    !/^20\d{2}-\d{2}-\d{2}$/.test(indexReview.edition_date||''))fail('EDITION_OR_SCHEMA');
 if(!validTime(indexReview.reviewed_at))fail('TIMING');
 const ids=enabledEditorialResources(registry).map(r=>r.resource_id).sort();
 if(!ids.length||ids.some(id=>typeof id!=='string'||!id)||!unique(ids)||
    indexReview.eligible_count!==ids.length)fail('REGISTRY_SET');
 const groups=['inspected_ids','inaccessible_ids','unreviewed_ids'];
 if(groups.some(k=>!Array.isArray(indexReview[k])||!unique(indexReview[k])))fail('DUPLICATE_GROUP');
 const all=groups.flatMap(k=>indexReview[k]);
 const eligible = new Set(ids);
 if (!unique(all)||all.length!==eligible.size||all.some(id=>!eligible.has(id))) fail('PARTITION');
 const {inspection_rows, qualification_only_ids} = indexReview;
 if (qualification_only_ids !== undefined) {
  const disabledVideoIds = new Set(registry.resources.filter(resource =>
   resource.enabled === false && resource.content_types?.includes('video')).map(resource => resource.resource_id));
  if (!Array.isArray(qualification_only_ids) || !unique(qualification_only_ids) ||
      qualification_only_ids.some(id => !disabledVideoIds.has(id))) fail('QUALIFICATION_SCOPE');
 }
 if (inspection_rows !== undefined) {
  const inspected = new Set(indexReview.inspected_ids);
  if (!Array.isArray(inspection_rows) || inspection_rows.length !== inspected.size ||
      !unique(inspection_rows.map(row => row?.resource_id)) || inspection_rows.some(row =>
       !inspected.has(row?.resource_id) || !https(row.index_url) || !validTime(row.observed_at) ||
       Date.parse(row.observed_at) > Date.parse(indexReview.reviewed_at) ||
       !['full_dated_item_read', 'bounded_public_index_search'].includes(row.outcome) ||
       (row.outcome === 'full_dated_item_read' && !https(row.original_item_url)))) fail('INSPECTION_EVIDENCE');
 }
 const index={
  eligible:ids.length,eligible_ids:ids,
  inspected:indexReview.inspected_ids.length,inspected_ids:[...indexReview.inspected_ids],
  inaccessible:indexReview.inaccessible_ids.length,inaccessible_ids:[...indexReview.inaccessible_ids],
  unreviewed:indexReview.unreviewed_ids.length,unreviewed_ids:[...indexReview.unreviewed_ids],
  reviewed_at:indexReview.reviewed_at,
  ...(inspection_rows !== undefined && {inspection_rows:structuredClone(inspection_rows)}),
  ...(qualification_only_ids !== undefined && {qualification_only_ids:[...qualification_only_ids]}),
  source:'GENUINE_PRESELECTION_INDEX_REVIEW'
 };
 return index;
}

export function attachEditorialIndexReview({registry,indexReview,bundle}){
 if(!bundle||indexReview?.edition_date!==bundle.edition_date)fail('EDITION_OR_SCHEMA');
 if(bundle.editorial_provenance?.sealed_at||
    ['PUBLISHED','RELEASED_VERIFIED','SHADOW_VERIFIED'].includes(bundle.status))fail('SEALED_BUNDLE');
 const index=validateEditorialIndexReview({registry,indexReview});
 const lock=bundle.editorial_provenance?.selection_locked_at;
 if(!validTime(lock)||!validTime(indexReview.selection_locked_at)||
    Date.parse(indexReview.reviewed_at)>Date.parse(indexReview.selection_locked_at)||
    Date.parse(indexReview.selection_locked_at)>Date.parse(lock))fail('TIMING');
 return {...bundle,source_discovery_audit:{...(bundle.source_discovery_audit||{}),index_review:index}};
}

const main=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(main){
 const [registryFile,indexFile,draftBundleFile,outputFile]=process.argv.slice(2);
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
 if (registryFile === '--check' && indexFile && draftBundleFile) {
  const index=validateEditorialIndexReview({registry:read(indexFile),indexReview:read(draftBundleFile)});
  console.log(JSON.stringify({result:'EDITORIAL_INDEX_PARTITION_CHECKED', inspected:index.inspected, eligible:index.eligible}));
 } else {
  if(!outputFile)fail('USAGE_REGISTRY_INDEX_DRAFT_OUTPUT');
  const output=attachEditorialIndexReview({registry:read(registryFile),indexReview:read(indexFile),bundle:read(draftBundleFile)});
  fs.mkdirSync(path.dirname(outputFile),{recursive:true});
  fs.writeFileSync(outputFile,JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({result:'PRESELECTION_INDEX_EVIDENCE_BOUND',edition_date:output.edition_date,
   inspected:output.source_discovery_audit.index_review.inspected,
   eligible:output.source_discovery_audit.index_review.eligible}));
 }
}
