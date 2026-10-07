import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD0Activation,validateD0ActivationReceipt} from '../image-capsules/activation-gate.mjs';

const proof=()=>({result:'PASS',evidence_path:'proof/evidence.json',evidence_sha256:'a'.repeat(64)});
const zeros={
  work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,
  billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,
  owner_image_transfer_used:false,owner_liveness_used:false
};
function receipt(){
  return {
    schema_version:'daily-compiler-d0-activation-v1',result:'PASS',
    strategy:'d0_native_image_capsules',contract_version:'daily-compiler-image-contract-v3',
    activated_at:'2026-10-07T00:00:00Z',
    proofs:{p0_a:proof(),p0_b:proof(),p0_c:proof(),p0_d:proof(),p0_e:proof(),p0_f:proof()},
    cost_boundary:zeros,proposal1r_reader_story_fallback_used:false,owner_intervention:false
  };
}
function rootWith(contract,activation=null){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d0-activation-'));
  fs.mkdirSync(path.join(root,'contracts'),{recursive:true});
  fs.writeFileSync(path.join(root,'contracts/image-contract.json'),JSON.stringify(contract));
  if(activation){
    fs.mkdirSync(path.join(root,'proof'),{recursive:true});
    fs.writeFileSync(path.join(root,'proof/activation.json'),JSON.stringify(activation));
  }
  return root;
}

test('proof-required contract blocks D0 activation',()=>{
  const root=rootWith({schema_version:'daily-compiler-image-contract-v3',strategy:'d0_native_image_capsules',activation_status:'proof_required',activation_receipt_path:null,activation_receipt_sha256:null});
  const r=validateD0Activation({repoRoot:root});
  assert.equal(r.result,'FAIL');
  assert.ok(r.errors.includes('d0_activation_not_active'));
});

test('all six PASS proofs and exact receipt digest activate D0',()=>{
  const a=receipt();
  const root=rootWith({schema_version:'daily-compiler-image-contract-v3',strategy:'d0_native_image_capsules',activation_status:'active',activation_receipt_path:'proof/activation.json',activation_receipt_sha256:canonicalSha(a)},a);
  assert.deepEqual(validateD0ActivationReceipt(a),[]);
  assert.equal(validateD0Activation({repoRoot:root}).result,'PASS');
});

test('missing proof or prohibited cost prevents activation',()=>{
  const a=receipt(); delete a.proofs.p0_e;
  assert.ok(validateD0ActivationReceipt(a).includes('activation_proof_p0_e'));
  const b=receipt(); b.cost_boundary.paid_model_api_used=true;
  assert.ok(validateD0ActivationReceipt(b).includes('activation_cost_boundary_paid_model_api_used'));
});
