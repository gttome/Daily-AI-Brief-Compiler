import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {canonicalSha} from '../image-capsules/util.mjs';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {validateD1Activation} from '../image-studio/activation.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const readiness=(repoRoot='.')=>JSON.parse(execFileSync(process.execPath,['scripts/check-d1-implementation-readiness.mjs',repoRoot],{encoding:'utf8'}));
const withFixture=fn=>{
  const f=makeD1QualificationFixture();
  try{
    // Use real implementation inputs while retaining the isolated synthetic
    // contract and proof. This never changes the source checkout's activation.
    const files=['contracts/d1-implementation-readiness.json','contracts/editorial-contract.json',...read('contracts/d1-implementation-readiness.json').required_files];
    for(const p of files){const dest=path.join(f.root,p);if(!fs.existsSync(dest)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);}}
    return fn(f);
  }finally{f.cleanup();}
};

test('D1 v5 readiness covers Work browser path and six-image rehearsal',()=>{
  const m=read('contracts/d1-implementation-readiness.json');
  assert.equal(m.schema_version,'daily-compiler-d1-implementation-readiness-v2');
  for(const p of ['contracts/d1-work-browser-prompt.txt','docs/D1-WORK-BROWSER-SIX-IMAGE-REHEARSAL.md','rehearsals/d1-six-image-browser-r1/plan.json']) assert.ok(m.required_files.includes(p),p);
  assert.equal(m.implementation_invariants.work_scope,'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST');
  assert.equal(m.implementation_invariants.dot_required_for_image_path,false);
});

test('current readiness requires independently validated full proof for active status',()=>{
  const r=readiness(),c=read('contracts/d1-image-contract.json'),activation=validateD1Activation();
  assert.equal(r.result,'PASS',r.errors.join(','));assert.equal(r.implementation_complete,true);
  assert.equal(r.activation_status,c.activation_status);assert.equal(r.activation_ready,activation.result==='PASS');
  assert.equal(r.work_scope,'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST');
  assert.equal(r.image_path_owner,'work_cloud_browser');
  if(c.activation_status==='active'){
    assert.equal(activation.result,'PASS',activation.errors.join(','));
    assert.equal(r.external_blocker,null);
  }else{
    assert.equal(c.activation_status,'proof_required');
    assert.equal(r.activation_ready,false);
    assert.ok(activation.errors.includes('d1_not_active'));
    assert.equal(r.external_blocker,read('contracts/d1-implementation-readiness.json').expected_external_blocker);
  }
});

test('TEST_ONLY readiness changes only after complete activation and fails closed on missing evidence',()=>withFixture(f=>{
  const blocked=()=>{
    const r=readiness(f.root);
    assert.equal(r.result,'PASS',r.errors.join(','));assert.equal(r.implementation_complete,true);
    assert.equal(r.activation_ready,false);
    assert.equal(r.external_blocker,read(path.join(f.root,'contracts/d1-implementation-readiness.json')).expected_external_blocker);
    assert.equal(validateD1Activation({repoRoot:f.root}).result,'FAIL');
  };
  blocked();
  applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  const active=readiness(f.root);
  assert.equal(active.result,'PASS');assert.equal(active.activation_status,'active');assert.equal(active.activation_ready,true);assert.equal(active.external_blocker,null);
  assert.equal(validateD1Activation({repoRoot:f.root}).result,'PASS');
  const contract=read(path.join(f.root,'contracts/d1-image-contract.json')),receiptPath=path.join(f.root,contract.activation_receipt_path),receipt=read(receiptPath);
  fs.unlinkSync(receiptPath);blocked();f.write(contract.activation_receipt_path,receipt);
  // A still-present active flag and receipt cannot substitute for a required
  // companion, even when the aggregate cloud-proof record continues to say PASS.
  delete f.evidence.runtime;f.refresh();
  receipt.cloud_proof_sha256=canonicalSha(f.proof);f.write(contract.activation_receipt_path,receipt);
  contract.activation_receipt_sha256=canonicalSha(receipt);f.write('contracts/d1-image-contract.json',contract);
  assert.deepEqual(validateD1Activation({repoRoot:f.root}).errors,['d1_evidence_reference']);
  blocked();
}));

test('TEST_ONLY fixture construction after activation preserves quality and resets only activation metadata',()=>withFixture(f=>{
  applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  for(const p of ['tests/fixtures/d1-qualification.mjs','tests/fixtures/d1-specifications.mjs']){const dest=path.join(f.root,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);}
  // A fresh process imports the fixture from an activated source checkout.
  const code=`
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import {canonicalSha} from './image-capsules/util.mjs';
    import {applyD1Activation} from './image-studio/activation-apply.mjs';
    import {validateD1Activation,validateD1CloudProof} from './image-studio/activation.mjs';
    import {makeD1QualificationFixture} from './tests/fixtures/d1-qualification.mjs';
    const source=JSON.parse(fs.readFileSync('contracts/d1-image-contract.json','utf8'));
    assert.equal(source.activation_status,'active');
    const f=makeD1QualificationFixture();
    try{
      const contract=JSON.parse(fs.readFileSync(path.join(f.root,'contracts/d1-image-contract.json'),'utf8'));
      assert.deepEqual(contract,{...source,activation_status:'proof_required',activation_receipt_path:null,activation_receipt_sha256:null});
      assert.deepEqual(f.data.quality_contract,contract);
      assert.equal(f.data.admission.quality_contract_sha256,canonicalSha(contract));
      assert.deepEqual(validateD1CloudProof(f.proof,{repoRoot:f.root}),[]);
      applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
      assert.equal(validateD1Activation({repoRoot:f.root}).result,'PASS');
      assert.deepEqual(JSON.parse(fs.readFileSync('contracts/d1-image-contract.json','utf8')),source);
    }finally{f.cleanup();}
  `;
  execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:f.root,encoding:'utf8'});
}));
