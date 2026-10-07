import {gitBlobSha,sha256,hex,nonempty} from './util.mjs';

export const RAW_RECEIPT_SCHEMA='daily-compiler-image-raw-receipt-v1';
export const DIRECT_PERSISTENCE_MODE='git_data_direct_blob';

const safeStory=v=>typeof v==='string'&&/^[A-Za-z0-9._-]+$/.test(v);
export function rawAttemptPath({editionDate,storyId,attempt,root='shadow-runs'}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(editionDate||'')||!safeStory(storyId)||!Number.isInteger(attempt)||attempt<1||attempt>4) throw new Error('invalid_attempt_identity');
  if(!['shadow-runs','rehearsals'].includes(root)) throw new Error('invalid_attempt_root');
  const prefix=root+'/'+editionDate;
  return prefix+'/images/attempts/'+storyId+'/a'+String(attempt).padStart(2,'0')+'/raw.png';
}
export function isImmutableRawPath(p){
  return typeof p==='string'&&(
    /^shadow-runs\/\d{4}-\d{2}-\d{2}\/images\/attempts\/[A-Za-z0-9._-]+\/a0[1-4]\/raw\.png$/.test(p)||
    /^rehearsals\/[A-Za-z0-9._-]+\/images\/attempts\/[A-Za-z0-9._-]+\/a0[1-4]\/raw\.png$/.test(p)||
    /^proof\/d0-native-image-capsules\/[A-Za-z0-9._/-]+\/raw\.png$/.test(p)
  );
}
function unwrap(value){
  const v=value?.result??value;
  if(v?.content&&typeof v.content==='string'){
    try{return JSON.parse(v.content);}catch{}
  }
  return v;
}
async function fetchJson(api,url){
  const r=unwrap(await api.fetch({url}));
  if(!r||r.error||r.is_error) throw new Error('git_fetch_failed');
  return r;
}
function repoApiUrl(repository,suffix){return 'https://api.github.com/repos/'+repository+'/'+suffix;}
function validBranch(branch){return /^(shadow|rehearsal|proof)\/[A-Za-z0-9._/-]+$/.test(branch||'');}

export function buildRawReceipt({editionDate=null,storyId,candidateId,attempt,path,bytes,persistenceMode=DIRECT_PERSISTENCE_MODE,commitSha=null,persistedAt=new Date().toISOString(),invocationId,contextId,readBackVerified=false}){
  if(!Buffer.isBuffer(bytes)||bytes.length===0) throw new Error('raw_bytes_required');
  if(!isImmutableRawPath(path)) throw new Error('immutable_raw_path_required');
  if(!safeStory(storyId)||!nonempty(candidateId)||!Number.isInteger(attempt)||attempt<1||attempt>4) throw new Error('raw_identity_invalid');
  if(!nonempty(invocationId)||!nonempty(contextId)) throw new Error('capsule_identity_required');
  return {
    schema_version:RAW_RECEIPT_SCHEMA,edition_date:editionDate,story_id:storyId,candidate_id:candidateId,attempt,
    path,bytes:bytes.length,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes),persistence_mode:persistenceMode,
    commit_sha:commitSha,persisted_at:persistedAt,same_invocation_capture:true,
    capsule_invocation_id:invocationId,capsule_context_id:contextId,read_back_verified:readBackVerified,
    owner_intervention:false,model_calls_during_persistence:0
  };
}

export function validateRawReceipt(receipt,{bytes=null}={}){
  const errors=[];
  if(receipt?.schema_version!==RAW_RECEIPT_SCHEMA) errors.push('raw_receipt_schema');
  if(!safeStory(receipt?.story_id)||!nonempty(receipt?.candidate_id)) errors.push('raw_identity');
  if(!Number.isInteger(receipt?.attempt)||receipt.attempt<1||receipt.attempt>4) errors.push('raw_attempt');
  if(!isImmutableRawPath(receipt?.path)) errors.push('raw_path');
  if(!Number.isInteger(receipt?.bytes)||receipt.bytes<1||!hex(receipt?.sha256,64)||!hex(receipt?.git_blob_sha,40)) errors.push('raw_content_identity');
  if(receipt?.same_invocation_capture!==true||!nonempty(receipt?.capsule_invocation_id)||!nonempty(receipt?.capsule_context_id)) errors.push('same_invocation_capture_evidence');
  if(receipt?.owner_intervention!==false||receipt?.model_calls_during_persistence!==0) errors.push('persistence_control_boundary');
  if(bytes){
    if(!Buffer.isBuffer(bytes)||bytes.length!==receipt.bytes||sha256(bytes)!==receipt.sha256||gitBlobSha(bytes)!==receipt.git_blob_sha) errors.push('raw_bytes_mismatch');
  }
  return [...new Set(errors)];
}

export async function persistRawBytesDirect({api,repository,branch,path,bytes,identity}){
  if(!api||['fetch','create_blob','create_tree','create_commit','update_ref'].some(k=>typeof api[k]!=='function')) throw new Error('complete_git_data_adapter_required');
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository||'')||!validBranch(branch)||!isImmutableRawPath(path)||!Buffer.isBuffer(bytes)||!bytes.length) throw new Error('direct_persistence_input_invalid');
  const expectedBlob=gitBlobSha(bytes);
  const ref=await fetchJson(api,repoApiUrl(repository,'git/ref/heads/'+branch));
  const parent=ref?.object?.sha;
  if(!hex(parent,40)) throw new Error('branch_head_invalid');
  const commit=await fetchJson(api,repoApiUrl(repository,'git/commits/'+parent));
  const baseTree=commit?.tree?.sha;
  if(!hex(baseTree,40)) throw new Error('branch_tree_invalid');

  let existing=null;
  try{existing=await fetchJson(api,repoApiUrl(repository,'contents/'+path+'?ref='+encodeURIComponent(parent)));}catch{}
  if(existing?.sha&&existing.sha!==expectedBlob) throw new Error('immutable_raw_path_conflict');
  let commitSha=parent,reused=Boolean(existing?.sha);
  if(!reused){
    const blob=unwrap(await api.create_blob({repository_full_name:repository,content:bytes.toString('base64'),encoding:'base64'}));
    if(blob?.sha!==expectedBlob) throw new Error('direct_blob_identity_mismatch');
    const tree=unwrap(await api.create_tree({repository_full_name:repository,base_tree_sha:baseTree,tree_elements:[{path,mode:'100644',type:'blob',sha:expectedBlob}]}));
    if(!hex(tree?.sha,40)) throw new Error('created_tree_invalid');
    const created=unwrap(await api.create_commit({repository_full_name:repository,message:'Persist D0 native raw image',tree_sha:tree.sha,parent_sha:parent}));
    if(!hex(created?.sha,40)) throw new Error('created_commit_invalid');
    const updated=unwrap(await api.update_ref({repository_full_name:repository,branch_name:branch,sha:created.sha,force:false,expected_sha:parent}));
    if(updated?.success!==true) throw new Error('branch_update_unconfirmed');
    commitSha=created.sha;
  }
  const receipt=buildRawReceipt({...identity,path,bytes,persistenceMode:DIRECT_PERSISTENCE_MODE,commitSha,readBackVerified:false});
  if(validateRawReceipt(receipt,{bytes}).length) throw new Error('raw_receipt_validation_failed');
  return {...receipt,reused};
}
