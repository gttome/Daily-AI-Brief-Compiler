import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateD1BundleImages} from '../image-studio/bundle-gate.mjs';
import {validateCanonicalPng} from '../image-studio/png-integrity.mjs';
import {validateEdition,validateEditionRecords} from '../compiler/compile.mjs';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';

const fixture=t=>{const f=makeProductReleaseFixture();t.after(()=>f.cleanup());return f;};
const gate=f=>validateD1BundleImages({bundle:f.bundle,state:f.state,repoRoot:f.root});
const core=f=>validateEdition({statePath:f.statePath,bundlePath:f.bundlePath,repoRoot:f.root});
const saveCandidate=f=>{const text=JSON.stringify(f.bundle,null,2)+'\n';fs.writeFileSync(f.bundlePath,text);f.state.bundle.digest=sha256(text);fs.writeFileSync(f.statePath,JSON.stringify(f.state,null,2)+'\n');};
const green=f=>{
  fs.mkdirSync(path.join(f.root,'dashboard'),{recursive:true});
  fs.writeFileSync(path.join(f.root,'dashboard','status.json'),JSON.stringify({result:'PASS',all_green:true,images:'PASS',media:'PASS',stale:true}));
};
const refreshReview=f=>{f.reviews.observations.forEach(profile=>{profile.review_sha256=canonicalSha(f.reviews.images.find(image=>image.story_id===profile.story_id));});f.persist();};

test('I06-T06 current D1 product passes only with exact canonical reviews and active qualified fixture',t=>{
  const f=fixture(t),result=gate(f);assert.equal(result.result,'PASS',result.errors.join('\n'));
  assert.equal(result.quality.reviewed_images,6);assert.equal(result.subjective_rereview_performed,false);
  assert.ok(f.bundle.images.every(image=>image.visual_review===undefined));
  assert.equal(core(f).d1ImageGate.result,'PASS');
});

test('I06-T03/T06 each immutable asset readback may retain its own commit',t=>{
  const f=fixture(t),before=structuredClone(f.reviews.binary_readback.images),row=f.reviews.binary_readback.images[0];
  row.commit='e'.repeat(40);row.url=row.url.replace(f.reviews.binary_readback.commit,row.commit);f.persist();
  assert.deepEqual(f.reviews.binary_readback.images.slice(1),before.slice(1));
  assert.equal(gate(f).result,'PASS');
  row.commit='main';f.persist();assert.equal(gate(f).result,'FAIL');
});

test('I06-T03 exact historical legacy bundle retains its separate diagram-contract binding',()=>{
  const state=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
  state.state='SHADOW_VERIFIED';state.stage='VERIFY';
  state.images={...state.images,strategy:'proposal1r_legacy',strategy_contract_version:'daily-compiler-diagram-spec-v2'};
  const result=validateEditionRecords({stateText:JSON.stringify(state),bundleText:fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'),repoRoot:'.'});
  assert.equal(result.legacyImageGate.result,'HISTORICAL_COMPATIBILITY');
  assert.equal(result.state.state,'SHADOW_VERIFIED');
});

for(const [label,mutate,expected] of [
  ['canonical review absent',f=>{delete f.bundle.image_system.canonical_reviews_path;delete f.bundle.image_system.canonical_reviews_sha256;},/canonical_reviews/],
  ['canonical review hash stale',f=>{f.bundle.image_system.canonical_reviews_sha256='0'.repeat(64);},/evidence_digest_mismatch/],
  ['review records are proxy flags',f=>{f.reviews.images[0]={story_id:f.bundle.stories[0].id,result:'PASS'};refreshReview(f);},/review/],
  ['canonical review bound to native raw bytes instead of published bytes',f=>{f.reviews.images[0].final_sha256='f'.repeat(64);refreshReview(f);},/canonical_review/],
  ['review basic gate failed despite overall PASS',f=>{f.reviews.images[0].basic_gates.no_overlap.verdict='FAIL';refreshReview(f);},/canonical_review/],
  ['unapproved visible text',f=>{f.reviews.images[0].visible_text.extra_visible_text=['Unapproved'];refreshReview(f);},/canonical_review/],
  ['stale edition acceptance',f=>{f.manifest.edition_date='2026-10-07';f.persist();},/edition_binding/],
  ['wrong repository handoff',f=>{f.handoff.repository='gttome/other-repository';f.persist();},/handoff_target/],
  ['wrong execution handoff',f=>{f.handoff.execution_id='stale-execution';f.persist();},/review_identity/],
  ['wrong story mapping',f=>{f.bundle.images[0].story_id=f.bundle.images[1].story_id;},/image_story_mapping/],
  ['incorrect asset length',f=>{f.manifest.images[0].bytes++;f.persist();},/byte_count/],
  ['review profile false despite green summary',f=>{f.reviews.observations[0].story_specific_mechanism_clear=false;f.persist();},/product_profile/],
  ['profile numeric string',f=>{f.reviews.observations[0].canvas_utilization_percent='85';f.persist();},/profile_layout/],
  ['mutable raw URL',f=>{f.reviews.binary_readback.images[0].url=f.reviews.binary_readback.images[0].url.replace(f.reviews.binary_readback.commit,'main');f.persist();},/immutable_readback/],
  ['raw transformed without canonical acceptance',f=>{f.reviews.binary_readback.images[0].raw.sha256='d'.repeat(64);f.persist();},/raw_identity/],
  ['semantic editing normalization',f=>{f.reviews.binary_readback.images[0].normalization.semantic_editing=true;f.persist();},/normalization/],
  ['used story conversation',f=>{f.reviews.sessions[0].prior_context_reused=true;f.persist();},/story_context/],
  ['attempt reset',f=>{f.reviews.sessions[0].attempts[0].attempt=2;f.persist();},/attempt_lineage/],
  ['old strategy contract',f=>{f.bundle.image_system.contract_version='daily-compiler-image-contract-v4';},/contract_version/]
]){
  test('I06-T02/I06-T06 green observation cannot mask '+label,t=>{
    const f=fixture(t);green(f);mutate(f);
    const result=gate(f);assert.equal(result.result,'FAIL');assert.match(result.errors.join(';'),expected);
  });
}

test('I06-T02 canonical PNG must be complete and CRC-valid even when header dimensions are valid',t=>{
  const f=fixture(t),original=fs.readFileSync(path.join(f.root,f.bundle.images[0].path));
  assert.deepEqual(validateCanonicalPng(original),{width:1200,height:630});
  for(const bytes of [original.subarray(0,24),original.subarray(0,-12),Buffer.concat([original,Buffer.from('extra')])])assert.throws(()=>validateCanonicalPng(bytes),/canonical_png_/);
  const corrupt=Buffer.from(original);corrupt[corrupt.length-5]^=1;
  assert.throws(()=>validateCanonicalPng(corrupt),/canonical_png_crc/);
  green(f);fs.writeFileSync(path.join(f.root,f.bundle.images[0].path),corrupt);
  assert.equal(gate(f).result,'FAIL');assert.throws(()=>core(f),/canonical_png_crc/);
});

test('I06-T02 an in-root symlink cannot supply an out-of-root canonical asset',t=>{
  const f=fixture(t),target=path.join(f.root,f.bundle.images[0].path),outside=path.join(f.root,'..',path.basename(f.root)+'-outside.png');
  fs.copyFileSync(target,outside);t.after(()=>fs.rmSync(outside,{force:true}));fs.unlinkSync(target);fs.symlinkSync(outside,target);
  assert.equal(gate(f).result,'FAIL');assert.throws(()=>core(f),/outside|escape/);
});

test('I06-T06 sealed image specification cannot be reused after editorial story bytes change',t=>{
  const f=fixture(t);f.bundle.stories[0].summary+=' Changed after image approval.';f.persist();green(f);
  assert.throws(()=>core(f),/selected_story_binding/);
});

test('I06-T02 an unvalidated corrections label cannot bypass fresh sequential story contexts',t=>{
  const f=fixture(t);f.bundle.corrections=[{result:'PASS',unvalidated:true}];
  f.reviews.sessions[1].started_at=f.reviews.sessions[0].started_at;f.persist();green(f);
  const result=gate(f);assert.equal(result.result,'FAIL');assert.match(result.errors.join(';'),/story_order/);
  assert.throws(()=>core(f),/validated separate correction revision/);
});

test('I06-T02 missing external activation remains a real image blocker',t=>{
  const f=fixture(t),contract=path.join(f.root,'contracts','d1-image-contract.json');
  fs.copyFileSync(new URL('../contracts/d1-image-contract.json',import.meta.url),contract);green(f);
  const result=gate(f);assert.equal(result.result,'FAIL');assert.match(result.errors.join(';'),/activation/);
});

for(const [label,mutate,expected] of [
  ['old strategy label',f=>{f.bundle.image_system.strategy='d1_cloud_image_studio';},/unsupported image strategy/],
  ['mixed strategy',f=>{f.bundle.images[0].image_system='d0_native_image_capsules';},/multiple image systems/],
  ['missing D1 metadata',f=>{delete f.bundle.image_system;},/D1 image system metadata missing/],
  ['legacy fallback on a new current edition',f=>{
    delete f.bundle.image_system;delete f.state.images.strategy;
    f.bundle.producer_receipt.work_used=false;
    for(const image of f.bundle.images){delete image.image_system;image.visual_review={result:'PASS',reviewed_sha256:image.sha256};}
  },/unregistered legacy image strategy/],
  ['old Work scope',f=>{f.bundle.producer_receipt.work_scope='IMAGE_PACKAGE_INGEST';},/D1 Work usage/],
  ['accepted image regeneration',f=>{f.bundle.producer_receipt.accepted_image_regenerations=1;},/regeneration forbidden/],
  ['wrong media duration',f=>{f.bundle.videos[0].duration_minutes=21;},/media/i],
  ['unsafe story source link',f=>{f.bundle.stories[0].source.url='javascript:alert(1)';},/source URL invalid/],
  ['reused permanent route',f=>{f.bundle.stories[0].permanent_route=f.bundle.stories[1].permanent_route;},/permanent routes must be unique/]
]){
  test('I06-T02 compiler rejects '+label+' independently of green observation',t=>{
    const f=fixture(t);mutate(f);saveCandidate(f);green(f);assert.throws(()=>core(f),expected);
  });
}

