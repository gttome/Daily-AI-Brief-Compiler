// These tests verify the post-deploy release-record gate; they do NOT simulate
// a real external Work reviewer or count as a production acceptance proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {finishExternalImageRelease} from '../scripts/finalize-external-image-release.mjs';
import {verifyExternalImageLive,checkLiveBinary} from '../scripts/verify-external-image-live.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const DATE='2026-10-11';
function sample(){
  const job={schema_version:'external-compiler-image-job-v1',edition_date:DATE,execution_id:'compiler-'+DATE+'-r1',
    lifecycle:'PUBLISHED_PENDING',source:{commit_sha:'a'.repeat(40),bundle_sha256:'b'.repeat(64)}};
  const jobBytes=Buffer.from(JSON.stringify(job)+'\n');
  const images=Array.from({length:6},(_,i)=>({
    story_id:'story-'+(i+1),route:'briefs/images/'+DATE+'/image-'+(i+1)+'.png',
    sha256:String(i+1).repeat(64),bytes:100
  }));
  const prepared={result:'PREPARED_ONLY',edition_date:DATE,execution_id:job.execution_id,
    source_bundle_sha256:job.source.bundle_sha256,job_sha256:sha(jobBytes),
    staged_package_head:'c'.repeat(40),changed_count:13,oct8_pinned_count:17};
  const verification={result:'PASS',independent_network_byte_checks:true,oct8_checked:17,
    edition_date:DATE,execution_id:job.execution_id,changed_checked:13,controls_checked:11,
    source_bundle_sha256:job.source.bundle_sha256,job_sha256:sha(jobBytes),
    total_http_sha256_checks:41,verified_at:'2026-10-11T01:00:00Z',image_sha256s:images};
  const index={schema_version:'external-compiler-image-index-v1',latest_eligible_date:DATE,
    editions:[{edition_date:DATE,status:'PUBLISHED_PENDING',job_sha256:sha(jobBytes),
      bundle_sha256:job.source.bundle_sha256}]};
  const refs={deployedPagesUrl:BASE,ciHeadSha:'d'.repeat(40),mergeCommitSha:'e'.repeat(40),
    workflowRunUrl:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/123'};
  return {index,jobBytes,prepared,verification,...refs};
}
test('verified release transitions one exact immutable job, retains first-publication identity',()=>{
  const f=sample(),{index,receipt}=finishExternalImageRelease(f);
  assert.equal(receipt.result,'RELEASED_VERIFIED');
  assert.equal(receipt.immutable_job_sha256,sha(f.jobBytes));
  assert.equal(receipt.protected_oct8_objects_verified,17);
  assert.equal(receipt.images.length,6);
  assert.equal(receipt.original_bundle_sha256,'b'.repeat(64));
  assert.equal(receipt.first_publication_original_immutable,true);
  assert.equal(index.editions[0].status,'RELEASED_VERIFIED');
  assert.equal(index.latest_eligible_date,null);
  assert.equal(f.index.editions[0].status,'PUBLISHED_PENDING');
  assert.throws(()=>finishExternalImageRelease({...f,index}),/job_already_released_or_stale/);
});
test('no release from staging only, old history drift, synthetic verification or mismatched edition',()=>{
  const f=sample();
  assert.throws(()=>finishExternalImageRelease({...f,verification:{...f.verification,result:'STAGED_ONLY'}}),/genuine_postdeploy/);
  assert.throws(()=>finishExternalImageRelease({...f,verification:{...f.verification,oct8_checked:16}}),/genuine_postdeploy/);
  assert.throws(()=>finishExternalImageRelease({...f,prepared:{...f.prepared,changed_count:14}}),/genuine_postdeploy/);
  assert.throws(()=>finishExternalImageRelease({...f,verification:{...f.verification,job_sha256:'0'.repeat(64)}}),/genuine_postdeploy/);
  assert.throws(()=>finishExternalImageRelease({...f,ciHeadSha:'unverified'}),/genuine_postdeploy/);
});
test('live verifier forbids incomplete staged six-image packages without any remote requests',async()=>{
  await assert.rejects(verifyExternalImageLive({receipt:{result:'STAGED_ONLY'},stagedSiteRoot:'/',priorHistoryRoot:'/'}),/unqualified_preparation/);
  await assert.rejects(verifyExternalImageLive({receipt:{result:'PREPARED_ONLY',publication_verified:false,changed_paths:[],images:[]},stagedSiteRoot:'/',priorHistoryRoot:'/'}),/unqualified_preparation/);
});
test('independent live byte verifier rejects changed responses without inventing PASS',async()=>{
  const bytes=Buffer.from('exact object');
  const route='briefs/'+DATE+'/index.html';
  const verified=await checkLiveBinary({route,sha256:sha(bytes),bytes:bytes.length,
    fetchImpl:async()=>({status:200,arrayBuffer:async()=>bytes})});
  assert.equal(verified.sha256,sha(bytes));
  await assert.rejects(checkLiveBinary({route,sha256:sha(bytes),bytes:bytes.length,
    fetchImpl:async()=>({status:404,arrayBuffer:async()=>bytes})}),/live_http_404/);
  await assert.rejects(checkLiveBinary({route,sha256:sha(bytes),bytes:bytes.length,
    fetchImpl:async()=>({status:200,arrayBuffer:async()=>Buffer.from('altered')})}),/live_byte_or_sha256/);
});
