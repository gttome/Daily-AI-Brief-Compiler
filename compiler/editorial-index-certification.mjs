// Edition-scoped certification of actual PRESELECTION editorial inspections.
// Automated index census and URL reachability must not inflate this numerator.
import {enabledEditorialResources} from '../operations/resources.mjs';
export const EDITORIAL_INDEX_CERTIFICATION_EFFECTIVE='2026-11-15';
const fail=s=>{throw Error('editorial_index_certification:'+s);};
const iso=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const unique=arr=>Array.isArray(arr)&&new Set(arr).size===arr.length;

export function validateBoundEditorialIndex({bundle,registry}){
 if(!bundle||bundle.edition_date<EDITORIAL_INDEX_CERTIFICATION_EFFECTIVE)
  return {result:'SKIPPED_HISTORICAL'};
 const idx=bundle.source_discovery_audit?.index_review;
 const lock=bundle.editorial_provenance?.selection_locked_at;
 if(!idx||idx.source!=='GENUINE_PRESELECTION_INDEX_REVIEW'||
    !iso(idx.reviewed_at)||!iso(lock)||Date.parse(idx.reviewed_at)>Date.parse(lock))
  fail('missing_or_postselection_index_receipt');
 const expected=enabledEditorialResources(registry).map(r=>r.resource_id).sort();
 if(!expected.length||!unique(expected)||!Array.isArray(idx.eligible_ids)||
    JSON.stringify(idx.eligible_ids)!==JSON.stringify(expected)||idx.eligible!==expected.length)
  fail('eligible_ids_do_not_match_current_registry');
 const groups=['inspected_ids','inaccessible_ids','unreviewed_ids'];
 if(groups.some(k=>!unique(idx[k])))fail('duplicated_or_missing_disposition_group');
 const all=groups.flatMap(k=>idx[k]);
 if(!unique(all)||all.length!==expected.length||
    all.some(id=>!expected.includes(id))||
    idx.inspected!==idx.inspected_ids.length||
    idx.inaccessible!==idx.inaccessible_ids.length||
    idx.unreviewed!==idx.unreviewed_ids.length)
  fail('not_a_complete_exclusive_enabled_source_partition');
 const rows=idx.inspection_rows??(idx.inspected_ids.length===0?[]:null);
 if(!Array.isArray(rows)||rows.length!==idx.inspected_ids.length||
    !unique(rows.map(r=>r.resource_id)))
  fail('inspected_ids_require_one_actual_source_read_row_each');
 const inspected=new Set(idx.inspected_ids);
 for(const row of rows){
   if(!inspected.has(row.resource_id)||!https(row.index_url)||
      !iso(row.observed_at)||Date.parse(row.observed_at)>Date.parse(idx.reviewed_at)||
      !['full_dated_item_read','bounded_public_index_search'].includes(row.outcome)||
      (row.outcome==='full_dated_item_read'&&!https(row.original_item_url)))
     fail('inspection_row_missing_actual_scope_url_or_clock');
 }
 if(idx.qualification_only_ids!==undefined){
   const disabled=new Set(registry.resources.filter(r=>r.enabled===false&&
     r.content_types?.includes('video')).map(r=>r.resource_id));
   if(!unique(idx.qualification_only_ids)||
      idx.qualification_only_ids.some(id=>!disabled.has(id)))
     fail('disabled_source_must_be_qualification_only');
 }
 return {result:'PASS',eligible:expected.length,inspected:rows.length,
   inaccessible:idx.inaccessible,unreviewed:idx.unreviewed,
   index_only_rows:rows.filter(r=>r.outcome==='bounded_public_index_search').length,
   full_original_item_rows:rows.filter(r=>r.outcome==='full_dated_item_read').length,
   full_article_read_never_inferred_from_index:true};
}
