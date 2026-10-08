import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {admitD1Specifications,sealD1Specifications,compileD1StoryPrompt} from '../image-studio/spec-admission.mjs';
import {makeD1SpecificationsFixture} from './fixtures/d1-specifications.mjs';
import {makeD1RecipeFixture,refreshSyntheticReview,syntheticRecipeReview} from './fixtures/d1-recipe-v2.mjs';
import {compileRecipeProjections,validateRecipeReview,compileRecipeCorrection,deriveRecipeCriteria,RECIPE_PROFILE_SHA,hasRecipeProfile,assertNewGenerationProfile} from '../image-studio/specification-projection.mjs';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
const reseal=f=>{for(const s of f.request.stories)refreshSyntheticReview(s,f.sourceEvidence.stories.find(x=>x.story_id===s.story_id));f.request=sealD1Specifications(f.request,f.sourceEvidence);return f;};
test('IMG-P01/P04: v2 all-six admission binds the complete derived criterion set and input arity',()=>{
 const f=makeD1RecipeFixture(),r=admitD1Specifications(f.request,f.sourceEvidence);assert.equal(r.result,'PASS',r.errors.join(';'));assert.equal(r.recipe_profile.definition_sha256,RECIPE_PROFILE_SHA);assert.equal(r.recipe_profile.stories.length,6);
 for(const s of f.request.stories){const p=compileD1StoryPrompt(f.request,f.sourceEvidence,s.story_id);assert.equal(p.criteria_sha256,canonicalSha(deriveRecipeCriteria(s)));assert.ok(p.projection.derived_inputs.every(c=>c.input_count===c.entries.length));assert.ok(!p.prompt.includes(f.request.source_commit));assert.ok(!p.prompt.includes(s.specification_sha256));assert.ok(!p.prompt.includes(s.story_id));assert.ok(!p.prompt.includes('TEST_ONLY synthetic source reviewer'));}
});
test('IMG-P01/P02/P07: structural contradictions and lowered quality fail before generation',async t=>{
 const faults=[
  ['two-input contradiction',s=>s.generation.mechanism_plan.dominant_mechanism='An independent two-input comparator'],
  ['missing port',s=>s.generation.meaningful_components_plan[2].input_bindings=[]],
  ['duplicate port',s=>s.generation.meaningful_components_plan[2].input_bindings.push(structuredClone(s.generation.meaningful_components_plan[2].input_bindings[0]))],
  ['unknown source',s=>s.generation.meaningful_components_plan[2].input_bindings[0].source_component_id='c40'],
  ['reference as transported material',s=>s.generation.mechanism_plan.internal_substages[0].kind='comparison_reference'],
  ['reference component transported',s=>s.generation.meaningful_components_plan[0].semantic_role='comparison_reference'],
  ['unsupported feedback',s=>s.generation.mechanism_plan.internal_substages[0].kind='feedback'],
  ['undeclared count',s=>s.generation.meaningful_components_plan[2].port_count=3],
  ['two regions',s=>s.generation.meaningful_components_plan.forEach((c,i)=>c.region='r'+(i%2+1))],
  ['eleven components',s=>s.generation.meaningful_components_plan.pop()],
  ['one substage',s=>s.generation.mechanism_plan.internal_substages.pop()],
  ['one secondary relation',s=>s.generation.mechanism_plan.secondary_relationships.pop()],
  ['unallowlisted extra field',s=>s.generation.mechanism_plan.geometry_requirements[0].visible_label='SECRET'],
  ['duplicate relationship id',s=>s.generation.mechanism_plan.secondary_relationships[0].relation_id='relation-1'],
  ['operational metadata in new geometry',s=>s.generation.mechanism_plan.selected_construction='Read docs/implementation/hidden.json before drawing.']
 ];
 for(const [name,mutate] of faults)await t.test(name,()=>{const f=makeD1RecipeFixture();mutate(f.request.stories[0]);reseal(f);const result=admitD1Specifications(f.request,f.sourceEvidence);assert.equal(result.result,'FAIL',name);assert.equal(result.quality_attempts_consumed,0);assert.equal(result.story_chats_opened,0);});
});
test('IMG-P03: a structurally supported source index does not override a negative bound semantic review',()=>{
 const f=makeD1RecipeFixture();f.request.stories[0].recipe_profile.semantic_review.claims[0].assessment='REJECTED';f.request=sealD1Specifications(f.request,f.sourceEvidence);assert.equal(admitD1Specifications(f.request,f.sourceEvidence).result,'FAIL');
});
test('IMG-P04/P05: missing, duplicate or added review requirements and corrected target drift fail',()=>{
 const s=makeD1RecipeFixture().request.stories[0],good=syntheticRecipeReview(s);
 assert.equal(validateRecipeReview(s,good,{finalSha256:good.final_sha256,contextId:good.reviewer_context}),'PASS');
 for(const mutate of [r=>r.criteria.pop(),r=>r.criteria.push(r.criteria[0]),r=>r.criteria[0].id='geometry.new-fourth-port',r=>r.criteria[0].observation='',r=>r.criteria_sha256='a'.repeat(64)]){const r=structuredClone(good);mutate(r);assert.throws(()=>validateRecipeReview(s,r,{finalSha256:r.final_sha256,contextId:r.reviewer_context}));}
 const failed=syntheticRecipeReview(s,{failure:'relation.relation-1'}),c=compileRecipeCorrection(s,failed);assert.deepEqual(c.failed_criterion_ids,['relation.relation-1']);assert.ok(c.text.includes(compileRecipeProjections(s).prompt));
 assert.throws(()=>compileRecipeCorrection(s,good),/pass_or_conflict/);assert.throws(()=>compileRecipeCorrection(s,syntheticRecipeReview(s,{conflict:true})),/pass_or_conflict/);
 const changed=structuredClone(s);changed.generation.meaningful_components_plan[0].description='Changed target';assert.throws(()=>compileRecipeCorrection(changed,failed),/review_asset_binding/);
});
test('IMG-P06: readable text and placeholder marks remain independent visible defects',()=>{
 const s=makeD1RecipeFixture().request.stories[0];
 const marks=syntheticRecipeReview(s,{failure:'text.no_placeholder_lines'});assert.equal(validateRecipeReview(s,marks,{finalSha256:marks.final_sha256,contextId:marks.reviewer_context}),'FAIL');
 marks.criteria.find(c=>c.id==='text.no_placeholder_lines').offending_text='invented word';assert.throws(()=>validateRecipeReview(s,marks,{finalSha256:marks.final_sha256,contextId:marks.reviewer_context}),/marks_not_readable/);
 const extra=syntheticRecipeReview(s,{failure:'text.allowlist'});assert.throws(()=>validateRecipeReview(s,extra,{finalSha256:extra.final_sha256,contextId:extra.reviewer_context}),/actual_text_defect/);extra.criteria.find(c=>c.id==='text.allowlist').offending_text='Unauthorized';assert.equal(validateRecipeReview(s,extra,{finalSha256:extra.final_sha256,contextId:extra.reviewer_context}),'FAIL');
});
test('IMG-P08/P20: legacy remains valid for verification; mixed or stale profile portfolios reject new generation',()=>{
 const old=makeD1SpecificationsFixture();assert.equal(hasRecipeProfile(old.request),false);assert.equal(admitD1Specifications(old.request,old.sourceEvidence).result,'PASS');assert.throws(()=>assertNewGenerationProfile(old.request),/profile_required/);
 for(const mutate of [f=>delete f.request.stories[5].recipe_profile,f=>f.request.stories[0].recipe_profile.definition_sha256='a'.repeat(64),f=>f.request.source_evidence_sha256='a'.repeat(64),f=>f.request.stories[0].specification_sha256='a'.repeat(64)]){const f=makeD1RecipeFixture();mutate(f);assert.equal(admitD1Specifications(f.request,f.sourceEvidence).result,'FAIL');}
});
test('IMG-P07: v5, admission locator and canonical visual contract remain unchanged in the patch',()=>{
 for(const [name,digest] of [["contracts/d1-image-contract.json", "13da5b952ebd77d14cd8953b2bfa9fee64e732f3275de23556e87808a83a9669"], ["contracts/d1-image-admission-contract.json", "54a9db9016b6370ef97cd46a82535b8b446215d355b9699e5d6e7b88a97bcf5a"], ["image-capsules/review-contract.mjs", "888939b896b325ff6af00024804c2be3ba31a11fefe8b85ace62b8da0df49d25"]])assert.equal(sha256(fs.readFileSync(name)),digest);
});

test('IMG-P04 generation, review and correction projections exclude operational calibration metadata',()=>{
 const f=makeD1RecipeFixture(),s=f.request.stories[0],p=compileRecipeProjections(s),failed=syntheticRecipeReview(s,{failure:'basic.mechanism_detail'});
 const correction=compileRecipeCorrection(s,failed);
 for(const text of [p.prompt,p.review_prompt,correction.text])for(const forbidden of ['docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md','gate_location','gate_actor','github_visual_rereview_required','work_visual_rereview_required',f.request.source_commit,s.specification_sha256])assert.equal(text.includes(forbidden),false,forbidden);
});
