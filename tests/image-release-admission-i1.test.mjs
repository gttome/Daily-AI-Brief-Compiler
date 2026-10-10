import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readImageProcessVersions} from '../scripts/image-process-versions.mjs';
import {verifyImageReleaseAdmission} from '../scripts/check-external-image-release-gates.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
 const date='2026-10-11',source={commit_sha:'c'.repeat(40),bundle_sha256:'b'.repeat(64)};
 const job={schema_version:'external-compiler-image-job-v1',lifecycle:'PUBLISHED_PENDING',edition_date:date,execution_id:'test-'+date,source,stories:Array.from({length:6},(_,i)=>({story_id:'story-'+i}))};
 const jobBytes=Buffer.from(JSON.stringify(job)+'\n');
 const images=job.stories.map((s,i)=>({story_id:s.story_id,sha256:String(i).repeat(64),git_blob_sha:'a'.repeat(40),width:1200,height:630,accepted_locked:true,visual_review:{result:'PASS',inspected_png_sha256:String(i).repeat(64)}}));
 const manifest={schema_version:'external-compiler-image-package-v1',edition_date:date,execution_id:job.execution_id,job_sha256:hash(jobBytes),original_bundle_sha256:source.bundle_sha256,original_source_commit_sha:source.commit_sha,expected_pages_history_head:'e'.repeat(40),images};
 const manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n');
 const index={schema_version:'external-compiler-image-index-v1',editions:[{edition_date:date,job_sha256:hash(jobBytes),bundle_sha256:source.bundle_sha256,source_commit_sha:source.commit_sha,story_count:6,status:'PUBLISHED_PENDING',job_url:'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+date+'/job.json'}]};
 const submitted_starter_text='Create the six premium images for this selected eligible job. I authorize protected publication once the exact images pass review. This is an owner-submitted starter assignment, not owner personal artwork review.';
 const assignment={schema_version:'external-compiler-starter-assignment-v7',prompt_version:'rev7',owner_identity:'gttome',assignment_channel:'submitted_chat_prompt',scope:'image_only_postpublication',observed_submission:true,edition_date:date,execution_id:job.execution_id,job_sha256:hash(jobBytes),manifest_sha256:hash(manifestBytes),original_source_commit_sha:source.commit_sha,original_bundle_sha256:source.bundle_sha256,submitted_starter_text,submitted_starter_sha256:hash(Buffer.from(submitted_starter_text)),observed_at:'2026-10-10T16:00:00Z',owner_personal_artwork_review_claimed:false,conversation_url:null,accepted_images:images.map(x=>({story_id:x.story_id,sha256:x.sha256}))};
 const versions={...readImageProcessVersions(),image_release_authority_policy:'bounded_starter_v7',image_starter_contract_version:'rev7'};
 return {jobBytes,index,manifestBytes,assignment,versions};
}
test('I1 exact submitted assignment removes redundant owner GO without faking approval URLs or schedule',()=>{
 const f=fixture(),r=verifyImageReleaseAdmission(f);
 assert.equal(r.result,'BOUNDED_STARTER_AUTHORIZED_NOT_DEPLOYED');
 assert.equal(r.assignment_evidence_url,null);
 assert.equal(r.source_scheduled_execution_not_inferred,true);
 assert.equal(r.accepted_images.length,6);
});
test('I1 rejects invented or mismatched authority, job, accepted hashes and review',()=>{
 const f=fixture();
 for(const change of [
  {observed_submission:false},{submitted_starter_sha256:'0'.repeat(64)},
  {job_sha256:'0'.repeat(64)},{owner_personal_artwork_review_claimed:true},
  {accepted_images:f.assignment.accepted_images.slice(0,5)},
  {conversation_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/issues/123'}]){
  assert.throws(()=>verifyImageReleaseAdmission({...f,assignment:{...f.assignment,...change}}),/external_image_owner_gate:/);
 }
 const badManifest=JSON.parse(f.manifestBytes);
 badManifest.images[0].visual_review.result='FAIL';
 assert.throws(()=>verifyImageReleaseAdmission({...f,manifestBytes:Buffer.from(JSON.stringify(badManifest)+'\n')}),/accepted_image_binding/);
 assert.throws(()=>verifyImageReleaseAdmission({...f,versions:{...f.versions,image_starter_contract_version:'rev6'}}),/RELEASE_ADMISSION_HOLD/);
});
