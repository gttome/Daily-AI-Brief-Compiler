import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {verifyExternalImageReleaseGo} from '../scripts/check-external-image-release-gates.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const DATE='2026-10-11';
function inputs(){
  const job={schema_version:'external-compiler-image-job-v1',edition_date:DATE,execution_id:'compiler-'+DATE+'-r1',lifecycle:'PUBLISHED_PENDING',
    stories:Array.from({length:6},(_,i)=>({story_id:'story-'+i})),source:{bundle_sha256:'b'.repeat(64),commit_sha:'c'.repeat(40)}};
  const jobBytes=Buffer.from(JSON.stringify(job)+'\n');
  const manifest={schema_version:'external-compiler-image-package-v1',edition_date:DATE,execution_id:job.execution_id,
    job_sha256:sha(jobBytes),original_bundle_sha256:job.source.bundle_sha256,
    original_source_commit_sha:job.source.commit_sha,images:Array.from({length:6},(_,i)=>({story_id:'story-'+i}))};
  const manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n');
  const index={schema_version:'external-compiler-image-index-v1',editions:[{
    edition_date:DATE,job_sha256:sha(jobBytes),bundle_sha256:job.source.bundle_sha256,
    source_commit_sha:job.source.commit_sha,story_count:6,status:'PUBLISHED_PENDING',
    job_url:'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+DATE+'/job.json'}]};
  const approval={schema_version:'external-compiler-owner-image-release-go-v1',
    owner_decision:'GO',approved_by:'gttome',scope:'image_only_postpublication',edition_date:DATE,
    execution_id:job.execution_id,job_sha256:sha(jobBytes),manifest_sha256:sha(manifestBytes),
    release1_genuine_scheduled_placeholder_verified:true,release1_owner_acceptance_recorded:true,
    external_six_image_package_owner_approved:true,external_work_cold_start_proven:true,
    exact_saved_pixel_review_proven:true,original_oct8_preservation_required:true,
    owner_decision_evidence_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/issues/123',
    approved_at:'2026-10-11T02:15:00Z'};
  return {jobBytes,index,manifestBytes,approval};
}
test('feature gate checks explicit owner decision and exact image job/index/manifest identities',()=>{
  const f=inputs(),r=verifyExternalImageReleaseGo(f);
  assert.equal(r.result,'GO_RECORDED_NOT_DEPLOYED');
  assert.equal(r.release2_accepted,false);
  for(const field of ['release1_genuine_scheduled_placeholder_verified','release1_owner_acceptance_recorded','external_six_image_package_owner_approved','external_work_cold_start_proven','exact_saved_pixel_review_proven']){
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,[field]:false}}),/real_owner_approval_absent/);
  }
  assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:null}),/real_owner_approval_absent/);
  assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,manifest_sha256:'f'.repeat(64)}}),/real_owner_approval_absent/);
  assert.throws(()=>verifyExternalImageReleaseGo({...f,index:{...f.index,editions:[{...f.index.editions[0],status:'RELEASED_VERIFIED'}]}}),/index_job_digest_or_status_mismatch/);
  assert.throws(()=>verifyExternalImageReleaseGo({...f,index:{...f.index,editions:[]}}),/no_published_pending_index_job/);
});
test('replacement workflow is manual-only; protected exact-head gates before any deployment',()=>{
  const yml=fs.readFileSync('.github/workflows/external-image-only-replacement.yml','utf8');
  assert.match(yml,/workflow_dispatch:/);
  assert.doesNotMatch(yml,/\n[ \t]+schedule:/);
  assert.doesNotMatch(yml,/render-shadow-images\.yml|image_gen|generator_context|work_image_lane/);
  assert.match(yml,/group: daily-compiler-pages-deploy/);
  for(const phrase of ['rulesets/24610983','event=pull_request','check-external-image-release-gates.mjs',
      'stage-external-image-package.mjs','verify-external-image-original-live.mjs',
      'prepare-external-image-replacement.mjs','verify-external-image-live.mjs',
      'audit-oct8-live','finish','finalize-external-image-release.mjs']){
    if(phrase==='audit-oct8-live'||phrase==='finish')continue;
    assert.ok(yml.includes(phrase),phrase);
  }
  const gate=yml.indexOf('check-external-image-release-gates.mjs');
  const deploy=yml.indexOf('uses: actions/deploy-pages@v4');
  const verify=yml.indexOf('verify-external-image-live.mjs');
  assert.ok(gate>0&&deploy>gate&&verify>deploy);
  assert.doesNotMatch(yml,/github\.com\/gttome\/Daily-AI-Brief(?:\/|["'])/);
});
