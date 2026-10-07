import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';
import {evaluateD0ProofSet,buildD0ActivationReceipt,buildActivatedImageContract} from '../image-capsules/completion-gate.mjs';

const keys=['p0_a','p0_b','p0_c','p0_d','p0_e','p0_f'];
const schemas={
  p0_a:'daily-compiler-d0-p0-a-v1',p0_b:'daily-compiler-d0-p0-b-v2',
  p0_c:'daily-compiler-d0-p0-c-v1',p0_d:'daily-compiler-d0-p0-d-v1',
  p0_e:'daily-compiler-d0-p0-e-v1',p0_f:'daily-compiler-d0-p0-f-v1'
};
const zeros={work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false};

function validReceipt(key){
  if(key==='p0_a') return {
    schema_version:schemas[key],result:'PASS',evidence_reused_without_regeneration:true,native_generations_added_for_promotion:0,
    successful_run_ids:['r1','r2'],distinct_task_titles:true,distinct_run_nonces:true,distinct_story_packets:true,
    isolation_evidence:['r1','r2'].map((run_id,i)=>({run_id,method:'standalone_scheduled_task_new_chat',task_title:'task-'+i,run_nonce:'nonce-'+i,prompt_sha256:(i?'b':'a').repeat(64),outer_probe_id:'probe-'+i,outer_probe_leakage_detected:false,unrelated_context_leakage_detected:false,story_subject_correct:true}))
  };
  if(key==='p0_b') return {
    schema_version:schemas[key],result:'PASS',p0_a_dependency:false,activation_still_requires_p0_a:true,evidence_reused_without_regeneration:true,native_generations_added_for_promotion:0,
    source_proof_id:'transport-proof',source_scope:'TRANSPORT_ONLY_NOT_CAPSULE_OR_P0_PROOF',generated_file_id:'file-1',same_invocation_capture:true,
    bridge_kind:'connected_google_drive_ephemeral_file_shuttle',ephemeral_drive_deleted:true,
    raw_identity:{bytes:100,sha256:'a'.repeat(64),git_blob_sha:'b'.repeat(40),persisted_path:'proof/raw.png',persisted_commit_sha:'c'.repeat(40),read_back_verified:true},
    cost_boundary:zeros
  };
  if(key==='p0_c') return {
    schema_version:schemas[key],result:'PASS',source_proof_id:'transport-proof',evidence_reused_without_regeneration:true,native_generations_added_for_p0c:0,
    raw_identity:{bytes:100,sha256:'a'.repeat(64),git_blob_sha:'b'.repeat(40)},
    normalization:{version:'d0-sharp-contain-white-v1',fit:'contain',background:'#ffffff',crop:false,width:1200,height:630,model_calls:0},
    run_1:{branch:'rehearsal/a',final_path:'a/final.png',final_sha256:'c'.repeat(64),final_git_blob_sha:'d'.repeat(40),bytes:90,structural_gate:'PASS',workflow_run_id:1},
    run_2:{branch:'rehearsal/a',final_path:'b/final.png',final_sha256:'c'.repeat(64),final_git_blob_sha:'d'.repeat(40),bytes:90,structural_gate:'PASS',workflow_run_id:2},
    deterministic_repeat_identity:true,owner_intervention:false,work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,new_paid_infrastructure_used:false
  };
  if(key==='p0_d') return {
    schema_version:schemas[key],result:'PASS',capability_receipt:'proof/p0-d-capability.json',exact_persisted_pixel_review_capability:'PASS',formal_story_bound_visual_review_v3:'PASS',
    story_id:'story-1',final_path:'images/final.png',final_sha256:'a'.repeat(64),final_git_blob_sha:'b'.repeat(40),
    visual_review_path:'images/review.json',visual_review_sha256:'c'.repeat(64),reviewer_identity:'reviewer-1',native_generations_added_for_p0d:0,owner_intervention:false
  };
  if(key==='p0_e'){
    const stress=i=>({story_id:'stress-'+i,attempt:1,isolated_context:true,prompt_sha256:(i?'b':'a').repeat(64),final_sha256:(i?'d':'c').repeat(64),final_git_blob_sha:(i?'f':'e').repeat(40),visible_text_allowlist:['A','B'],observed_required_labels:['B','A'],missing_labels:[],extra_visible_text:[],no_branding:true,no_logos:true,benchmark_grade:true,exact_asset_review:'PASS'});
    return {schema_version:schemas[key],result:'PASS',stress_cases:[stress(0),stress(1)],cost_boundary:zeros,proposal1r_reader_story_fallback_used:false,owner_intervention:false};
  }
  const candidates=Array.from({length:6},(_,i)=>({
    story_id:'story-'+i,context_id:'ctx-'+i,isolated_context:true,
    raw_sha256:(i+1).toString(16).repeat(64).slice(0,64),
    raw_git_blob_sha:(i+2).toString(16).repeat(40).slice(0,40),
    final_sha256:(i+7).toString(16).repeat(64).slice(0,64),
    final_git_blob_sha:(i+8).toString(16).repeat(40).slice(0,40),
    normalized_1200x630:true,visual_review_v3:'PASS'
  }));
  return {schema_version:schemas[key],result:'PASS',candidates,set_review:{result:'PASS',unique_compositions:6,distinct_layouts:4,distinct_grammars:4,distinct_hierarchies:4,distinct_annotation_patterns:3,unique_byte_streams:6,labels_swapped_template:false},cost_boundary:zeros,proposal1r_reader_story_fallback_used:false,owner_intervention:false};
}

function root({missing=null,blocked=null}={}){
  const r=fs.mkdtempSync(path.join(os.tmpdir(),'d0-completion-'));
  fs.mkdirSync(path.join(r,'contracts'),{recursive:true});
  fs.mkdirSync(path.join(r,'proof/formal'),{recursive:true});
  const manifest={schema_version:'daily-compiler-d0-proof-manifest-v1',proofs:{}};
  for(const key of keys){
    const p='proof/formal/'+key+'.json';
    manifest.proofs[key]={path:p,schema_version:schemas[key]};
    if(key!==missing){
      const receipt=validReceipt(key);
      if(key===blocked) receipt.result='BLOCKED';
      fs.writeFileSync(path.join(r,p),JSON.stringify(receipt));
    }
  }
  fs.writeFileSync(path.join(r,'contracts/d0-proof-manifest.json'),JSON.stringify(manifest));
  return r;
}

test('completion gate blocks on any missing or non-PASS proof',()=>{
  assert.equal(evaluateD0ProofSet({repoRoot:root({missing:'p0_a'})}).activation_ready,false);
  assert.equal(evaluateD0ProofSet({repoRoot:root({blocked:'p0_e'})}).activation_ready,false);
});

test('six validated PASS proofs deterministically build activation receipt and active contract',()=>{
  const repoRoot=root();
  const readiness=evaluateD0ProofSet({repoRoot});
  assert.equal(readiness.result,'PASS',readiness.errors.join(','));
  const activation=buildD0ActivationReceipt({repoRoot,activatedAt:'2026-10-07T00:00:00Z'});
  assert.equal(activation.result,'PASS');
  assert.equal(Object.keys(activation.proofs).length,6);
  assert.ok(keys.every(k=>activation.proofs[k].evidence_sha256===canonicalSha(JSON.parse(fs.readFileSync(path.join(repoRoot,'proof/formal/'+k+'.json'),'utf8')))));
  const contract={schema_version:'daily-compiler-image-contract-v3',strategy:'d0_native_image_capsules',activation_status:'proof_required',paid_capacity_branch_exists:false};
  const active=buildActivatedImageContract({contract,activationReceipt:activation,activationPath:'proof/formal/activation.json'});
  assert.equal(active.activation_status,'active');
  assert.equal(active.activation_receipt_sha256,canonicalSha(activation));
});

test('activation builder refuses a contract with a paid-capacity branch',()=>{
  const repoRoot=root(),activation=buildD0ActivationReceipt({repoRoot,activatedAt:'2026-10-07T00:00:00Z'});
  assert.throws(()=>buildActivatedImageContract({contract:{schema_version:'daily-compiler-image-contract-v3',strategy:'d0_native_image_capsules',paid_capacity_branch_exists:true},activationReceipt:activation}),/paid_capacity_branch_forbidden/);
});
