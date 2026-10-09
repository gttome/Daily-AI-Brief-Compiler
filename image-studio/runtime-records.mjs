// Deterministic observed-event serializer. It never generates/reviews an image,
// creates a task, or supplies a network writer. Publication uses the existing
// runtime's injected, authenticated expected-head Git adapter.
import path from 'node:path';
import {canonicalSha,sha256,gitBlobSha,hex} from '../image-capsules/util.mjs';
import {assertD1Specifications,compileD1StoryPrompt} from './spec-admission.mjs';
import {assertNewGenerationProfile,compileRecipeProjections,compileRecipeCorrection,validateRecipeReview,bindRecipeReview} from './specification-projection.mjs';
import {validateD1ProofState,nextD1ProofAction,nextRecordedStoryOperation} from './proof-state.mjs';
import {validateVisualReview,BASIC_GATES,BENCHMARK_DIMENSIONS} from '../image-capsules/review-contract.mjs';
import {validateCanonicalPng} from './png-integrity.mjs';
import {pngDimensions} from '../work-porter/integrity.mjs';

const need=(ok,label)=>{if(!ok)throw new Error('d1_event:'+label);};
const exact=(x,ks,label)=>need(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k)),label+'_fields');
const safe=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!/[\\\s:#?]/.test(p)&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const json=o=>JSON.stringify(o,null,2)+'\n';
const instant=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const context=x=>typeof x==='string'&&/^ctx-[a-f0-9]{64}$/.test(x);
const rowsOf=log=>Array.isArray(log.stories)?log.stories:log.story_id?[log]:[];
const generated=row=>(row?.attempts??[]).filter(a=>a.native_generation_completed===true||['PASS','FAIL'].includes(a.result??a.review));
const byteIdentity=(bytes,assetPath)=>({path:assetPath,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes),bytes:bytes.length,...pngDimensions(bytes),format:'png'});
export function inspectD1RuntimeRecords({state,attemptLog,request,sourceEvidence,expectedStateSha256,expectedLogSha256}){
 need(validateD1ProofState(state).length===0,'state_schema');
 need(hex(expectedStateSha256,64)&&canonicalSha(state)===expectedStateSha256,'prior_state_digest');
 need(hex(expectedLogSha256,64)&&canonicalSha(attemptLog)===expectedLogSha256&&state.specification_binding?.attempt_log_sha256===expectedLogSha256,'prior_log_canonical_digest');
 const admitted=assertD1Specifications(request,sourceEvidence),b=state.specification_binding;
 need(b.request_sha256===admitted.request_sha256&&b.source_evidence_sha256===admitted.source_evidence_sha256&&b.source_commit===request.source_commit&&hex(b.request_commit,40)&&request.execution_id===state.proof_id,'immutable_request_binding');
 const account=nextRecordedStoryOperation(state,request,attemptLog);
 const next=nextD1ProofAction(state,{request,sourceEvidence,attemptLog,requestSource:{branch:state.branch,request_path:state.request_path,source_evidence_path:b.source_evidence_path,commit:b.request_commit}});
 const blocked=['BLOCKED','COMPLETE'].includes(state.status)||account.action==='FAIL_ATTEMPT_LIMIT';
 return {schema_version:'daily-compiler-d1-runtime-inspection-v1',scope:'READ_ONLY_ACCOUNTING_NOT_LIVE_CAPABILITY',status:state.status,native_generations:state.native_generations,accepted_images:state.accepted_assets.length,next_action:next.action,accounting_action:account.action,permitted_new_generations:blocked||!['START_WORK_BROWSER_STORY_1','RESUME_FIRST_UNACCEPTED_STORY'].includes(next.action)?0:Math.min(24-state.native_generations,4-generated(rowsOf(attemptLog).find(r=>r.story_id===account.story_id)).length),generation_authorized:false,state_sha256:expectedStateSha256,attempt_log_canonical_sha256:expectedLogSha256};
}
export function recordD1ImageEvent(input){
 const {state,attemptLog,request,sourceEvidence,engineSha,expectedHead,event,rawBytes,canonicalBytes}=input;
 const inspected=inspectD1RuntimeRecords(input);
 need(hex(engineSha,40)&&hex(expectedHead,40),'engine_and_expected_head');
 exact(event,['event_id','type','story_id','context_id','invocation_id','observed_at','data'],'event');
 need(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(event.event_id)&&context(event.context_id)&&context(event.invocation_id)&&instant(event.observed_at),'event_identity');
 const base=path.posix.dirname(state.request_path);
 need(safe(base)&&safe(state.branch)&&state.branch!=='main','runtime_namespace');
 const eventPath=base+'/evidence/events/'+event.event_id+'.json';
 const digest=canonicalSha({event,engine_sha:engineSha,request_sha256:canonicalSha(request),raw_sha256:rawBytes?sha256(rawBytes):null,canonical_sha256:canonicalBytes?sha256(canonicalBytes):null});
 const previous=(attemptLog.events??[]).find(e=>e.event_id===event.event_id);
 if(previous){need(previous.event_sha256===digest,'event_id_conflict');return {schema_version:'daily-compiler-d1-event-batch-v1',result:'UNCHANGED',expected_head:expectedHead,writes:[],native_generations:state.native_generations,state,attempt_log:attemptLog,generation_authorized:false};}
 need(!['BLOCKED','COMPLETE'].includes(state.status),'terminal_state_immutable');
 need(['PLANNED','BROWSER_RUNNING'].includes(state.status),'attempt_stage_only');
 need(Date.parse(event.observed_at)>=Date.parse(state.updated_at),'event_time_regressed');
 need(Array.isArray(attemptLog.stories),'legacy_history_read_only');
 const story=request.stories.find(s=>s.story_id===event.story_id);need(story,'story_identity');
 const first=request.stories.find(s=>!attemptLog.stories.find(r=>r.story_id===s.story_id)?.accepted_locked);
 need(first?.story_id===story.story_id,'prefix_or_accepted_lock');
 const nextState=structuredClone(state),log=structuredClone(attemptLog),writes=[];
 let row=log.stories.find(r=>r.story_id===story.story_id);
 if(!row){row={story_id:story.story_id,attempts:[],accepted_locked:false,accepted_assets:[],accepted_attempt:null};log.stories.push(row);}
 const attempts=generated(row),last=attempts.at(-1),pending=log.pending_intent;
 const write=(p,bytes)=>{need(safe(p)&&p.startsWith(base+'/'),'write_scope');writes.push({path:p,content_base64:Buffer.from(bytes).toString('base64'),bytes:Buffer.byteLength(bytes),bytes_sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes)});};
 const data=event.data;
 need((rawBytes===undefined||event.type==='GENERATION_COMPLETED')&&(canonicalBytes===undefined||event.type==='REVIEW_COMPLETED'),'unexpected_asset_payload');
 const assetPath=(attempt,name)=>base+'/evidence/attempts/'+story.story_id+'/a'+String(attempt).padStart(2,'0')+'/'+name+'.png';
 if(event.type==='GENERATION_INTENT'){
  assertNewGenerationProfile(request);
  need(Date.parse(story.recipe_profile.semantic_review.reviewed_at)<=Date.parse(event.observed_at),'source_review_not_yet_performed');
  exact(data,['prompt_text','prompt_sha256'],'intent');
  need(!pending&&attempts.length<4&&state.native_generations<24&&(!last||last.result==='FAIL'),'intent_not_eligible');
  if(last)need(last.context_id===event.context_id&&!last.recipe_review.specification_conflict,'retry_context_or_conflict');
  else need(!log.stories.some(r=>r!==row&&r.attempts.some(a=>a.context_id===event.context_id)),'story_context_reused');
  const prompt=last?compileRecipeCorrection(story,last.recipe_review).text:compileD1StoryPrompt(request,sourceEvidence,story.story_id).prompt;
  need(data.prompt_text===prompt&&data.prompt_sha256===sha256(prompt),'exact_prompt_required');
  log.pending_intent={event_id:event.event_id,event_sha256:digest,story_id:story.story_id,context_id:event.context_id,invocation_id:event.invocation_id,attempt:attempts.length+1,observed_at:event.observed_at,prompt_sha256:sha256(prompt),event_path:eventPath};
 }else if(event.type==='GENERATION_COMPLETED'){
  exact(data,['intent_event_id','raw_path'],'generated');
  need(pending&&pending.event_id===data.intent_event_id&&pending.story_id===story.story_id&&pending.context_id===event.context_id,'pending_intent_required');
  need(Buffer.isBuffer(rawBytes)&&rawBytes.length>0&&rawBytes.length<=64*1024*1024&&safe(data.raw_path)&&data.raw_path.startsWith(base+'/'),'raw_bytes_required');
  need(pending.attempt===attempts.length+1&&pending.attempt<=4&&state.native_generations<24&&Date.parse(event.observed_at)>=Date.parse(pending.observed_at),'completed_attempt_or_time');
  need(data.raw_path===assetPath(pending.attempt,'raw'),'raw_path_immutable_namespace');
  const identity=byteIdentity(rawBytes,data.raw_path);
  need(!rowsOf(attemptLog).some(r=>generated(r).some(a=>a.raw_path===identity.path)),'raw_path_immutable');
  row.attempts.push({attempt:pending.attempt,native_generation_completed:true,quality_attempt_consumed:true,context_id:event.context_id,invocation_id:event.invocation_id,generated_at:event.observed_at,raw_path:identity.path,raw_sha256:identity.sha256,raw_identity:identity,generation_prompt_sha256:pending.prompt_sha256,generation_event_path:pending.event_path,completion_event_path:eventPath});
  delete log.pending_intent;
  nextState.native_generations+=1;write(identity.path,rawBytes);
 }else if(event.type==='REVIEW_COMPLETED'){
  exact(data,['canonical_path','review_request_text','review_response_text','recipe_review','visual_review'],'review');
  need(!pending&&last&&!last.result&&last.context_id===event.context_id&&Buffer.isBuffer(canonicalBytes),'pending_review_required');
  need(data.canonical_path===assetPath(last.attempt,'canonical'),'canonical_path_immutable_namespace');
  validateCanonicalPng(canonicalBytes);
  const identity=byteIdentity(canonicalBytes,data.canonical_path),projection=compileRecipeProjections(story);
  need(data.review_request_text===projection.review_prompt,'review_request_exact');
  need(canonicalSha(data.recipe_review)===canonicalSha(bindRecipeReview(story,data.review_response_text,{finalSha256:identity.sha256,contextId:event.context_id,reviewedAt:data.visual_review?.reviewed_at})),'review_response_binding');
  const result=validateRecipeReview(story,data.recipe_review,{finalSha256:identity.sha256,contextId:event.context_id});
  const vr=data.visual_review;
  need(vr?.story_id===story.story_id&&vr.attempt===last.attempt&&vr.final_path===identity.path&&vr.final_sha256===identity.sha256&&vr.final_git_blob_sha===identity.git_blob_sha&&vr.reviewer_identity===event.context_id&&vr.packet_sha256===story.specification_sha256&&vr.prompt_sha256===projection.prompt_sha256,'visual_review_binding');
  need(instant(vr.reviewed_at)&&Date.parse(vr.reviewed_at)>=Date.parse(last.generated_at)&&Date.parse(vr.reviewed_at)<=Date.parse(event.observed_at)&&vr.reviewed_at===data.recipe_review.reviewed_at,'review_chronology');
  // Existing validator returns rejection errors for a truthful FAIL. Only PASS
  // can enter a lock; a failed basic/benchmark review must not be overridden.
  const errors=validateVisualReview(vr,{packet:{envelope:{story_id:story.story_id,packet_sha256:story.specification_sha256},generation:story.generation},finalReceipt:{story_id:story.story_id,attempt:last.attempt,final:identity}});
  need(['PASS','FAIL'].includes(vr.result),'visual_result');
  need(vr.schema_version==='daily-compiler-image-review-v3'&&[...BASIC_GATES.map(k=>vr.basic_gates?.[k]),...BENCHMARK_DIMENSIONS.map(k=>vr.benchmark_dimensions?.[k])].every(x=>x&&['PASS','FAIL'].includes(x.verdict)&&typeof x.observation==='string'&&x.observation.trim().length>=8)&&Array.isArray(vr.meaningful_components)&&vr.meaningful_components.every(x=>typeof x==='string'&&x.trim()),'complete_visual_observations');
  need(!errors.some(x=>['review_schema','review_identity','review_asset_identity','packet_binding','visible_text_packet_binding','final_asset_binding','overall_review_result_inconsistent'].includes(x)),'visual_schema_or_result_conflict');
  if(result==='PASS')need(vr.result==='PASS'&&errors.length===0&&vr.meaningful_components.length>=12&&new Set(vr.meaningful_components.map(x=>x.normalize('NFKC').toLowerCase().trim())).size===vr.meaningful_components.length,'canonical_quality_gate');
  Object.assign(last,{result:result==='PASS'?'PASS':'FAIL',reviewed_at:vr.reviewed_at,review_request_sha256:sha256(data.review_request_text),review_response_sha256:sha256(data.review_response_text),canonical_identity:identity,recipe_review:structuredClone(data.recipe_review),visual_review_sha256:canonicalSha(vr),review_event_path:eventPath});
  write(identity.path,canonicalBytes);
  if(data.recipe_review.specification_conflict||result==='FAIL'&&attempts.length===4){nextState.status='BLOCKED';nextState.last_error=data.recipe_review.specification_conflict?'SPECIFICATION_REVIEW_CONFLICT':'STORY_QUALITY_ATTEMPTS_EXHAUSTED';}
 }else if(event.type==='ACCEPT_LOCK'){
  exact(data,['asset_id','commit','path','sha256','git_blob_sha','bytes','readback_sha256','readback_git_blob_sha'],'lock');
  need(!pending&&last?.result==='PASS'&&last.context_id===event.context_id&&hex(data.commit,40)&&typeof data.asset_id==='string'&&data.asset_id.length>0,'acceptance_requires_actual_review');
  const identity=last.canonical_identity;
  need(['path','sha256','git_blob_sha','bytes'].every(k=>data[k]===identity[k])&&data.readback_sha256===identity.sha256&&data.readback_git_blob_sha===identity.git_blob_sha,'lock_readback_binding');
  need(!nextState.accepted_assets.includes(data.asset_id)&&!nextState.accepted_story_chats.includes(event.context_id),'duplicate_lock');
  Object.assign(row,{accepted_locked:true,accepted_attempt:last.attempt,accepted_assets:[data.asset_id],sha256:identity.sha256,accepted_at:event.observed_at,locked_at:event.observed_at,immutable_readback:structuredClone(data)});
  nextState.accepted_assets.push(data.asset_id);nextState.accepted_story_chats.push(event.context_id);
 }else if(event.type==='INFRASTRUCTURE_BLOCKED'){
  exact(data,['reason','external_outcome'],'infrastructure');
  need(typeof data.reason==='string'&&data.reason.trim().length>=8&&data.reason.length<=600,'infrastructure_reason');
  need(['NOT_INVOKED','UNKNOWN'].includes(data.external_outcome),'external_outcome');
  need(!pending||data.external_outcome==='UNKNOWN','intent_must_be_reconciled');
  // A pending intent stays pending. No assumed zero-generation retry.
  nextState.last_error=data.reason;
 }else throw new Error('d1_event:unsupported_event_type');
 if(nextState.status!=='BLOCKED')nextState.status='BROWSER_RUNNING';
 nextState.updated_at=event.observed_at;
 log.native_generations=nextState.native_generations;
 log.events??=[];need(log.events.length<256,'event_bound');log.events.push({event_id:event.event_id,event_sha256:digest,path:eventPath});
 nextState.specification_binding.attempt_log_sha256=canonicalSha(log);
 need(validateD1ProofState(nextState).length===0,'emitted_state_invalid');
 const record={schema_version:'daily-compiler-d1-observed-event-v1',event_sha256:digest,engine_sha:engineSha,expected_head:expectedHead,request_sha256:canonicalSha(request),prior_state_sha256:canonicalSha(state),prior_log_canonical_sha256:canonicalSha(attemptLog),event,raw_identity:rawBytes?byteIdentity(rawBytes,event.data.raw_path):null,canonical_identity:canonicalBytes?byteIdentity(canonicalBytes,event.data.canonical_path):null,generation_authorized:false};
 write(base+'/execution-state.json',json(nextState));write(base+'/attempt-log.json',json(log));write(eventPath,json(record));
 need(new Set(writes.map(w=>w.path)).size===writes.length,'duplicate_write_path');
 const preconditions=[{path:base+'/execution-state.json',canonical_sha256:canonicalSha(state)},{path:base+'/attempt-log.json',canonical_sha256:canonicalSha(attemptLog)},{path:state.request_path,canonical_sha256:canonicalSha(request)},{path:state.specification_binding.source_evidence_path,canonical_sha256:canonicalSha(sourceEvidence)}];
 const body={repository:'gttome/Daily-AI-Brief-Compiler',branch:state.branch,expected_head:expectedHead,engine_sha:engineSha,event_sha256:digest,preconditions,writes};
 return {schema_version:'daily-compiler-d1-event-batch-v1',result:'VALIDATED_WRITE_BATCH_NOT_PUBLISHED',...body,batch_sha256:canonicalSha(body),state:nextState,attempt_log:log,inspection_before:inspected,generation_authorized:false};
}
export async function publishD1EventBatch(batch,writer){
 need(writer&&['getHead','createCommit','updateRef','readFile'].every(k=>typeof writer[k]==='function'),'existing_writer_capability_required');
 if(batch?.result==='UNCHANGED'){need(batch.writes.length===0,'noop_writes');return {result:'UNCHANGED',writes:0};}
 const {repository,branch,expected_head,engine_sha,event_sha256,preconditions,writes}=batch;
 const body={repository,branch,expected_head,engine_sha,event_sha256,preconditions,writes};
 need(batch.schema_version==='daily-compiler-d1-event-batch-v1'&&batch.result==='VALIDATED_WRITE_BATCH_NOT_PUBLISHED'&&repository==='gttome/Daily-AI-Brief-Compiler'&&branch!=='main'&&safe(branch)&&hex(expected_head,40)&&batch.batch_sha256===canonicalSha(body),'batch_binding');
 need(Array.isArray(writes)&&writes.length>=3&&writes.length<=5&&new Set(writes.map(w=>w.path)).size===writes.length,'batch_files');
 for(const w of writes){const b=Buffer.from(w.content_base64,'base64');need(safe(w.path)&&b.length===w.bytes&&sha256(b)===w.bytes_sha256&&gitBlobSha(b)===w.git_blob_sha,'batch_bytes');}
 need(await writer.getHead({repository,branch})===expected_head,'stale_expected_head');
 need(Array.isArray(preconditions)&&preconditions.length===4,'preconditions_required');
 const priorRecords=[];
 for(const p of preconditions){need(safe(p.path)&&hex(p.canonical_sha256,64),'precondition_identity');const bytes=await writer.readFile({repository,commit:expected_head,path:p.path});need(Buffer.isBuffer(bytes),'remote_source_or_state_changed');const value=JSON.parse(bytes.toString('utf8'));need(canonicalSha(value)===p.canonical_sha256,'remote_source_or_state_changed');priorRecords.push(value);}
 // Re-run the pure adapter against the actual immutable prior records. A
 // hand-edited batch plus recomputed hashes cannot bypass event validation.
 const [priorState,priorLog,request,sourceEvidence]=priorRecords;
 const base=path.posix.dirname(priorState.request_path??'');
 const eventWrites=writes.filter(w=>w.path.startsWith(base+'/evidence/events/')&&w.path.endsWith('.json'));
 need(eventWrites.length===1,'exact_event_record_required');
 const observed=JSON.parse(Buffer.from(eventWrites[0].content_base64,'base64').toString('utf8'));
 need(observed.schema_version==='daily-compiler-d1-observed-event-v1'&&observed.event_sha256===event_sha256,'observed_event_binding');
 const payload=p=>{const w=writes.find(w=>w.path===p);return w?Buffer.from(w.content_base64,'base64'):undefined;};
 const replay=recordD1ImageEvent({state:priorState,attemptLog:priorLog,request,sourceEvidence,expectedStateSha256:preconditions[0].canonical_sha256,expectedLogSha256:preconditions[1].canonical_sha256,engineSha:engine_sha,expectedHead:expected_head,event:observed.event,rawBytes:observed.event.type==='GENERATION_COMPLETED'?payload(observed.event.data.raw_path):undefined,canonicalBytes:observed.event.type==='REVIEW_COMPLETED'?payload(observed.event.data.canonical_path):undefined});
 need(replay.batch_sha256===batch.batch_sha256,'batch_does_not_replay');
 if(observed.event.type==='ACCEPT_LOCK'){
   // A matching claim in an event is not an immutable asset readback. Verify
   // the referenced canonical commit before publishing any accepted lock.
   const lock=observed.event.data;
   const bytes=await writer.readFile({repository,commit:lock.commit,path:lock.path});
   need(Buffer.isBuffer(bytes)&&bytes.length===lock.bytes&&sha256(bytes)===lock.sha256&&gitBlobSha(bytes)===lock.git_blob_sha,'accepted_asset_immutable_readback');
   validateCanonicalPng(bytes);
 }
 const mutablePaths=new Set(preconditions.slice(0,2).map(p=>p.path));
 for(const w of writes.filter(w=>!mutablePaths.has(w.path))){
   // The existing writer must return null only for an actual missing file,
   // never for access/network errors. Existing evidence is append-only.
   const prior=await writer.readFile({repository,commit:expected_head,path:w.path});
   need(prior===null||(Buffer.isBuffer(prior)&&sha256(prior)===w.bytes_sha256&&gitBlobSha(prior)===w.git_blob_sha),'immutable_path_already_contains_other_bytes');
 }
 // createCommit MUST create one complete Git tree with exactly this parent.
 // updateRef MUST enforce compare-and-swap; the read is not itself the fence.
 const commit=await writer.createCommit({repository,branch,parent:expected_head,writes});need(hex(commit,40),'commit_identity');
 await writer.updateRef({repository,branch,expectedHead:expected_head,commit,force:false});
 need(await writer.getHead({repository,branch})===commit,'published_head_not_observed');
 for(const w of writes){const b=await writer.readFile({repository,commit,path:w.path});need(Buffer.isBuffer(b)&&b.length===w.bytes&&sha256(b)===w.bytes_sha256&&gitBlobSha(b)===w.git_blob_sha,'immutable_readback_mismatch');}
 return {schema_version:'daily-compiler-d1-event-publication-v1',result:'EXACT_COMMIT_READBACK_PASS',commit,batch_sha256:batch.batch_sha256,files:writes.map(({path,bytes_sha256,git_blob_sha,bytes})=>({path,bytes_sha256,git_blob_sha,bytes})),native_runtime_capability_proven:false};
}
