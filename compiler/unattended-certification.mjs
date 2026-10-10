// Certification projection for the existing scheduled Compiler.
// An ordinary interactive publication can be valid without proving a naturally
// scheduled host invocation. A producer-authored receipt is NOT host evidence.
// verifiedRuntimeEvidence must come from an independently authenticated FIRST-PARTY
// host/same-invocation GitHub verifier, not JSON inside edition-bundle.json.
// The current deterministic publisher has no such adapter and intentionally
// supplies no evidence. It must report UNPROVEN, never manufacture a PASS.
export const PRIMARY_TASK_ID = '6ac9868490b88191ac91f84d5f555994';
const sha40=x=>typeof x==='string' && /^[a-f0-9]{40}$/.test(x);
const sha64=x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x);
const result=(status,reason)=>Object.freeze({status,proven:status==='PASS',reason});
export function assessUnattendedCertification(producerReceipt={},verifiedRuntimeEvidence=null){
  if(producerReceipt?.scheduled_execution===false)
    return result('NOT_SCHEDULED','OWNER_DIRECTED_OR_INTERACTIVE_PRODUCTION');
  if(producerReceipt?.scheduled_execution!==true)
    return result('UNPROVEN','SCHEDULED_INVOCATION_NOT_ESTABLISHED');
  const host=verifiedRuntimeEvidence?.c2, git=verifiedRuntimeEvidence?.c3;
  if(!host || host.authority!=='first_party_scheduled_runtime' ||
     host.verified!==true || host.task_id!==PRIMARY_TASK_ID ||
     host.trigger!=='scheduled' || host.mode!=='ordinary_chat' ||
     host.work_used!==false || host.codex_used!==false ||
     typeof host.invocation_id!=='string' || host.invocation_id.length<6 ||
     typeof host.evidence_id!=='string' || host.evidence_id.length<6)
    return result('UNPROVEN','C2_FIRST_PARTY_SCHEDULED_MODE_UNPROVEN');
  if(!git || git.authority!=='scheduled_same_context_github_readback' ||
     git.verified!==true || git.task_id!==PRIMARY_TASK_ID ||
     git.invocation_id!==host.invocation_id ||
     typeof git.evidence_id!=='string' || git.evidence_id.length<6 ||
     !sha40(git.blob_sha) || !sha64(git.sha256) ||
     !String(git.proof_branch||'').startsWith('proof/compiler-c3-'))
    return result('UNPROVEN','C3_SAME_INVOCATION_GITHUB_READBACK_UNPROVEN');
  return result('PASS','INDEPENDENTLY_BOUND_C2_C3_VERIFIED');
}
