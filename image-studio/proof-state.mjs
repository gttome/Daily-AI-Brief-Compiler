import {admitD1Specifications} from './spec-admission.mjs';
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {nextD0ImageOperation} from '../image-capsules/state.mjs';

export const D1_PROOF_STATE_SCHEMA='daily-compiler-d1-cloud-proof-execution-v2';
export const D1_PROOF_STATES=Object.freeze(['PLANNED','BROWSER_RUNNING','PACKAGE_ACCEPTED','GIT_INGEST','GITHUB_VERIFIED','COMPLETE','BLOCKED']);

export function validateD1ProofState(state={}){
  const errors=[];
  if(state.schema_version!==D1_PROOF_STATE_SCHEMA) errors.push('d1_proof_state_schema');
  if(!state.proof_id||!state.branch||!D1_PROOF_STATES.includes(state.status)) errors.push('d1_proof_state_identity');
  if(!state.request_path||!state.ingest_mapping_path) errors.push('d1_proof_state_paths');
  if(!Number.isInteger(state.native_generations)||state.native_generations<0) errors.push('d1_proof_state_generations');
  if(!Array.isArray(state.accepted_assets)||state.accepted_assets.length>6||new Set(state.accepted_assets).size!==state.accepted_assets.length) errors.push('d1_proof_state_assets');
  if(!Array.isArray(state.accepted_story_chats)||state.accepted_story_chats.length>6||new Set(state.accepted_story_chats).size!==state.accepted_story_chats.length) errors.push('d1_proof_state_chats');
  if(state.owner_intervention!==false||state.local_computer_used!==false) errors.push('d1_proof_state_cloud_boundary');
  if(['PACKAGE_ACCEPTED','GIT_INGEST','GITHUB_VERIFIED','COMPLETE'].includes(state.status)){
    if(!state.acceptance_manifest_path||state.accepted_assets.length!==6||state.accepted_story_chats.length!==6) errors.push('d1_proof_state_package_required');
  }
  if(['GIT_INGEST','GITHUB_VERIFIED','COMPLETE'].includes(state.status)&&!state.ingest_handoff_path) errors.push('d1_proof_state_handoff_required');
  if(['GITHUB_VERIFIED','COMPLETE'].includes(state.status)&&!state.work_porter_receipt_path) errors.push('d1_proof_state_porter_required');
  if(state.status==='COMPLETE'&&!state.cloud_proof_path) errors.push('d1_proof_state_cloud_proof_required');
  return [...new Set(errors)];
}
// Read-only adapter for the existing flat (R3) and grouped (R1/R2) attempt logs.
// The original records remain intact. Context IDs are deliberately not copied:
// D1 retries within one story chat, unlike D0's per-attempt capsule policy.
function nextRecordedStoryOperation(state,request,attemptLog){
  if(!attemptLog || attemptLog.proof_id!==state.proof_id || canonicalSha(attemptLog)!==state.specification_binding.attempt_log_sha256) throw new Error('attempt_log_binding');
  if(state.status==='PLANNED'&&(state.native_generations!==0||state.accepted_assets.length!==0||state.accepted_story_chats.length!==0)) throw new Error('planned_state_contains_existing_generation');
  const rows=Array.isArray(attemptLog.stories)?attemptLog.stories:attemptLog.story_id?[attemptLog]:null;
  if(!rows || rows.length>6 || new Set(rows.map(row=>row?.story_id)).size!==rows.length) throw new Error('attempt_log_stories');
  const ids=new Set(request.stories.map(story=>story.story_id)),operations=new Map();
  let generations=0;
  const acceptedAssets=[];
  for(const row of rows){
    if(!ids.has(row?.story_id)||!Array.isArray(row?.attempts)) throw new Error('attempt_log_story_binding');
    const attempts=[];
    for(const item of row.attempts){
      if(item?.native_generation_completed===false && item?.quality_attempt_consumed===false){
        if(item.status!=='BLOCKED_INFRASTRUCTURE'||item.result!==undefined||item.review!==undefined) throw new Error('contradictory_infrastructure_evidence');
        continue;
      }
      const review=item?.result??item?.review;
      if(item?.native_generation_completed!==true && !['PASS','FAIL'].includes(review)) throw new Error('attempt_generation_evidence_missing');
      generations++;
      if(item.attempt!==attempts.length+1||item.attempt>4) throw new Error('attempt_number_or_limit');
      let status=review==='FAIL'?'REJECTED_QUALITY':'CAPSULE_ADMITTED';
      if(review==='PASS') status='REVIEW_PASS_PENDING_SET';
      if(row.accepted_locked===true && item.attempt===row.accepted_attempt){
        if(review!=='PASS'||!Array.isArray(row.accepted_assets)||row.accepted_assets.length!==1||!state.accepted_assets.includes(row.accepted_assets[0])) throw new Error('accepted_lock_binding');
        status='ACCEPTED_LOCKED';acceptedAssets.push(row.accepted_assets[0]);
      }
      attempts.push({attempt:item.attempt,state:status,quality_attempt_consumed:true});
    }
    if(row.accepted_locked===true && !attempts.some(item=>item.state==='ACCEPTED_LOCKED')) throw new Error('accepted_attempt_missing');
    if(row.accepted_locked===true && row.accepted_attempt!==attempts.length) throw new Error('generation_after_accepted_lock');
    operations.set(row.story_id,nextD0ImageOperation(attempts));
  }
  if(generations!==state.native_generations || (attemptLog.native_generations!==undefined&&attemptLog.native_generations!==generations)) throw new Error('generation_count_changed_or_missing');
  if(new Set(acceptedAssets).size!==state.accepted_assets.length||state.accepted_assets.some(asset=>!acceptedAssets.includes(asset))) throw new Error('accepted_assets_removed_or_unbound');
  let unfinished=false;
  for(const story of request.stories){
    const row=rows.find(item=>item.story_id===story.story_id);
    const generated=listGenerated(row);
    if(unfinished&&generated) throw new Error('non_prefix_story_history');
    if(operations.get(story.story_id)?.action!=='REUSE_ACCEPTED_LOCKED') unfinished=true;
  }
  for(const story of request.stories){
    const operation=operations.get(story.story_id)??{action:'ALLOCATE_FRESH_CAPSULE',attempt:1};
    if(operation.action==='REUSE_ACCEPTED_LOCKED') continue;
    return {story_id:story.story_id,...operation};
  }
  return {action:'REUSE_ACCEPTED_LOCKED'};
}

function listGenerated(row){
  return Array.isArray(row?.attempts)&&row.attempts.some(item=>item?.native_generation_completed===true||['PASS','FAIL'].includes(item?.result??item?.review));
}

export function nextD1ProofAction(state={}, {request,sourceEvidence,requestSource,attemptLog}={}){
  const errors=validateD1ProofState(state); if(errors.length) throw new Error(errors.join(';'));
  if(['PLANNED','BROWSER_RUNNING'].includes(state.status)){
    const admission=admitD1Specifications(request,sourceEvidence);
    if(admission.result!=='PASS') return {action:'BLOCK_SPEC_ADMISSION',errors:admission.errors,quality_attempts_consumed:0,story_chats_opened:0};
    const binding=state.specification_binding;
    if(!binding||binding.request_sha256!==admission.request_sha256||binding.source_evidence_sha256!==admission.source_evidence_sha256||binding.source_commit!==request.source_commit||request.execution_id!==state.proof_id||
      !hex(binding.request_commit,40)||!hex(binding.attempt_log_sha256,64)||!binding.source_evidence_path||
      requestSource?.branch!==state.branch||requestSource?.request_path!==state.request_path||requestSource?.commit!==binding.request_commit||requestSource?.source_evidence_path!==binding.source_evidence_path){
      return {action:'BLOCK_REQUEST_BINDING',quality_attempts_consumed:0,story_chats_opened:0};
    }
    try{
      const operation=nextRecordedStoryOperation(state,request,attemptLog);
      if(['FAIL_ATTEMPT_LIMIT','RESUME_EXISTING_CANDIDATE','REUSE_ACCEPTED_LOCKED'].includes(operation.action)) return operation;
    }catch(error){return {action:'BLOCK_ATTEMPT_LINEAGE',errors:[error.message],quality_attempts_consumed:0,story_chats_opened:0};}
  }
  switch(state.status){
    case 'PLANNED': return {action:'START_WORK_BROWSER_STORY_1'};
    case 'BROWSER_RUNNING': return {action:'RESUME_FIRST_UNACCEPTED_STORY'};
    case 'PACKAGE_ACCEPTED': return {action:'BUILD_INGEST_HANDOFF'};
    case 'GIT_INGEST': return {action:'RESUME_EXACT_BYTE_INGEST'};
    case 'GITHUB_VERIFIED': return {action:'BUILD_CLOUD_PROOF'};
    case 'COMPLETE': return {action:'EXIT_COMPLETE'};
    case 'BLOCKED': return {action:'EXIT_BLOCKED'};
    default: throw new Error('d1_proof_state_unknown');
  }
}
export function initialD1ProofState({proofId,branch,requestPath,ingestMappingPath,updatedAt=new Date().toISOString()}={}){
  const state={schema_version:D1_PROOF_STATE_SCHEMA,proof_id:proofId,branch,status:'PLANNED',request_path:requestPath,
    acceptance_manifest_path:null,ingest_mapping_path:ingestMappingPath,ingest_handoff_path:null,work_porter_receipt_path:null,
    cloud_proof_path:null,native_generations:0,accepted_assets:[],accepted_story_chats:[],owner_intervention:false,
    local_computer_used:false,last_error:null,updated_at:updatedAt};
  const errors=validateD1ProofState(state); if(errors.length) throw new Error(errors.join(';')); return state;
}

