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
  for(const field of ['release1_genuine_scheduled_placeholder_verified','release1_owner_acceptance_recorded','external_six_image_package_owner_approved','exact_saved_pixel_review_proven','original_oct8_preservation_required']){
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,[field]:false}}),/real_owner_approval_absent|scheduled_release_one_or_exact_owner_exception_not_accepted/);
  }
  assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:null}),/real_owner_approval_absent|scheduled_release_one_or_exact_owner_exception_not_accepted/);
  assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,manifest_sha256:'f'.repeat(64)}}),/real_owner_approval_absent|scheduled_release_one_or_exact_owner_exception_not_accepted/);
  assert.throws(()=>verifyExternalImageReleaseGo({...f,index:{...f.index,editions:[{...f.index.editions[0],status:'RELEASED_VERIFIED'}]}}),/index_job_digest_or_status_mismatch/);
  assert.throws(()=>verifyExternalImageReleaseGo({...f,index:{...f.index,editions:[]}}),/no_published_pending_index_job/);
});
test('Revision 6 accepts an authorized reviewed package without legacy Work-session claims',()=>{
  for(const legacy of [undefined,false,true]){
    const f=inputs();
    if(legacy===undefined)delete f.approval.external_work_cold_start_proven;
    else f.approval.external_work_cold_start_proven=legacy;
    assert.equal(verifyExternalImageReleaseGo(f).result,'GO_RECORDED_NOT_DEPLOYED');
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,owner_decision:'WAIT'}}),/real_owner_approval_absent/);
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,job_sha256:'0'.repeat(64)}}),/real_owner_approval_absent/);
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,exact_saved_pixel_review_proven:false}}),/real_owner_approval_absent/);
  }
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

test('image replacement still requires a new specific owner GO but supports the exceptional published Oct9 job',()=>{
  const f=inputs(),job=JSON.parse(f.jobBytes.toString('utf8'));
  job.edition_date='2026-10-09';
  job.execution_id='compiler-2026-10-09-r1';
  job.source.branch='shadow/2026-10-09-owner-placeholder-20261009';
  job.source.one_time_owner_recovery=true;
  job.source.unattended_schedule_proven=false;
  const jobBytes=Buffer.from(JSON.stringify(job)+'\n'),index=structuredClone(f.index);
  index.editions[0].edition_date='2026-10-09';
  index.editions[0].job_url='https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/2026-10-09/job.json';
  index.editions[0].job_sha256=sha(jobBytes);
  const m=JSON.parse(f.manifestBytes.toString('utf8'));
  m.edition_date='2026-10-09';
  m.execution_id=job.execution_id;
  m.job_sha256=sha(jobBytes);
  const manifestBytes=Buffer.from(JSON.stringify(m)+'\n');
  const approval={...f.approval,edition_date:'2026-10-09',execution_id:job.execution_id,job_sha256:sha(jobBytes),manifest_sha256:sha(manifestBytes),
    release1_genuine_scheduled_placeholder_verified:false,release1_owner_acceptance_recorded:false,
    oct9_separate_owner_recovery_published_and_live_verified:true,
    oct9_manual_placeholder_publication_owner_accepted:true};
  const args={jobBytes,index,manifestBytes,approval};
  const ok=verifyExternalImageReleaseGo(args);
  assert.equal(ok.result,'GO_RECORDED_NOT_DEPLOYED');
  assert.equal(ok.separately_owner_authorized_oct9_exception,true);
  assert.equal(ok.unattended_release1_accepted,false);
  assert.throws(()=>verifyExternalImageReleaseGo({...args,approval:{...approval,oct9_manual_placeholder_publication_owner_accepted:false}}),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  assert.throws(()=>verifyExternalImageReleaseGo({...args,approval:{...approval,external_six_image_package_owner_approved:false}}),/real_owner_approval_absent/);
});

function oct10Inputs(){
  const root='external-image-packages/2026-10-10/';
  const jobBytes=fs.readFileSync(root+'source/job.json');
  const job=JSON.parse(jobBytes);
  const manifestBytes=fs.readFileSync(root+'manifest.json');
  const approval=JSON.parse(fs.readFileSync(root+'owner-release-approval.json','utf8'));
  const index={schema_version:'external-compiler-image-index-v1',editions:[{
    edition_date:job.edition_date,job_sha256:sha(jobBytes),bundle_sha256:job.source.bundle_sha256,
    source_commit_sha:job.source.commit_sha,story_count:6,status:'PUBLISHED_PENDING',
    job_url:'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/2026-10-10/job.json'
  }]};
  return {jobBytes,index,manifestBytes,approval};
}
function authorizedOct10Fixture(){
  const f=oct10Inputs();
  // Test-only simulated owner decision; never mutates the stored owner record.
  f.approval={...f.approval,owner_decision:'GO',approved_by:'gttome',approved_at:'2026-10-10T04:00:00Z',
    oct10_continued_publication_owner_accepted:true,oct10_image_only_exception_owner_authorized:true};
  return f;
}
test('pending October 10 exception cannot release and cannot claim scheduled Release 1',()=>{
  const f=oct10Inputs();
  f.approval={...f.approval,owner_decision:'WAITING_FOR_SPECIFIC_EXCEPTION_APPROVAL',
    oct10_continued_publication_owner_accepted:false,oct10_image_only_exception_owner_authorized:false};
  assert.throws(()=>verifyExternalImageReleaseGo(f),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  const falseSchedule={...f.approval,owner_decision:'GO',approved_by:'gttome',approved_at:'2026-10-10T04:00:00Z',
    release1_genuine_scheduled_placeholder_verified:true,release1_owner_acceptance_recorded:true};
  assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:falseSchedule}),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  const bundle=fs.readFileSync('external-image-packages/2026-10-10/source/edition-bundle.json');
  assert.equal(sha(bundle),JSON.parse(f.jobBytes).source.bundle_sha256);
  assert.equal(JSON.parse(bundle).producer_receipt.scheduled_execution,false);
});
test('only explicitly accepted exact October 10 package can use the one-job exception',()=>{
  const f=authorizedOct10Fixture(),r=verifyExternalImageReleaseGo(f);
  assert.equal(r.result,'GO_RECORDED_NOT_DEPLOYED');
  assert.equal(r.separately_owner_authorized_oct10_image_exception,true);
  assert.equal(r.unattended_release1_accepted,false);
  assert.equal(r.release2_accepted,false);
  for(const field of ['oct10_existing_continued_publication_verified','oct10_continued_publication_owner_accepted','oct10_image_only_exception_owner_authorized']){
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,[field]:false}}),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  }
  for(const field of ['release1_genuine_scheduled_placeholder_verified','release1_owner_acceptance_recorded','unattended_release1_acceptance_claimed']){
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,[field]:true}}),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  }
  for(const field of ['expected_pages_history_head','approved_package_commit_sha']){
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,[field]:'0'.repeat(40)}}),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  }
  const manifest=JSON.parse(f.manifestBytes);manifest.images[0].sha256='0'.repeat(64);
  const manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n');
  assert.throws(()=>verifyExternalImageReleaseGo({...f,manifestBytes,approval:{...f.approval,manifest_sha256:sha(manifestBytes)}}),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
  for(const field of ['external_six_image_package_owner_approved','exact_saved_pixel_review_proven','original_oct8_preservation_required']){
    assert.throws(()=>verifyExternalImageReleaseGo({...f,approval:{...f.approval,[field]:false}}),/real_owner_approval_absent/);
  }
});
test('October 10 exception flags do not admit another edition',()=>{
  const f=inputs(),exception=authorizedOct10Fixture().approval;
  f.approval={...f.approval,release1_genuine_scheduled_placeholder_verified:false,release1_owner_acceptance_recorded:false,
    oct10_existing_continued_publication_verified:exception.oct10_existing_continued_publication_verified,
    oct10_continued_publication_owner_accepted:true,oct10_image_only_exception_owner_authorized:true,
    unattended_release1_acceptance_claimed:false,expected_pages_history_head:exception.expected_pages_history_head,
    approved_package_commit_sha:exception.approved_package_commit_sha};
  assert.throws(()=>verifyExternalImageReleaseGo(f),/scheduled_release_one_or_exact_owner_exception_not_accepted/);
});
