import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFormalProofsFromFusedLiveProof,validateFusedLiveProof} from '../image-capsules/fused-proof.mjs';

const zeros={work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false};
function fixture(){
  const candidates=Array.from({length:6},(_,i)=>({
    story_id:'s'+i,run_id:'r'+i,task_title:'task-'+i,run_nonce:'nonce-'+i,
    packet_sha256:(i+1).toString(16).repeat(64).slice(0,64),prompt_sha256:(i+7).toString(16).repeat(64).slice(0,64),
    context_id:'ctx-'+i,outer_probe_id:'probe-'+i,isolated_context:true,outer_probe_leakage_detected:false,
    unrelated_context_leakage_detected:false,story_subject_correct:true,attempt:1,stress_case:i<2,
    raw_sha256:(i+2).toString(16).repeat(64).slice(0,64),raw_git_blob_sha:(i+3).toString(16).repeat(40).slice(0,40),
    final_path:'proof/set/s'+i+'/final.png',final_sha256:(i+8).toString(16).repeat(64).slice(0,64),final_git_blob_sha:(i+9).toString(16).repeat(40).slice(0,40),
    visual_review_path:'proof/set/s'+i+'/review.json',visual_review_sha256:(i+10).toString(16).repeat(64).slice(0,64),reviewer_identity:'review-'+i,
    visual_review_v3:'PASS',visible_text_allowlist:['Input','Review'],observed_required_labels:['Review','Input'],
    missing_labels:[],extra_visible_text:[],no_branding:true,no_logos:true,benchmark_grade:true,exact_asset_review:'PASS'
  }));
  return {schema_version:'daily-compiler-d0-fused-live-proof-v1',result:'PASS',proof_id:'fused-1',candidates,
    set_review:{result:'PASS',unique_compositions:6,distinct_layouts:4,distinct_grammars:4,distinct_hierarchies:4,distinct_annotation_patterns:3,unique_byte_streams:6,labels_swapped_template:false},
    cost_boundary:zeros,proposal1r_reader_story_fallback_used:false,owner_intervention:false};
}

test('one six-image fused proof promotes P0-A/P0-D/P0-E/P0-F with zero extra generations',()=>{
  const f=fixture();
  assert.deepEqual(validateFusedLiveProof(f),[]);
  const p=buildFormalProofsFromFusedLiveProof(f);
  assert.equal(p.p0_a.successful_run_ids.length,6);
  assert.equal(p.p0_d.native_generations_added_for_p0d,0);
  assert.equal(p.p0_e.stress_cases.length,2);
  assert.equal(p.p0_f.candidates.length,6);
});

test('fused proof rejects duplicated contexts or insufficient first-attempt stress cases',()=>{
  const a=fixture();a.candidates[1].context_id=a.candidates[0].context_id;
  assert.ok(validateFusedLiveProof(a).includes('fused_context_identity'));
  const b=fixture();b.candidates[1].stress_case=false;
  assert.ok(validateFusedLiveProof(b).includes('fused_two_stress_cases_required'));
  const c=fixture();c.candidates[0].attempt=2;
  assert.ok(validateFusedLiveProof(c).includes('fused_stress_first_attempt'));
});
