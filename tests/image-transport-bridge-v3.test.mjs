import test from 'node:test';
import assert from 'node:assert/strict';
import {validateD0TransportPreflight} from '../image-capsules/transport-bridge.mjs';

function receipt(){
  return {
    schema_version:'daily-compiler-d0-transport-preflight-v1',
    proof_id:'transport-r1',
    scope:'TRANSPORT_ONLY_NOT_CAPSULE_OR_P0_PROOF',
    generated_by:'chatgpt_native_images',
    native_generated_file_id:'file_native_1',
    native_generation_id:'gen-1',
    same_assistant_invocation:true,
    bridge:{
      kind:'connected_google_drive_ephemeral_file_shuttle',
      preconnected:true,
      owner_approval_required:false,
      drive_file_id:'drive-temp-1',
      drive_file_deleted_after_persistence:true
    },
    raw_identity:{
      bytes:1234,sha256:'a'.repeat(64),git_blob_sha:'b'.repeat(40),
      github_path:'proof/d0-native-image-capsules/transport-only/raw.png',
      github_commit_sha:'c'.repeat(40),
      source_vs_drive_byte_identity:'PASS',
      drive_vs_git_blob_identity:'PASS',
      github_blob_readback_sha:'b'.repeat(40)
    },
    boundaries:{
      proves_native_image_to_file_handoff:true,
      proves_exact_byte_persistence:true,
      proves_clean_fresh_capsule:false,
      formal_p0_a:false,formal_p0_b:false,
      work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,
      billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,
      owner_image_transfer_used:false,owner_liveness_used:false
    }
  };
}

test('validates the zero-cost native file to exact Git byte bridge',()=>{
  assert.deepEqual(validateD0TransportPreflight(receipt()),[]);
});

test('transport preflight cannot self-promote into P0 proof',()=>{
  const r=receipt(); r.boundaries.formal_p0_b=true;
  assert.ok(validateD0TransportPreflight(r).includes('transport_must_not_claim_formal_proof'));
});

test('ephemeral bridge must be cleaned up',()=>{
  const r=receipt(); r.bridge.drive_file_deleted_after_persistence=false;
  assert.ok(validateD0TransportPreflight(r).includes('ephemeral_file_cleanup_required'));
});

test('paid or owner-assisted transport is rejected',()=>{
  const r=receipt(); r.boundaries.billable_overage_used=true;
  assert.ok(validateD0TransportPreflight(r).includes('zero_cost_boundary:billable_overage_used'));
});
