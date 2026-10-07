import {hex,nonempty} from './util.mjs';

const COST_KEYS=[
  'work_used','codex_used','paid_model_api_used','paid_image_service_used',
  'billable_overage_used','new_paid_infrastructure_used','alternate_account_used',
  'owner_image_transfer_used','owner_liveness_used'
];
const allFalse=x=>COST_KEYS.every(k=>x?.[k]===false);
const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));

export function validateP0E(receipt={}){
  const errors=[];
  if(receipt.schema_version!=='daily-compiler-d0-p0-e-v1'||receipt.result!=='PASS') errors.push('p0e_schema_or_result');
  if(!Array.isArray(receipt.stress_cases)||receipt.stress_cases.length<2) errors.push('p0e_two_stress_cases_required');
  const ids=new Set(),finals=new Set();
  for(const c of receipt.stress_cases||[]){
    if(!nonempty(c?.story_id)||ids.has(c.story_id)) errors.push('p0e_story_identity');
    ids.add(c?.story_id);
    if(c?.attempt!==1) errors.push('p0e_first_attempt_required');
    if(c?.isolated_context!==true) errors.push('p0e_isolation');
    if(!hex(c?.prompt_sha256,64)||!hex(c?.final_sha256,64)||!hex(c?.final_git_blob_sha,40)) errors.push('p0e_asset_identity');
    if(finals.has(c?.final_sha256)) errors.push('p0e_unique_final_bytes');
    finals.add(c?.final_sha256);
    if(!sameSet(c?.visible_text_allowlist,c?.observed_required_labels)) errors.push('p0e_exact_required_labels');
    if(!Array.isArray(c?.missing_labels)||c.missing_labels.length||!Array.isArray(c?.extra_visible_text)||c.extra_visible_text.length) errors.push('p0e_no_extra_text');
    if(c?.no_branding!==true||c?.no_logos!==true) errors.push('p0e_branding');
    if(c?.benchmark_grade!==true||c?.exact_asset_review!=='PASS') errors.push('p0e_quality_review');
  }
  if(!allFalse(receipt.cost_boundary)) errors.push('p0e_zero_cost_boundary');
  if(receipt.proposal1r_reader_story_fallback_used!==false) errors.push('p0e_proposal1r_fallback');
  if(receipt.owner_intervention!==false) errors.push('p0e_owner_intervention');
  return [...new Set(errors)];
}

export function validateP0F(receipt={}){
  const errors=[];
  if(receipt.schema_version!=='daily-compiler-d0-p0-f-v1'||receipt.result!=='PASS') errors.push('p0f_schema_or_result');
  if(!Array.isArray(receipt.candidates)||receipt.candidates.length!==6) errors.push('p0f_six_candidates_required');
  const stories=new Set(),contexts=new Set(),raws=new Set(),finals=new Set();
  for(const c of receipt.candidates||[]){
    if(!nonempty(c?.story_id)||stories.has(c.story_id)) errors.push('p0f_story_identity');
    stories.add(c?.story_id);
    if(!nonempty(c?.context_id)||contexts.has(c.context_id)) errors.push('p0f_context_identity');
    contexts.add(c?.context_id);
    if(c?.isolated_context!==true) errors.push('p0f_isolation');
    if(!hex(c?.raw_sha256,64)||!hex(c?.raw_git_blob_sha,40)||!hex(c?.final_sha256,64)||!hex(c?.final_git_blob_sha,40)) errors.push('p0f_asset_identity');
    if(raws.has(c?.raw_sha256)) errors.push('p0f_unique_raw_bytes');
    if(finals.has(c?.final_sha256)) errors.push('p0f_unique_final_bytes');
    raws.add(c?.raw_sha256); finals.add(c?.final_sha256);
    if(c?.normalized_1200x630!==true) errors.push('p0f_normalization');
    if(c?.visual_review_v3!=='PASS') errors.push('p0f_visual_review');
  }
  const s=receipt.set_review||{};
  if(s.result!=='PASS'||s.unique_compositions!==6||s.distinct_layouts<4||s.distinct_grammars<4||s.distinct_hierarchies<4||s.distinct_annotation_patterns<3||s.unique_byte_streams!==6||s.labels_swapped_template!==false) errors.push('p0f_set_review');
  if(!allFalse(receipt.cost_boundary)) errors.push('p0f_zero_cost_boundary');
  if(receipt.proposal1r_reader_story_fallback_used!==false) errors.push('p0f_proposal1r_fallback');
  if(receipt.owner_intervention!==false) errors.push('p0f_owner_intervention');
  return [...new Set(errors)];
}
