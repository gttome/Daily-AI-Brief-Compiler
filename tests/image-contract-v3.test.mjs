import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('D0 contract is fail-closed and proof-gated',()=>{
  const c=read('contracts/image-contract.json');
  assert.equal(c.schema_version,'daily-compiler-image-contract-v3');
  assert.equal(c.strategy,'d0_native_image_capsules');
  assert.equal(c.activation_status,'proof_required');
  assert.equal(c.activation_receipt_path,null);
  assert.equal(c.activation_receipt_sha256,null);
  assert.deepEqual(c.activation_required_proofs,['P0-A','P0-B','P0-C','P0-D','P0-E','P0-F']);
  assert.equal(c.required_count,6);
  assert.equal(c.dimensions.width,1200);
  assert.equal(c.dimensions.height,630);
  assert.equal(c.same_invocation_capture_required,true);
  assert.equal(c.minimum_meaningful_components,8);
  assert.equal(c.max_genuine_visual_attempts_per_story,4);
  assert.equal(c.two_phase_acceptance,true);
  assert.equal(c.bundle_ready_fail_closed,true);
  assert.equal(c.proposal1r_reader_story_fallback,false);
  assert.equal(c.set_gate.unique_compositions,6);
  assert.ok(c.benchmark_dimensions_required.length===9);
});

test('all D0 v3 schemas are present with closed top-level objects',()=>{
  for(const p of [
    'contracts/image-packet-v3.schema.json',
    'contracts/image-capsule-admission.schema.json',
    'contracts/image-attempt-v3.schema.json',
    'contracts/image-review-v3.schema.json',
    'contracts/image-set-plan-v3.schema.json',
    'contracts/image-set-review-v3.schema.json',
    'contracts/d0-activation.schema.json'
  ]){
    const s=read(p);
    assert.equal(s.type,'object',p);
    assert.equal(s.additionalProperties,false,p);
  }
});
