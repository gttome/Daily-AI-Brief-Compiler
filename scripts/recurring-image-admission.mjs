// Future-only recurring image authority. Selected only by rev8; historic rev6/7 unchanged.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {nextEditionDate,checkedDate} from './two-task-cycle.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Error('external_image_recurring_gate:'+code);};
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/;
const authPath=new URL('../contracts/automation/recurring-image-authorization.json',import.meta.url);
export function verifyRecurringImageReleaseAdmission({jobBytes,index,manifestBytes,assignment,authorization=null}){
 const policy=authorization??JSON.parse(fs.readFileSync(authPath,'utf8'));
 if(policy?.schema_version!=='external-image-recurring-authorization-v1'||
   policy.owner_identity!=='gttome'||policy.decision!=='STANDING_FUTURE_ONLY'||
   policy.repository!=='gttome/Daily-AI-Brief-Compiler'||policy.task_id!=='6acac88cff048191ba02e5b2bcb3becb'||
   policy.active_when_selected!==true||policy.revocation?.enabled!==false||
   policy.requires_scheduled_work_mode!==true||policy.requires_actual_image_creation!==true||
   policy.requires_same_invocation_connected_github!==true||
   policy.manual_github_pr_approval_bypass_allowed!==false)fail('STANDING_AUTHORITY_INACTIVE_OR_INCONSISTENT');
 if(!Buffer.isBuffer(jobBytes)||!Buffer.isBuffer(manifestBytes))fail('EXACT_BYTES_REQUIRED');
 let job,manifest;
 try{job=JSON.parse(jobBytes);manifest=JSON.parse(manifestBytes);}catch{fail('INVALID_JOB_OR_PACKAGE_JSON');}
 const date=job.edition_date,jobHash=hash(jobBytes),manifestHash=hash(manifestBytes);
 const a=assignment;
 if(a?.schema_version!=='external-compiler-recurring-assignment-v8'||a.prompt_version!=='rev8'||
    a.scope!=='image_only_postpublication'||a.owner_personal_artwork_review_claimed!==false||
    a.task_id!==policy.task_id||a.edition_date!==date||a.execution_id!==job.execution_id||
    a.job_sha256!==jobHash||a.manifest_sha256!==manifestHash||
    a.original_source_commit_sha!==job.source?.commit_sha||
    a.original_bundle_sha256!==job.source?.bundle_sha256)fail('CURRENT_CYCLE_ASSIGNMENT_BINDING_MISSING');
 let expected;
 try{expected=nextEditionDate(a.cycle_date);
  checkedDate(policy.effective_cycle_date);
  checkedDate(policy.first_authorized_edition_date);
 }catch{fail('INVALID_CYCLE_BINDING');}
 if(date!==expected||date<policy.first_authorized_edition_date||
   a.cycle_date<policy.effective_cycle_date)fail('NOT_CURRENT_AUTHORIZED_CYCLE');
 const sched=a.scheduled_runtime_evidence;
 const workMode=['work','WORK_CODEX'].includes(sched?.mode);
 const firstPartySchedulerProof=sched?.source==='first_party_scheduler'&&
   typeof sched.host_invocation_id==='string'&&sched.host_invocation_id.length>=8;
 // Some real scheduled Work environments expose the native image and connected
 // GitHub tools but no internal scheduler invocation ID. Such an ID can never
 // be invented. The alternate route is explicitly marked unproven on host
 // provenance, and demands genuine image/export/Git evidence tied to package
 // bytes. This is NOT a substitution for pixel, CI or deployment gates.
 const observedWorkRoute=sched?.source==='scheduled_task_runtime_observation'&&
   (sched.host_invocation_id===null||sched.host_invocation_id===undefined)&&
   ['image_gen__imagegen','image_gen'].includes(sched.runtime_tool_evidence?.native_image_tool_name)&&
   sched.runtime_tool_evidence?.actual_generation_count>=6&&
   sched.runtime_tool_evidence?.exact_png_1200x630_export_observed===true&&
   sched.runtime_tool_evidence?.github_binary_sha256_readback_observed===true&&
   sched.runtime_tool_evidence?.original_manifest_sha256===manifestHash&&
   sched.runtime_tool_evidence?.six_actual_saved_pixel_reviews_passed===true;
 if(sched?.task_id!==policy.task_id||!workMode||
   (!firstPartySchedulerProof&&!observedWorkRoute)||
   sched?.native_image_creation_observed!==true||
   sched?.same_invocation_github_binary_readback_observed!==true||
   sched?.actual_saved_pixel_review_observed!==true||
   !Number.isFinite(Date.parse(sched.scheduled_for))||
   !Number.isFinite(Date.parse(sched.observed_at)))
   fail('REAL_SCHEDULED_WORK_EVIDENCE_NOT_SUPPLIED');
 // The genuinely observed host schedule binds the cycle, not a later release clock.
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',
   year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
   .formatToParts(new Date(sched.scheduled_for));
 const part=type=>parts.find(x=>x.type===type)?.value;
 if(part('year')+'-'+part('month')+'-'+part('day')!==a.cycle_date||
   part('hour')!=='21'||part('minute')!=='15')fail('SCHEDULE_IS_NOT_THIS_EVENING');
 if(job.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
   !Array.isArray(job.stories)||job.stories.length!==6||
   new Set(job.stories.map(x=>x.story_id)).size!==6||
   index?.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(index.editions))
   fail('NO_PUBLISHED_SIX_STORY_CURRENT_JOB');
 const matches=index.editions.filter(x=>x.edition_date===date);
 const row=matches[0];
 if(matches.length!==1||row.status!=='PUBLISHED_PENDING'||
   row.job_sha256!==jobHash||row.bundle_sha256!==job.source?.bundle_sha256||
   row.source_commit_sha!==job.source?.commit_sha||row.story_count!==6||
   row.job_url!=='https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+date+'/job.json')
   fail('IMMUTABLE_CURRENT_IMAGE_INDEX_MISMATCH');
 if(manifest.schema_version!=='external-compiler-image-package-v1'||manifest.edition_date!==date||
   manifest.execution_id!==job.execution_id||manifest.job_sha256!==jobHash||
   manifest.original_bundle_sha256!==job.source.bundle_sha256||
   manifest.original_source_commit_sha!==job.source.commit_sha||
   !SHA40.test(manifest.expected_pages_history_head||'')||
   !Array.isArray(manifest.images)||manifest.images.length!==6||
   manifest.set_review?.result!=='PASS')fail('PACKAGE_MANIFEST_OR_SET_QA_INVALID');
 const allowed=new Set(job.stories.map(s=>s.story_id)),seen=new Set();
 const accepted=new Map((a.accepted_images||[]).map(x=>[x.story_id,x.sha256]));
 if((a.accepted_images||[]).length!==6||accepted.size!==6)fail('ASSIGNMENT_SIX_ACCEPTED_BINDINGS_MISSING');
 for(const img of manifest.images){
  if(!allowed.has(img.story_id)||seen.has(img.story_id)||
    !img.accepted_locked||img.width!==1200||img.height!==630||
    !SHA64.test(img.sha256||'')||!SHA40.test(img.git_blob_sha||'')||
    img.visual_review?.result!=='PASS'||
    img.visual_review?.inspected_png_sha256!==img.sha256||
    accepted.get(img.story_id)!==img.sha256)fail('IMAGE_SOURCE_OR_SAVED_PIXEL_BINDING_FAILED');
  seen.add(img.story_id);
 }
 return {
  schema_version:'external-compiler-image-release-admission-v8',
  result:'STANDING_CURRENT_CYCLE_AUTHORIZED_NOT_DEPLOYED',
  cycle_date:a.cycle_date,edition_date:date,
  task_id:policy.task_id,job_sha256:jobHash,manifest_sha256:manifestHash,
  original_source_commit_sha:job.source.commit_sha,
  original_bundle_sha256:job.source.bundle_sha256,
  accepted_images:manifest.images.map(x=>({story_id:x.story_id,sha256:x.sha256})),
  scheduled_runtime_claim_requires_first_party_confirmation:!firstPartySchedulerProof,
  scheduled_host_invocation_id_verified:firstPartySchedulerProof,
  runtime_observed_image_github_route:observedWorkRoute,
  ci_does_not_independently_attest_chatgpt_work_mode:true,
  manual_release_go_not_required:true,
  actual_protected_pr_ci_merge_and_live_checks_still_required:true
 };
}
