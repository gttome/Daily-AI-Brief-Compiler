import {canonicalSha,hex,nonempty} from './util.mjs';
import {assertVisualReview} from './review-contract.mjs';

export const SET_REVIEW_SCHEMA='daily-compiler-image-set-review-v3';

export function observedSetGate(candidates){
  const values=f=>candidates.map(x=>x?.[f]).filter(nonempty);
  return {
    unique_compositions:new Set(values('composition_signature')).size,
    distinct_layouts:new Set(values('layout_signature')).size,
    distinct_grammars:new Set(values('diagram_grammar')).size,
    distinct_hierarchies:new Set(values('hierarchy_signature')).size,
    distinct_annotation_patterns:new Set(values('annotation_pattern_signature')).size,
    unique_byte_streams:new Set(values('final_sha256')).size
  };
}
export function validateSetReview(review){
  const errors=[];
  if(review?.schema_version!==SET_REVIEW_SCHEMA||!/^\d{4}-\d{2}-\d{2}$/.test(review?.edition_date||'')) errors.push('set_review_identity');
  const c=review?.candidates||[];
  if(!Array.isArray(c)||c.length!==6) errors.push('set_review_exactly_six');
  const ids=new Set();
  for(const x of c){
    if(!nonempty(x?.story_id)||!hex(x?.final_sha256,64)) errors.push('set_candidate_identity');
    if(ids.has(x?.story_id)) errors.push('set_duplicate_story');
    ids.add(x?.story_id);
    for(const f of ['composition_signature','layout_signature','diagram_grammar','hierarchy_signature','annotation_pattern_signature']) if(!nonempty(x?.[f])) errors.push('set_candidate_'+f);
  }
  const g=observedSetGate(c);
  if(g.unique_compositions!==6) errors.push('set_unique_compositions');
  if(g.distinct_layouts<4) errors.push('set_distinct_layouts');
  if(g.distinct_grammars<4) errors.push('set_distinct_grammars');
  if(g.distinct_hierarchies<4) errors.push('set_distinct_hierarchies');
  if(g.distinct_annotation_patterns<3) errors.push('set_distinct_annotation_patterns');
  if(g.unique_byte_streams!==6) errors.push('set_unique_byte_streams');
  const d=review?.observed_gate||{};
  for(const [k,v] of Object.entries(g)) if(d[k]!==v) errors.push('set_observed_gate_'+k);
  for(const f of ['no_labels_swapped_template','no_repeated_dominant_template','intentionally_curated','all_individually_benchmark_grade']) if(review?.[f]!==true) errors.push('set_editorial_'+f);
  const shouldPass=errors.length===0;
  if(review?.result!==(shouldPass?'PASS':'FAIL')) errors.push('set_result_inconsistent');
  return [...new Set(errors)];
}
export function assertSetReview(review){
  const errors=validateSetReview(review);
  if(errors.length) throw new Error(errors.join(';'));
  return {set_review_sha256:canonicalSha(review),gate:observedSetGate(review.candidates)};
}
export function buildAtomicAcceptance({editionDate,items,setReview,acceptedAt=new Date().toISOString()}){
  const set=assertSetReview(setReview);
  if(setReview.edition_date!==editionDate||!Array.isArray(items)||items.length!==6) throw new Error('acceptance_set_identity');
  const accepted=items.map(item=>{
    const r=assertVisualReview(item.review,item.review_context);
    if(item.review.result!=='PASS') throw new Error('individual_review_not_pass');
    if(!setReview.candidates.some(x=>x.story_id===item.story_id&&x.final_sha256===item.final_sha256)) throw new Error('set_candidate_binding');
    return {story_id:item.story_id,final_path:item.final_path,sha256:item.final_sha256,git_blob_sha:item.git_blob_sha,asset_version:item.asset_version,cache_key:item.cache_key,supersedes:item.supersedes??null,review_sha256:r.review_sha256};
  });
  if(new Set(accepted.map(x=>x.story_id)).size!==6||new Set(accepted.map(x=>x.sha256)).size!==6) throw new Error('atomic_acceptance_uniqueness');
  return {
    schema_version:'daily-compiler-image-acceptance-v3',edition_date:editionDate,accepted_at:acceptedAt,
    accepted_locked:true,set_review_sha256:set.set_review_sha256,images:accepted
  };
}
