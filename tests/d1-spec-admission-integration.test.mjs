import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {makeD1RecipeFixture as makeD1SpecificationsFixture} from './fixtures/d1-recipe-v2.mjs';
import {admitD1Specifications,sealD1Specifications} from '../image-studio/spec-admission.mjs';
import {initialD1ProofState,nextD1ProofAction} from '../image-studio/proof-state.mjs';
import {buildD1ImageLaneHandoff,IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';

function proofFixture(){
  const fixture=makeD1SpecificationsFixture();
  const state=initialD1ProofState({proofId:fixture.request.execution_id,branch:'proof/admission-fixture',requestPath:'fixtures/admission/request.json',ingestMappingPath:'fixtures/admission/mapping.json',updatedAt:'2026-10-08T00:00:00Z'});
  const attemptLog={schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:state.proof_id,native_generations:0,stories:[]};
  const requestSource={branch:state.branch,request_path:state.request_path,source_evidence_path:'fixtures/admission/source-evidence.json',commit:'c'.repeat(40)};
  state.specification_binding={request_sha256:canonicalSha(fixture.request),source_evidence_sha256:canonicalSha(fixture.sourceEvidence),source_commit:fixture.request.source_commit,
    request_commit:requestSource.commit,source_evidence_path:requestSource.source_evidence_path,attempt_log_sha256:canonicalSha(attemptLog)};
  return {...fixture,state,attemptLog,requestSource};
}
const next=fixture=>nextD1ProofAction(fixture.state,fixture);
function bindLog(fixture){
  fixture.state.specification_binding.attempt_log_sha256=canonicalSha(fixture.attemptLog);
}

test('I01-T01: the existing proof selector checks all six before any first-story start',()=>{
  const f=proofFixture();assert.equal(next(f).action,'START_WORK_BROWSER_STORY_1');
  f.request.stories[5].generation.core_mechanism='';
  f.request=sealD1Specifications(f.request,f.sourceEvidence);
  const before=JSON.stringify(f),out=next(f);
  assert.equal(out.action,'BLOCK_SPEC_ADMISSION');assert.equal(out.story_chats_opened,0);assert.equal(out.quality_attempts_consumed,0);
  assert.equal(JSON.stringify(f),before);
});

test('I01-T03: a valid but unrelated request cannot start the existing proof',async t=>{
  const mutations=[
    ['proof identity',f=>{f.state.proof_id='another-proof';}],
    ['request digest',f=>{f.state.specification_binding.request_sha256='0'.repeat(64);}],
    ['source digest',f=>{f.state.specification_binding.source_evidence_sha256='0'.repeat(64);}],
    ['source commit',f=>{f.state.specification_binding.source_commit='0'.repeat(40);}],
    ['storage commit',f=>{f.requestSource.commit='0'.repeat(40);}],
    ['branch',f=>{f.requestSource.branch='proof/unrelated';}],
    ['request path',f=>{f.requestSource.request_path='unrelated.json';}],
    ['evidence path',f=>{f.requestSource.source_evidence_path='unrelated.json';}],
    ['missing binding',f=>{delete f.state.specification_binding;}]
  ];
  for(const [name,mutate] of mutations) await t.test(name,()=>{const f=proofFixture();mutate(f);assert.equal(next(f).action,'BLOCK_REQUEST_BINDING');});
});

test('I01-T04: four real D1 quality failures cannot reset under a renamed request',()=>{
  const f=proofFixture();f.state.status='BROWSER_RUNNING';f.state.native_generations=4;
  f.attemptLog={schema_version:'daily-compiler-d1-r3-attempt-log-v1',proof_id:f.state.proof_id,story_id:f.request.stories[0].story_id,
    native_generations:4,attempts:[1,2,3,4].map(attempt=>({attempt,result:'FAIL'})),accepted_locked:false,accepted_assets:[],accepted_attempt:null};
  bindLog(f);
  const before=JSON.stringify(f);assert.equal(next(f).action,'FAIL_ATTEMPT_LIMIT');assert.equal(JSON.stringify(f),before);
  f.request.request_id='renamed-request-without-new-attempts';f.request=sealD1Specifications(f.request,f.sourceEvidence);
  f.state.specification_binding.request_sha256=canonicalSha(f.request);
  assert.equal(next(f).action,'FAIL_ATTEMPT_LIMIT');
  f.state.native_generations=0;assert.equal(next(f).action,'BLOCK_ATTEMPT_LINEAGE');
});

test('I01-T04: lost or conflicting D1 lineage never becomes an empty attempt budget',async t=>{
  for(const [name,mutate] of [
    ['missing log',f=>{delete f.attemptLog;}],
    ['other proof log',f=>{f.attemptLog.proof_id='other';bindLog(f);}],
    ['discarded generations',f=>{f.state.native_generations=4;}],
    ['changed log digest',f=>{f.attemptLog.native_generations=1;}],
    ['unknown evidence',f=>{f.attemptLog.stories=[{story_id:f.request.stories[0].story_id,attempts:[{attempt:1}]}];bindLog(f);}]
  ]) await t.test(name,()=>{const f=proofFixture();mutate(f);assert.equal(next(f).action,'BLOCK_ATTEMPT_LINEAGE');});
});

test('I01-T04: accepted assets and pending generated candidates resume without generation',()=>{
  const f=proofFixture();f.state.status='BROWSER_RUNNING';f.state.native_generations=2;
  f.state.accepted_assets=['assets/accepted-story.png'];f.state.accepted_story_chats=['accepted-story-chat'];
  f.attemptLog.native_generations=2;
  f.attemptLog.stories=[
    {story_id:f.request.stories[0].story_id,attempts:[{attempt:1,native_generation_completed:true,review:'PASS'}],accepted_locked:true,accepted_attempt:1,accepted_assets:['assets/accepted-story.png'],sha256:'d'.repeat(64)},
    {story_id:f.request.stories[1].story_id,attempts:[{attempt:1,native_generation_completed:true}],accepted_locked:false,pending_asset_sha256:'e'.repeat(64)}
  ];bindLog(f);
  const before=JSON.stringify(f),out=next(f);
  assert.equal(out.action,'RESUME_EXISTING_CANDIDATE');assert.equal(out.story_id,f.request.stories[1].story_id);assert.equal(out.attempt,1);
  assert.equal(JSON.stringify(f),before);
  f.state.accepted_assets=[];assert.equal(next(f).action,'BLOCK_ATTEMPT_LINEAGE');
});

test('I01-T04: explicit infrastructure failures consume no quality attempt',()=>{
  const f=proofFixture();
  f.attemptLog.stories=[{story_id:f.request.stories[0].story_id,attempts:[{attempt:1,native_generation_completed:false,quality_attempt_consumed:false,status:'BLOCKED_INFRASTRUCTURE'}],accepted_locked:false}];
  bindLog(f);const before=JSON.stringify(f);assert.equal(next(f).action,'START_WORK_BROWSER_STORY_1');assert.equal(JSON.stringify(f),before);
});

test('I01-T04: a reset PLANNED status cannot restart an accepted first story',()=>{
  const f=proofFixture();f.state.native_generations=1;f.state.accepted_assets=['accepted.png'];f.state.accepted_story_chats=['accepted-chat'];
  f.attemptLog.native_generations=1;f.attemptLog.stories=[{story_id:f.request.stories[0].story_id,attempts:[{attempt:1,result:'PASS'}],accepted_locked:true,accepted_attempt:1,accepted_assets:['accepted.png']}];
  bindLog(f);const before=JSON.stringify(f);assert.equal(next(f).action,'BLOCK_ATTEMPT_LINEAGE');assert.equal(JSON.stringify(f),before);
});

test('I01-T04: out-of-order pending history blocks new generation and remains preserved',()=>{
  const f=proofFixture();f.state.status='BROWSER_RUNNING';f.state.native_generations=1;f.attemptLog.native_generations=1;
  f.attemptLog.stories=[{story_id:f.request.stories[1].story_id,attempts:[{attempt:1,native_generation_completed:true}],accepted_locked:false,pending_asset_sha256:'e'.repeat(64)}];
  bindLog(f);const before=JSON.stringify(f);assert.equal(next(f).action,'BLOCK_ATTEMPT_LINEAGE');assert.equal(JSON.stringify(f),before);
});

test('I01-T04: quality rejection cannot masquerade as a zero-attempt infrastructure event',()=>{
  const f=proofFixture();f.attemptLog.stories=[{story_id:f.request.stories[0].story_id,attempts:[{attempt:1,native_generation_completed:false,quality_attempt_consumed:false,status:'REJECTED_QUALITY',result:'FAIL'}]}];
  bindLog(f);assert.equal(next(f).action,'BLOCK_ATTEMPT_LINEAGE');
});

test('I01-T04: blocked and accepted transport/terminal states do not require new specifications',()=>{
  const f=proofFixture();
  f.state.accepted_assets=Array.from({length:6},(_,i)=>'asset-'+i);f.state.accepted_story_chats=Array.from({length:6},(_,i)=>'chat-'+i);
  f.state.acceptance_manifest_path='manifest.json';f.state.ingest_handoff_path='handoff.json';f.state.work_porter_receipt_path='porter.json';f.state.cloud_proof_path='proof.json';
  delete f.state.specification_binding;
  for(const [status,action] of [['BLOCKED','EXIT_BLOCKED'],['PACKAGE_ACCEPTED','BUILD_INGEST_HANDOFF'],['GIT_INGEST','RESUME_EXACT_BYTE_INGEST'],['GITHUB_VERIFIED','BUILD_CLOUD_PROOF'],['COMPLETE','EXIT_COMPLETE']]){
    f.state.status=status;const before=JSON.stringify(f.state);assert.equal(nextD1ProofAction(f.state).action,action);assert.equal(JSON.stringify(f.state),before);
  }
});

function handoffFixture(){
  const f=makeD1SpecificationsFixture();
  return {specifications:f.request,sourceEvidence:f.sourceEvidence,edition:f.request.edition_date,executionId:f.request.execution_id,branch:'proof/admission-fixture',
    requestPath:'fixtures/admission/request.json',requestSha256:canonicalSha(f.request),sourceEvidencePath:'fixtures/admission/source-evidence.json',requestCommit:'c'.repeat(40),
    readyAt:'2026-10-08T01:00:00Z',now:'2026-10-08T01:01:00Z'};
}

test('I01-T06: admitted handoff binds both immutable input locators and uses the existing task',()=>{
  const f=handoffFixture(),before=JSON.stringify(f),h=buildD1ImageLaneHandoff(f);
  assert.equal(h.specification_admission.result,'PASS');assert.equal(h.generation_authorized,false);
  assert.equal(h.automation_update.jawbone_id,IMAGE_TASK_ID);assert.equal(h.scheduler_readback_verified,false);
  assert.equal(h.source_evidence_path,f.sourceEvidencePath);assert.equal(h.request_commit,f.requestCommit);
  assert.equal(h.source_evidence_sha256,canonicalSha(f.sourceEvidence));assert.equal(JSON.stringify(f),before);
  assert.equal(buildD1ImageLaneHandoff({...f,previous:{...h,scheduler_readback_verified:true}}).action,'NOOP');
  for(const update of [{branch:'proof/different'},{requestCommit:'d'.repeat(40)},{sourceEvidencePath:'fixtures/admission/other-evidence.json'}]){
    assert.equal(buildD1ImageLaneHandoff({...f,...update,previous:{...h,scheduler_readback_verified:true}}).action,'ARM_EXISTING_TASK');
  }
});

test('I01-T01: handoff rejects missing, invalid or mismatched specification/evidence bindings',async t=>{
  for(const update of [{sourceEvidence:undefined},{requestSha256:'0'.repeat(64)},{executionId:'other'},{sourceEvidencePath:undefined},{requestPath:'../request.json'},{requestCommit:'main'},{branch:'other branch'}]){
    await t.test(JSON.stringify(update),()=>assert.throws(()=>buildD1ImageLaneHandoff({...handoffFixture(),...update})));
  }
});

test('I01-T01: CLI failure records admission FAIL without emitting a first-story prompt',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'d1-admission-'));
  try{
    const f=makeD1SpecificationsFixture();f.request.stories[5].generation.core_mechanism='';f.request=sealD1Specifications(f.request,f.sourceEvidence);
    const req=path.join(directory,'request.json'),evidence=path.join(directory,'source.json'),receipt=path.join(directory,'receipt.json'),prompt=path.join(directory,'prompt.txt');
    fs.writeFileSync(req,JSON.stringify(f.request));fs.writeFileSync(evidence,JSON.stringify(f.sourceEvidence));
    const before=[fs.readFileSync(req),fs.readFileSync(evidence)];
    const out=spawnSync(process.execPath,['scripts/admit-d1-specifications.mjs',req,evidence,receipt,f.request.stories[0].story_id,prompt],{encoding:'utf8'});
    assert.equal(out.status,1,out.stderr);assert.equal(JSON.parse(fs.readFileSync(receipt)).result,'FAIL');assert.equal(fs.existsSync(prompt),false);
    assert.deepEqual([fs.readFileSync(req),fs.readFileSync(evidence)],before);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('I01-T06: CLI emits one exact clean prompt and never overwrites an existing output',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'d1-admission-'));
  try{
    const f=makeD1SpecificationsFixture();
    const req=path.join(directory,'request.json'),evidence=path.join(directory,'source.json'),receipt=path.join(directory,'receipt.json'),prompt=path.join(directory,'prompt.txt');
    fs.writeFileSync(req,JSON.stringify(f.request));fs.writeFileSync(evidence,JSON.stringify(f.sourceEvidence));
    const args=['scripts/admit-d1-specifications.mjs',req,evidence,receipt,f.request.stories[0].story_id,prompt];
    assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,0);
    const text=fs.readFileSync(prompt,'utf8');assert.match(text,/Permission routing/);assert.ok(!text.includes(f.request.stories[1].generation.subject));
    const before=fs.readFileSync(receipt);assert.notEqual(spawnSync(process.execPath,args,{encoding:'utf8'}).status,0);assert.deepEqual(fs.readFileSync(receipt),before);
    assert.equal(admitD1Specifications(f.request,f.sourceEvidence).generation_authorized,false);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
