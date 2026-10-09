// Pure environment-bound test preparation/accounting. No image executor,
// scheduler, Git client, production activation or modification of prior runs.
import fs from 'node:fs';
import {canonicalSha,sha256,gitBlobSha,hex} from '../image-capsules/util.mjs';
import {assertD1Specifications,sealD1Specifications} from './spec-admission.mjs';
import {validateRecipeStory,compileRecipeProjections,compileRecipeCorrection,bindRecipeReview,validateRecipeReview} from './specification-projection.mjs';
import {initialD1ProofState} from './proof-state.mjs';
import {inspectD1RuntimeRecords} from './runtime-records.mjs';
import {validateCanonicalPng} from './png-integrity.mjs';
import {pngDimensions} from '../work-porter/integrity.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const IMAGE_TEST_ENVIRONMENTS=freeze(JSON.parse(fs.readFileSync(new URL('../contracts/image-test-environments.json',import.meta.url),'utf8')));
export const IMAGE_TEST_ENVIRONMENTS_SHA256=canonicalSha(IMAGE_TEST_ENVIRONMENTS);
export const DEVELOPMENT_RUN_SCHEMA='daily-compiler-image-development-run-v1';
export const DEVELOPMENT_STATE_SCHEMA='daily-compiler-image-development-state-v1';
export const TEST_RUN_REGISTRY_SCHEMA='daily-compiler-image-test-run-registry-v1';
const need=(ok,code)=>{if(!ok)throw new Error('image_test_run:'+code);};
const obj=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys,label)=>need(obj(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),label+'_fields');
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value);
const context=value=>typeof value==='string'&&/^ctx-[a-f0-9]{64}$/.test(value);
const instant=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const same=(a,b)=>canonicalSha(a)===canonicalSha(b);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const addOne=value=>{need(integer(value)&&Number.isSafeInteger(value+1),'counter_representation_overflow');return value+1;};
const identity=(bytes,path)=>({path,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes),bytes:bytes.length,...pngDimensions(bytes),format:'png'});

export function imageRunBudget(environment='production'){
  need(['development','preproduction','production'].includes(environment),'environment');
  return structuredClone(IMAGE_TEST_ENVIRONMENTS[environment]);
}

export function emptyImageTestRunRegistry(){return {schema_version:TEST_RUN_REGISTRY_SCHEMA,runs:[]};}
function validateRegistry(registry){
  exact(registry,['schema_version','runs'],'registry');
  need(registry.schema_version===TEST_RUN_REGISTRY_SCHEMA&&Array.isArray(registry.runs),'registry_schema');
  const seen=new Set();
  for(const run of registry.runs){
    exact(run,['run_id','environment','manifest_sha256','namespace'],'registry_run');
    need(id(run.run_id)&&!seen.has(run.run_id)&&['development','preproduction'].includes(run.environment)&&hex(run.manifest_sha256,64)&&run.namespace===namespace(run.environment,run.run_id),'registry_run_identity');seen.add(run.run_id);
  }
}
const namespace=(environment,runId)=>environment==='development'?'development/image-experiments/'+runId:'qualifications/preproduction/'+runId;
function newRun({operation,environment,runId,createdAt,registry,retainedExecutionIds,startReason}){
  need(operation==='START_NEW_TEST_RUN','explicit_new_run_required');
  need(['development','preproduction'].includes(environment),'test_environment_required');
  need(id(runId)&&instant(createdAt)&&typeof startReason==='string'&&startReason.trim().length>=12,'run_identity_time_reason');
  validateRegistry(registry);
  need(Array.isArray(retainedExecutionIds)&&retainedExecutionIds.every(value=>typeof value==='string'),'retained_execution_inventory_required');
  need(!registry.runs.some(run=>run.run_id===runId)&&!retainedExecutionIds.includes(runId),'run_identity_already_used_resume_instead');
  return {run_id:runId,environment,namespace:namespace(environment,runId),created_at:createdAt,start_reason:startReason,operation,policy_sha256:IMAGE_TEST_ENVIRONMENTS_SHA256,prior_registry_sha256:canonicalSha(registry)};
}
function register(registry,manifest){
  const next=structuredClone(registry);
  next.runs.push({run_id:manifest.run_id,environment:manifest.environment,manifest_sha256:canonicalSha(manifest),namespace:manifest.namespace});
  return next;
}

// A development run may contain one, seven or any other positive case count.
// Repeated scientific stories are distinct experiments only when they have
// distinct case IDs; their full original source/specification stays attached.
export function prepareDevelopmentImageRun(input){
  const metadata=newRun({...input,environment:'development'});
  need(Array.isArray(input.cases)&&input.cases.length>0,'development_cases_required');
  const caseIds=new Set();
  const cases=input.cases.map(row=>{
    exact(row,['case_id','story','source'],'development_case');
    need(id(row.case_id)&&!caseIds.has(row.case_id),'development_case_identity');caseIds.add(row.case_id);
    const story=structuredClone(row.story),source=structuredClone(row.source),payload=structuredClone(story);delete payload.specification_sha256;
    need(hex(story.specification_sha256,64)&&story.specification_sha256===canonicalSha(payload)&&source.story_id===story.story_id&&source.story_content_sha256===story.story_content_sha256,'development_case_binding');
    validateRecipeStory(story,source);
    const projection=compileRecipeProjections(story);
    return {case_id:row.case_id,story,source,prompt_sha256:projection.prompt_sha256,criteria_sha256:projection.criteria_sha256};
  });
  const manifest={schema_version:DEVELOPMENT_RUN_SCHEMA,...metadata,production_eligible:false,qualification_eligible:false,cases};
  const state={schema_version:DEVELOPMENT_STATE_SCHEMA,environment:'development',run_id:manifest.run_id,manifest_sha256:canonicalSha(manifest),production_eligible:false,qualification_eligible:false,status:'RUNNING',native_generations:0,cases:cases.map(row=>({case_id:row.case_id,context_id:null,attempts:[],pending_intent:null,accepted_lock:null,blocked_reason:null})),events:[],updated_at:manifest.created_at};
  return {manifest,state,registry:register(input.registry,manifest),budget:imageRunBudget('development'),generation_authorized:false,publication_required:true};
}

// A new preproduction run gets a new request identity and a new empty runtime,
// while retaining the exact six story specifications and source facts. Neither
// previous counters nor accepted locks are rewritten or imported as fresh work.
export function preparePreproductionImageRun(input){
  const metadata=newRun({...input,environment:'preproduction'});
  assertD1Specifications(input.request,input.sourceEvidence);
  const sourceEvidence=structuredClone(input.sourceEvidence);sourceEvidence.execution_id=metadata.run_id;
  const draft=structuredClone(input.request);draft.execution_id=metadata.run_id;draft.request_id=metadata.run_id;
  const request=sealD1Specifications(draft,sourceEvidence),admission=assertD1Specifications(request,sourceEvidence);
  need(same(request.stories,input.request.stories),'preproduction_specifications_changed');
  const manifest={schema_version:'daily-compiler-image-preproduction-run-v1',...metadata,case_count:6,request_sha256:canonicalSha(request),source_evidence_sha256:canonicalSha(sourceEvidence),template_request_sha256:canonicalSha(input.request),template_source_evidence_sha256:canonicalSha(input.sourceEvidence),production_eligible:false,qualification_eligible:true};
  const mapping={schema_version:'daily-compiler-d1-proof-ingest-mapping-v2',repository:'gttome/Daily-AI-Brief-Compiler',branch:'qualification/preproduction-'+metadata.run_id,execution_id:metadata.run_id,edition_date:request.edition_date,items:request.stories.map((story,index)=>{const filename=String(index+1).padStart(2,'0')+'-'+story.story_id+'.png';return {story_id:story.story_id,filename,target_path:metadata.namespace+'/images/'+filename};})};
  return {manifest,request,sourceEvidence,admission,mapping,registry:register(input.registry,manifest),budget:imageRunBudget('preproduction'),generation_authorized:false,publication_required:true};
}

export function initializePreproductionRuntime({prepared,requestCommit,observedAt,existingState,existingAttemptLog}){
  need(existingState===null&&existingAttemptLog===null,'runtime_already_exists_resume_instead');
  const {manifest,request,sourceEvidence,mapping}=prepared;
  need(manifest?.schema_version==='daily-compiler-image-preproduction-run-v1'&&manifest.environment==='preproduction'&&manifest.production_eligible===false&&manifest.qualification_eligible===true&&manifest.namespace===namespace('preproduction',manifest.run_id)&&manifest.policy_sha256===IMAGE_TEST_ENVIRONMENTS_SHA256,'preproduction_manifest');
  need(hex(requestCommit,40)&&instant(observedAt)&&Date.parse(observedAt)>=Date.parse(manifest.created_at),'immutable_request_commit_time');
  need(manifest.request_sha256===canonicalSha(request)&&manifest.source_evidence_sha256===canonicalSha(sourceEvidence)&&request.execution_id===manifest.run_id&&mapping.execution_id===manifest.run_id,'preproduction_request_binding');
  need(mapping.repository==='gttome/Daily-AI-Brief-Compiler'&&mapping.branch==='qualification/preproduction-'+manifest.run_id&&mapping.items?.length===6&&mapping.items.every((item,index)=>item.story_id===request.stories[index].story_id&&item.target_path===manifest.namespace+'/images/'+String(index+1).padStart(2,'0')+'-'+item.story_id+'.png'),'preproduction_target_binding');
  assertD1Specifications(request,sourceEvidence);
  const state=initialD1ProofState({proofId:manifest.run_id,branch:mapping.branch,requestPath:manifest.namespace+'/request.json',ingestMappingPath:manifest.namespace+'/ingest-mapping.json',updatedAt:observedAt});
  const attemptLog={schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:manifest.run_id,native_generations:0,stories:[]};
  state.specification_binding={request_sha256:canonicalSha(request),source_evidence_sha256:canonicalSha(sourceEvidence),source_commit:request.source_commit,request_commit:requestCommit,source_evidence_path:manifest.namespace+'/source-evidence.json',attempt_log_sha256:canonicalSha(attemptLog)};
  return {state,attemptLog,generation_authorized:false,publication_required:true};
}

export function resumePreproductionImageRun({operation,prepared,state,attemptLog,expectedStateSha256,expectedLogSha256}){
  need(operation==='RESUME_EXISTING_RUN','explicit_resume_required');
  const {manifest,request,sourceEvidence}=prepared;
  need(manifest?.environment==='preproduction'&&state.proof_id===manifest.run_id&&state.request_path===manifest.namespace+'/request.json'&&manifest.request_sha256===canonicalSha(request)&&manifest.source_evidence_sha256===canonicalSha(sourceEvidence),'preproduction_resume_binding');
  const inspection=inspectD1RuntimeRecords({state,attemptLog,request,sourceEvidence,expectedStateSha256,expectedLogSha256});
  return {state:structuredClone(state),attemptLog:structuredClone(attemptLog),inspection,budget:imageRunBudget('preproduction'),generation_authorized:false};
}

function validateDevelopmentState(manifest,state){
  need(manifest?.schema_version===DEVELOPMENT_RUN_SCHEMA&&manifest.environment==='development'&&manifest.production_eligible===false&&manifest.qualification_eligible===false&&manifest.policy_sha256===IMAGE_TEST_ENVIRONMENTS_SHA256&&manifest.namespace===namespace('development',manifest.run_id),'development_manifest');
  exact(state,['schema_version','environment','run_id','manifest_sha256','production_eligible','qualification_eligible','status','native_generations','cases','events','updated_at'],'development_state');
  need(state.schema_version===DEVELOPMENT_STATE_SCHEMA&&state.environment==='development'&&state.run_id===manifest.run_id&&state.manifest_sha256===canonicalSha(manifest)&&state.production_eligible===false&&state.qualification_eligible===false&&['RUNNING','COMPLETE'].includes(state.status)&&instant(state.updated_at),'development_state_binding');
  need(Array.isArray(state.cases)&&state.cases.length===manifest.cases.length&&new Set(state.cases.map(row=>row.case_id)).size===state.cases.length&&state.cases.every(row=>manifest.cases.some(item=>item.case_id===row.case_id)),'development_case_set');
  need(integer(state.native_generations)&&Array.isArray(state.events)&&new Set(state.events.map(row=>row.event_id)).size===state.events.length,'development_accounting');
  let total=0;const contexts=[];
  for(const row of state.cases){
    exact(row,['case_id','context_id','attempts','pending_intent','accepted_lock','blocked_reason'],'development_case_state');
    need(row.context_id===null||context(row.context_id),'development_context');if(row.context_id!==null)contexts.push(row.context_id);
    need(Array.isArray(row.attempts)&&(row.blocked_reason===null||row.blocked_reason==='SPECIFICATION_REVIEW_CONFLICT'),'development_attempts');
    for(const [index,attempt] of row.attempts.entries()){
      need(attempt.attempt===index+1&&attempt.native_generation_completed===true&&attempt.context_id===row.context_id&&hex(attempt.raw_identity?.sha256,64)&&['PASS','FAIL',null].includes(attempt.result),'development_attempt_accounting');
      need(index===row.attempts.length-1||attempt.result==='FAIL','development_attempt_sequence');total=addOne(total);
    }
    const last=row.attempts.at(-1);
    if(row.pending_intent)need(row.pending_intent.attempt===row.attempts.length+1&&row.pending_intent.context_id===row.context_id&&(!last||last.result==='FAIL')&&!row.accepted_lock,'development_pending_intent');
    if(row.accepted_lock)need(last?.result==='PASS'&&row.accepted_lock.attempt===last.attempt&&row.accepted_lock.sha256===last.canonical_identity?.sha256&&!row.pending_intent,'development_accepted_lock');
  }
  need(new Set(contexts).size===contexts.length,'development_case_context_reuse');
  need(total===state.native_generations,'development_count_changed');
}

export function inspectDevelopmentImageRun({manifest,state,expectedStateSha256}){
  validateDevelopmentState(manifest,state);
  need(hex(expectedStateSha256,64)&&canonicalSha(state)===expectedStateSha256,'development_state_digest');
  return {environment:'development',run_id:manifest.run_id,native_generations:state.native_generations,case_count:state.cases.length,budget:imageRunBudget('development'),production_eligible:false,qualification_eligible:false,generation_authorized:false,cases:state.cases.map(row=>({case_id:row.case_id,native_generations:row.attempts.length,accepted_locked:row.accepted_lock!==null,next_action:row.accepted_lock?'REUSE_ACCEPTED_LOCKED':row.blocked_reason?'CASE_BLOCKED':row.pending_intent?'RECONCILE_EXISTING_INTENT':row.attempts.at(-1)?.result===null?'RESUME_EXISTING_CANDIDATE':row.attempts.at(-1)?.result==='PASS'?'LOCK_REVIEWED_CANDIDATE':'GENERATE_NEXT_ATTEMPT'}))};
}

export function recordDevelopmentImageEvent({manifest,state,expectedStateSha256,event,rawBytes,canonicalBytes}){
  inspectDevelopmentImageRun({manifest,state,expectedStateSha256});
  exact(event,['event_id','type','case_id','context_id','invocation_id','observed_at','data'],'development_event');
  need(id(event.event_id)&&context(event.context_id)&&context(event.invocation_id)&&instant(event.observed_at),'development_event_identity');
  const digest=canonicalSha({manifest_sha256:canonicalSha(manifest),event,raw_sha256:rawBytes?sha256(rawBytes):null,canonical_sha256:canonicalBytes?sha256(canonicalBytes):null});
  const earlier=state.events.find(row=>row.event_id===event.event_id);
  if(earlier){need(earlier.sha256===digest,'development_event_conflict');return {result:'UNCHANGED',state:structuredClone(state),artifacts:[],generation_authorized:false,production_eligible:false};}
  need(state.status==='RUNNING'&&Date.parse(event.observed_at)>=Date.parse(state.updated_at),'development_run_closed_or_time');
  need((rawBytes===undefined||event.type==='GENERATION_COMPLETED')&&(canonicalBytes===undefined||event.type==='REVIEW_COMPLETED'),'development_unexpected_bytes');
  const next=structuredClone(state),row=next.cases.find(item=>item.case_id===event.case_id),definition=manifest.cases.find(item=>item.case_id===event.case_id);
  need(row&&definition&&!row.accepted_lock&&!row.blocked_reason,'development_case_closed_or_missing');
  need(row.context_id===null||row.context_id===event.context_id,'development_context_changed');
  if(event.type!=='INFRASTRUCTURE_BLOCKED'){
    need(!next.cases.some(item=>item.case_id!==row.case_id&&item.context_id===event.context_id),'development_case_context_reuse');
    row.context_id=event.context_id;
  }
  const last=row.attempts.at(-1),pending=row.pending_intent,data=event.data,artifacts=[];
  const assetPath=(attempt,kind)=>manifest.namespace+'/cases/'+row.case_id+'/attempt-'+attempt+'/'+kind+'.png';
  if(event.type==='GENERATION_INTENT'){
    exact(data,['prompt_text','prompt_sha256'],'development_intent');
    need(!pending&&(!last||last.result==='FAIL'),'development_intent_not_eligible');
    need(Date.parse(definition.story.recipe_profile.semantic_review.reviewed_at)<=Date.parse(event.observed_at),'development_source_review_future');
    const prompt=last?compileRecipeCorrection(definition.story,last.recipe_review).text:compileRecipeProjections(definition.story).prompt;
    need(data.prompt_text===prompt&&data.prompt_sha256===sha256(prompt),'development_prompt_binding');
    row.pending_intent={event_id:event.event_id,attempt:addOne(row.attempts.length),context_id:event.context_id,invocation_id:event.invocation_id,observed_at:event.observed_at,prompt_text:prompt,prompt_sha256:sha256(prompt)};
  }else if(event.type==='GENERATION_COMPLETED'){
    exact(data,['intent_event_id'],'development_generated');
    need(pending&&pending.event_id===data.intent_event_id&&Buffer.isBuffer(rawBytes)&&rawBytes.length>0,'development_pending_generation_required');
    const raw=identity(rawBytes,assetPath(pending.attempt,'raw'));
    row.attempts.push({attempt:pending.attempt,native_generation_completed:true,context_id:event.context_id,invocation_id:event.invocation_id,generated_at:event.observed_at,generation_prompt_text:pending.prompt_text,generation_prompt_sha256:pending.prompt_sha256,raw_identity:raw,result:null});
    next.native_generations=addOne(next.native_generations);row.pending_intent=null;
    artifacts.push({...raw,content_base64:rawBytes.toString('base64')});
  }else if(event.type==='REVIEW_COMPLETED'){
    exact(data,['review_request_text','review_response_text','reviewed_at'],'development_review');
    need(!pending&&last?.result===null&&Buffer.isBuffer(canonicalBytes),'development_pending_review_required');
    need(instant(data.reviewed_at)&&Date.parse(data.reviewed_at)>=Date.parse(last.generated_at)&&Date.parse(data.reviewed_at)<=Date.parse(event.observed_at),'development_review_time');
    validateCanonicalPng(canonicalBytes);
    const canonical=identity(canonicalBytes,assetPath(last.attempt,'canonical')),projection=compileRecipeProjections(definition.story);
    need(data.review_request_text===projection.review_prompt,'development_review_request');
    const review=bindRecipeReview(definition.story,data.review_response_text,{finalSha256:canonical.sha256,contextId:event.context_id,reviewedAt:data.reviewed_at});
    const result=validateRecipeReview(definition.story,review,{finalSha256:canonical.sha256,contextId:event.context_id});
    if(result==='PASS'){
      // Preserve the existing distinct-detail gate without pretending that a
      // fifth development attempt is an in-range production v3 attempt.
      const components=definition.story.generation.meaningful_components_plan.map(component=>{
        const item=review.criteria.find(criterion=>criterion.id==='component.'+component.component_id);
        return (item.location+': '+item.observation).normalize('NFKC').toLowerCase().trim();
      });
      need(components.length>=12&&new Set(components).size===components.length,'development_distinct_component_quality');
    }
    Object.assign(last,{canonical_identity:canonical,recipe_review:review,review_request_text:data.review_request_text,review_response_text:data.review_response_text,reviewed_at:data.reviewed_at,result});
    if(review.specification_conflict)row.blocked_reason='SPECIFICATION_REVIEW_CONFLICT';
    artifacts.push({...canonical,content_base64:canonicalBytes.toString('base64')});
  }else if(event.type==='ACCEPT_LOCK'){
    exact(data,['commit','path','sha256','git_blob_sha','bytes','readback_sha256','readback_git_blob_sha'],'development_lock');
    need(!pending&&last?.result==='PASS'&&hex(data.commit,40),'development_lock_requires_review');
    const canonical=last.canonical_identity;
    need(['path','sha256','git_blob_sha','bytes'].every(key=>data[key]===canonical[key])&&data.readback_sha256===canonical.sha256&&data.readback_git_blob_sha===canonical.git_blob_sha,'development_lock_readback_binding');
    row.accepted_lock={...data,attempt:last.attempt,locked_at:event.observed_at,environment:'development',production_eligible:false,qualification_eligible:false};
  }else if(event.type==='INFRASTRUCTURE_BLOCKED'){
    exact(data,['reason','external_outcome'],'development_infrastructure');
    need(typeof data.reason==='string'&&data.reason.trim().length>=12&&['NOT_INVOKED','UNKNOWN'].includes(data.external_outcome),'development_infrastructure_observation');
    need(!pending||data.external_outcome==='UNKNOWN','development_unknown_intent_must_be_reconciled');
    // The event retains the blocker. A possible external generation stays
    // pending and is never treated as zero-cost permission to regenerate.
  }else throw new Error('image_test_run:development_event_type');
  next.events.push({event_id:event.event_id,sha256:digest,event:structuredClone(event)});next.updated_at=event.observed_at;
  if(next.cases.every(item=>item.accepted_lock!==null))next.status='COMPLETE';
  validateDevelopmentState(manifest,next);
  return {result:'DEVELOPMENT_OBSERVATION_RECORDED_NOT_PUBLISHED',state:next,artifacts,event_sha256:digest,production_eligible:false,qualification_eligible:false,generation_authorized:false};
}

export function resumeDevelopmentImageRun({operation,manifest,state,expectedStateSha256}){
  need(operation==='RESUME_EXISTING_RUN','explicit_resume_required');
  const inspection=inspectDevelopmentImageRun({manifest,state,expectedStateSha256});
  return {state:structuredClone(state),inspection,generation_authorized:false,production_eligible:false};
}
