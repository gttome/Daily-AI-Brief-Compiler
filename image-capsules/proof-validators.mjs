import {hex,nonempty} from './util.mjs';
import {validateP0B} from './p0b-proof.mjs';
import {validateP0E,validateP0F} from './final-proof-gates.mjs';

const sameNonemptySet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.length>0&&new Set(a).size===a.length&&a.every(x=>b.includes(x));

export function validateP0A(receipt={}){
  const errors=[];
  if(receipt?.schema_version!=='daily-compiler-d0-p0-a-v1') errors.push('p0a_schema');
  if(receipt?.result!=='PASS') return [...new Set([...errors,'p0a_not_pass'])];
  if(receipt?.evidence_reused_without_regeneration!==true||receipt?.native_generations_added_for_promotion!==0) errors.push('p0a_no_regeneration_boundary');
  if(!Array.isArray(receipt?.successful_run_ids)||receipt.successful_run_ids.length<2||new Set(receipt.successful_run_ids).size!==receipt.successful_run_ids.length) errors.push('p0a_run_ids');
  if(receipt?.distinct_task_titles!==true||receipt?.distinct_run_nonces!==true||receipt?.distinct_story_packets!==true) errors.push('p0a_repeatability');
  if(!Array.isArray(receipt?.isolation_evidence)||receipt.isolation_evidence.length!==receipt.successful_run_ids?.length) errors.push('p0a_isolation_evidence_count');
  const evidenceIds=[];
  for(const e of receipt?.isolation_evidence||[]){
    evidenceIds.push(e?.run_id);
    if(!nonempty(e?.run_id)||e?.method!=='standalone_scheduled_task_new_chat'||!nonempty(e?.task_title)||!nonempty(e?.run_nonce)||!hex(e?.prompt_sha256,64)||!nonempty(e?.outer_probe_id)) errors.push('p0a_isolation_identity');
    if(e?.outer_probe_leakage_detected!==false||e?.unrelated_context_leakage_detected!==false||e?.story_subject_correct!==true) errors.push('p0a_isolation_failed');
  }
  if(receipt?.successful_run_ids&&evidenceIds.length&& !sameNonemptySet(receipt.successful_run_ids,evidenceIds)) errors.push('p0a_run_evidence_binding');
  return [...new Set(errors)];
}

export {validateP0B};

export function validateP0C(receipt={}){
  const errors=[];
  if(receipt?.schema_version!=='daily-compiler-d0-p0-c-v1'||receipt?.result!=='PASS') errors.push('p0c_schema_or_result');
  if(!nonempty(receipt?.source_proof_id)||receipt?.evidence_reused_without_regeneration!==true||receipt?.native_generations_added_for_p0c!==0) errors.push('p0c_source_boundary');
  const raw=receipt?.raw_identity||{};
  if(!Number.isInteger(raw.bytes)||raw.bytes<1||!hex(raw.sha256,64)||!hex(raw.git_blob_sha,40)) errors.push('p0c_raw_identity');
  const n=receipt?.normalization||{};
  if(n.version!=='d0-sharp-contain-white-v1'||n.fit!=='contain'||n.background!=='#ffffff'||n.crop!==false||n.width!==1200||n.height!==630||n.model_calls!==0) errors.push('p0c_normalization_contract');
  const runs=[receipt?.run_1,receipt?.run_2];
  for(const r of runs){
    if(!nonempty(r?.branch)||!nonempty(r?.final_path)||!hex(r?.final_sha256,64)||!hex(r?.final_git_blob_sha,40)||!Number.isInteger(r?.bytes)||r.bytes<1||r?.structural_gate!=='PASS'||!Number.isInteger(r?.workflow_run_id)) errors.push('p0c_run_identity');
  }
  if(runs.every(Boolean)){
    if(runs[0].final_sha256!==runs[1].final_sha256||runs[0].final_git_blob_sha!==runs[1].final_git_blob_sha||runs[0].bytes!==runs[1].bytes) errors.push('p0c_deterministic_identity_mismatch');
  }
  if(receipt?.deterministic_repeat_identity!==true) errors.push('p0c_repeatability');
  for(const k of ['owner_intervention','work_used','codex_used','paid_model_api_used','paid_image_service_used','new_paid_infrastructure_used']) if(receipt?.[k]!==false) errors.push('p0c_zero_cost_'+k);
  return [...new Set(errors)];
}

export function validateP0D(receipt={}){
  const errors=[];
  if(receipt?.schema_version!=='daily-compiler-d0-p0-d-v1') errors.push('p0d_schema');
  if(receipt?.result!=='PASS') return [...new Set([...errors,'p0d_not_pass'])];
  if(receipt?.exact_persisted_pixel_review_capability!=='PASS'||receipt?.formal_story_bound_visual_review_v3!=='PASS') errors.push('p0d_review_capability');
  if(!nonempty(receipt?.capability_receipt)||!nonempty(receipt?.story_id)||!nonempty(receipt?.final_path)||!hex(receipt?.final_sha256,64)||!hex(receipt?.final_git_blob_sha,40)) errors.push('p0d_asset_identity');
  if(!nonempty(receipt?.visual_review_path)||!hex(receipt?.visual_review_sha256,64)||!nonempty(receipt?.reviewer_identity)) errors.push('p0d_review_identity');
  if(receipt?.native_generations_added_for_p0d!==0) errors.push('p0d_no_extra_generation');
  if(receipt?.owner_intervention!==false) errors.push('p0d_owner_intervention');
  return [...new Set(errors)];
}

export function validateFormalD0Proof(key,receipt={}){
  if(key==='p0_a') return validateP0A(receipt);
  if(key==='p0_b') return validateP0B(receipt);
  if(key==='p0_c') return validateP0C(receipt);
  if(key==='p0_d') return validateP0D(receipt);
  if(key==='p0_e') return validateP0E(receipt);
  if(key==='p0_f') return validateP0F(receipt);
  return ['unknown_d0_proof_key'];
}
