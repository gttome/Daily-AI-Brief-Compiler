import {hex,nonempty} from './util.mjs';
import {validateP0A,validateP0D} from './proof-validators.mjs';
import {validateP0E,validateP0F} from './final-proof-gates.mjs';

export const FUSED_PROOF_SCHEMA='daily-compiler-d0-fused-live-proof-v1';
const COST_KEYS=[
  'work_used','codex_used','paid_model_api_used','paid_image_service_used',
  'billable_overage_used','new_paid_infrastructure_used','alternate_account_used',
  'owner_image_transfer_used','owner_liveness_used'
];
const allFalse=x=>COST_KEYS.every(k=>x?.[k]===false);
const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));

export function validateFusedLiveProof(receipt={}){
  const errors=[];
  if(receipt?.schema_version!==FUSED_PROOF_SCHEMA||receipt?.result!=='PASS'||!nonempty(receipt?.proof_id)) errors.push('fused_identity');
  const c=Array.isArray(receipt?.candidates)?receipt.candidates:[];
  if(c.length!==6) errors.push('fused_six_candidates_required');
  const sets={
    story:new Set(),run:new Set(),task:new Set(),nonce:new Set(),packet:new Set(),context:new Set(),raw:new Set(),final:new Set()
  };
  let stress=0;
  for(const x of c){
    if(!nonempty(x?.story_id)||sets.story.has(x.story_id)) errors.push('fused_story_identity'); sets.story.add(x?.story_id);
    if(!nonempty(x?.run_id)||sets.run.has(x.run_id)) errors.push('fused_run_identity'); sets.run.add(x?.run_id);
    if(!nonempty(x?.task_title)||sets.task.has(x.task_title)) errors.push('fused_task_identity'); sets.task.add(x?.task_title);
    if(!nonempty(x?.run_nonce)||sets.nonce.has(x.run_nonce)) errors.push('fused_nonce_identity'); sets.nonce.add(x?.run_nonce);
    if(!hex(x?.packet_sha256,64)||sets.packet.has(x.packet_sha256)) errors.push('fused_packet_identity'); sets.packet.add(x?.packet_sha256);
    if(!hex(x?.prompt_sha256,64)) errors.push('fused_prompt_identity');
    if(!nonempty(x?.context_id)||sets.context.has(x.context_id)) errors.push('fused_context_identity'); sets.context.add(x?.context_id);
    if(!nonempty(x?.outer_probe_id)||x?.isolated_context!==true||x?.outer_probe_leakage_detected!==false||x?.unrelated_context_leakage_detected!==false||x?.story_subject_correct!==true) errors.push('fused_isolation');
    if(!Number.isInteger(x?.attempt)||x.attempt<1||x.attempt>4) errors.push('fused_attempt');
    if(x?.stress_case===true){stress++;if(x.attempt!==1)errors.push('fused_stress_first_attempt');}
    if(!hex(x?.raw_sha256,64)||!hex(x?.raw_git_blob_sha,40)||sets.raw.has(x.raw_sha256)) errors.push('fused_raw_identity'); sets.raw.add(x?.raw_sha256);
    if(!nonempty(x?.final_path)||!hex(x?.final_sha256,64)||!hex(x?.final_git_blob_sha,40)||sets.final.has(x.final_sha256)) errors.push('fused_final_identity'); sets.final.add(x?.final_sha256);
    if(!nonempty(x?.visual_review_path)||!hex(x?.visual_review_sha256,64)||!nonempty(x?.reviewer_identity)||x?.visual_review_v3!=='PASS') errors.push('fused_review_identity');
    if(!sameSet(x?.visible_text_allowlist,x?.observed_required_labels)||!Array.isArray(x?.missing_labels)||x.missing_labels.length||!Array.isArray(x?.extra_visible_text)||x.extra_visible_text.length) errors.push('fused_exact_text');
    if(x?.no_branding!==true||x?.no_logos!==true||x?.benchmark_grade!==true||x?.exact_asset_review!=='PASS') errors.push('fused_quality');
  }
  if(stress<2) errors.push('fused_two_stress_cases_required');
  const s=receipt?.set_review||{};
  if(s.result!=='PASS'||s.unique_compositions!==6||s.distinct_layouts<4||s.distinct_grammars<4||s.distinct_hierarchies<4||s.distinct_annotation_patterns<3||s.unique_byte_streams!==6||s.labels_swapped_template!==false) errors.push('fused_set_review');
  if(!allFalse(receipt?.cost_boundary)) errors.push('fused_zero_cost_boundary');
  if(receipt?.proposal1r_reader_story_fallback_used!==false) errors.push('fused_proposal1r_fallback');
  if(receipt?.owner_intervention!==false) errors.push('fused_owner_intervention');
  return [...new Set(errors)];
}

export function buildFormalProofsFromFusedLiveProof(receipt, {
  p0dCapabilityReceiptPath='proof/d0-native-image-capsules/formal/p0-d-capability.json'
}={}){
  const errors=validateFusedLiveProof(receipt);
  if(errors.length) throw new Error('fused_live_proof_invalid:'+errors.join(','));
  const c=receipt.candidates;
  const p0a={
    schema_version:'daily-compiler-d0-p0-a-v1',result:'PASS',
    capability_proof_id:receipt.proof_id,evidence_reused_without_regeneration:true,
    native_generations_added_for_promotion:0,
    successful_run_ids:c.map(x=>x.run_id),
    distinct_task_titles:true,distinct_run_nonces:true,distinct_story_packets:true,
    isolation_evidence:c.map(x=>({
      run_id:x.run_id,method:'standalone_scheduled_task_new_chat',task_title:x.task_title,run_nonce:x.run_nonce,
      prompt_sha256:x.prompt_sha256,outer_probe_id:x.outer_probe_id,
      outer_probe_leakage_detected:false,unrelated_context_leakage_detected:false,story_subject_correct:true
    }))
  };
  const p0dSource=c[0];
  const p0d={
    schema_version:'daily-compiler-d0-p0-d-v1',result:'PASS',
    capability_receipt:p0dCapabilityReceiptPath,
    exact_persisted_pixel_review_capability:'PASS',formal_story_bound_visual_review_v3:'PASS',
    story_id:p0dSource.story_id,final_path:p0dSource.final_path,final_sha256:p0dSource.final_sha256,
    final_git_blob_sha:p0dSource.final_git_blob_sha,visual_review_path:p0dSource.visual_review_path,
    visual_review_sha256:p0dSource.visual_review_sha256,reviewer_identity:p0dSource.reviewer_identity,
    native_generations_added_for_p0d:0,owner_intervention:false
  };
  const stress=c.filter(x=>x.stress_case===true).slice(0,2);
  const p0e={
    schema_version:'daily-compiler-d0-p0-e-v1',result:'PASS',
    stress_cases:stress.map(x=>({
      story_id:x.story_id,attempt:x.attempt,isolated_context:true,prompt_sha256:x.prompt_sha256,
      final_sha256:x.final_sha256,final_git_blob_sha:x.final_git_blob_sha,
      visible_text_allowlist:x.visible_text_allowlist,observed_required_labels:x.observed_required_labels,
      missing_labels:[],extra_visible_text:[],no_branding:true,no_logos:true,benchmark_grade:true,exact_asset_review:'PASS'
    })),
    cost_boundary:structuredClone(receipt.cost_boundary),proposal1r_reader_story_fallback_used:false,owner_intervention:false
  };
  const p0f={
    schema_version:'daily-compiler-d0-p0-f-v1',result:'PASS',
    candidates:c.map(x=>({
      story_id:x.story_id,context_id:x.context_id,isolated_context:true,
      raw_sha256:x.raw_sha256,raw_git_blob_sha:x.raw_git_blob_sha,
      final_sha256:x.final_sha256,final_git_blob_sha:x.final_git_blob_sha,
      normalized_1200x630:true,visual_review_v3:'PASS'
    })),
    set_review:structuredClone(receipt.set_review),
    cost_boundary:structuredClone(receipt.cost_boundary),proposal1r_reader_story_fallback_used:false,owner_intervention:false
  };
  const proofErrors={
    p0_a:validateP0A(p0a),p0_d:validateP0D(p0d),p0_e:validateP0E(p0e),p0_f:validateP0F(p0f)
  };
  const invalid=Object.entries(proofErrors).filter(([,v])=>v.length);
  if(invalid.length) throw new Error('derived_formal_proof_invalid:'+invalid.map(([k,v])=>k+':'+v.join('|')).join(','));
  return {p0_a:p0a,p0_d:p0d,p0_e:p0e,p0_f:p0f};
}
