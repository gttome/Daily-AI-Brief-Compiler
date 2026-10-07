import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {validateD1Activation} from '../image-studio/activation.mjs';

function proof(){
  return {
    schema_version:'daily-compiler-d1-cloud-proof-v2',result:'PASS',proof_id:'proof-2',
    browser_orchestrator:{work_cloud_browser:true,authenticated_session:true,work_native_image_generation:false,work_subagent_image_generation:false},
    story_chats:{fresh_regular_conversations:true,conversation_count:6,native_chatgpt_images:true,six_assets:true,acceptance_manifest_pass:true,prior_conversation_reuse:false},
    handoff:{owner_transfer:false,local_file_transfer:false,archive_required:false,programmatic_cloud_download:true,exact_assets_preserved:true},
    git_readback:{exact_commit_binary_download:true,all_sha256_match:true,all_git_blob_match:true,all_byte_counts_match:true},
    cloud_only:true,owner_intervention:false,local_computer_used:false,prohibited_dependencies_used:false
  };
}
function root(){
  const r=fs.mkdtempSync(path.join(os.tmpdir(),'d1-activation-'));
  fs.mkdirSync(path.join(r,'contracts'),{recursive:true});fs.mkdirSync(path.join(r,'proof'),{recursive:true});
  fs.writeFileSync(path.join(r,'contracts/d1-image-contract.json'),fs.readFileSync('contracts/d1-image-contract.json'));
  fs.writeFileSync(path.join(r,'proof/cloud.json'),JSON.stringify(proof()));
  return r;
}
test('D1 v5 activation is proof-gated and deterministic',()=>{
  const r=root();
  const result=applyD1Activation({repoRoot:r,proofPath:'proof/cloud.json',activatedAt:'2026-10-08T00:00:00Z'});
  assert.equal(result.result,'PASS');
  assert.equal(validateD1Activation({repoRoot:r}).result,'PASS');
  const c=JSON.parse(fs.readFileSync(path.join(r,'contracts/d1-image-contract.json'),'utf8'));
  assert.equal(c.activation_status,'active');
  assert.equal(c.activation_receipt_path,'proof/d1-work-browser/activation.json');
});
test('D1 activation rejects owner transfer proof',()=>{
  const r=root();const p=proof();p.handoff.owner_transfer=true;fs.writeFileSync(path.join(r,'proof/cloud.json'),JSON.stringify(p));
  assert.throws(()=>applyD1Activation({repoRoot:r,proofPath:'proof/cloud.json'}),/D1 cloud proof invalid/);
});
test('D1 activation rejects fewer than six clean story chats',()=>{
  const r=root();const p=proof();p.story_chats.conversation_count=5;fs.writeFileSync(path.join(r,'proof/cloud.json'),JSON.stringify(p));
  assert.throws(()=>applyD1Activation({repoRoot:r,proofPath:'proof/cloud.json'}),/D1 cloud proof invalid/);
});
