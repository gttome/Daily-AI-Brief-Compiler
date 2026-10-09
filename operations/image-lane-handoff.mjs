import {assertNewGenerationProfile} from '../image-studio/specification-projection.mjs';
import crypto from 'node:crypto';
import {assertD1Specifications} from '../image-studio/spec-admission.mjs';
import {canonicalSha,hex} from '../image-capsules/util.mjs';

export const IMAGE_TASK_ID = '6ac6cf14a9e88191af48c353b9bc1e11';

function ceilTimestampSecond(value, parsed) {
  // Date.parse truncates beyond milliseconds, including a nonzero .000123.
  // Keep that remainder when rounding up to DTSTART's whole-second precision.
  const fraction = typeof value === 'string' ? value.match(/:\d{2}\.(\d+)(?:Z|[+-]\d{2}:?\d{2})?$/i)?.[1] : undefined;
  const submillisecond = /[1-9]/.test(fraction?.slice(3) ?? '');
  return Math.ceil(parsed / 1000) * 1000 + (parsed % 1000 === 0 && submillisecond ? 1000 : 0);
}

// Build an exact one-shot schedule only after durable readiness exists.
// The semantic task applies this payload with Automations, then reads it back.
export function buildImageLaneHandoff({edition, executionId, branch, requestPath, requestSha256, readyAt, now, lastRunAt=null, previous=null}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edition) || !executionId || !branch || !requestPath || !/^[a-f0-9]{64}$/.test(requestSha256)) throw new Error('handoff_identity');
  const ready=Date.parse(readyAt),current=Date.parse(now),last=lastRunAt===null?null:Date.parse(lastRunAt);
  if (!Number.isFinite(ready)||!Number.isFinite(current)||(last!==null&&!Number.isFinite(last))||ready>current) throw new Error('handoff_time');
  const key=crypto.createHash('sha256').update(JSON.stringify([edition,executionId,requestPath,requestSha256])).digest('hex');
  if(previous?.handoff_key===key && previous.scheduler_readback_verified===true) return {action:'NOOP',handoff_key:key};
  // Round each input up before adding the unchanged whole-second minimums.
  // Both representations then name one instant at or after both true bounds.
  const due=new Date(Math.max(ceilTimestampSecond(now,current)+60_000, last===null?0:ceilTimestampSecond(lastRunAt,last)+3_600_000));
  const stamp=due.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  return {schema_version:'daily-compiler-image-lane-handoff-v1',action:'ARM_EXISTING_TASK',handoff_key:key,edition_date:edition,execution_id:executionId,branch,request_path:requestPath,request_sha256:requestSha256,ready_at:readyAt,due_at:due.toISOString(),scheduler_readback_verified:false,automation_update:{jawbone_id:IMAGE_TASK_ID,is_enabled:true,default_timezone:'America/Chicago',schedule:`BEGIN:VEVENT\nDTSTART:${stamp}\nEND:VEVENT`}};
}

// New D1 generation requests use this admission-bound entry point. The original
// schedule-payload helper is shared; previously stored handoffs remain unchanged.
// Neither function invokes a scheduler or grants image activation.
export function buildD1ImageLaneHandoff({specifications,sourceEvidence,sourceEvidencePath,requestCommit,...input}) {
  const admission = assertD1Specifications(specifications,sourceEvidence);
  assertNewGenerationProfile(specifications);
  if (input.edition !== specifications.edition_date || input.executionId !== specifications.execution_id || input.requestSha256 !== admission.request_sha256) throw new Error('d1_handoff_specification_binding');
  const safePath = value => typeof value === 'string' && value.length > 0 && !value.includes('\\') && !value.startsWith('/') && !value.split('/').some(part => !part || part === '.' || part === '..') && !/[\s:#?]/.test(value);
  if (!safePath(input.requestPath) || !safePath(sourceEvidencePath) || input.requestPath === sourceEvidencePath || !hex(requestCommit,40)) throw new Error('d1_handoff_source_locator');
  if (typeof input.branch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(input.branch) || input.branch.includes('..')) throw new Error('d1_handoff_branch');
  const handoff = buildImageLaneHandoff({...input,previous:null});
  const binding = {edition_date:input.edition,execution_id:input.executionId,branch:input.branch,request_path:input.requestPath,request_sha256:admission.request_sha256,
    request_commit:requestCommit,source_evidence_path:sourceEvidencePath,source_evidence_sha256:admission.source_evidence_sha256,quality_contract_sha256:admission.quality_contract_sha256,admission_contract_sha256:admission.admission_contract_sha256,recipe_profile:admission.recipe_profile};
  const key = canonicalSha(binding);
  const sameVerified = input.previous?.handoff_key === key && input.previous?.scheduler_readback_verified === true;
  const result = sameVerified ? {action:'NOOP',scheduler_readback_verified:true} : handoff;
  return {...result,...binding,handoff_key:key,schema_version:'daily-compiler-d1-image-lane-handoff-v2',specification_admission:admission,source_commit:specifications.source_commit,generation_authorized:false};
}
