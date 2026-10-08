// TEST_ONLY: synthetic observations and PNGs exercise deterministic conversion
// and the actual event serializer. No generation, pixel inspection or live proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeD1RecipeFixture,syntheticRecipeReview,syntheticResponse} from './fixtures/d1-recipe-v2.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {bindRecipeReview,compileRecipeProjections,projectRecipeVisualReview,validateRecipeReview} from '../image-studio/specification-projection.mjs';
import {BASIC_GATES,BENCHMARK_DIMENSIONS,validateVisualReview} from '../image-capsules/review-contract.mjs';
import {initialD1ProofState} from '../image-studio/proof-state.mjs';
import {recordD1ImageEvent} from '../image-studio/runtime-records.mjs';
import {canonicalSha,sha256,gitBlobSha} from '../image-capsules/util.mjs';

const fixture=makeD1RecipeFixture();
function sample(){
 const story=structuredClone(fixture.request.stories[0]),recipe=syntheticRecipeReview(story);
 return {story,recipe,options:{attempt:2,canonicalIdentity:{path:'TEST_ONLY/attempts/a02/canonical.png',sha256:recipe.final_sha256,git_blob_sha:'b'.repeat(40)}}};
}
const fail=(recipe,id)=>{const c=recipe.criteria.find(c=>c.id===id);c.pass=false;recipe.result='FAIL';return c;};
const convert=f=>projectRecipeVisualReview(f.story,f.recipe,f.options);
const localized=c=>c.location+': '+c.observation;

test('bound PASS projects exact observations, identity, sealed component order and base prompt without altering inputs',()=>{
 const f=sample(),before=structuredClone(f),projection=compileRecipeProjections(f.story);
 // Response order has no authority over the sealed component order.
 f.recipe.criteria.reverse();before.recipe.criteria.reverse();
 const review=convert(f);
 assert.equal(review.result,'PASS');assert.deepEqual(validateVisualReview(review),[]);
 assert.equal(review.story_id,f.story.story_id);assert.equal(review.attempt,2);
 assert.equal(review.final_path,f.options.canonicalIdentity.path);assert.equal(review.final_sha256,f.recipe.final_sha256);
 assert.equal(review.final_git_blob_sha,f.options.canonicalIdentity.git_blob_sha);
 assert.equal(review.packet_sha256,f.story.specification_sha256);assert.equal(review.prompt_sha256,projection.prompt_sha256);
 assert.equal(review.reviewed_at,f.recipe.reviewed_at);assert.equal(review.reviewer_identity,f.recipe.reviewer_context);
 for(const [prefix,keys,rows] of [['basic.',BASIC_GATES,review.basic_gates],['benchmark.',BENCHMARK_DIMENSIONS,review.benchmark_dimensions]])for(const key of keys){
  const c=f.recipe.criteria.find(c=>c.id===prefix+key);assert.deepEqual(rows[key],{verdict:'PASS',observation:localized(c)});
 }
 assert.deepEqual(review.meaningful_components,f.story.generation.meaningful_components_plan.map(c=>localized(f.recipe.criteria.find(row=>row.id==='component.'+c.component_id))));
 assert.deepEqual(review.visible_text,{result:'PASS',required_labels:f.story.generation.visible_text_allowlist,observed_required_labels:f.story.generation.visible_text_allowlist,missing_labels:[],extra_visible_text:[]});
 assert.equal(review.generic_or_sparse,false);assert.equal(review.decorative_only,false);
 assert.deepEqual(f,before);assert.deepEqual(compileRecipeProjections(f.story),projection);
});

test('every basic and benchmark failure remains a failing v3 verdict with its exact observation',async t=>{
 for(const [prefix,keys,field] of [['basic.',BASIC_GATES,'basic_gates'],['benchmark.',BENCHMARK_DIMENSIONS,'benchmark_dimensions']])for(const key of keys)await t.test(prefix+key,()=>{
  const f=sample(),c=fail(f.recipe,prefix+key),review=convert(f);
  assert.equal(review.result,'FAIL');assert.deepEqual(review[field][key],{verdict:'FAIL',observation:localized(c)});
  const errors=validateVisualReview(review);assert.ok(errors.includes((prefix==='basic.'?'basic_gate_':'benchmark_')+key));assert.ok(!errors.includes('overall_review_result_inconsistent'));
 });
});

test('text projection preserves actual missing labels and unauthorized transcription without invented OCR',async t=>{
 for(const kind of ['missing','extra','both'])await t.test(kind,()=>{
  const f=sample(),c=fail(f.recipe,'text.allowlist');
  if(kind!=='extra')c.missing_labels=[f.story.generation.visible_text_allowlist.at(-1),f.story.generation.visible_text_allowlist[0]];
  if(kind!=='missing')c.offending_text='Exact extra words: Ω / 2026';
  const review=convert(f);
  assert.equal(review.result,'FAIL');assert.equal(review.visible_text.result,'FAIL');
  assert.deepEqual(review.visible_text.required_labels,f.story.generation.visible_text_allowlist);
  assert.deepEqual(review.visible_text.observed_required_labels,f.story.generation.visible_text_allowlist.filter(label=>!c.missing_labels.includes(label)));
  assert.deepEqual(review.visible_text.missing_labels,c.missing_labels);
  assert.deepEqual(review.visible_text.extra_visible_text,c.offending_text===null?[]:[c.offending_text]);
  assert.ok(!validateVisualReview(review).includes('overall_review_result_inconsistent'));
 });
});

test('failed components are omitted and unsupported broad quality flags stay unknown',async t=>{
 const f=sample(),components=f.story.generation.meaningful_components_plan;
 for(const c of components.slice(7))fail(f.recipe,'component.'+c.component_id);
 const review=convert(f);assert.equal(review.meaningful_components.length,7);assert.equal(review.result,'FAIL');
 assert.deepEqual(review.meaningful_components,components.slice(0,7).map(c=>localized(f.recipe.criteria.find(row=>row.id==='component.'+c.component_id))));
 assert.ok(validateVisualReview(review).includes('meaningful_components_min_8'));
 for(const id of ['quality.generic_infographic_aesthetic_forbidden','quality.minimum_meaningful_components','benchmark.meaningful_detail','quality.decorative_geometry_forbidden'])await t.test(id,()=>{
  const f=sample();fail(f.recipe,id);const r=convert(f);
  assert.equal(r.result,'FAIL');assert.equal(r.generic_or_sparse,id==='quality.decorative_geometry_forbidden'?false:null);
  assert.equal(r.decorative_only,id==='quality.decorative_geometry_forbidden'?null:false);
  assert.ok(!validateVisualReview(r).includes('overall_review_result_inconsistent'));
 });
});

test('v2-only geometry and mark failures do not fabricate a narrower v3 failure or readable text',()=>{
 for(const id of ['geometry.entry-separation','text.no_pseudotext','text.no_placeholder_lines']){
  const f=sample();fail(f.recipe,id);const review=convert(f);
  assert.equal(validateRecipeReview(f.story,f.recipe,{finalSha256:f.recipe.final_sha256,contextId:f.recipe.reviewer_context}),'FAIL');
  assert.equal(review.result,'PASS');assert.deepEqual(validateVisualReview(review),[]);
  assert.deepEqual(review.visible_text.extra_visible_text,[]);assert.deepEqual(review.visible_text.missing_labels,[]);
 }
});

test('conversion rejects wrong canonical bindings, invalid context or incomplete criterion observations',()=>{
 for(const mutate of [f=>f.options.canonicalIdentity.sha256='1'.repeat(64),f=>f.options.canonicalIdentity.git_blob_sha='invalid',f=>f.options.attempt=0,f=>f.recipe.reviewer_context='unbound-context',f=>f.recipe.specification_sha256='1'.repeat(64),f=>f.recipe.criteria.pop()]){
  const f=sample();mutate(f);assert.throws(()=>convert(f));
 }
 const f=sample(),c=fail(f.recipe,'text.allowlist');c.missing_labels=[f.story.generation.visible_text_allowlist[0]];c.offending_text=42;
 assert.throws(()=>convert(f),/visual_projection_actual_text/);
});

test('actual serializer records the projected review, preserves v2 rejection and refuses duplicated pixel observations',async t=>{
 const q=makeD1QualificationFixture({recipeV2:true});t.after(()=>q.cleanup());
 const raw=fs.readFileSync(path.join(q.root,q.data.handoff.items[0].target_path)),base='qualifications/TEST_ONLY-review-projection';
 const ctx='ctx-'+'c'.repeat(64),inv='ctx-'+'d'.repeat(64),head='a'.repeat(40),engine='b'.repeat(40);
 for(const mode of ['PASS','basic-fail','v2-geometry-fail','duplicate-components'])await t.test(mode,()=>{
  const {request,source_evidence:sourceEvidence}=q.data,story=request.stories[0],projection=compileRecipeProjections(story);
  let state=initialD1ProofState({proofId:request.execution_id,branch:'qualification/TEST_ONLY-review-projection',requestPath:base+'/request.json',ingestMappingPath:base+'/mapping.json',updatedAt:'2026-10-08T22:00:00Z'});
  let log={schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:state.proof_id,native_generations:0,stories:[]};
  state.specification_binding={request_sha256:canonicalSha(request),source_evidence_sha256:canonicalSha(sourceEvidence),source_commit:request.source_commit,request_commit:head,source_evidence_path:base+'/source-evidence.json',attempt_log_sha256:canonicalSha(log)};
  const observed=(type,n,data)=>({event_id:'TEST_ONLY_'+type+'_'+n,type,story_id:story.story_id,context_id:ctx,invocation_id:inv,observed_at:'2026-10-08T22:00:0'+n+'Z',data});
  const apply=(event,assets={})=>{const batch=recordD1ImageEvent({state,attemptLog:log,request,sourceEvidence,engineSha:engine,expectedHead:head,expectedStateSha256:canonicalSha(state),expectedLogSha256:canonicalSha(log),event,...assets});state=batch.state;log=batch.attempt_log;return batch;};
  const intent=observed('GENERATION_INTENT',1,{prompt_text:projection.prompt,prompt_sha256:projection.prompt_sha256});apply(intent);
  apply(observed('GENERATION_COMPLETED',2,{intent_event_id:intent.event_id,raw_path:base+'/evidence/attempts/'+story.story_id+'/a01/raw.png'}),{rawBytes:raw});
  const identity={path:base+'/evidence/attempts/'+story.story_id+'/a01/canonical.png',sha256:sha256(raw),git_blob_sha:gitBlobSha(raw)};
  const synthetic=syntheticRecipeReview(story,{sha:identity.sha256,context:ctx,at:'2026-10-08T22:00:03Z'});
  if(mode==='basic-fail')fail(synthetic,'basic.mechanism_detail');
  if(mode==='v2-geometry-fail')fail(synthetic,'geometry.entry-separation');
  if(mode==='duplicate-components')for(const c of synthetic.criteria.filter(c=>c.id.startsWith('component.'))){c.location='TEST_ONLY same region';c.observation='TEST_ONLY identical synthetic pixel observation.';}
  const response=syntheticResponse(synthetic),recipe=bindRecipeReview(story,response,{finalSha256:identity.sha256,contextId:ctx,reviewedAt:synthetic.reviewed_at});
  const visual=projectRecipeVisualReview(story,recipe,{attempt:1,canonicalIdentity:identity});
  const reviewEvent=observed('REVIEW_COMPLETED',3,{canonical_path:identity.path,review_request_text:projection.review_prompt,review_response_text:response,recipe_review:recipe,visual_review:visual});
  if(mode==='duplicate-components'){
   assert.equal(new Set(visual.meaningful_components).size,1);assert.equal(visual.result,'PASS');
   const before={state:structuredClone(state),log:structuredClone(log)};
   assert.throws(()=>apply(reviewEvent,{canonicalBytes:raw}),/canonical_quality_gate/);assert.deepEqual({state,log},before);return;
  }
  const batch=apply(reviewEvent,{canonicalBytes:raw}),attempt=log.stories[0].attempts[0];
  assert.equal(attempt.result,mode==='PASS'?'PASS':'FAIL');assert.equal(attempt.visual_review_sha256,canonicalSha(visual));
  assert.equal(attempt.review_response_sha256,sha256(response));assert.equal(state.native_generations,1);assert.equal(state.accepted_assets.length,0);
  const saved=JSON.parse(Buffer.from(batch.writes.find(w=>w.path.endsWith('/'+reviewEvent.event_id+'.json')).content_base64,'base64'));
  assert.deepEqual(saved.event.data.visual_review,visual);
  if(mode==='v2-geometry-fail')assert.equal(visual.result,'PASS');
  if(mode!=='PASS')assert.throws(()=>apply(observed('ACCEPT_LOCK',4,{asset_id:'TEST_ONLY-asset',commit:'e'.repeat(40),path:identity.path,sha256:identity.sha256,git_blob_sha:identity.git_blob_sha,bytes:raw.length,readback_sha256:identity.sha256,readback_git_blob_sha:identity.git_blob_sha})),/acceptance_requires_actual_review/);
 });
});
