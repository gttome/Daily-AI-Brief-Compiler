// C2: observational admission only; no task launch, GitHub write or publisher hook.
// A prompt, an interactive chat and a caller-supplied JSON field are not host proof.
export const C2_HOST_VERSION = 'c2-scheduled-host-v1';
export const COMPILER_PRIMARY_ID = '6ac9868490b88191ac91f84d5f555994';
const hexId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{6,200}$/.test(value);
const decision = (status, reason, evidence_id = null) =>
  Object.freeze({schema_version:C2_HOST_VERSION,status,reason,evidence_id});
export async function evaluateScheduledHost(observation = {}, {
  selector = 'v1',
  verifyFirstPartyInvocation = null
} = {}) {
  if (selector === 'off') return decision('UNPROVEN','C2_DIAGNOSTIC_DISABLED');
  if (selector !== 'v1') return decision('UNPROVEN','UNKNOWN_C2_SELECTOR');
  if (observation.task_id !== COMPILER_PRIMARY_ID ||
      !hexId(observation.invocation_id) ||
      observation.trigger !== 'scheduled') {
    return decision('UNPROVEN','NO_AUTHENTIC_SCHEDULED_INVOCATION_ID');
  }
  // No implementation may self-attest execution mode from task title/prompt.
  if (typeof verifyFirstPartyInvocation !== 'function') {
    return decision('UNPROVEN','FIRST_PARTY_HOST_MODE_OBSERVER_UNAVAILABLE');
  }
  let proof;
  try { proof = await verifyFirstPartyInvocation(observation.task_id, observation.invocation_id); }
  catch { return decision('UNPROVEN','FIRST_PARTY_HOST_MODE_OBSERVER_ERROR'); }
  if (!proof || proof.authority !== 'first_party_scheduled_runtime' ||
      proof.task_id !== observation.task_id ||
      proof.invocation_id !== observation.invocation_id ||
      proof.trigger !== 'scheduled' ||
      !hexId(proof.evidence_id) ||
      proof.verified !== true) {
    return decision('UNPROVEN','HOST_ATTESTATION_NOT_VERIFIED');
  }
  if (proof.mode === 'work' || proof.mode === 'codex' ||
      proof.work_used === true || proof.codex_used === true) {
    return decision('FAIL','PROHIBITED_WORK_OR_CODEX_EXECUTION',proof.evidence_id);
  }
  if (proof.mode !== 'ordinary_chat' ||
      proof.work_used !== false || proof.codex_used !== false) {
    return decision('UNPROVEN','ORDINARY_CHAT_MODE_NOT_PROVEN',proof.evidence_id);
  }
  return decision('PASS','FIRST_PARTY_SCHEDULED_ORDINARY_CHAT_PROVEN',proof.evidence_id);
}
