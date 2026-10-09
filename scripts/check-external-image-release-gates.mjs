import {OCT9_RECOVERY_BRANCH} from '../compiler/oct9-owner-exception.mjs';
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
  const ordinaryRelease1=approval?.release1_genuine_scheduled_placeholder_verified===true &&
    approval?.release1_owner_acceptance_recorded===true;
  const explicitOct9Exception=date==='2026-10-09'&&
    job.source?.branch===OCT9_RECOVERY_BRANCH&&
    job.source?.one_time_owner_recovery===true&&
    job.source?.unattended_schedule_proven===false&&
    approval?.oct9_separate_owner_recovery_published_and_live_verified===true&&
    approval?.oct9_manual_placeholder_publication_owner_accepted===true&&
    approval?.release1_genuine_scheduled_placeholder_verified===false&&
    approval?.release1_owner_acceptance_recorded===false;
  if(!ordinaryRelease1&&!explicitOct9Exception)fail('scheduled_release_one_or_exact_owner_oct9_exception_not_accepted');
  if(approval?.schema_version!==OWNER_GATE_VERSION||approval.owner_decision!=='GO'||
    approval.approved_by!=='gttome'||approval.scope!=='image_only_postpublication'||
    approval.edition_date!==date||approval.execution_id!==job.execution_id||
    approval.job_sha256!==expectedJob||approval.manifest_sha256!==expectedManifest||

    approval.external_six_image_package_owner_approved!==true||
    approval.external_work_cold_start_proven!==true||
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
    unattended_release1_accepted:ordinaryRelease1};
}
function main(){
  const [jobFile,indexFile,manifestFile,approvalFile,outFile]=process.argv.slice(2);
  if(!outFile)fail('usage: node scripts/check-external-image-release-gates.mjs <job> <index> <package-manifest> <approved-owner-go> <receipt>');
  const result=verifyExternalImageReleaseGo({jobBytes:fs.readFileSync(jobFile),
    index:JSON.parse(fs.readFileSync(indexFile,'utf8')),manifestBytes:fs.readFileSync(manifestFile),
    approval:JSON.parse(fs.readFileSync(approvalFile,'utf8'))});
  fs.mkdirSync(path.dirname(outFile),{recursive:true});
  fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
