// TEST_ONLY: deterministic event/writer simulations. No native generation,
// scheduler, GitHub publication, actual image inspection, or release authority.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {syntheticRecipeReview,syntheticResponse} from './fixtures/d1-recipe-v2.mjs';
import {compileRecipeProjections,compileRecipeCorrection} from '../image-studio/specification-projection.mjs';
import {recordD1ImageEvent,publishD1EventBatch,inspectD1RuntimeRecords} from '../image-studio/runtime-records.mjs';
import {initialD1ProofState} from '../image-studio/proof-state.mjs';
import {validateD1QualificationEvidence} from '../image-studio/proof-evidence.mjs';
import {canonicalSha,sha256,gitBlobSha} from '../image-capsules/util.mjs';
const Q=makeD1QualificationFixture({recipeV2:true});after(()=>Q.cleanup());
const raw=fs.readFileSync(path.join(Q.root,Q.data.handoff.items[0].target_path));
const H='a'.repeat(40),E='b'.repeat(40),ctx='ctx-'+'c'.repeat(64),inv='ctx-'+'d'.repeat(64),base='qualifications/TEST_ONLY-event-writer';
const j=x=>JSON.stringify(x,null,2)+'\n';
function fresh(){
 const state=initialD1ProofState({proofId:Q.data.request.execution_id,branch:'qualification/TEST_ONLY-event-writer',requestPath:base+'/request.json',ingestMappingPath:base+'/mapping.json',updatedAt:'2026-10-08T22:00:00Z'});
 const attemptLog={schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:state.proof_id,native_generations:0,stories:[]};
 state.specification_binding={request_sha256:canonicalSha(Q.data.request),source_evidence_sha256:canonicalSha(Q.data.source_evidence),source_commit:Q.data.request.source_commit,request_commit:H,source_evidence_path:base+'/source-evidence.json',attempt_log_sha256:canonicalSha(attemptLog)};
 return {state,attemptLog,request:structuredClone(Q.data.request),sourceEvidence:structuredClone(Q.data.source_evidence),engineSha:E,expectedHead:H};
}
const story=f=>f.request.stories.find(s=>!f.attemptLog.stories.find(r=>r.story_id===s.story_id)?.accepted_locked);
const bind=f=>({...f,expectedStateSha256:canonicalSha(f.state),expectedLogSha256:canonicalSha(f.attemptLog)});
const time=n=>'2026-10-08T22:'+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+'Z';
function event(f,type,n,data){return {event_id:'TEST_ONLY_'+type+'_'+n,type,story_id:story(f).story_id,context_id:ctx,invocation_id:inv,observed_at:time(n),data};}
function apply(f,e,assets={}){const r=recordD1ImageEvent({...bind(f),event:e,...assets});f.state=r.state;f.attemptLog=r.attempt_log;return r;}
function intent(f,n){const s=story(f),prior=f.attemptLog.stories.find(r=>r.story_id===s.story_id)?.attempts.at(-1);const text=prior?compileRecipeCorrection(s,prior.recipe_review).text:compileRecipeProjections(s).prompt;return event(f,'GENERATION_INTENT',n,{prompt_text:text,prompt_sha256:sha256(text)});}
function generatedEvent(f,n){const p=f.attemptLog.pending_intent;return event(f,'GENERATION_COMPLETED',n,{intent_event_id:p.event_id,raw_path:base+'/evidence/attempts/'+p.story_id+'/a'+String(p.attempt).padStart(2,'0')+'/raw.png'});}
function reviewEvent(f,n,{fail=false,conflict=false}={}){
 const s=story(f),last=f.attemptLog.stories.find(r=>r.story_id===s.story_id).attempts.at(-1),p=compileRecipeProjections(s);
 const vr=structuredClone(Q.data.canonical_reviews.images.find(i=>i.story_id===s.story_id));
 const canonical_path=base+'/evidence/attempts/'+s.story_id+'/a'+String(last.attempt).padStart(2,'0')+'/canonical.png';
 Object.assign(vr,{attempt:last.attempt,final_path:canonical_path,final_sha256:sha256(raw),final_git_blob_sha:gitBlobSha(raw),reviewer_identity:ctx,reviewed_at:time(n),packet_sha256:s.specification_sha256,prompt_sha256:p.prompt_sha256});
 if(fail){vr.basic_gates.mechanism_detail.verdict='FAIL';vr.result='FAIL';}
 const recipe_review=syntheticRecipeReview(s,{sha:sha256(raw),context:ctx,at:time(n),failure:fail?'basic.mechanism_detail':null,conflict});
 return event(f,'REVIEW_COMPLETED',n,{canonical_path,review_request_text:p.review_prompt,review_response_text:syntheticResponse(recipe_review),recipe_review,visual_review:vr});
}
function candidate(f,n=1){apply(f,intent(f,n));return apply(f,generatedEvent(f,n+1),{rawBytes:raw});}
function lockEvent(f,n){const i=f.attemptLog.stories.find(r=>r.story_id===story(f).story_id).attempts.at(-1).canonical_identity;
 return event(f,'ACCEPT_LOCK',n,{asset_id:'TEST_ONLY-asset-'+story(f).story_id,commit:'e'.repeat(40),path:i.path,sha256:i.sha256,git_blob_sha:i.git_blob_sha,bytes:i.bytes,readback_sha256:i.sha256,readback_git_blob_sha:i.git_blob_sha});}
function lock(f,n){return apply(f,lockEvent(f,n));}
function fakeWriter(f,{race=false,corrupt=false,skipUpdate=false}={}){
 const trees=new Map(),initial=new Map([[base+'/execution-state.json',Buffer.from(j(f.state))],[base+'/attempt-log.json',Buffer.from(j(f.attemptLog))],[f.state.request_path,Buffer.from(j(f.request))],[f.state.specification_binding.source_evidence_path,Buffer.from(j(f.sourceEvidence))]]);trees.set(H,initial);
 let head=H,commits=0,updates=0;const target='f'.repeat(40);
 return {trees,get head(){return head;},get commits(){return commits;},get updates(){return updates;},async getHead(){return head;},
 async readFile({commit,path:p}){const b=trees.get(commit)?.get(p)??null;return corrupt&&commit===target&&b?Buffer.concat([b,Buffer.from('corrupt')]):b;},
 async createCommit({parent,writes}){assert.equal(parent,H);commits++;const next=new Map(trees.get(parent));for(const w of writes)next.set(w.path,Buffer.from(w.content_base64,'base64'));trees.set(target,next);if(race)head='1'.repeat(40);return target;},
 async updateRef({expectedHead,commit,force}){assert.equal(force,false);assert.equal(expectedHead,H);updates++;if(head!==expectedHead)throw new Error('TEST_ONLY concurrent head advance');if(!skipUpdate)head=commit;}};
}

test('C11 intent consumes zero; pending output advances only to review; genuine completion consumes exactly once',()=>{
 const f=fresh(),before=structuredClone(f),e=intent(f,1),i=apply(f,e);
 assert.equal(i.state.native_generations,0);assert.equal(i.writes.length,3);assert.equal(i.inspection_before.generation_authorized,false);
 assert.equal(inspectD1RuntimeRecords(bind(f)).next_action,'RECONCILE_EXISTING_INTENT');
 const again=recordD1ImageEvent({...bind(f),event:e});assert.equal(again.result,'UNCHANGED');assert.equal(again.writes.length,0);
 const done=generatedEvent(f,2),r=apply(f,done,{rawBytes:raw});assert.equal(r.state.native_generations,1);assert.equal(r.writes.length,4);
 assert.equal(inspectD1RuntimeRecords(bind(f)).next_action,'RESUME_EXISTING_CANDIDATE');
 assert.equal(recordD1ImageEvent({...bind(f),event:done,rawBytes:raw}).result,'UNCHANGED');
 assert.equal(before.state.native_generations,0);assert.deepEqual(before.attemptLog.stories,[]);
});

test('C11 every failed review consumes its actual generation; four FAILs are terminal with no fifth',()=>{
 const f=fresh();let n=1;
 for(let attempt=1;attempt<=4;attempt++,n+=3){candidate(f,n);const r=apply(f,reviewEvent(f,n+2,{fail:true}),{canonicalBytes:raw});assert.equal(r.state.native_generations,attempt);assert.equal(f.attemptLog.stories[0].attempts[attempt-1].result,'FAIL');}
 assert.equal(f.state.status,'BLOCKED');assert.equal(f.state.accepted_assets.length,0);
 const read=inspectD1RuntimeRecords(bind(f));assert.equal(read.next_action,'EXIT_BLOCKED');assert.equal(read.accounting_action,'FAIL_ATTEMPT_LIMIT');assert.equal(read.permitted_new_generations,0);
 assert.throws(()=>apply(f,intent(f,14)),/terminal_state_immutable/);
 const reopened=structuredClone(f);reopened.state.status='BROWSER_RUNNING';assert.throws(()=>apply(reopened,intent(reopened,15)),/intent_not_eligible/);
});

test('C13 reviewed canonical PASS resumes at lock/ingest, then accepted bytes and completed stories cannot regenerate',()=>{
 const f=fresh();candidate(f);apply(f,reviewEvent(f,3),{canonicalBytes:raw});assert.equal(inspectD1RuntimeRecords(bind(f)).next_action,'RESUME_EXISTING_CANDIDATE');
 const previous=structuredClone(f.attemptLog.stories[0]),r=lock(f,4);assert.equal(r.state.accepted_assets.length,1);assert.equal(r.state.native_generations,1);
 assert.equal(f.attemptLog.stories[0].accepted_locked,true);assert.deepEqual(f.attemptLog.stories[0].attempts,previous.attempts);
 const old=event(f,'GENERATION_INTENT',5,{prompt_text:'x',prompt_sha256:sha256('x')});old.story_id=f.request.stories[0].story_id;
 assert.throws(()=>apply(f,old),/prefix_or_accepted_lock/);
 assert.throws(()=>apply(f,intent(f,5)),/story_context_reused/);
});

test('recovery integration: event-emitted six-story locks and resume checkpoints satisfy the existing qualification reader',t=>{
 const fixture=makeD1QualificationFixture({recipeV2:true});t.after(()=>fixture.cleanup());
 const {request,source_evidence:sourceEvidence,runtime,manifest,canonical_reviews:reviews}=fixture.data;
 const state=initialD1ProofState({proofId:request.execution_id,branch:fixture.data.state.branch,requestPath:fixture.paths.request,ingestMappingPath:fixture.data.state.ingest_mapping_path,updatedAt:'2026-10-08T00:00:00Z'});
 const attemptLog={schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:state.proof_id,native_generations:0,stories:[]};
 state.specification_binding={...structuredClone(fixture.data.state.specification_binding),attempt_log_sha256:canonicalSha(attemptLog)};
 const f={state,attemptLog,request,sourceEvidence,engineSha:E,expectedHead:H};
 const checkpoints={},root=path.posix.dirname(state.request_path);
 for(const [index,s] of request.stories.entries()){
  const session=runtime.sessions[index],image=manifest.images[index],projection=compileRecipeProjections(s);
  const bytes=fs.readFileSync(path.join(fixture.root,fixture.data.handoff.items[index].target_path));
  const attemptRoot=root+'/evidence/attempts/'+s.story_id+'/a01';
  const observed=(type,at,data)=>({event_id:'TEST_ONLY_integration_'+index+'_'+type,type,story_id:s.story_id,context_id:session.context_id,invocation_id:session.invocation_id,observed_at:at,data});
  const intentEvent=observed('GENERATION_INTENT',session.started_at,{prompt_text:projection.prompt,prompt_sha256:projection.prompt_sha256});
  apply(f,intentEvent);
  apply(f,observed('GENERATION_COMPLETED',session.generated_at,{intent_event_id:intentEvent.event_id,raw_path:attemptRoot+'/raw.png'}),{rawBytes:bytes});
  if(index===2){checkpoints.after_state=structuredClone(f.state);checkpoints.after_log=structuredClone(f.attemptLog);}
  const vr={...structuredClone(reviews.images[index]),final_path:attemptRoot+'/canonical.png'};
  const recipe=reviews.recipe_reviews[index].attempts[0];
  apply(f,observed('REVIEW_COMPLETED',vr.reviewed_at,{canonical_path:vr.final_path,review_request_text:projection.review_prompt,review_response_text:recipe.review_response_text,recipe_review:recipe.review,visual_review:vr}),{canonicalBytes:bytes});
  apply(f,observed('ACCEPT_LOCK',session.locked_at,{asset_id:image.cloud_asset_id,commit:fixture.data.binary_readback.commit,path:vr.final_path,sha256:image.sha256,git_blob_sha:vr.final_git_blob_sha,bytes:image.bytes,readback_sha256:image.sha256,readback_git_blob_sha:vr.final_git_blob_sha}));
  if(index===1){checkpoints.before_state=structuredClone(f.state);checkpoints.before_log=structuredClone(f.attemptLog);}
 }
 // The chronology field must come from the serializer, never be filled in by
 // the companion fixture after the event has been emitted.
 fixture.data.attempt_log=structuredClone(f.attemptLog);
 fixture.data.state.specification_binding.attempt_log_sha256=canonicalSha(f.attemptLog);
 for(const [key,value] of Object.entries(checkpoints))fixture.checkpoints[key]=value;
 for(const kind of ['before','after']){
  fixture.data.resume[kind].state.sha256=canonicalSha(checkpoints[kind+'_state']);
  fixture.data.resume[kind].attempt_log.sha256=canonicalSha(checkpoints[kind+'_log']);
 }
 fixture.refresh();
 const checked=validateD1QualificationEvidence({repoRoot:fixture.root,evidence:fixture.proof.evidence,proofId:state.proof_id});
 assert.equal(checked.result,'PASS',checked.errors.join(';'));
 assert.equal(fixture.data.attempt_log.stories.length,6);
 for(const [index,row] of fixture.data.attempt_log.stories.entries()){
  assert.equal(row.accepted_at,runtime.sessions[index].locked_at);
  assert.equal(row.accepted_at,row.locked_at);
 }
});

test('C09 infrastructure unknowns retain pending intent; schema conflicts, text drift and missing observations fail before mutation',()=>{
 const f=fresh(),e=event(f,'INFRASTRUCTURE_BLOCKED',1,{reason:'TEST_ONLY dependency unavailable',external_outcome:'NOT_INVOKED'});apply(f,e);assert.equal(f.state.native_generations,0);
 apply(f,intent(f,2));apply(f,event(f,'INFRASTRUCTURE_BLOCKED',3,{reason:'TEST_ONLY invocation outcome unresolved',external_outcome:'UNKNOWN'}));assert.ok(f.attemptLog.pending_intent);
 assert.throws(()=>apply(f,intent(f,4)),/intent_not_eligible/);
 assert.throws(()=>apply(f,event(f,'INFRASTRUCTURE_BLOCKED',4,{reason:'TEST_ONLY unresolved request',external_outcome:'NOT_INVOKED'})),/intent_must_be_reconciled/);
 apply(f,generatedEvent(f,5),{rawBytes:raw});const good=reviewEvent(f,6);
 for(const mutate of [e=>e.data.review_request_text+=' unsealed requirement',e=>e.data.recipe_review.criteria.pop(),e=>e.data.visual_review.basic_gates.mechanism_detail.observation='',e=>e.data.visual_review.final_sha256='0'.repeat(64)]){
  const bad=structuredClone(good),before=structuredClone(f);mutate(bad);assert.throws(()=>apply(f,bad,{canonicalBytes:raw}));assert.deepEqual(f,before);
 }
 const conflicted=reviewEvent(f,6,{conflict:true});apply(f,conflicted,{canonicalBytes:raw});assert.equal(f.state.status,'BLOCKED');assert.equal(f.state.native_generations,1);assert.equal(f.state.last_error,'SPECIFICATION_REVIEW_CONFLICT');
});

test('C11 full state/log canonical bindings, closed state and event identities reject reinterpretation or hidden budget reset',()=>{
 const f=fresh();const wrong={...bind(f),expectedLogSha256:sha256(j(f.attemptLog))};assert.notEqual(wrong.expectedLogSha256,canonicalSha(f.attemptLog));assert.throws(()=>inspectD1RuntimeRecords(wrong),/prior_log_canonical_digest/);
 const changed=structuredClone(f);changed.state.runtime_progress={result:'green'};assert.throws(()=>inspectD1RuntimeRecords(bind(changed)),/state_schema/);
 const e=intent(f,1);apply(f,e);const conflict=structuredClone(e);conflict.data.prompt_text+=' changed';assert.throws(()=>apply(f,conflict),/event_id_conflict/);
 const hidden=structuredClone(f);hidden.attemptLog.pending_intent.attempt=5;hidden.state.specification_binding.attempt_log_sha256=canonicalSha(hidden.attemptLog);assert.throws(()=>inspectD1RuntimeRecords(bind(hidden)),/pending_intent_attempt_or_budget/);
 const unknown=event(f,'FAIL_PSEUDOTEXT',2,{});assert.throws(()=>apply(f,unknown),/unsupported_event_type/);
});

test('C16 immutable asset destinations forbid overwriting request, state, raw image or another story asset',()=>{
 for(const target of [base+'/request.json',base+'/execution-state.json',base+'/source-evidence.json',base+'/evidence/attempts/other/a01/raw.png']){
  const f=fresh();apply(f,intent(f,1));const bad=generatedEvent(f,2);bad.data.raw_path=target;assert.throws(()=>apply(f,bad,{rawBytes:raw}),/immutable_namespace/);
 }
 const f=fresh();candidate(f);const bad=reviewEvent(f,3);bad.data.canonical_path=f.attemptLog.stories[0].attempts[0].raw_path;assert.throws(()=>apply(f,bad,{canonicalBytes:raw}),/canonical_path_immutable_namespace/);
 const good=reviewEvent(f,3);assert.throws(()=>apply(f,good,{canonicalBytes:Buffer.from('not a PNG')}),/canonical_png/);
});

test('writer stages one complete commit then fences the ref and reads every immutable byte',async()=>{
 const f=fresh(),before=structuredClone(f),writer=fakeWriter(f),batch=recordD1ImageEvent({...bind(f),event:intent(f,1)});
 const result=await publishD1EventBatch(batch,writer);assert.equal(result.result,'EXACT_COMMIT_READBACK_PASS');assert.equal(result.native_runtime_capability_proven,false);assert.equal(writer.commits,1);assert.equal(writer.updates,1);
 assert.equal(writer.head,result.commit);assert.deepEqual(f,before);assert.equal(result.files.length,3);
 for(const w of batch.writes)assert.equal(sha256(writer.trees.get(result.commit).get(w.path)),w.bytes_sha256);
});

test('recovery integration: accepted-lock publication reads the referenced immutable canonical asset before any writes',async t=>{
 for(const mode of ['missing','different-bytes','access-error','exact'])await t.test(mode,async()=>{
  const f=fresh();candidate(f);apply(f,reviewEvent(f,3),{canonicalBytes:raw});
  const e=lockEvent(f,4),writer=fakeWriter(f),batch=recordD1ImageEvent({...bind(f),event:e});
  if(mode==='different-bytes'||mode==='exact')writer.trees.set(e.data.commit,new Map([[e.data.path,mode==='exact'?raw:Buffer.concat([raw,Buffer.from('changed')])]]));
  let referencedAssetReads=0;
  const originalRead=writer.readFile;
  writer.readFile=async args=>{
   if(args.commit===e.data.commit&&args.path===e.data.path){
    referencedAssetReads++;assert.equal(writer.commits,0);assert.equal(writer.updates,0);
    if(mode==='access-error')throw new Error('TEST_ONLY immutable read access denied');
   }
   return originalRead(args);
  };
  if(mode==='exact'){
   const receipt=await publishD1EventBatch(batch,writer);
   assert.equal(receipt.result,'EXACT_COMMIT_READBACK_PASS');assert.equal(writer.commits,1);assert.equal(writer.updates,1);
  }else{
   await assert.rejects(publishD1EventBatch(batch,writer),mode==='access-error'?/TEST_ONLY immutable read access denied/:/accepted_asset_immutable_readback/);
   assert.equal(writer.commits,0);assert.equal(writer.updates,0);assert.equal(writer.head,H);
  }
  assert.equal(referencedAssetReads,1);
 });
});

test('writer rejects stale competing head, source drift, immutable path collision and mismatched readback',async t=>{
 for(const mode of ['stale','race','source','collision','corrupt','no-update'])await t.test(mode,async()=>{
  const f=fresh(),writer=fakeWriter(f,{race:mode==='race',corrupt:mode==='corrupt',skipUpdate:mode==='no-update'}),batch=recordD1ImageEvent({...bind(f),event:intent(f,1)});
  if(mode==='stale')writer.getHead=async()=>'9'.repeat(40);
  if(mode==='source')writer.trees.get(H).set(f.state.request_path,Buffer.from('{}'));
  if(mode==='collision')writer.trees.get(H).set(batch.writes.at(-1).path,Buffer.from('prior preserved event'));
  const expected={stale:/stale_expected_head/,race:/concurrent head/,source:/remote_source_or_state_changed/,collision:/immutable_path_already_contains_other_bytes/,corrupt:/immutable_readback_mismatch/,'no-update':/published_head_not_observed/}[mode];
  await assert.rejects(publishD1EventBatch(batch,writer),expected);
  if(['stale','source','collision'].includes(mode)){assert.equal(writer.commits,0);assert.equal(writer.updates,0);}
  if(mode==='race')assert.equal(writer.head,'1'.repeat(40),'must preserve winning concurrent branch, without retry or overwrite');
 });
});

test('callable CLI emits actual TEST_ONLY batch, validates without writes and refuses output replacement',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-event-cli-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const f=fresh(),input=path.join(root,'input.json'),out=path.join(root,'batch.json');fs.writeFileSync(input,j({...bind(f),event:intent(f,1)}));
 const run=(...args)=>JSON.parse(execFileSync(process.execPath,['scripts/record-d1-image-event.mjs',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const inspected=run('validate-only',input);assert.equal(inspected.native_generations,0);assert.equal(inspected.runtime_capability_proven,false);assert.deepEqual(fs.readdirSync(root),['input.json']);
 const emitted=run('emit',input,out);assert.equal(emitted.scope,'LOCAL_BATCH_ONLY_NOT_GIT_PUBLICATION');assert.equal(emitted.runtime_capability_proven,false);
 const saved=fs.readFileSync(out);assert.equal(JSON.parse(saved).state.native_generations,0);assert.throws(()=>run('emit',input,out));assert.deepEqual(fs.readFileSync(out),saved);
});

test('IMG-P12 forged resealed batches cannot override derived totals, and pre-ref interruption preserves the old complete tree',async()=>{
 const f=fresh(),writer=fakeWriter(f),batch=recordD1ImageEvent({...bind(f),event:intent(f,1)});
 const edited=structuredClone(batch),w=edited.writes.find(w=>w.path===base+'/execution-state.json'),state=JSON.parse(Buffer.from(w.content_base64,'base64'));
 state.native_generations=24;const bytes=Buffer.from(j(state));Object.assign(w,{content_base64:bytes.toString('base64'),bytes:bytes.length,bytes_sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes)});
 const {repository,branch,expected_head,engine_sha,event_sha256,preconditions,writes}=edited;edited.batch_sha256=canonicalSha({repository,branch,expected_head,engine_sha,event_sha256,preconditions,writes});
 await assert.rejects(publishD1EventBatch(edited,writer),/batch_does_not_replay/);assert.equal(writer.commits,0);
 const stopped=fakeWriter(f);stopped.updateRef=async()=>{throw new Error('TEST_ONLY interrupted before ref publication');};
 await assert.rejects(publishD1EventBatch(batch,stopped),/interrupted before ref/);assert.equal(stopped.head,H);assert.equal(stopped.commits,1);
 assert.equal(canonicalSha(JSON.parse(stopped.trees.get(H).get(base+'/execution-state.json'))),canonicalSha(f.state));
 assert.equal(canonicalSha(JSON.parse(stopped.trees.get(H).get(base+'/attempt-log.json'))),canonicalSha(f.attemptLog));
});

test('IMG-P12 real temporary Git stores the entire batch in one tree and one expected-parent commit',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-git-event-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(args,input,env={})=>execFileSync('git',args,{cwd:root,input,env:{...process.env,...env},stdio:['pipe','pipe','pipe']});
 const text=(args,input,env)=>git(args,input,env).toString('utf8').trim();
 const f=fresh();text(['init','-q']);text(['config','user.name','TEST_ONLY event test']);text(['config','user.email','test@example.invalid']);
 const initial=[[base+'/execution-state.json',f.state],[base+'/attempt-log.json',f.attemptLog],[f.state.request_path,f.request],[f.state.specification_binding.source_evidence_path,f.sourceEvidence]];
 for(const [p,value] of initial){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),j(value));}
 text(['add','.']);text(['commit','--no-gpg-sign','-qm','TEST_ONLY immutable inputs']);const head=text(['rev-parse','HEAD']);
 const ref='refs/heads/'+f.state.branch;text(['update-ref',ref,head]);f.expectedHead=head;
 const batch=recordD1ImageEvent({...bind(f),event:intent(f,1)});let created=0;
 const writer={async getHead(){return text(['rev-parse',ref]);},async readFile({commit,path:p}){
   try{return git(['show',commit+':'+p]);}catch(e){const stderr=e.stderr?.toString()??'';if(/does not exist in|exists on disk, but not in/.test(stderr))return null;throw e;}
 },async createCommit({parent,writes}){
   created++;const env={GIT_INDEX_FILE:path.join(root,'TEST_ONLY-index')};text(['read-tree',parent],undefined,env);
   for(const w of writes){const blob=text(['hash-object','-w','--stdin'],Buffer.from(w.content_base64,'base64'));assert.equal(blob,w.git_blob_sha);text(['update-index','--add','--cacheinfo','100644,'+blob+','+w.path],undefined,env);}
   const tree=text(['write-tree'],undefined,env);return text(['commit-tree',tree,'-p',parent],Buffer.from('TEST_ONLY one atomic observed event\n'));
 },async updateRef({expectedHead,commit,force}){assert.equal(force,false);text(['update-ref',ref,commit,expectedHead]);}};
 const receipt=await publishD1EventBatch(batch,writer);assert.equal(receipt.result,'EXACT_COMMIT_READBACK_PASS');assert.equal(created,1);
 assert.equal(text(['rev-parse',receipt.commit+'^']),head);assert.equal(text(['rev-parse',ref]),receipt.commit);
 const changed=text(['diff-tree','--no-commit-id','--name-only','-r',receipt.commit]).split('\n').sort();assert.deepEqual(changed,batch.writes.map(w=>w.path).sort());
 for(const [p,value] of initial)assert.equal(canonicalSha(JSON.parse(git(['show',head+':'+p]))),canonicalSha(value));
 await assert.rejects(publishD1EventBatch(batch,writer),/stale_expected_head/);assert.equal(created,1);assert.equal(text(['remote']), '');
 assert.equal(receipt.native_runtime_capability_proven,false);
});
