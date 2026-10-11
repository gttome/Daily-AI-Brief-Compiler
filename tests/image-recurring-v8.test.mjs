import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {verifyRecurringImageReleaseAdmission} from '../scripts/recurring-image-admission.mjs';
import {imageReleaseCompatibility,readImageProcessVersions} from '../scripts/image-process-versions.mjs';
import {selectExternalImageAppDocuments} from '../scripts/select-image-app-contracts.mjs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function f(){
 const date='2026-10-12',source={commit_sha:'c'.repeat(40),bundle_sha256:'b'.repeat(64)};
 const job={schema_version:'external-compiler-image-job-v1',edition_date:date,lifecycle:'PUBLISHED_PENDING',
   execution_id:'new-'+date,source,stories:Array.from({length:6},(_,i)=>({story_id:'new-'+i}))};
 const jobBytes=Buffer.from(JSON.stringify(job)+'\n');
 const images=job.stories.map((s,i)=>({story_id:s.story_id,sha256:String(i).repeat(64),
   git_blob_sha:'a'.repeat(40),width:1200,height:630,accepted_locked:true,
   visual_review:{result:'PASS',inspected_png_sha256:String(i).repeat(64)}}));
 const manifest={schema_version:'external-compiler-image-package-v1',edition_date:date,execution_id:job.execution_id,
   job_sha256:hash(jobBytes),original_bundle_sha256:source.bundle_sha256,
   original_source_commit_sha:source.commit_sha,expected_pages_history_head:'e'.repeat(40),
   set_review:{result:'PASS'},images};
 const manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n');
 const index={schema_version:'external-compiler-image-index-v1',editions:[{
   edition_date:date,status:'PUBLISHED_PENDING',job_sha256:hash(jobBytes),
   bundle_sha256:source.bundle_sha256,source_commit_sha:source.commit_sha,story_count:6,
   job_url:'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+date+'/job.json'
 }]};
 const assignment={schema_version:'external-compiler-recurring-assignment-v8',prompt_version:'rev8',
   scope:'image_only_postpublication',owner_personal_artwork_review_claimed:false,
   task_id:'6acac88cff048191ba02e5b2bcb3becb',cycle_date:'2026-10-11',
   edition_date:date,execution_id:job.execution_id,job_sha256:hash(jobBytes),
   manifest_sha256:hash(manifestBytes),original_source_commit_sha:source.commit_sha,
   original_bundle_sha256:source.bundle_sha256,
   scheduled_runtime_evidence:{task_id:'6acac88cff048191ba02e5b2bcb3becb',
    mode:'work',source:'first_party_scheduler',scheduled_for:'2026-10-12T02:15:00Z',
    observed_at:'2026-10-12T02:15:08Z',host_invocation_id:'evidence-only-fixture',
    native_image_creation_observed:true,same_invocation_github_binary_readback_observed:true,
    actual_saved_pixel_review_observed:true},
   accepted_images:images.map(x=>({story_id:x.story_id,sha256:x.sha256}))};
 return {jobBytes,index,manifestBytes,assignment};
}
test('Rev8 is future-compatible while Rev6/Rev7 still resolve separately and selector stays Rev7',()=>{
 const baseline=readImageProcessVersions();
 assert.equal(baseline.image_starter_contract_version,'rev7');
 const v8={...baseline,image_release_authority_policy:'recurring_work_v8',image_starter_contract_version:'rev8'};
 assert.equal(imageReleaseCompatibility(v8).result,'COMPATIBLE');
 assert.equal(selectExternalImageAppDocuments(v8,true).selected_version,'rev8');
 assert.equal(imageReleaseCompatibility({...v8,image_starter_contract_version:'rev7'}).result,'RELEASE_ADMISSION_HOLD');
 assert.match(fs.readFileSync('docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md','utf8'),/Create the six premium images/);
});
test('Standing authority accepts only exact new current-cycle job and real-type evidence',()=>{
 const d=f(),r=verifyRecurringImageReleaseAdmission(d);
 assert.equal(r.result,'STANDING_CURRENT_CYCLE_AUTHORIZED_NOT_DEPLOYED');
 assert.equal(r.edition_date,'2026-10-12');
 assert.equal(r.ci_does_not_independently_attest_chatgpt_work_mode,true);
 for(const patch of [
  {cycle_date:'2026-10-10'}, {task_id:'wrong'}, {job_sha256:'f'.repeat(64)},
  {owner_personal_artwork_review_claimed:true}
 ]) assert.throws(()=>verifyRecurringImageReleaseAdmission({...d,assignment:{...d.assignment,...patch}}),/external_image_recurring_gate/);
 assert.throws(()=>verifyRecurringImageReleaseAdmission({...d,assignment:{...d.assignment,scheduled_runtime_evidence:{...d.assignment.scheduled_runtime_evidence,mode:'chat'}}}),/SCHEDULED_WORK_EVIDENCE/);
 assert.throws(()=>verifyRecurringImageReleaseAdmission({...d,authorization:{...JSON.parse(fs.readFileSync('contracts/automation/recurring-image-authorization.json')),revocation:{enabled:true}}}),/STANDING_AUTHORITY/);
 const bad=JSON.parse(d.manifestBytes);bad.images[0].visual_review.result='FAIL';
 assert.throws(()=>verifyRecurringImageReleaseAdmission({...d,manifestBytes:Buffer.from(JSON.stringify(bad)+'\n')}),/IMAGE_SOURCE/);
});
