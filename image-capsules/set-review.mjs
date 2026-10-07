import {canonicalSha,hex,nonempty} from './util.mjs';
import {validateVisualReview} from './review-contract.mjs';

export function setReviewGate(review){
  const c=review?.candidates||[];
  const values=f=>c.map(x=>x?.[f]).filter(nonempty);
  return {
    candidate_count:c.length,
    unique_compositions:new Set(values('composition_signature')).size,
    distinct_layouts:new Set(values('layout_signature')).size,
    distinct_grammars:new Set(values('diagram_grammar')).size,
    distinct_hierarchies:new Set(values('hierarchy_signature')).size,
    distinct_annotation_patterns:new Set(values('annotation_pattern_signature')).size,
    unique_byte_streams:new Set(values('final_sha256')).size
  };
}
export function validateSetReview(review,{individualReviews=[]}={}){
  const errors=[];
  if(review?.schema_version!=='daily-compiler-image-set-review-v3') errors.push('set_review_schema');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(review?.edition_date||'')) errors.push('set_review_date');
  if(!Array.isArray(review?.candidates)||review.candidates.length!==6) errors.push('set_review_exactly_six');
  const stories=new Set();
  for(const c of review?.candidates||[]){
    if(!nonempty(c?.story_id)||!hex(c?.final_sha256,64)) errors.push('set_review_candidate_identity');
    if(stories.has(c?.story_id)) errors.push('set_review_duplicate_story');
    stories.add(c?.story_id);
    for(const f of ['composition_signature','layout_signature','diagram_grammar','hierarchy_signature','annotation_pattern_signature']) if(!nonempty(c?.[f])) errors.push('set_review_candidate_'+f);
  }
  const g=setReviewGate(review);
  if(g.unique_compositions!==6) errors.push('set_review_unique_compositions');
  if(g.distinct_layouts<4) errors.push('set_review_distinct_layouts');
  if(g.distinct_grammars<4) errors.push('set_review_distinct_grammars');
  if(g.distinct_hierarchies<4) errors.push('set_review_distinct_hierarchies');
  if(g.distinct_annotation_patterns<3) errors.push('set_review_distinct_annotation_patterns');
  if(g.unique_byte_streams!==6) errors.push('set_review_unique_bytes');
  const declared=review?.observed_gate||{};
  for(const [k,v] of Object.entries(g)) if(k!=='candidate_count'&&declared[k]!==v) errors.push('set_review_observed_gate_'+k);
  for(const f of ['no_labels_swapped_template','no_repeated_dominant_template','intentionally_curated','all_individually_benchmark_grade']) if(review?.[f]!==true) errors.push('set_review_'+f);
  if(review?.result!=='PASS') errors.push('set_review_result_not_pass');
  if(individualReviews.length){
    if(individualReviews.length!==6) errors.push('individual_review_count');
    const byStory=new Map(individualReviews.map(x=>[x.story_id,x]));
    for(const c of review.candidates||[]){
      const r=byStory.get(c.story_id);
      if(!r||validateVisualReview(r).length||r.final_sha256!==c.final_sha256) errors.push('individual_review_not_bound:'+c.story_id);
    }
  }
  return [...new Set(errors)];
}
export function assertSetReview(review,opts){
  const errors=validateSetReview(review,opts);
  if(errors.length) throw new Error(errors.join(';'));
  return {set_review_sha256:canonicalSha(review),gate:setReviewGate(review)};
}
