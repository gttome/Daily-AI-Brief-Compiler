import crypto from 'node:crypto';

export const IMAGE_TASK_ID = '6ac6cf14a9e88191af48c353b9bc1e11';

// Build an exact one-shot schedule only after durable readiness exists.
// The semantic task applies this payload with Automations, then reads it back.
export function buildImageLaneHandoff({edition, executionId, branch, requestPath, requestSha256, readyAt, now, lastRunAt=null, previous=null}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edition) || !executionId || !branch || !requestPath || !/^[a-f0-9]{64}$/.test(requestSha256)) throw new Error('handoff_identity');
  const ready=Date.parse(readyAt),current=Date.parse(now),last=lastRunAt===null?null:Date.parse(lastRunAt);
  if (!Number.isFinite(ready)||!Number.isFinite(current)||(last!==null&&!Number.isFinite(last))||ready>current) throw new Error('handoff_time');
  const key=crypto.createHash('sha256').update(JSON.stringify([edition,executionId,requestPath,requestSha256])).digest('hex');
  if(previous?.handoff_key===key && previous.scheduler_readback_verified===true) return {action:'NOOP',handoff_key:key};
  // Respect the platform's minimum interval between task invocations.
  const due=new Date(Math.max(current+60_000, last===null?0:last+3_600_000));
  const stamp=due.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  return {schema_version:'daily-compiler-image-lane-handoff-v1',action:'ARM_EXISTING_TASK',handoff_key:key,edition_date:edition,execution_id:executionId,branch,request_path:requestPath,request_sha256:requestSha256,ready_at:readyAt,due_at:due.toISOString(),scheduler_readback_verified:false,automation_update:{jawbone_id:IMAGE_TASK_ID,is_enabled:true,default_timezone:'America/Chicago',schedule:`BEGIN:VEVENT\nDTSTART:${stamp}\nEND:VEVENT`}};
}
