import {hex,nonempty} from './util.mjs';

export const D0_CAPABILITY_PROOF_SCHEMA='daily-compiler-d0-capability-proof-v1';

export const RETRYABLE_CAPABILITY_BLOCKERS=new Set([
  'NATIVE_IMAGE_GENERATION_TEMPORARILY_UNAVAILABLE',
  'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE',
  'STANDALONE_SCHEDULED_RUN_TEMPORARILY_UNAVAILABLE',
  'PLUGIN_FILE_HANDOFF_TEMPORARILY_UNAVAILABLE',
  'PLUGIN_DOWNLOAD_URL_TEMPORARILY_UNAVAILABLE',
  'GIT_PERSISTENCE_TEMPORARILY_UNAVAILABLE'
]);

const COST_KEYS=[
  'work_used','codex_used','paid_model_api_used','paid_image_service_used',
  'billable_overage_used','new_paid_infrastructure_used','alternate_account_used',
  'owner_image_transfer_used','owner_liveness_used'
];

function allFalse(obj,keys){return keys.every(k=>obj?.[k]===false);}
function cleanRun(run){
  return nonempty(run?.run_id)&&nonempty(run?.story_id)&&hex(run?.packet_sha256,64)&&
    run?.session_boundary?.kind==='standalone_scheduled_task'&&
    run.session_boundary.new_chat_per_run===true&&
    nonempty(run.session_boundary.plugin_session_id)&&
    run.session_boundary.prior_chat_context_available===false&&
    run.session_boundary.prior_images_available===false&&
    run?.native_generation?.executor==='chatgpt_native_images'&&
    run.native_generation.included_subscription===true&&run.native_generation.generated===true&&
    nonempty(run?.canary?.outer_probe_id)&&
    run.canary.outer_probe_visible_to_generator===false&&
    run.canary.other_story_material_visible===false&&
    run.canary.prior_image_material_visible===false&&
    run.canary.output_contamination_detected===false&&
    nonempty(run?.same_run_handoff?.generated_file_id)&&
    run.same_run_handoff.download_url_obtained_before_capsule_end===true&&
    run.same_run_handoff.persistence_tool_called_in_same_session===true&&
    run.same_run_handoff.persistence_tool_session_id===run.session_boundary.plugin_session_id&&
    Number.isInteger(run?.raw_identity?.bytes)&&run.raw_identity.bytes>0&&
    hex(run.raw_identity.sha256,64)&&hex(run.raw_identity.git_blob_sha,40)&&
    nonempty(run.raw_identity.persisted_path)&&hex(run.raw_identity.persisted_commit_sha,40)&&
    run.raw_identity.read_back_verified===true;
}

export function deriveD0CapabilityStatus({cost_boundary,runs=[],blocker_code=null}={}){
  if(!allFalse(cost_boundary,COST_KEYS)) return {status:'FAIL',reason:'zero_cost_boundary_violated'};
  if(blocker_code){
    if(RETRYABLE_CAPABILITY_BLOCKERS.has(blocker_code)) return {status:'BLOCKED_RETRYABLE',reason:blocker_code};
    return {status:'FAIL',reason:blocker_code};
  }
  if(!Array.isArray(runs)||runs.length<2||runs.some(r=>!cleanRun(r))) return {status:'FAIL',reason:'preproof_evidence_incomplete_or_invalid'};
  const sessions=new Set(runs.map(r=>r.session_boundary.plugin_session_id));
  const packets=new Set(runs.map(r=>r.packet_sha256));
  const raws=new Set(runs.map(r=>r.raw_identity.sha256));
  if(sessions.size!==runs.length) return {status:'FAIL',reason:'session_identity_reused'};
  if(packets.size<2) return {status:'FAIL',reason:'materially_distinct_story_packets_required'};
  if(raws.size!==runs.length) return {status:'FAIL',reason:'distinct_raw_byte_streams_required'};
  return {status:'PASS',reason:null};
}

export function buildD0CapabilityProof({proof_id,cost_boundary,runs=[],blocker_code=null}){
  if(!nonempty(proof_id)) throw new Error('proof_id_required');
  const derived=deriveD0CapabilityStatus({cost_boundary,runs,blocker_code});
  const sessions=new Set(runs.map(r=>r?.session_boundary?.plugin_session_id).filter(Boolean));
  const packets=new Set(runs.map(r=>r?.packet_sha256).filter(Boolean));
  const raws=new Set(runs.map(r=>r?.raw_identity?.sha256).filter(Boolean));
  const pass=derived.status==='PASS';
  return {
    schema_version:D0_CAPABILITY_PROOF_SCHEMA,
    proof_id,
    status:derived.status,
    blocker_code:blocker_code??null,
    cost_boundary:structuredClone(cost_boundary),
    runs:structuredClone(runs),
    repeatability:{
      distinct_session_ids:runs.length>=2&&sessions.size===runs.length,
      distinct_story_packets:runs.length>=2&&packets.size>=2,
      distinct_raw_byte_streams:runs.length>=2&&raws.size===runs.length,
      minimum_successful_runs:pass?runs.length:0
    },
    formal_authorization:{
      p0_a_authorized:pass,
      p0_b_authorized:pass,
      may_reuse_preproof_evidence_without_regeneration:true
    }
  };
}

export function validateD0CapabilityProof(receipt){
  const errors=[];
  if(receipt?.schema_version!==D0_CAPABILITY_PROOF_SCHEMA) errors.push('capability_proof_schema');
  const derived=deriveD0CapabilityStatus({
    cost_boundary:receipt?.cost_boundary,
    runs:receipt?.runs,
    blocker_code:receipt?.blocker_code??null
  });
  if(receipt?.status!==derived.status) errors.push('capability_status_mismatch');
  if(!allFalse(receipt?.cost_boundary,COST_KEYS)) errors.push('zero_cost_boundary_violated');
  const runs=Array.isArray(receipt?.runs)?receipt.runs:[];
  const sessions=new Set(runs.map(r=>r?.session_boundary?.plugin_session_id).filter(Boolean));
  const packets=new Set(runs.map(r=>r?.packet_sha256).filter(Boolean));
  const raws=new Set(runs.map(r=>r?.raw_identity?.sha256).filter(Boolean));
  const pass=derived.status==='PASS';
  if(receipt?.repeatability?.distinct_session_ids!==(runs.length>=2&&sessions.size===runs.length)) errors.push('repeatability_session_mismatch');
  if(receipt?.repeatability?.distinct_story_packets!==(runs.length>=2&&packets.size>=2)) errors.push('repeatability_packet_mismatch');
  if(receipt?.repeatability?.distinct_raw_byte_streams!==(runs.length>=2&&raws.size===runs.length)) errors.push('repeatability_raw_mismatch');
  if(pass&&receipt?.repeatability?.minimum_successful_runs<2) errors.push('repeatability_minimum');
  if(receipt?.formal_authorization?.p0_a_authorized!==pass||receipt?.formal_authorization?.p0_b_authorized!==pass) errors.push('formal_authorization_mismatch');
  if(receipt?.formal_authorization?.may_reuse_preproof_evidence_without_regeneration!==true) errors.push('preproof_evidence_reuse_required');
  return [...new Set(errors)];
}

export function assertD0CapabilityProof(receipt){
  const errors=validateD0CapabilityProof(receipt);
  if(errors.length) throw new Error(errors.join(';'));
  if(receipt.status!=='PASS') throw new Error('d0_capability_proof_not_pass');
  return true;
}
