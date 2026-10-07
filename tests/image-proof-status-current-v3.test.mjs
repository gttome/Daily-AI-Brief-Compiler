import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateD0ProofSet} from '../image-capsules/completion-gate.mjs';

test('repository proof status reuses completed evidence without claiming activation',()=>{
  const r=evaluateD0ProofSet({repoRoot:'.'});
  assert.equal(r.activation_ready,false);
  assert.equal(r.result,'BLOCKED');
  assert.equal(r.proofs.p0_b.result,'PASS');
  assert.equal(r.proofs.p0_c.result,'PASS');
  assert.equal(r.proofs.p0_a.result,'BLOCKED');
  assert.equal(r.proofs.p0_d.result,'BLOCKED');
  assert.equal(r.proofs.p0_e.result,'MISSING');
  assert.equal(r.proofs.p0_f.result,'MISSING');
});
