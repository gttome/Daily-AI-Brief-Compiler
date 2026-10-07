import {hex,nonempty} from './util.mjs';

export const D0_TRANSPORT_PREFLIGHT_SCHEMA='daily-compiler-d0-transport-preflight-v1';
export const D0_EPHEMERAL_BRIDGE='connected_google_drive_ephemeral_file_shuttle';

export function validateD0TransportPreflight(receipt){
  const errors=[];
  if(receipt?.schema_version!==D0_TRANSPORT_PREFLIGHT_SCHEMA) errors.push('transport_schema');
  if(receipt?.scope!=='TRANSPORT_ONLY_NOT_CAPSULE_OR_P0_PROOF') errors.push('transport_scope');
  if(receipt?.generated_by!=='chatgpt_native_images') errors.push('native_generator_required');
  if(!nonempty(receipt?.native_generated_file_id)) errors.push('generated_file_id_required');
  if(receipt?.same_assistant_invocation!==true) errors.push('same_invocation_required');

  const b=receipt?.bridge||{};
  if(b.kind!==D0_EPHEMERAL_BRIDGE) errors.push('bridge_kind');
  if(b.preconnected!==true) errors.push('bridge_must_be_preconnected');
  if(b.owner_approval_required!==false) errors.push('owner_approval_forbidden');
  if(!nonempty(b.drive_file_id)) errors.push('ephemeral_file_id_required');
  if(b.drive_file_deleted_after_persistence!==true) errors.push('ephemeral_file_cleanup_required');

  const r=receipt?.raw_identity||{};
  if(!Number.isInteger(r.bytes)||r.bytes<1) errors.push('raw_bytes');
  if(!hex(r.sha256,64)) errors.push('raw_sha256');
  if(!hex(r.git_blob_sha,40)) errors.push('raw_git_blob_sha');
  if(!nonempty(r.github_path)||!/^proof\/d0-native-image-capsules\//.test(r.github_path)) errors.push('proof_path_required');
  if(!hex(r.github_commit_sha,40)) errors.push('raw_commit_sha');
  if(r.source_vs_drive_byte_identity!=='PASS'||r.drive_vs_git_blob_identity!=='PASS') errors.push('byte_identity_not_proven');
  if(r.github_blob_readback_sha!==r.git_blob_sha) errors.push('github_readback_mismatch');

  const x=receipt?.boundaries||{};
  if(x.proves_native_image_to_file_handoff!==true||x.proves_exact_byte_persistence!==true) errors.push('transport_capability_not_proven');
  if(x.proves_clean_fresh_capsule!==false||x.formal_p0_a!==false||x.formal_p0_b!==false) errors.push('transport_must_not_claim_formal_proof');
  for(const k of ['work_used','codex_used','paid_model_api_used','paid_image_service_used','billable_overage_used','new_paid_infrastructure_used','alternate_account_used','owner_image_transfer_used','owner_liveness_used']){
    if(x[k]!==false) errors.push('zero_cost_boundary:'+k);
  }
  return [...new Set(errors)];
}

export function assertD0TransportPreflight(receipt){
  const errors=validateD0TransportPreflight(receipt);
  if(errors.length) throw new Error(errors.join(';'));
  return true;
}
