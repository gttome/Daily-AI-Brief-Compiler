import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {validateD1Activation} from '../image-studio/activation.mjs';

function proof(){
  return {
    schema_version:'daily-compiler-d1-cloud-proof-v1',result:'PASS',proof_id:'proof-1',
    dot_coordinator:{cloud_task:true,separate_image_task:true,persistent_context_used_for_generation:false},
    image_studio:{fresh_conversation:true,native_chatgpt_images:true,six_assets:true,acceptance_manifest_pass:true},
    handoff:{owner_transfer:false,local_file_transfer:false,archive_required:false,programmatic_cloud_transfer:true,exact_assets_preserved:true},
    work_porter:{scope:'IMAGE_PACKAGE_INGEST',cloud_work:true,visual_rereview:false,generation:false,porter_receipt_pass:true},
    cloud_only:true,owner_intervention:false,local_computer_used:false,prohibited_dependencies_used:false
  };
}
function root(){
  const r=fs.mkdtempSync(path.join(os.tmpdir(),'d1-activation-'));
  fs.mkdirSync(path.join(r,'contracts'),{recursive:true});
  fs.mkdirSync(path.join(r,'proof'),{recursive:true});
  const c=JSON.parse(fs.readFileSync('contracts/d1-image-contract.json','utf8'));
  fs.writeFileSync(path.join(r,'contracts/d1-image-contract.json'),JSON.stringify(c));
  fs.writeFileSync(path.join(r,'proof/cloud.json'),JSON.stringify(proof()));
  return r;
}

test('D1 activation is proof-gated and deterministic',()=>{
  const r=root();
  const result=applyD1Activation({repoRoot:r,proofPath:'proof/cloud.json',activatedAt:'2026-10-08T00:00:00Z'});
  assert.equal(result.result,'PASS');
  assert.equal(validateD1Activation({repoRoot:r}).result,'PASS');
  const c=JSON.parse(fs.readFileSync(path.join(r,'contracts/d1-image-contract.json'),'utf8'));
  assert.equal(c.activation_status,'active');
  assert.equal(c.activation_receipt_path,'proof/d1-cloud-image-studio/activation.json');
});

test('D1 activation rejects owner/manual handoff proof',()=>{
  const r=root();
  const p=proof();p.handoff.owner_transfer=true;
  fs.writeFileSync(path.join(r,'proof/cloud.json'),JSON.stringify(p));
  assert.throws(()=>applyD1Activation({repoRoot:r,proofPath:'proof/cloud.json'}),/D1 cloud proof invalid/);
});
