import test from 'node:test';
import assert from 'node:assert/strict';
import {validateP0E,validateP0F} from '../image-capsules/final-proof-gates.mjs';

const zeros={work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false};

function p0e(){
  const c=i=>({story_id:'s'+i,attempt:1,isolated_context:true,prompt_sha256:String(i).repeat(64),final_sha256:(i===1?'a':'b').repeat(64),final_git_blob_sha:(i===1?'c':'d').repeat(40),visible_text_allowlist:['A','B'],observed_required_labels:['B','A'],missing_labels:[],extra_visible_text:[],no_branding:true,no_logos:true,benchmark_grade:true,exact_asset_review:'PASS'});
  return {schema_version:'daily-compiler-d0-p0-e-v1',result:'PASS',stress_cases:[c(1),c(2)],cost_boundary:zeros,proposal1r_reader_story_fallback_used:false,owner_intervention:false};
}
function p0f(){
  const candidates=Array.from({length:6},(_,i)=>({story_id:'s'+i,context_id:'ctx'+i,isolated_context:true,raw_sha256:String(i+1).repeat(64).slice(0,64),raw_git_blob_sha:String(i+1).repeat(40).slice(0,40),final_sha256:(i+3).toString(16).repeat(64).slice(0,64),final_git_blob_sha:(i+7).toString(16).repeat(40).slice(0,40),normalized_1200x630:true,visual_review_v3:'PASS'}));
  return {schema_version:'daily-compiler-d0-p0-f-v1',result:'PASS',candidates,set_review:{result:'PASS',unique_compositions:6,distinct_layouts:4,distinct_grammars:4,distinct_hierarchies:4,distinct_annotation_patterns:3,unique_byte_streams:6,labels_swapped_template:false},cost_boundary:zeros,proposal1r_reader_story_fallback_used:false,owner_intervention:false};
}

test('P0-E requires two isolated benchmark-grade first attempts with exact text and no branding',()=>{
  const r=p0e(); assert.deepEqual(validateP0E(r),[]);
  const bad=p0e(); bad.stress_cases[0].extra_visible_text=['oops']; assert.ok(validateP0E(bad).includes('p0e_no_extra_text'));
  const bad2=p0e(); bad2.stress_cases[0].attempt=2; assert.ok(validateP0E(bad2).includes('p0e_first_attempt_required'));
});

test('P0-F requires six unique isolated byte streams and a passing differentiated set',()=>{
  const r=p0f(); assert.deepEqual(validateP0F(r),[]);
  const bad=p0f(); bad.candidates[1].context_id=bad.candidates[0].context_id; assert.ok(validateP0F(bad).includes('p0f_context_identity'));
  const bad2=p0f(); bad2.set_review.distinct_grammars=3; assert.ok(validateP0F(bad2).includes('p0f_set_review'));
});
