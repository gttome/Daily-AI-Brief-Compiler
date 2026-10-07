import test from 'node:test';
import assert from 'node:assert/strict';
import {validateP0A,validateP0C,validateP0D} from '../image-capsules/proof-validators.mjs';

test('P0-A PASS requires two clean repeatable isolated runs',()=>{
  const r={schema_version:'daily-compiler-d0-p0-a-v1',result:'PASS',evidence_reused_without_regeneration:true,native_generations_added_for_promotion:0,
    successful_run_ids:['r1','r2'],distinct_task_titles:true,distinct_run_nonces:true,distinct_story_packets:true,
    isolation_evidence:['r1','r2'].map((id,i)=>({run_id:id,method:'standalone_scheduled_task_new_chat',task_title:'t'+i,run_nonce:'n'+i,prompt_sha256:(i?'b':'a').repeat(64),outer_probe_id:'p'+i,outer_probe_leakage_detected:false,unrelated_context_leakage_detected:false,story_subject_correct:true}))};
  assert.deepEqual(validateP0A(r),[]);
  const bad=structuredClone(r); bad.isolation_evidence[0].story_subject_correct=false;
  assert.ok(validateP0A(bad).includes('p0a_isolation_failed'));
  const blocked={schema_version:'daily-compiler-d0-p0-a-v1',result:'BLOCKED_RETRYABLE'};
  assert.ok(validateP0A(blocked).includes('p0a_not_pass'));
});

test('P0-C PASS requires identical deterministic normalized outputs',()=>{
  const base={schema_version:'daily-compiler-d0-p0-c-v1',result:'PASS',source_proof_id:'s',evidence_reused_without_regeneration:true,native_generations_added_for_p0c:0,
    raw_identity:{bytes:10,sha256:'a'.repeat(64),git_blob_sha:'b'.repeat(40)},
    normalization:{version:'d0-sharp-contain-white-v1',fit:'contain',background:'#ffffff',crop:false,width:1200,height:630,model_calls:0},
    run_1:{branch:'r/a',final_path:'x/final.png',final_sha256:'c'.repeat(64),final_git_blob_sha:'d'.repeat(40),bytes:20,structural_gate:'PASS',workflow_run_id:1},
    run_2:{branch:'r/a',final_path:'y/final.png',final_sha256:'c'.repeat(64),final_git_blob_sha:'d'.repeat(40),bytes:20,structural_gate:'PASS',workflow_run_id:2},
    deterministic_repeat_identity:true,owner_intervention:false,work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,new_paid_infrastructure_used:false};
  assert.deepEqual(validateP0C(base),[]);
  const bad=structuredClone(base); bad.run_2.final_sha256='e'.repeat(64);
  assert.ok(validateP0C(bad).includes('p0c_deterministic_identity_mismatch'));
});

test('P0-D does not treat capability-only or blocked evidence as formal PASS',()=>{
  const blocked={schema_version:'daily-compiler-d0-p0-d-v1',result:'BLOCKED_BY_P0_A'};
  assert.ok(validateP0D(blocked).includes('p0d_not_pass'));
  const pass={schema_version:'daily-compiler-d0-p0-d-v1',result:'PASS',exact_persisted_pixel_review_capability:'PASS',formal_story_bound_visual_review_v3:'PASS',capability_receipt:'proof/cap.json',story_id:'s1',final_path:'x/final.png',final_sha256:'a'.repeat(64),final_git_blob_sha:'b'.repeat(40),visual_review_path:'x/review.json',visual_review_sha256:'c'.repeat(64),reviewer_identity:'review-1',native_generations_added_for_p0d:0,owner_intervention:false};
  assert.deepEqual(validateP0D(pass),[]);
});
