import {readImageProcessVersions,imageReleaseCompatibility} from './image-process-versions.mjs';
import {OCT9_RECOVERY_BRANCH} from '../compiler/oct9-owner-exception.mjs';
import {isAuthorizedOct10ImageException} from '../compiler/oct10-image-owner-exception.mjs';
// Pure, fail-closed owner + published-job release admission.
// This does not schedule the Work app, generate images or declare visual PASS.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw new Error('external_image_owner_gate:'+s);};
export const OWNER_GATE_VERSION='external-compiler-owner-image-release-go-v1';
export function verifyExternalImageReleaseGo({jobBytes,index,manifestBytes,approval}){
  if(!Buffer.isBuffer(jobBytes)||!Buffer.isBuffer(manifestBytes))fail('exact_file_bytes_required');
  const job=JSON.parse(jobBytes),manifest=JSON.parse(manifestBytes),date=job.edition_date;
  const expectedJob=sha(jobBytes),expectedManifest=sha(manifestBytes);
  if(job.schema_version!=='external-compiler-image-job-v1'||
    job.lifecycle!=='PUBLISHED_PENDING'||!/^20\d{2}-\d{2}-\d{2}$/.test(date||'')||
    date<='2026-10-08'||job.stories?.length!==6||
    index?.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(index.editions)||
    index.editions.filter(x=>x.edition_date===date).length!==1)fail('no_published_pending_index_job');
  const recorded=index.editions.find(x=>x.edition_date===date);
  if(recorded.status!=='PUBLISHED_PENDING'||recorded.job_sha256!==expectedJob||
    recorded.bundle_sha256!==job.source?.bundle_sha256||
    recorded.source_commit_sha!==job.source?.commit_sha||
    recorded.story_count!==6||recorded.job_url!==
    'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+date+'/job.json')
    fail('index_job_digest_or_status_mismatch');
  if(manifest?.schema_version!=='external-compiler-image-package-v1'||manifest.edition_date!==date||
    manifest.execution_id!==job.execution_id||manifest.job_sha256!==expectedJob||
    manifest.original_bundle_sha256!==job.source.bundle_sha256||
    manifest.original_source_commit_sha!==job.source.commit_sha||
    manifest.images?.length!==6)fail('package_not_original_job_bound');
  // Only this specific, separately owner-approved Oct9 manual publication can substitute
  // for an otherwise-required genuinely scheduled Release 1 publication.
  // The immutable October 10 producer receipt says scheduled_execution=false.
  // Do not accept its incorrectly inferred job flag as scheduled-run evidence.
  const ordinaryRelease1=date!=='2026-10-10' && approval?.release1_genuine_scheduled_placeholder_verified===true &&
    approval?.release1_owner_acceptance_recorded===true;
  const explicitOct9Exception=date==='2026-10-09'&&
    job.source?.branch===OCT9_RECOVERY_BRANCH&&
    job.source?.one_time_owner_recovery===true&&
    job.source?.unattended_schedule_proven===false&&
    approval?.oct9_separate_owner_recovery_published_and_live_verified===true&&
    approval?.oct9_manual_placeholder_publication_owner_accepted===true&&
    approval?.release1_genuine_scheduled_placeholder_verified===false&&
    approval?.release1_owner_acceptance_recorded===false;
  const explicitOct10Exception=isAuthorizedOct10ImageException({job,jobSha256:expectedJob,manifestSha256:expectedManifest,approval});
  if(!ordinaryRelease1&&!explicitOct9Exception&&!explicitOct10Exception)fail('scheduled_release_one_or_exact_owner_exception_not_accepted');
  if(approval?.schema_version!==OWNER_GATE_VERSION||approval.owner_decision!=='GO'||
    approval.approved_by!=='gttome'||approval.scope!=='image_only_postpublication'||
    approval.edition_date!==date||approval.execution_id!==job.execution_id||
    approval.job_sha256!==expectedJob||approval.manifest_sha256!==expectedManifest||

    approval.external_six_image_package_owner_approved!==true||
    // Revision 6 makes the image exchange app-independent. Legacy Work-session
    // metadata is optional; job/manifest, owner and saved-pixel gates remain.
    approval.exact_saved_pixel_review_proven!==true||
    approval.original_oct8_preservation_required!==true||
    typeof approval.owner_decision_evidence_url!=='string'||
    !/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/(issues|pull|discussions)\/\d+/.test(approval.owner_decision_evidence_url)||
    !Number.isFinite(Date.parse(approval.approved_at))||
    approval.approved_at<='2026-10-09T00:00:00Z')fail('real_owner_approval_absent');
  return {schema_version:'external-compiler-image-owner-go-check-v1',result:'GO_RECORDED_NOT_DEPLOYED',
    edition_date:date,job_sha256:expectedJob,manifest_sha256:expectedManifest,
    approved_by:'gttome',approved_at:approval.approved_at,decision_evidence_url:approval.owner_decision_evidence_url,
    publisher_scheduler_modified:false,release2_accepted:false,
    separately_owner_authorized_oct9_exception:explicitOct9Exception,
    separately_owner_authorized_oct10_image_exception:explicitOct10Exception,
    unattended_release1_accepted:ordinaryRelease1};
}

/**
 * I1 standing authorization: a real submitted Rev7 starter is a bounded owner
 * instruction for one pending job, not proof of an owner art review or source
 * scheduling. Protected PR checks and live image safety remain in the workflow.
 * Historic legacy owner GO receipts are deliberately left readable as-is.
 */
export function verifyImageReleaseAdmission({jobBytes,index,manifestBytes,assignment,versions=readImageProcessVersions()}){
  const compatibility=imageReleaseCompatibility(versions);
  if(compatibility.result!=='COMPATIBLE')fail('RELEASE_ADMISSION_HOLD:'+compatibility.pair);
  if(versions.image_release_authority_policy==='legacy_go_v1')
    return verifyExternalImageReleaseGo({jobBytes,index,manifestBytes,approval:assignment});
  if(!Buffer.isBuffer(jobBytes)||!Buffer.isBuffer(manifestBytes))fail('exact_file_bytes_required');
  const job=JSON.parse(jobBytes),manifest=JSON.parse(manifestBytes);
  const date=job.edition_date,jobHash=sha(jobBytes),manifestHash=sha(manifestBytes);
  if(job.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
    !/^20\d{2}-\d{2}-\d{2}$/.test(date||'')||date<='2026-10-08'||
    !Array.isArray(job.stories)||job.stories.length!==6||
    index?.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(index.editions)||
    index.editions.filter(x=>x.edition_date===date).length!==1)
    fail('no_published_pending_index_job');
  const row=index.editions.find(x=>x.edition_date===date);
  if(row.status!=='PUBLISHED_PENDING'||row.job_sha256!==jobHash||
    row.bundle_sha256!==job.source?.bundle_sha256||row.source_commit_sha!==job.source?.commit_sha||
    row.story_count!==6||row.job_url!==
      'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+date+'/job.json')
    fail('index_job_digest_or_status_mismatch');
  if(manifest?.schema_version!=='external-compiler-image-package-v1'||manifest.edition_date!==date||
    manifest.execution_id!==job.execution_id||manifest.job_sha256!==jobHash||
    manifest.original_bundle_sha256!==job.source.bundle_sha256||
    manifest.original_source_commit_sha!==job.source.commit_sha||
    !/^[a-f0-9]{40}$/.test(manifest.expected_pages_history_head||'')||
    !Array.isArray(manifest.images)||manifest.images.length!==6)fail('package_not_original_job_bound');
  const jobIds=new Set(job.stories.map(s=>s.story_id)),manifestIds=new Set();
  if(jobIds.size!==6)fail('six_distinct_job_stories_required');
  for(const image of manifest.images){
    if(!jobIds.has(image.story_id)||manifestIds.has(image.story_id)||!image.accepted_locked||
      !/^[a-f0-9]{64}$/.test(image.sha256||'')||
      !/^[a-f0-9]{40}$/.test(image.git_blob_sha||'')||
      image.width!==1200||image.height!==630||
      image.visual_review?.result!=='PASS'||image.visual_review?.inspected_png_sha256!==image.sha256)
      fail('accepted_image_binding_or_saved_pixel_review_absent');
    manifestIds.add(image.story_id);
  }
  // Do not invent a URL for a chat instruction. The operator records the
  // complete submitted assignment text and its digest from the actual message.
  const a=assignment;
  if(a?.schema_version!=='external-compiler-starter-assignment-v7'||a.prompt_version!=='rev7'||
    a.owner_identity!=='gttome'||a.assignment_channel!=='submitted_chat_prompt'||
    a.scope!=='image_only_postpublication'||a.observed_submission!==true||
    a.edition_date!==date||a.execution_id!==job.execution_id||
    a.job_sha256!==jobHash||a.manifest_sha256!==manifestHash||
    a.original_source_commit_sha!==job.source.commit_sha||
    a.original_bundle_sha256!==job.source.bundle_sha256||
    typeof a.submitted_starter_text!=='string'||a.submitted_starter_text.length<80||
    !/Create the six premium images/i.test(a.submitted_starter_text)||
    !/authoriz/i.test(a.submitted_starter_text)||
    a.submitted_starter_sha256!==sha(Buffer.from(a.submitted_starter_text))||
    !Number.isFinite(Date.parse(a.observed_at))||
    a.owner_personal_artwork_review_claimed!==false||
    (a.conversation_url!==null&&a.conversation_url!==undefined&&
      !a.conversation_url.startsWith('https://chatgpt.com/')))
    fail('real_scoped_starter_assignment_absent');
  if(!Array.isArray(a.accepted_images)||a.accepted_images.length!==6)fail('assignment_six_hash_bindings_missing');
  const evidence=new Map(a.accepted_images.map(x=>[x.story_id,x.sha256]));
  if(evidence.size!==6||manifest.images.some(image=>evidence.get(image.story_id)!==image.sha256))
    fail('assignment_accepted_image_hash_mismatch');
  return {schema_version:'external-compiler-image-release-admission-v7',result:'BOUNDED_STARTER_AUTHORIZED_NOT_DEPLOYED',
    edition_date:date,job_sha256:jobHash,manifest_sha256:manifestHash,
    source_commit_sha:job.source.commit_sha,original_bundle_sha256:job.source.bundle_sha256,
    assignment_sha256:a.submitted_starter_sha256,assignment_evidence_url:a.conversation_url??null,
    source_scheduled_execution_not_inferred:true,owner_personal_artwork_review_claimed:false,
    accepted_images:manifest.images.map(x=>({story_id:x.story_id,sha256:x.sha256})),
    existing_protected_pr_ci_required:true,existing_history_and_live_verification_required:true};
}

function main(){
  const [jobFile,indexFile,manifestFile,assignmentFile,outFile]=process.argv.slice(2);
  if(!outFile)fail('usage: node scripts/check-external-image-release-gates.mjs <job> <index> <package-manifest> <assignment-or-historic-go> <receipt>');
  const result=verifyImageReleaseAdmission({jobBytes:fs.readFileSync(jobFile),
    index:JSON.parse(fs.readFileSync(indexFile,'utf8')),manifestBytes:fs.readFileSync(manifestFile),
    assignment:JSON.parse(fs.readFileSync(assignmentFile,'utf8'))});
  fs.mkdirSync(path.dirname(outFile),{recursive:true});
  fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
