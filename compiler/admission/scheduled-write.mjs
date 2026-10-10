// C3: isolated GitHub connector proof verification only. Never writes editions or main.
// This pure adapter cannot create or attest a scheduled invocation by itself.
import {createHash} from 'node:crypto';
export const C3_WRITE_VERSION='c3-scheduled-write-v1';
export const C3_PRIMARY_ID='6ac9868490b88191ac91f84d5f555994';
const hex40=x=>typeof x==='string' && /^[0-9a-f]{40}$/.test(x);
const decision=(status,reason,extra={})=>Object.freeze({schema_version:C3_WRITE_VERSION,status,reason,...extra});
export async function evaluateScheduledWrite(record={},{
 selector='v1', verifyScheduledOrigin=null,readGitHubProof=null
}={}){
 if(selector==='off') return decision('UNPROVEN','C3_PROBE_DISABLED');
 if(selector!=='v1') return decision('UNPROVEN','UNKNOWN_C3_SELECTOR');
 if(record.task_id!==C3_PRIMARY_ID || typeof record.invocation_id!=='string' ||
    !record.invocation_id.trim() || record.origin!=='scheduled'){
  return decision('UNPROVEN','SCHEDULED_INVOCATION_UNVERIFIED');
 }
 const validBranch = typeof record.branch==='string' &&
   record.branch.startsWith('proof/compiler-c3-') &&
   /^[a-z0-9-]+$/.test(record.branch.slice('proof/compiler-c3-'.length));
 const validPath = typeof record.path==='string' &&
   record.path.startsWith('proof/') &&
   /^[a-zA-Z0-9_.-]+$/.test(record.path.slice('proof/'.length)) &&
   (record.path.endsWith('.json') || record.path.endsWith('.txt'));
 if(!validBranch || !validPath ||
    record.repository!=='gttome/Daily-AI-Brief-Compiler'){
  return decision('UNPROVEN','UNSAFE_OR_NONPROOF_TARGET');
 }
 if(!hex40(record.create_commit) || !hex40(record.update_commit) ||
    !hex40(record.final_blob_sha) || record.create_commit===record.update_commit ||
    typeof record.expected_text!=='string' || record.expected_text.length>8192){
  return decision('UNPROVEN','CREATE_UPDATE_EVIDENCE_INCOMPLETE');
 }
 if(typeof verifyScheduledOrigin!=='function' || typeof readGitHubProof!=='function')
  return decision('UNPROVEN','LIVE_SCHEDULED_AND_GITHUB_VERIFIERS_UNAVAILABLE');
 let host,git;
 try{
  host=await verifyScheduledOrigin(record.task_id,record.invocation_id);
  if(!host || host.verified!==true || host.authority!=='first_party_scheduled_runtime' ||
     host.task_id!==record.task_id || host.invocation_id!==record.invocation_id ||
     host.trigger!=='scheduled' || host.mode!=='ordinary_chat' ||
     host.work_used!==false || host.codex_used!==false){
    return decision('UNPROVEN','SAME_CONTEXT_SCHEDULED_OR_ORDINARY_MODE_UNPROVEN');
  }
  git=await readGitHubProof({repository:record.repository,branch:record.branch,
    path:record.path,create_commit:record.create_commit,
    update_commit:record.update_commit});
 }catch{return decision('UNPROVEN','LIVE_PROOF_CONNECTOR_UNAVAILABLE');}
 if(!git || git.verified!==true || git.repository!==record.repository ||
    git.branch!==record.branch || git.path!==record.path ||
    git.create_commit!==record.create_commit ||
    git.update_commit!==record.update_commit){
  return decision('UNPROVEN','GITHUB_COMMIT_OR_TARGET_READBACK_UNVERIFIED');
 }
 if(git.blob_sha!==record.final_blob_sha || git.text!==record.expected_text){
  return decision('FAIL','GITHUB_EXACT_READBACK_MISMATCH');
 }
 const sha256=createHash('sha256').update(git.text,'utf8').digest('hex');
 if(record.expected_sha256 && record.expected_sha256!==sha256)
  return decision('FAIL','GITHUB_SHA256_MISMATCH');
 return decision('PASS','SCHEDULED_SAME_CONTEXT_CREATE_UPDATE_READBACK_VERIFIED',
   {branch:record.branch,blob_sha:git.blob_sha,sha256});
}
