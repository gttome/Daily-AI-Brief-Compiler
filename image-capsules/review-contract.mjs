import {canonicalSha,hex,nonempty} from './util.mjs';

export const REVIEW_SCHEMA='daily-compiler-image-review-v3';
export const BASIC_GATES=['subject_match','mechanism_detail','legible_labels','contrast','composition','no_people','no_humanoids','no_branding','no_photorealism','no_overlap','no_clipping','no_unapproved_text','no_unsupported_specifics','no_context_contamination','professional_textbook_editorial_quality'];
export const BENCHMARK_DIMENSIONS=['professional_finish','meaningful_detail','explanatory_mechanism','annotation_richness','visual_depth','hierarchy','composition','story_specificity','differentiation'];

const passObservation=x=>x?.verdict==='PASS'&&nonempty(x?.observation)&&x.observation.length>=8;
const sameSet=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));

export function validateVisualReview(review,{packet=null,finalReceipt=null}={}){
  const errors=[];
  if(review?.schema_version!==REVIEW_SCHEMA) errors.push('review_schema');
  if(!nonempty(review?.story_id)||!Number.isInteger(review?.attempt)||review.attempt<1||review.attempt>4) errors.push('review_identity');
  for(const f of ['final_sha256','packet_sha256','prompt_sha256']) if(!hex(review?.[f],64)) errors.push('review_'+f);
  if(!hex(review?.final_git_blob_sha,40)||!nonempty(review?.final_path)||!nonempty(review?.reviewer_identity)) errors.push('review_asset_identity');
  for(const gate of BASIC_GATES) if(!passObservation(review?.basic_gates?.[gate])) errors.push('basic_gate_'+gate);
  const visible=review?.visible_text||{};
  if(visible.result!=='PASS'||!Array.isArray(visible.required_labels)||!Array.isArray(visible.observed_required_labels)||!Array.isArray(visible.missing_labels)||!Array.isArray(visible.extra_visible_text)) errors.push('visible_text_record');
  else if(visible.missing_labels.length||visible.extra_visible_text.length||!sameSet(visible.required_labels,visible.observed_required_labels)) errors.push('visible_text_exact_gate');
  if(!Array.isArray(review?.meaningful_components)||review.meaningful_components.length<8||review.meaningful_components.some(x=>!nonempty(x))) errors.push('meaningful_components_min_8');
  for(const dim of BENCHMARK_DIMENSIONS) if(!passObservation(review?.benchmark_dimensions?.[dim])) errors.push('benchmark_'+dim);
  if(review?.generic_or_sparse!==false) errors.push('generic_or_sparse');
  if(review?.decorative_only!==false) errors.push('decorative_only');
  if(packet){
    if(review.story_id!==packet.envelope?.story_id||review.packet_sha256!==packet.envelope?.packet_sha256) errors.push('packet_binding');
    const expected=packet.generation?.visible_text_allowlist||[];
    if(!sameSet(review.visible_text?.required_labels||[],expected)) errors.push('visible_text_packet_binding');
  }
  if(finalReceipt){
    const f=finalReceipt.final||{};
    if(review.story_id!==finalReceipt.story_id||review.attempt!==finalReceipt.attempt||review.final_path!==f.path||review.final_sha256!==f.sha256||review.final_git_blob_sha!==f.git_blob_sha) errors.push('final_asset_binding');
  }
  const shouldPass=errors.length===0;
  if(review?.result!==(shouldPass?'PASS':'FAIL')) errors.push('overall_review_result_inconsistent');
  return [...new Set(errors)];
}
export function assertVisualReview(review,opts){
  const errors=validateVisualReview(review,opts);
  if(errors.length) throw new Error(errors.join(';'));
  return {review_sha256:canonicalSha(review)};
}
