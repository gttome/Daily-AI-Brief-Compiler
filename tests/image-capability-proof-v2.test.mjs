import test from 'node:test';
import assert from 'node:assert/strict';
import {buildD0CapabilityProofV2,validateD0CapabilityProofV2} from '../image-capsules/capability-proof-v2.mjs';

const zeros={work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false};
function run(n){
  const a=n===1?'a':'b';
  return {
    run_id:'d0-preproof-'+a,story_id:'story-'+a,packet_sha256:a.repeat(64),
    session_boundary:{method:'standalone_scheduled_task_new_chat',task_title:'D0 Preproof '+a.toUpperCase(),run_nonce:'nonce-'+a,product_contract_ref:'https://learn.chatgpt.com/docs/automations',new_chat_per_run:true,prior_chat_context_available:false,prior_images_available:false},
    generator_submission:{prompt_path:'proof/'+a+'/generator-prompt.txt',prompt_sha256:(n===1?'c':'d').repeat(64),explicit_exact_prompt:true,outer_canary_present_in_task_context:true,outer_canary_present_in_generator_prompt:false},
    native_generation:{executor:'chatgpt_native_images',included_subscription:true,generated:true,generated_file_id:'file-'+a},
    canary:{outer_probe_id:'probe-'+a,outer_probe_leakage_detected:false,unrelated_context_leakage_detected:false,story_subject_correct:true},
    same_run_handoff:{bridge_kind:'connected_google_drive_ephemeral_file_shuttle',ephemeral_file_id:'drive-'+a,raw_fetched_before_run_end:true,git_persisted_before_run_end:true,ephemeral_file_deleted:true},
    raw_identity:{bytes:100+n,sha256:(n===1?'e':'f').repeat(64),git_blob_sha:(n===1?'1':'2').repeat(40),persisted_path:'proof/'+a+'/raw.png',persisted_commit_sha:(n===1?'3':'4').repeat(40),read_back_verified:true}
  };
}

test('two independent standalone runs with exact native bytes authorize P0-A and P0-B',()=>{
  const r=buildD0CapabilityProofV2({proof_id:'p',cost_boundary:zeros,runs:[run(1),run(2)]});
  assert.equal(r.status,'PASS'); assert.equal(r.formal_authorization.p0_a_authorized,true); assert.equal(r.formal_authorization.p0_b_authorized,true);
  assert.deepEqual(validateD0CapabilityProofV2(r),[]);
});

test('same scheduled task title cannot masquerade as two independent fresh tasks',()=>{
  const a=run(1),b=run(2); b.session_boundary.task_title=a.session_boundary.task_title;
  const r=buildD0CapabilityProofV2({proof_id:'p',cost_boundary:zeros,runs:[a,b]});
  assert.equal(r.status,'FAIL');
});

test('outer canary leakage fails capability proof',()=>{
  const a=run(1); a.canary.outer_probe_leakage_detected=true;
  const r=buildD0CapabilityProofV2({proof_id:'p',cost_boundary:zeros,runs:[a,run(2)]});
  assert.equal(r.status,'FAIL');
});

test('Drive outage is retryable without opening paid capacity',()=>{
  const r=buildD0CapabilityProofV2({proof_id:'p',cost_boundary:zeros,runs:[],blocker_code:'DRIVE_EPHEMERAL_BRIDGE_TEMPORARILY_UNAVAILABLE'});
  assert.equal(r.status,'BLOCKED_RETRYABLE'); assert.equal(r.formal_authorization.p0_b_authorized,false);
});

test('paid capacity is a hard failure',()=>{
  const bad={...zeros,paid_image_service_used:true};
  const r=buildD0CapabilityProofV2({proof_id:'p',cost_boundary:bad,runs:[run(1),run(2)]});
  assert.equal(r.status,'FAIL');
});
