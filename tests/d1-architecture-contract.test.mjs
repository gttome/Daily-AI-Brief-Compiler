import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('D1 contract is cloud-only, no-ZIP, Studio-quality and narrow-Work',()=>{
  const c=read('contracts/d1-image-contract.json');
  assert.equal(c.schema_version,'daily-compiler-image-contract-v4');
  assert.equal(c.strategy,'d1_cloud_image_studio');
  assert.equal(c.activation_status,'proof_required');
  assert.equal(c.transfer.archive_required,false);
  assert.equal(c.quality.gate_location,'image_studio');
  assert.equal(c.quality.github_visual_rereview_required,false);
  assert.deepEqual(c.allowed_work_scope,['IMAGE_PACKAGE_INGEST']);
  assert.equal(c.transfer.work_may_generate_or_edit_images,false);
  assert.equal(c.transfer.work_may_make_visual_quality_decisions,false);
  assert.equal(c.image_creation.owner_intervention,false);
});

test('Dot and Work contracts require cloud operation with no owner/local transfer',()=>{
  const dot=read('contracts/d1-dot-coordinator-contract.json');
  const work=read('contracts/d1-work-porter-contract.json');
  assert.equal(dot.local_computer_dependency,false);
  assert.equal(dot.owner_presence_required,false);
  assert.ok(dot.prohibited.includes('generate_images_in_persistent_dot_context'));
  assert.equal(work.allowed_scope,'IMAGE_PACKAGE_INGEST');
  assert.equal(work.cloud_only,true);
  assert.equal(work.may_generate_images,false);
  assert.equal(work.may_visually_accept_images,false);
});

test('schedule contract keeps Work disabled generally and allows only D1 image ingest',()=>{
  const s=read('contracts/schedule-contract.json');
  assert.equal(s.rules.work,false);
  assert.equal(s.rules.work_image_package_ingest_only,true);
  assert.deepEqual(s.rules.work_allowed_scope,['IMAGE_PACKAGE_INGEST']);
  assert.equal(s.rules.local_computer_dependency,false);
  assert.equal(s.rules.owner_presence_required,false);
});

test('operational contracts exist for observability, resources, future suggestions, corrections and dashboard',()=>{
  for(const p of [
    'contracts/run-event.schema.json','contracts/run-metrics.schema.json','contracts/problem-learning.schema.json','contracts/run-analysis.schema.json',
    'contracts/resource-registry.schema.json','contracts/resource-observation.schema.json','contracts/future-brief-suggestion.schema.json',
    'contracts/post-publication-correction.schema.json','contracts/dashboard-snapshot.schema.json'
  ]){
    assert.equal(read(p).type,'object',p);
  }
});

test('D1 executable runtime does not embed paid model API or local-computer execution',()=>{
  const files=['image-studio/acceptance.mjs','image-studio/activation.mjs','image-studio/activation-apply.mjs','image-studio/bundle-gate.mjs','work-porter/integrity.mjs'];
  const forbidden=[/api\.openai\.com/i,/OPENAI_API_KEY/,/invokeCodex\s*\(/i,/local computer command/i,/Remote Desktop Commander/i];
  for(const p of files){
    const text=fs.readFileSync(p,'utf8');
    for(const rule of forbidden) assert.doesNotMatch(text,rule,p+' violates D1 firewall');
  }
});
