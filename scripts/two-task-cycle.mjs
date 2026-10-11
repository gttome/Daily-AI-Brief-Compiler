// Pure, deterministic edition binding. Never select "latest eligible" across cycles.
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
export function checkedDate(d){
 if(typeof d!=='string'||!DATE.test(d))throw Error('invalid_chicago_cycle_date');
 const dt=new Date(d+'T00:00:00Z');
 if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==d)throw Error('invalid_calendar_date');
 return d;
}
export function nextEditionDate(cycleDate){
 const d=new Date(checkedDate(cycleDate)+'T00:00:00Z');
 d.setUTCDate(d.getUTCDate()+1);
 return d.toISOString().slice(0,10);
}
export function selectCurrentCycleImageJob({cycleDate,index,job,jobBytes=null,sha256=null}){
 const date=nextEditionDate(cycleDate);
 if(index?.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(index.editions))
  return {result:'BLOCKED_INCOMPLETE',edition_date:date,reason:'IMAGE_INDEX_MISSING_OR_INVALID'};
 const rows=index.editions.filter(x=>x.edition_date===date);
 if(rows.length>1)return {result:'BLOCKED_INCOMPLETE',edition_date:date,reason:'DUPLICATE_CURRENT_EDITION'};
 if(rows.length===0)return {result:'WAITING_SOURCE',edition_date:date,reason:'CURRENT_EDITION_JOB_NOT_PUBLISHED'};
 const row=rows[0];
 if(row.status==='RELEASED_VERIFIED')return {result:'ALREADY_RELEASED',edition_date:date,source_job_date:date,generate:false};
 if(row.status!=='PUBLISHED_PENDING')return {result:'BLOCKED_INCOMPLETE',edition_date:date,reason:'CURRENT_JOB_INELIGIBLE'};
 if(job?.schema_version!=='external-compiler-image-job-v1'||job.edition_date!==date||
   job.lifecycle!=='PUBLISHED_PENDING'||!Array.isArray(job.stories)||job.stories.length!==6||
   new Set(job.stories.map(s=>s.story_id)).size!==6||
   row.story_count!==6||row.source_commit_sha!==job.source?.commit_sha||
   row.bundle_sha256!==job.source?.bundle_sha256)
  return {result:'BLOCKED_INCOMPLETE',edition_date:date,reason:'IMMUTABLE_CURRENT_JOB_BINDING_MISMATCH'};
 if(jobBytes!==null){
  if(!Buffer.isBuffer(jobBytes)||typeof sha256!=='function'||row.job_sha256!==sha256(jobBytes))
   return {result:'BLOCKED_INCOMPLETE',edition_date:date,reason:'CURRENT_JOB_SHA256_MISMATCH'};
 }
 return {result:'CURRENT_JOB_READY',edition_date:date,source_job_date:date,generate:true,job_sha256:row.job_sha256};
}
