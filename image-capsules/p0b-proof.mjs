import {hex,nonempty} from './util.mjs';

export const P0B_SCHEMA='daily-compiler-d0-p0-b-v2';

const COST_KEYS=[
  'work_used','codex_used','paid_model_api_used','paid_image_service_used',
  'billable_overage_used','new_paid_infrastructure_used','alternate_account_used',
  'owner_image_transfer_used','owner_liveness_used'
];

function allFalse(obj){return COST_KEYS.every(k=>obj?.[k]===false);}

export function validateTransportPreflight(receipt){
  const errors=[];
  if(receipt?.scope!=='TRANSPORT_ONLY_NOT_CAPSULE_OR_P0_PROOF') errors.push('transport_scope');
  if(receipt?.generated_by!=='chatgpt_native_images') errors.push('native_generator_required');
  if(!nonempty(receipt?.native_generated_file_id)) errors.push('generated_file_id_required');
  if(receipt?.same_assistant_invocation!==true) errors.push('same_invocation_required');
  if(receipt?.bridge?.kind!=='connected_google_drive_ephemeral_file_shuttle') errors.push('bridge_kind');
  if(receipt?.bridge?.preconnected!==true||receipt?.bridge?.owner_approval_required!==false) errors.push('preconnected_no_approval_required');
  if(!nonempty(receipt?.bridge?.drive_file_id)||receipt?.bridge?.drive_file_deleted_after_persistence!==true) errors.push('ephemeral_cleanup_required');
  const r=receipt?.raw_identity||{};
  if(!Number.isInteger(r.bytes)||r.bytes<1||!hex(r.sha256,64)||!hex(r.git_blob_sha,40)) errors.push('raw_identity');
  if(!nonempty(r.github_path)||!hex(r.github_commit_sha,40)) errors.push('git_identity');
  if(r.source_vs_drive_byte_identity!=='PASS'||r.drive_vs_git_blob_identity!=='PASS'||r.github_blob_readback_sha!==r.git_blob_sha) errors.push('byte_identity_not_proven');
  const b=receipt?.boundaries||{};
  if(b.proves_native_image_to_file_handoff!==true||b.proves_exact_byte_persistence!==true) errors.push('transport_primitive_not_proven');
  if(b.formal_p0_a!==false||b.formal_p0_b!==false) errors.push('transport_receipt_boundary');
  if(!allFalse({
    work_used:b.work_used,codex_used:b.codex_used,paid_model_api_used:b.paid_model_api_used,
    paid_image_service_used:b.paid_image_service_used,billable_overage_used:b.billable_overage_used,
    new_paid_infrastructure_used:b.new_paid_infrastructure_used,alternate_account_used:b.alternate_account_used,
    owner_image_transfer_used:b.owner_image_transfer_used,owner_liveness_used:b.owner_liveness_used
  })) errors.push('zero_cost_boundary');
  return [...new Set(errors)];
}

export function promoteTransportPreflightToP0B(receipt){
  const errors=validateTransportPreflight(receipt);
  if(errors.length) throw new Error(errors.join(';'));
  return {
    schema_version:P0B_SCHEMA,
    result:'PASS',
    p0_a_dependency:false,
    activation_still_requires_p0_a:true,
    evidence_reused_without_regeneration:true,
    native_generations_added_for_promotion:0,
    source_proof_id:receipt.proof_id,
    source_scope:receipt.scope,
    generated_file_id:receipt.native_generated_file_id,
    same_invocation_capture:true,
    bridge_kind:receipt.bridge.kind,
    ephemeral_drive_deleted:true,
    raw_identity:{
      bytes:receipt.raw_identity.bytes,
      sha256:receipt.raw_identity.sha256,
      git_blob_sha:receipt.raw_identity.git_blob_sha,
      persisted_path:receipt.raw_identity.github_path,
      persisted_commit_sha:receipt.raw_identity.github_commit_sha,
      read_back_verified:true
    },
    cost_boundary:{
      work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,
      billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,
      owner_image_transfer_used:false,owner_liveness_used:false
    }
  };
}

export function validateP0B(receipt){
  const errors=[];
  if(receipt?.schema_version!==P0B_SCHEMA||receipt?.result!=='PASS') errors.push('p0b_schema_or_result');
  if(receipt?.p0_a_dependency!==false||receipt?.activation_still_requires_p0_a!==true) errors.push('p0a_independence_boundary');
  if(receipt?.evidence_reused_without_regeneration!==true||receipt?.native_generations_added_for_promotion!==0) errors.push('no_regeneration_boundary');
  if(!nonempty(receipt?.source_proof_id)||!nonempty(receipt?.generated_file_id)||receipt?.same_invocation_capture!==true) errors.push('source_identity');
  if(receipt?.bridge_kind!=='connected_google_drive_ephemeral_file_shuttle'||receipt?.ephemeral_drive_deleted!==true) errors.push('bridge_or_cleanup');
  const r=receipt?.raw_identity||{};
  if(!Number.isInteger(r.bytes)||r.bytes<1||!hex(r.sha256,64)||!hex(r.git_blob_sha,40)||!nonempty(r.persisted_path)||!hex(r.persisted_commit_sha,40)||r.read_back_verified!==true) errors.push('raw_identity');
  if(!allFalse(receipt?.cost_boundary)) errors.push('zero_cost_boundary');
  return [...new Set(errors)];
}
