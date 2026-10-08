// TEST_ONLY: checks the actual old contradiction as data; never retries its case.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeStudyContradictionFixture} from './fixtures/d1-study-recipe.mjs';
import {refreshSyntheticReview} from './fixtures/d1-recipe-v2.mjs';
import {admitD1Specifications,compileD1StoryPrompt,sealD1Specifications} from '../image-studio/spec-admission.mjs';
import {sha256} from '../image-capsules/util.mjs';
const original='qualifications/value-image-2026-10-08/request.json';
function reset(f){refreshSyntheticReview(f.request.stories[0],f.sourceEvidence.stories[0]);f.request=sealD1Specifications(f.request,f.sourceEvidence);return admitD1Specifications(f.request,f.sourceEvidence);}
test('IMG-P01/P02 original comparator contradiction is replaced only in an excluded thirteen-component fixture',()=>{
 const bytes=fs.readFileSync(original),old=JSON.parse(bytes).stories[0];assert.match(old.generation.mechanism_plan.dominant_mechanism,/two-input comparator/);
 const f=makeStudyContradictionFixture(),result=admitD1Specifications(f.request,f.sourceEvidence);assert.equal(result.result,'PASS',result.errors.join(';'));
 const s=f.request.stories[0],p=compileD1StoryPrompt(f.request,f.sourceEvidence,s.story_id),input=p.projection.derived_inputs.find(x=>x.component==='c9');
 assert.equal(s.generation.meaningful_components_plan.length,13);assert.equal(new Set(s.generation.meaningful_components_plan.map(c=>c.region)).size,4);
 assert.equal(input.input_count,3);assert.deepEqual(input.entries.map(x=>x.entry),['upper-day10','middle-day90','lower-unaided']);
 assert.equal(s.generation.mechanism_plan.secondary_relationships.filter(e=>e.kind==='comparison_reference').length,3);
 assert.equal(s.generation.mechanism_plan.secondary_relationships.some(e=>e.kind==='feedback'),false);
 assert.equal(result.generation_authorized,false);assert.deepEqual(fs.readFileSync(original),bytes);
 const removed=makeStudyContradictionFixture();removed.request.stories[0].generation.meaningful_components_plan.find(c=>c.component_id==='c9').input_bindings.pop();assert.equal(reset(removed).result,'FAIL');
 const contradictory=makeStudyContradictionFixture();contradictory.request.stories[0].generation.mechanism_plan.dominant_mechanism=old.generation.mechanism_plan.dominant_mechanism;assert.equal(reset(contradictory).result,'FAIL');
 assert.equal(sha256(fs.readFileSync(original)),sha256(bytes));
});
