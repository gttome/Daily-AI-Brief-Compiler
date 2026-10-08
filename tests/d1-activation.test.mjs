import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {validateD1Activation} from '../image-studio/activation.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';

const withFixture=fn=>{const f=makeD1QualificationFixture();try{return fn(f);}finally{f.cleanup();}};
// TEST_ONLY structural evidence. These tests do not establish an actual image lane.
test('D1 v5 activation is proof-gated and deterministic',()=>withFixture(f=>{
  const result=applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  assert.equal(result.result,'PASS');
  assert.equal(validateD1Activation({repoRoot:f.root}).result,'PASS');
  const c=JSON.parse(fs.readFileSync(path.join(f.root,'contracts/d1-image-contract.json'),'utf8'));
  assert.equal(c.activation_status,'active');
  assert.equal(c.activation_receipt_path,'proof/d1-work-browser/activation.json');
}));
test('D1 activation rejects owner transfer proof',()=>withFixture(f=>{
  f.proof.handoff.owner_transfer=true;f.write(f.proofPath,f.proof);
  assert.throws(()=>applyD1Activation({repoRoot:f.root,proofPath:f.proofPath}),/D1 cloud proof invalid/);
}));
test('D1 activation rejects fewer than six clean story chats',()=>withFixture(f=>{
  f.proof.story_chats.conversation_count=5;f.write(f.proofPath,f.proof);
  assert.throws(()=>applyD1Activation({repoRoot:f.root,proofPath:f.proofPath}),/D1 cloud proof invalid/);
}));

