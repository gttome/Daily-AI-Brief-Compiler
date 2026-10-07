import {hex,nonempty} from './util.mjs';

export const D0_CAPABILITY_PROOF_V2='daily-compiler-d0-capability-proof-v2';
export const D0_STANDALONE_TASK_CONTRACT='https://learn.chatgpt.com/docs/automations';
export const D0_PROVEN_BYTE_BRIDGE='connected_google_drive_ephemeral_file_shuttle';

export const D0_RETRYABLE_CAPABILITY_BLOCKERS_V2=new Set([
  'NATIVE_IMAGE_GENERATION_TEMPORARILY_UNAVAILABLE',
  'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE',
  'STANDALONE_SCHEDULED_RUN_TEMPORARILY_UNAVAILABLE',
  'SCHEDULED_IMAGE_TOOL_TEMPORARILY_UNAVAILABLE',
  'RUNTIME_GENERATED_FILE_HANDOFF_TEMPORARILY_UNAVAILABLE',
  'DRIVE_EPHEMERAL_BRIDGE_TEMPORARILY_UNAVAILABLE',
  'GIT_PERSISTENCE_TEMPORARILY_UNAVAILABLE'
]);

const COST_KEYS=['work_used','codex_used','paid_model_api_used','paid_image_service_used','billable_overage_used','new_paid_infrastructure_used','alternate_account_used','owner_image_transfer_used','owner_liveness_used'];
const allFalse=(x,keys)=>keys.every(k=>x?.[k]===false);

function validRun(r){
  return nonempty(r?.run_id)&&nonempty(r?.story_id)&&hex(r?.packet_sha256,64)&&
    r?.session_boundary?.method==='standalone_scheduled_task_new_chat'&&
    nonempty(r.session_boundary.task_title)&&nonempty(r.session_boundary.run_nonce)&&
    r.session_boundary.product_contract_ref===D0_STANDALONE_TASK_CONTRACT&&
    r.session_boundary.new_chat_per_run===true&&r.session_boundary.prior_chat_context_available===false&&
    r.session_boundary.prior_images_available===false&&
    nonempty(r?.generator_submission?.prompt_path)&&hex(r.generator_submission.prompt_sha256,64)&&
    r.generator_submission.explicit_exact_prompt===true&&
    r.generator_submission.outer_canary_present_in_task_context===true&&
    r.generator_submission.outer_canary_present_in_generator_prompt===false&&
    r?.native_generation?.executor==='chatgpt_native_images'&&
    r.native_generation.included_subscription===true&&r.native_generation.generated===true&&
    nonempty(r.native_generation.generated_file_id)&&
    nonempty(r?.canary?.outer_probe_id)&&r.canary.outer_probe_leakage_detected===false&&
    r.canary.unrelated_context_leakage_detected===false&&r.canary.story_subject_correct===true&&
    r?.same_run_handoff?.bridge_kind===D0_PROVEN_BYTE_BRIDGE&&nonempty(r.same_run_handoff.ephemeral_file_id)&&
    r.same_run_handoff.raw_fetched_before_run_end===true&&r.same_run_handoff.git_persisted_before_run_end===true&&
    r.same_run_handoff.ephemeral_file_deleted===true&&
    Number.isInteger(r?.raw_identity?.bytes)&&r.raw_identity.bytes>0&&hex(r.raw_identity.sha256,64)&&
    hex(r.raw_identity.git_blob_sha,40)&&nonempty(r.raw_identity.persisted_path)&&
    hex(r.raw_identity.persisted_commit_sha,40)&&r.raw_identity.read_back_verified===true;
}

function repeatability(runs){
  const titles=new Set(runs.map(r=>r?.session_boundary?.task_title).filter(Boolean));
  const nonces=new Set(runs.map(r=>r?.session_boundary?.run_nonce).filter(Boolean));
  const packets=new Set(runs.map(r=>r?.packet_sha256).filter(Boolean));
  const raws=new Set(runs.map(r=>r?.raw_identity?.sha256).filter(Boolean));
  return {
    distinct_task_titles:runs.length>=2&&titles.size===runs.length,
    distinct_run_nonces:runs.length>=2&&nonces.size===runs.length,
    distinct_story_packets:runs.length>=2&&packets.size===runs.length,
    distinct_raw_byte_streams:runs.length>=2&&raws.size===runs.length
  };
}

export function deriveD0CapabilityStatusV2({cost_boundary,runs=[],blocker_code=null}={}){
  if(!allFalse(cost_boundary,COST_KEYS)) return {status:'FAIL',reason:'zero_cost_boundary_violated'};
  if(blocker_code){
    if(D0_RETRYABLE_CAPABILITY_BLOCKERS_V2.has(blocker_code)) return {status:'BLOCKED_RETRYABLE',reason:blocker_code};
    return {status:'FAIL',reason:blocker_code};
  }
  if(!Array.isArray(runs)||runs.length<2||runs.some(r=>!validRun(r))) return {status:'FAIL',reason:'preproof_evidence_incomplete_or_invalid'};
  const rep=repeatability(runs);
  if(Object.values(rep).some(v=>v!==true)) return {status:'FAIL',reason:'preproof_repeatability_failed'};
  return {status:'PASS',reason:null};
}

export function buildD0CapabilityProofV2({proof_id,cost_boundary,runs=[],blocker_code=null}){
  if(!nonempty(proof_id)) throw new Error('proof_id_required');
  const derived=deriveD0CapabilityStatusV2({cost_boundary,runs,blocker_code});
  const rep=repeatability(runs);
  const pass=derived.status==='PASS';
  return {
    schema_version:D0_CAPABILITY_PROOF_V2,proof_id,status:derived.status,blocker_code:blocker_code??null,
    cost_boundary:structuredClone(cost_boundary),runs:structuredClone(runs),
    repeatability:{...rep,minimum_successful_runs:pass?runs.length:0},
    formal_authorization:{p0_a_authorized:pass,p0_b_authorized:pass,may_reuse_preproof_evidence_without_regeneration:true}
  };
}

export function validateD0CapabilityProofV2(receipt){
  const errors=[];
  if(receipt?.schema_version!==D0_CAPABILITY_PROOF_V2) errors.push('capability_proof_schema');
  const runs=Array.isArray(receipt?.runs)?receipt.runs:[];
  const derived=deriveD0CapabilityStatusV2({cost_boundary:receipt?.cost_boundary,runs,blocker_code:receipt?.blocker_code??null});
  if(receipt?.status!==derived.status) errors.push('capability_status_mismatch');
  if(!allFalse(receipt?.cost_boundary,COST_KEYS)) errors.push('zero_cost_boundary_violated');
  const rep=repeatability(runs);
  for(const [k,v] of Object.entries(rep)) if(receipt?.repeatability?.[k]!==v) errors.push('repeatability_'+k+'_mismatch');
  const pass=derived.status==='PASS';
  if(pass&&receipt?.repeatability?.minimum_successful_runs<2) errors.push('repeatability_minimum');
  if(receipt?.formal_authorization?.p0_a_authorized!==pass||receipt?.formal_authorization?.p0_b_authorized!==pass) errors.push('formal_authorization_mismatch');
  if(receipt?.formal_authorization?.may_reuse_preproof_evidence_without_regeneration!==true) errors.push('preproof_evidence_reuse_required');
  return [...new Set(errors)];
}
