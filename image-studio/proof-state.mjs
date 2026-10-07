export const D1_PROOF_STATE_SCHEMA='daily-compiler-d1-cloud-proof-execution-v1';
export const D1_PROOF_STATES=Object.freeze(['PLANNED','STUDIO_REQUESTED','STUDIO_RUNNING','PACKAGE_ACCEPTED','WORK_INGEST','GITHUB_VERIFIED','COMPLETE','BLOCKED']);

export function validateD1ProofState(state={}){
  const errors=[];
  if(state.schema_version!==D1_PROOF_STATE_SCHEMA) errors.push('d1_proof_state_schema');
  if(!state.proof_id||!state.branch||!D1_PROOF_STATES.includes(state.status)) errors.push('d1_proof_state_identity');
  if(!state.studio_request_path||!state.ingest_mapping_path) errors.push('d1_proof_state_paths');
  if(!Number.isInteger(state.native_generations)||state.native_generations<0) errors.push('d1_proof_state_generations');
  if(!Array.isArray(state.accepted_assets)||state.accepted_assets.length>6||new Set(state.accepted_assets).size!==state.accepted_assets.length) errors.push('d1_proof_state_assets');
  if(state.owner_intervention!==false||state.local_computer_used!==false) errors.push('d1_proof_state_cloud_boundary');
  if(['PACKAGE_ACCEPTED','WORK_INGEST','GITHUB_VERIFIED','COMPLETE'].includes(state.status)){
    if(!state.acceptance_manifest_path||state.accepted_assets.length!==6) errors.push('d1_proof_state_package_required');
  }
  if(['WORK_INGEST','GITHUB_VERIFIED','COMPLETE'].includes(state.status)&&!state.ingest_handoff_path) errors.push('d1_proof_state_handoff_required');
  if(['GITHUB_VERIFIED','COMPLETE'].includes(state.status)&&!state.work_porter_receipt_path) errors.push('d1_proof_state_porter_required');
  if(state.status==='COMPLETE'&&!state.cloud_proof_path) errors.push('d1_proof_state_cloud_proof_required');
  return [...new Set(errors)];
}

export function nextD1ProofAction(state={}){
  const errors=validateD1ProofState(state);
  if(errors.length) throw new Error(errors.join(';'));
  switch(state.status){
    case 'PLANNED': return {action:'LAUNCH_FRESH_IMAGE_STUDIO'};
    case 'STUDIO_REQUESTED':
    case 'STUDIO_RUNNING': return {action:'WAIT_FOR_STUDIO_RESULT'};
    case 'PACKAGE_ACCEPTED': return {action:'BUILD_INGEST_HANDOFF'};
    case 'WORK_INGEST': return {action:'RESUME_WORK_PORTER'};
    case 'GITHUB_VERIFIED': return {action:'BUILD_CLOUD_PROOF'};
    case 'COMPLETE': return {action:'EXIT_COMPLETE'};
    case 'BLOCKED': return {action:'EXIT_BLOCKED'};
    default: throw new Error('d1_proof_state_unknown');
  }
}

export function initialD1ProofState({proofId,branch,studioRequestPath,ingestMappingPath,updatedAt=new Date().toISOString()}={}){
  const state={
    schema_version:D1_PROOF_STATE_SCHEMA,
    proof_id:proofId,branch,status:'PLANNED',
    studio_request_path:studioRequestPath,
    acceptance_manifest_path:null,
    ingest_mapping_path:ingestMappingPath,
    ingest_handoff_path:null,
    work_porter_receipt_path:null,
    cloud_proof_path:null,
    native_generations:0,
    accepted_assets:[],
    owner_intervention:false,
    local_computer_used:false,
    last_error:null,
    updated_at:updatedAt
  };
  const errors=validateD1ProofState(state);
  if(errors.length) throw new Error(errors.join(';'));
  return state;
}
