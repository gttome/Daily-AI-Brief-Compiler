// TEST_ONLY: complete synthetic fourteen-companion proof plus actual pure product
// validators. These inputs do not establish native quality, access, or release.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';
import {validateD1QualificationEvidence} from '../image-studio/proof-evidence.mjs';
import {validateEdition} from '../compiler/compile.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';

function check(q){return validateD1QualificationEvidence({repoRoot:q.root,evidence:{path:q.evidencePath,sha256:canonicalSha(q.evidence)},proofId:q.data.state.proof_id});}
test('v2 full qualification enforces frozen recipe through the existing fourteen companions',t=>{
 const q=makeD1QualificationFixture({recipeV2:true});t.after(()=>q.cleanup());
 assert.equal(check(q).result,'PASS',check(q).errors.join(';'));
 assert.equal(Object.keys(q.evidence).filter(k=>!['schema_version','proof_id'].includes(k)).length,14);
 const saved=structuredClone(q.data.canonical_reviews.recipe_reviews);
 for(const mutate of [r=>r.pop(),r=>r[0].attempts[0].review.criteria.pop(),r=>r[0].attempts[0].generation_text+=' Invented extra port',r=>r[0].attempts[0].review.result='FAIL']){
  q.data.canonical_reviews.recipe_reviews=structuredClone(saved);mutate(q.data.canonical_reviews.recipe_reviews);q.refresh();
  const failed=check(q);assert.equal(failed.result,'FAIL');assert.match(failed.errors.join(';'),/recipe_v2/,'rehashed companions cannot waive semantic binding');
 }
 q.data.canonical_reviews.recipe_reviews=saved;q.refresh();assert.equal(check(q).result,'PASS',check(q).errors.join(';'));
});

test('v2 daily product and image-only reader validation require the same complete criteria',t=>{
 const f=makeProductReleaseFixture({recipeV2:true});t.after(()=>f.cleanup());
 const result=validateEdition(f);assert.equal(result.d1ImageGate.result,'PASS');assert.equal(result.mediaGate.result,'PASS');
 const oldState=fs.readFileSync(f.statePath),oldImages=f.bundle.images.map(i=>fs.readFileSync(path.join(f.root,i.path)));
 const saved=structuredClone(f.reviews.recipe_reviews);
 for(const mutate of [r=>r[0].attempts[0].review_request_text+=' new rule',r=>r[0].criteria_sha256='f'.repeat(64),r=>r[0].attempts[0].raw_sha256='f'.repeat(64)]){
  f.reviews.recipe_reviews=structuredClone(saved);mutate(f.reviews.recipe_reviews);f.persist();
  assert.throws(()=>validateEdition(f),/recipe_v2/);
 }
 f.reviews.recipe_reviews=saved;f.persist();assert.equal(validateEdition(f).d1ImageGate.result,'PASS');
 assert.deepEqual(fs.readFileSync(f.statePath),oldState);
 f.bundle.images.forEach((i,n)=>assert.deepEqual(fs.readFileSync(path.join(f.root,i.path)),oldImages[n]));
});

test('legacy canonical reviews remain closed to undeclared profile authority',t=>{
 const f=makeProductReleaseFixture();t.after(()=>f.cleanup());
 assert.equal(validateEdition(f).d1ImageGate.result,'PASS');f.reviews.recipe_reviews=[];f.persist();
 assert.throws(()=>validateEdition(f),/legacy_review_extension_forbidden/);
});
