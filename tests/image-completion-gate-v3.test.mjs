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
function root({missing=null,blocked=null}={}){
  const r=fs.mkdtempSync(path.join(os.tmpdir(),'d0-completion-'));
  fs.mkdirSync(path.join(r,'contracts'),{recursive:true});
  fs.mkdirSync(path.join(r,'proof/formal'),{recursive:true});
  const manifest={schema_version:'daily-compiler-d0-proof-manifest-v1',proofs:{}};
  for(const key of keys){
    const p='proof/formal/'+key+'.json';
    manifest.proofs[key]={path:p,schema_version:schemas[key]};
    if(key!==missing) fs.writeFileSync(path.join(r,p),JSON.stringify({schema_version:schemas[key],result:key===blocked?'BLOCKED':'PASS',proof:key}));
  }
  fs.writeFileSync(path.join(r,'contracts/d0-proof-manifest.json'),JSON.stringify(manifest));
  return r;
}

test('completion gate blocks on any missing or non-PASS proof',()=>{
  assert.equal(evaluateD0ProofSet({repoRoot:root({missing:'p0_a'})}).activation_ready,false);
  assert.equal(evaluateD0ProofSet({repoRoot:root({blocked:'p0_e'})}).activation_ready,false);
});

test('six PASS proofs deterministically build activation receipt and active contract',()=>{
  const repoRoot=root();
  const readiness=evaluateD0ProofSet({repoRoot});
  assert.equal(readiness.result,'PASS');
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
