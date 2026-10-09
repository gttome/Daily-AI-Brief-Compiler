// TEST_ONLY: synthetic events and fixture bytes. These tests do not generate,
// inspect, publish, approve or qualify any actual image or development run.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {IMAGE_TEST_ENVIRONMENTS,imageRunBudget,emptyImageTestRunRegistry,prepareDevelopmentImageRun,preparePreproductionImageRun,initializePreproductionRuntime,resumePreproductionImageRun,resumeDevelopmentImageRun,inspectDevelopmentImageRun,recordDevelopmentImageEvent} from '../image-studio/test-run-policy.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {syntheticRecipeReview,syntheticResponse} from './fixtures/d1-recipe-v2.mjs';
import {compileRecipeProjections,compileRecipeCorrection,projectRecipeVisualReview} from '../image-studio/specification-projection.mjs';
import {validateD1ProofState} from '../image-studio/proof-state.mjs';
import {recordD1ImageEvent} from '../image-studio/runtime-records.mjs';
import {assertD1Specifications} from '../image-studio/spec-admission.mjs';
import {validateD1AcceptanceManifest} from '../image-studio/acceptance.mjs';
import {canonicalSha,sha256,gitBlobSha} from '../image-capsules/util.mjs';

const fixture=makeD1QualificationFixture({recipeV2:true});after(()=>fixture.cleanup());
const template=fixture.data.request,sources=fixture.data.source_evidence;
const raw=fs.readFileSync(path.join(fixture.root,fixture.data.handoff.items[0].target_path));
const context=label=>'ctx-'+canonicalSha('TEST_ONLY '+label);
const at=second=>new Date(Date.parse('2026-10-09T00:00:00Z')+second*1000).toISOString();
const baseInput=(runId,registry=emptyImageTestRunRegistry())=>({operation:'START_NEW_TEST_RUN',runId,createdAt:at(0),registry,retainedExecutionIds:['TEST_ONLY-existing-approved-run',template.execution_id],startReason:'TEST_ONLY explicit independent test execution.'});
const devInput=(runId,count=1)=>({...baseInput(runId),cases:Array.from({length:count},(_,index)=>({case_id:'TEST_ONLY-case-'+index,story:template.stories[index%6],source:sources.stories[index%6]}))});
function development(runId='TEST_ONLY-development',count=1){const prepared=prepareDevelopmentImageRun(devInput(runId,count));return {...prepared,tick:0};}
function devEvent(f,index,type,data){return {event_id:'TEST_ONLY-event-'+(++f.tick),type,case_id:f.manifest.cases[index].case_id,context_id:context('case-'+index),invocation_id:context('invocation'),observed_at:at(f.tick),data};}
function applyDev(f,event,assets={}){const result=recordDevelopmentImageEvent({manifest:f.manifest,state:f.state,expectedStateSha256:canonicalSha(f.state),event,...assets});f.state=result.state;return result;}
function generateDev(f,index,{pass=false,conflict=false,leavePending=false}={}){
  const story=f.manifest.cases[index].story,last=f.state.cases[index].attempts.at(-1),projection=compileRecipeProjections(story),prompt=last?compileRecipeCorrection(story,last.recipe_review).text:projection.prompt;
  const intent=devEvent(f,index,'GENERATION_INTENT',{prompt_text:prompt,prompt_sha256:sha256(prompt)});applyDev(f,intent);
  const completed=devEvent(f,index,'GENERATION_COMPLETED',{intent_event_id:intent.event_id});applyDev(f,completed,{rawBytes:raw});
  if(leavePending)return completed;
  const reviewedAt=at(f.tick+1),review=syntheticRecipeReview(story,{sha:sha256(raw),context:context('case-'+index),at:reviewedAt,failure:pass?null:'geometry.entry-separation',conflict});
  applyDev(f,devEvent(f,index,'REVIEW_COMPLETED',{review_request_text:projection.review_prompt,review_response_text:syntheticResponse(review),reviewed_at:reviewedAt}),{canonicalBytes:raw});
}
function preproduction(runId,registry){const prepared=preparePreproductionImageRun({...baseInput(runId,registry),request:template,sourceEvidence:sources});const runtime=initializePreproductionRuntime({prepared,requestCommit:'a'.repeat(40),observedAt:at(0),existingState:null,existingAttemptLog:null});return {prepared,...runtime,tick:0};}
function failPreproductionAttempt(f){
  const story=f.prepared.request.stories[0],previous=f.attemptLog.stories[0]?.attempts.at(-1),projection=compileRecipeProjections(story),prompt=previous?compileRecipeCorrection(story,previous.recipe_review).text:projection.prompt;
  const event=(type,data)=>({event_id:'TEST_ONLY-pre-event-'+(++f.tick),type,story_id:story.story_id,context_id:context('preproduction-case'),invocation_id:context('preproduction-invocation'),observed_at:at(f.tick),data});
  const apply=(observed,assets={})=>{const result=recordD1ImageEvent({state:f.state,attemptLog:f.attemptLog,request:f.prepared.request,sourceEvidence:f.prepared.sourceEvidence,engineSha:'b'.repeat(40),expectedHead:'c'.repeat(40),expectedStateSha256:canonicalSha(f.state),expectedLogSha256:canonicalSha(f.attemptLog),event:observed,...assets});f.state=result.state;f.attemptLog=result.attempt_log;};
  const intent=event('GENERATION_INTENT',{prompt_text:prompt,prompt_sha256:sha256(prompt)});apply(intent);
  const attempt=(previous?.attempt??0)+1,base=f.prepared.manifest.namespace+'/evidence/attempts/'+story.story_id+'/a'+String(attempt).padStart(2,'0');
  apply(event('GENERATION_COMPLETED',{intent_event_id:intent.event_id,raw_path:base+'/raw.png'}),{rawBytes:raw});
  const recipe=syntheticRecipeReview(story,{sha:sha256(raw),context:context('preproduction-case'),at:at(f.tick+1),failure:'geometry.entry-separation'});
  const visual=projectRecipeVisualReview(story,recipe,{attempt,canonicalIdentity:{path:base+'/canonical.png',sha256:sha256(raw),git_blob_sha:gitBlobSha(raw)}});
  apply(event('REVIEW_COMPLETED',{canonical_path:base+'/canonical.png',review_request_text:projection.review_prompt,review_response_text:syntheticResponse(recipe),recipe_review:recipe,visual_review:visual}),{canonicalBytes:raw});
}

test('production remains the default capped environment and development has no application case or attempt quota',()=>{
  assert.deepEqual(imageRunBudget(),{cases_per_run:6,maximum_attempts_per_case:4,maximum_native_generations_per_run:24,existing_execution_resumes_without_reset:true});
  const dev=imageRunBudget('development');assert.equal(dev.maximum_cases_per_run,null);assert.equal(dev.maximum_attempts_per_case,null);assert.equal(dev.maximum_native_generations_per_run,null);
  assert.equal(dev.production_eligible,false);assert.equal(dev.qualification_eligible,false);
  assert.equal(imageRunBudget('preproduction').cases_per_run,6);assert.equal(imageRunBudget('preproduction').maximum_attempts_per_case,4);
  assert.throws(()=>imageRunBudget('staging-unbounded'),/environment/);
  assert.throws(()=>IMAGE_TEST_ENVIRONMENTS.production.maximum_attempts_per_case=null,TypeError);
});

test('development records seven cases, fifth attempts and more than24 genuine generations without resets',()=>{
  const f=development('TEST_ONLY-seven-case-development',7);
  for(let index=0;index<7;index++)for(let attempt=0;attempt<5;attempt++)generateDev(f,index);
  const inspected=inspectDevelopmentImageRun({manifest:f.manifest,state:f.state,expectedStateSha256:canonicalSha(f.state)});
  assert.equal(inspected.case_count,7);assert.equal(inspected.native_generations,35);
  assert.ok(f.state.cases.every(row=>row.attempts.length===5&&row.attempts[4].attempt===5));
  assert.ok(inspected.cases.every(row=>row.next_action==='GENERATE_NEXT_ATTEMPT'));
  const before=structuredClone(f.state),resumed=resumeDevelopmentImageRun({operation:'RESUME_EXISTING_RUN',manifest:f.manifest,state:f.state,expectedStateSha256:canonicalSha(f.state)});
  assert.deepEqual(resumed.state,before);assert.equal(resumed.inspection.native_generations,35);
  generateDev(f,0,{pass:true});assert.equal(f.state.cases[0].attempts[5].attempt,6);assert.equal(f.state.native_generations,36);
  const canonical=f.state.cases[0].attempts[5].canonical_identity;
  applyDev(f,devEvent(f,0,'ACCEPT_LOCK',{commit:'d'.repeat(40),path:canonical.path,sha256:canonical.sha256,git_blob_sha:canonical.git_blob_sha,bytes:canonical.bytes,readback_sha256:canonical.sha256,readback_git_blob_sha:canonical.git_blob_sha}));
  const locked=structuredClone(f.state.cases[0]);assert.equal(locked.accepted_lock.attempt,6);assert.equal(locked.accepted_lock.production_eligible,false);
  assert.throws(()=>applyDev(f,devEvent(f,0,'GENERATION_INTENT',{prompt_text:'TEST_ONLY forbidden regeneration',prompt_sha256:sha256('TEST_ONLY forbidden regeneration')})),/case_closed_or_missing/);
  assert.deepEqual(f.state.cases[0],locked);
});

test('development resumes pending intent/candidate, preserves infrastructure unknowns and deduplicates the same observed event',()=>{
  const f=development('TEST_ONLY-resume');
  const prompt=compileRecipeProjections(f.manifest.cases[0].story).prompt,intent=devEvent(f,0,'GENERATION_INTENT',{prompt_text:prompt,prompt_sha256:sha256(prompt)});
  applyDev(f,intent);const before=structuredClone(f.state);
  const duplicate=applyDev(f,intent);assert.equal(duplicate.result,'UNCHANGED');assert.deepEqual(f.state,before);
  assert.throws(()=>applyDev(f,{...intent,data:{...intent.data,prompt_text:prompt+' altered'}}),/event_conflict/);
  applyDev(f,devEvent(f,0,'INFRASTRUCTURE_BLOCKED',{reason:'TEST_ONLY external outcome remains unknown.',external_outcome:'UNKNOWN'}));
  assert.ok(f.state.cases[0].pending_intent);assert.equal(f.state.native_generations,0);
  assert.throws(()=>applyDev(f,devEvent(f,0,'INFRASTRUCTURE_BLOCKED',{reason:'TEST_ONLY false zero outcome.',external_outcome:'NOT_INVOKED'})),/unknown_intent/);
  applyDev(f,devEvent(f,0,'GENERATION_COMPLETED',{intent_event_id:intent.event_id}),{rawBytes:raw});
  const inspected=inspectDevelopmentImageRun({manifest:f.manifest,state:f.state,expectedStateSha256:canonicalSha(f.state)});
  assert.equal(inspected.native_generations,1);assert.equal(inspected.cases[0].next_action,'RESUME_EXISTING_CANDIDATE');
  assert.equal(f.state.cases[0].attempts[0].result,null);
  assert.throws(()=>applyDev(f,devEvent(f,0,'GENERATION_INTENT',{prompt_text:prompt,prompt_sha256:sha256(prompt)})),/intent_not_eligible/);
  assert.throws(()=>resumeDevelopmentImageRun({operation:'RESUME_EXISTING_RUN',manifest:f.manifest,state:f.state,expectedStateSha256:canonicalSha(before)}),/state_digest/);
});

test('development never enters production state, admission, acceptance or a capped production v3 review',()=>{
  const f=development('TEST_ONLY-production-exclusion');
  assert.notDeepEqual(validateD1ProofState(f.state),[]);
  assert.throws(()=>assertD1Specifications(f.manifest,sources));
  assert.notDeepEqual(validateD1AcceptanceManifest(f.manifest),[]);
  const changed=structuredClone(f.state);changed.environment='production';
  assert.throws(()=>inspectDevelopmentImageRun({manifest:f.manifest,state:changed,expectedStateSha256:canonicalSha(changed)}),/state_binding/);
  const recipe=syntheticRecipeReview(f.manifest.cases[0].story);
  assert.throws(()=>projectRecipeVisualReview(f.manifest.cases[0].story,recipe,{attempt:5,canonicalIdentity:{path:'TEST_ONLY/fifth.png',sha256:recipe.final_sha256,git_blob_sha:'d'.repeat(40)}}),/visual_projection_identity/);
});

test('an explicit new preproduction run has a fresh six-case allowance while exhausted earlier runs remain immutable',()=>{
  const f=preproduction('TEST_ONLY-pre-run-one');
  for(let attempt=0;attempt<4;attempt++)failPreproductionAttempt(f);
  assert.equal(f.state.status,'BLOCKED');assert.equal(f.state.native_generations,4);
  const before={state:structuredClone(f.state),attemptLog:structuredClone(f.attemptLog),request:structuredClone(f.prepared.request)};
  const resumed=resumePreproductionImageRun({operation:'RESUME_EXISTING_RUN',prepared:f.prepared,state:f.state,attemptLog:f.attemptLog,expectedStateSha256:canonicalSha(f.state),expectedLogSha256:canonicalSha(f.attemptLog)});
  assert.equal(resumed.inspection.next_action,'EXIT_BLOCKED');assert.equal(resumed.inspection.permitted_new_generations,0);assert.equal(resumed.inspection.accounting_action,'FAIL_ATTEMPT_LIMIT');
  const next=preproduction('TEST_ONLY-pre-run-two',f.prepared.registry);
  assert.equal(next.prepared.request.stories.length,6);assert.equal(next.state.native_generations,0);assert.equal(next.attemptLog.stories.length,0);
  assert.notEqual(next.state.proof_id,f.state.proof_id);assert.notEqual(next.state.request_path,f.state.request_path);assert.notEqual(next.state.specification_binding.request_sha256,f.state.specification_binding.request_sha256);
  assert.deepEqual(next.prepared.request.stories,f.prepared.request.stories);
  assert.deepEqual({state:f.state,attemptLog:f.attemptLog,request:f.prepared.request},before);
  assert.throws(()=>initializePreproductionRuntime({prepared:f.prepared,requestCommit:'a'.repeat(40),observedAt:at(20),existingState:f.state,existingAttemptLog:f.attemptLog}),/runtime_already_exists/);
  assert.throws(()=>preparePreproductionImageRun({...baseInput(f.state.proof_id,f.prepared.registry),request:template,sourceEvidence:sources}),/run_identity_already_used/);
});

test('run creation cannot be disguised as resume or reuse retained identities and preproduction stays at six cases',()=>{
  for(const operation of ['RESUME_EXISTING_RUN',undefined,'RETRY'])assert.throws(()=>prepareDevelopmentImageRun({...devInput('TEST_ONLY-not-new'),operation}),/explicit_new_run_required/);
  assert.throws(()=>prepareDevelopmentImageRun(devInput('TEST_ONLY-existing-approved-run')),/run_identity_already_used/);
  const cases=devInput('TEST_ONLY-duplicate',2);cases.cases[1].case_id=cases.cases[0].case_id;assert.throws(()=>prepareDevelopmentImageRun(cases),/case_identity/);
  const fewer=structuredClone(template);fewer.stories.pop();
  assert.throws(()=>preparePreproductionImageRun({...baseInput('TEST_ONLY-fewer-pre'),request:fewer,sourceEvidence:sources}));
  const f=preproduction('TEST_ONLY-target');f.prepared.mapping.branch='main';
  assert.throws(()=>initializePreproductionRuntime({prepared:f.prepared,requestCommit:'a'.repeat(40),observedAt:at(1),existingState:null,existingAttemptLog:null}),/target_binding/);
});

test('development preserves full review requirements and specification-conflict stops without a quota reset',()=>{
  const f=development('TEST_ONLY-quality-conflict');generateDev(f,0,{conflict:true});
  assert.equal(f.state.native_generations,1);assert.equal(f.state.cases[0].blocked_reason,'SPECIFICATION_REVIEW_CONFLICT');
  const checked=inspectDevelopmentImageRun({manifest:f.manifest,state:f.state,expectedStateSha256:canonicalSha(f.state)});assert.equal(checked.cases[0].next_action,'CASE_BLOCKED');
  assert.throws(()=>generateDev(f,0),/correction_not_authorized/);
  const tampered=structuredClone(f.state);tampered.native_generations=0;
  assert.throws(()=>inspectDevelopmentImageRun({manifest:f.manifest,state:tampered,expectedStateSha256:canonicalSha(tampered)}),/count_changed/);
});

test('CLI writes a new local test package and refuses to replace an earlier result',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-image-budget-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const input=path.join(directory,'input.json'),out=path.join(directory,'prepared.json');fs.writeFileSync(input,JSON.stringify(devInput('TEST_ONLY-cli',7)));
  const script=new URL('../scripts/image-test-run.mjs',import.meta.url).pathname;
  const result=spawnSync(process.execPath,[script,'prepare-development',input,out],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const bytes=fs.readFileSync(out);assert.equal(JSON.parse(bytes).manifest.cases.length,7);
  const again=spawnSync(process.execPath,[script,'prepare-development',input,out],{encoding:'utf8'});assert.notEqual(again.status,0);assert.deepEqual(fs.readFileSync(out),bytes);
  assert.equal(JSON.parse(result.stdout).image_generation_performed,false);assert.equal(JSON.parse(result.stdout).git_publication_performed,false);
});
