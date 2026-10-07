import test from 'node:test';
import assert from 'node:assert/strict';
import {buildD0CapabilityProof,deriveD0CapabilityStatus,validateD0CapabilityProof} from '../image-capsules/capability-proof.mjs';

const zeros={
  work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,
  billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,
  owner_image_transfer_used:false,owner_liveness_used:false
};
function run(n){
  return {
    run_id:'r'+n,story_id:'story-'+n,packet_sha256:String(n).repeat(64),
    session_boundary:{kind:'standalone_scheduled_task',new_chat_per_run:true,plugin_session_id:'session-'+n,prior_chat_context_available:false,prior_images_available:false},
    native_generation:{executor:'chatgpt_native_images',included_subscription:true,generated:true},
    canary:{outer_probe_id:'canary-'+n,outer_probe_visible_to_generator:false,other_story_material_visible:false,prior_image_material_visible:false,output_contamination_detected:false},
    same_run_handoff:{generated_file_id:'file-'+n,download_url_obtained_before_capsule_end:true,persistence_tool_called_in_same_session:true,persistence_tool_session_id:'session-'+n},
    raw_identity:{bytes:100+n,sha256:(n===1?'a':'b').repeat(64),git_blob_sha:(n===1?'c':'d').repeat(40),persisted_path:'proof/d0-native-image-capsules/r'+n+'/raw.png',persisted_commit_sha:(n===1?'e':'f').repeat(40),read_back_verified:true}
  };
}

test('two clean zero-cost standalone runs authorize formal P0-A and P0-B without regeneration',()=>{
  const receipt=buildD0CapabilityProof({proof_id:'proof-1',cost_boundary:zeros,runs:[run(1),run(2)]});
  assert.equal(receipt.status,'PASS');
  assert.equal(receipt.formal_authorization.p0_a_authorized,true);
  assert.equal(receipt.formal_authorization.p0_b_authorized,true);
  assert.equal(receipt.formal_authorization.may_reuse_preproof_evidence_without_regeneration,true);
  assert.deepEqual(validateD0CapabilityProof(receipt),[]);
});

test('temporary included-capacity shortage is retryable and never opens a paid branch',()=>{
  const status=deriveD0CapabilityStatus({cost_boundary:zeros,runs:[],blocker_code:'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE'});
  assert.deepEqual(status,{status:'BLOCKED_RETRYABLE',reason:'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE'});
  const receipt=buildD0CapabilityProof({proof_id:'proof-retry',cost_boundary:zeros,runs:[],blocker_code:'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE'});
  assert.equal(receipt.status,'BLOCKED_RETRYABLE');
  assert.equal(receipt.formal_authorization.p0_a_authorized,false);
  assert.equal(receipt.formal_authorization.p0_b_authorized,false);
});

test('paid capacity or owner transfer is a hard failure',()=>{
  const bad={...zeros,paid_image_service_used:true};
  assert.equal(deriveD0CapabilityStatus({cost_boundary:bad,runs:[run(1),run(2)]}).status,'FAIL');
  assert.ok(validateD0CapabilityProof(buildD0CapabilityProof({proof_id:'proof-bad',cost_boundary:bad,runs:[run(1),run(2)]})).includes('zero_cost_boundary_violated'));
});

test('same-session persistence identity must match generator session',()=>{
  const r2=run(2); r2.same_run_handoff.persistence_tool_session_id='other-session';
  const receipt=buildD0CapabilityProof({proof_id:'proof-cross-session',cost_boundary:zeros,runs:[run(1),r2]});
  assert.equal(receipt.status,'FAIL');
  assert.equal(receipt.formal_authorization.p0_b_authorized,false);
});

test('session reuse fails isolation proof',()=>{
  const r2=run(2); r2.session_boundary.plugin_session_id='session-1'; r2.same_run_handoff.persistence_tool_session_id='session-1';
  const receipt=buildD0CapabilityProof({proof_id:'proof-session-reuse',cost_boundary:zeros,runs:[run(1),r2]});
  assert.equal(receipt.status,'FAIL');
  assert.ok(validateD0CapabilityProof(receipt).length===0);
});
