import {hex,nonempty,canonicalSha} from './util.mjs';

export const BENCHMARK_DIMENSIONS=[
  'professional_finish','meaningful_detail','explanatory_mechanism','annotation_richness',
  'visual_depth','hierarchy','composition','story_specificity','differentiation'
];
export const BASIC_GATES=[
  'subject_match','mechanism_detail','legible_labels','contrast','composition','no_people',
  'no_humanoids','no_branding','no_photorealism','no_overlap','no_clipping',
  'no_unapproved_text','no_unsupported_specifics','no_context_contamination',
  'professional_textbook_editorial_quality'
];

function gateErrors(gate,name){
  const e=[];
  if(!gate||!['PASS','FAIL'].includes(gate.verdict)) e.push(name+'_verdict');
  if(!nonempty(gate?.observation)||gate.observation.length<8) e.push(name+'_observation');
  return e;
}
export function validateVisualReview(review,{finalReceipt=null,packet=null,promptSha256=null}={}){
  const errors=[];
  if(review?.schema_version!=='daily-compiler-image-review-v3') errors.push('review_schema');
  if(!nonempty(review?.story_id)||!Number.isInteger(review?.attempt)||review.attempt<1||review.attempt>4) errors.push('review_identity');
  if(!nonempty(review?.final_path)||!hex(review?.final_sha256,64)||!hex(review?.final_git_blob_sha,40)) errors.push('review_asset_identity');
  if(!hex(review?.packet_sha256,64)||!hex(review?.prompt_sha256,64)||!nonempty(review?.reviewed_at)||!nonempty(review?.reviewer_identity)) errors.push('review_binding');
  for(const name of BASIC_GATES){
    errors.push(...gateErrors(review?.basic_gates?.[name],name));
    if(review?.basic_gates?.[name]?.verdict!=='PASS') errors.push('basic_gate_fail:'+name);
  }
  const visible=review?.visible_text||{};
  if(visible.result!=='PASS') errors.push('visible_text_not_pass');
  for(const f of ['required_labels','observed_required_labels','missing_labels','extra_visible_text']) if(!Array.isArray(visible[f])) errors.push('visible_text_'+f);
  if((visible.missing_labels||[]).length!==0) errors.push('visible_text_missing_labels');
  if((visible.extra_visible_text||[]).length!==0) errors.push('visible_text_extra');
  if((review?.meaningful_components||[]).length<8) errors.push('meaningful_components_min_8');
  for(const name of BENCHMARK_DIMENSIONS){
    errors.push(...gateErrors(review?.benchmark_dimensions?.[name],'benchmark_'+name));
    if(review?.benchmark_dimensions?.[name]?.verdict!=='PASS') errors.push('benchmark_fail:'+name);
  }
  if(review?.generic_or_sparse!==false) errors.push('generic_or_sparse');
  if(review?.decorative_only!==false) errors.push('decorative_only');
  if(review?.result!=='PASS') errors.push('review_result_not_pass');

  if(finalReceipt){
    const f=finalReceipt.final||{};
    if(review.final_path!==f.path||review.final_sha256!==f.sha256||review.final_git_blob_sha!==f.git_blob_sha) errors.push('review_final_asset_mismatch');
    if(review.story_id!==finalReceipt.story_id||review.attempt!==finalReceipt.attempt) errors.push('review_final_identity_mismatch');
  }
  if(packet){
    if(review.story_id!==packet.envelope?.story_id||review.packet_sha256!==packet.envelope?.packet_sha256) errors.push('review_packet_mismatch');
    const required=packet.generation?.visible_text_allowlist||[];
    if(JSON.stringify(visible.required_labels)!==JSON.stringify(required)) errors.push('review_required_labels_mismatch');
  }
  if(promptSha256&&review.prompt_sha256!==promptSha256) errors.push('review_prompt_mismatch');
  return [...new Set(errors)];
}
export function assertVisualReview(review,opts){
  const errors=validateVisualReview(review,opts);
  if(errors.length) throw new Error(errors.join(';'));
  return {review_sha256:canonicalSha(review)};
}
