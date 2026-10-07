import test from 'node:test';
import assert from 'node:assert/strict';
import {buildD0CapabilityProofV2} from '../image-capsules/capability-proof-v2.mjs';
import {promotePreproofToP0A,promotePreproofToP0B} from '../image-capsules/proof-promotion.mjs';

const zeros={work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false};
function run(n){
 const s=n===1?'a':'b';
 return {
  run_id:'r-'+s,story_id:'story-'+s,packet_sha256:s.repeat(64),
  session_boundary:{method:'standalone_scheduled_task_new_chat',task_title:'Task '+s,run_nonce:'nonce-'+s,product_contract_ref:'https://learn.chatgpt.com/docs/automations',new_chat_per_run:true,prior_chat_context_available:false,prior_images_available:false},
  generator_submission:{prompt_path:'p/'+s,prompt_sha256:(n===1?'c':'d').repeat(64),explicit_exact_prompt:true,outer_canary_present_in_task_context:true,outer_canary_present_in_generator_prompt:false},
  native_generation:{executor:'chatgpt_native_images',included_subscription:true,generated:true,generated_file_id:'file-'+s},
  canary:{outer_probe_id:'probe-'+s,outer_probe_leakage_detected:false,unrelated_context_leakage_detected:false,story_subject_correct:true},
  same_run_handoff:{bridge_kind:'connected_google_drive_ephemeral_file_shuttle',ephemeral_file_id:'drive-'+s,raw_fetched_before_run_end:true,git_persisted_before_run_end:true,ephemeral_file_deleted:true},
  raw_identity:{bytes:100+n,sha256:(n===1?'e':'f').repeat(64),git_blob_sha:(n===1?'1':'2').repeat(40),persisted_path:'proof/'+s+'/raw.png',persisted_commit_sha:(n===1?'3':'4').repeat(40),read_back_verified:true}
 };
}

test('formal P0-A and P0-B reuse preproof evidence with zero new generations',()=>{
 const capability=buildD0CapabilityProofV2({proof_id:'cap',cost_boundary:zeros,runs:[run(1),run(2)]});
 const a=promotePreproofToP0A(capability),b=promotePreproofToP0B(capability);
 assert.equal(a.result,'PASS'); assert.equal(b.result,'PASS');
 assert.equal(a.native_generations_added_for_promotion,0); assert.equal(b.native_generations_added_for_promotion,0);
 assert.deepEqual(a.successful_run_ids,['r-a','r-b']); assert.deepEqual(b.successful_run_ids,['r-a','r-b']);
});

test('blocked capability proof cannot be promoted',()=>{
 const capability=buildD0CapabilityProofV2({proof_id:'cap',cost_boundary:zeros,runs:[],blocker_code:'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE'});
 assert.throws(()=>promotePreproofToP0A(capability),/not_pass/);
 assert.throws(()=>promotePreproofToP0B(capability),/not_pass/);
});
