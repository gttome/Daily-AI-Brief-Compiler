import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {applyImageCorrectionBatch} from '../operations/image-correction-batch.mjs';
import {buildImageLaneHandoff,IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';

function fixture(ids=['s1']) {
  const bundle={edition_date:'2026-10-08',stories:[{id:'s1',text:'keep'},{id:'s2',text:'keep too'}],images:[{story_id:'s1',path:'old1.png',sha256:'a'.repeat(64)},{story_id:'s2',path:'old2.png',sha256:'b'.repeat(64)}],videos:['unchanged'],watchlist:{new:['unchanged']},producer_receipt:{bound_image_strategy:'proposal1r_legacy'}};
  const assets={}, corrections=ids.map((id,index)=>{
    // Only the signature/IHDR fields are relevant to this byte-binding unit test.
    const bytes=Buffer.alloc(25);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);bytes.write('IHDR',12);bytes.writeUInt32BE(1200,16);bytes.writeUInt32BE(630,20);bytes[24]=index;
    assets[id]=bytes;
    const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
    const git_blob_sha=crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    return {schema_version:'daily-compiler-post-publication-correction-v1',correction_id:'c-'+id,edition_date:bundle.edition_date,requested_at:'2026-10-08T01:00:00Z',requested_by:'owner',correction_type:'replace_image',target:{story_id:id,expected_sha256:bundle.images.find(x=>x.story_id===id).sha256},replacement:{image:{story_id:id,path:'corrections/'+id+'.png',sha256,git_blob_sha,bytes:bytes.length,accepted:true,accepted_locked:true,visual_review:{result:'PASS',reviewed_sha256:sha256,quality_gate_location:'fresh_regular_chat_per_story'}}},reason:'Owner image correction',status:'VALIDATED',semantic_scope:'image_only',correction_revision:1,preserve_original:true,new_execution_allowed:false,protected_pr_required:true,live_verification_required:true};
  });
  return {bundle,assets,corrections,request:{schema_version:'daily-compiler-image-correction-request-v1',request_id:'r1',edition_date:bundle.edition_date,status:'READY_TO_APPLY',story_ids:ids,preserve_original:true,new_execution_allowed:false}};
}
test('selected image correction preserves all semantics, unselected images, and original bundle',()=>{
  const f=fixture(),before=structuredClone(f.bundle),out=applyImageCorrectionBatch(f);
  assert.deepEqual(f.bundle,before);
  for(const key of ['stories','videos','watchlist','producer_receipt']) assert.deepEqual(out.bundle[key],before[key]);
  assert.deepEqual(out.bundle.images[1],before.images[1]);
  assert.notEqual(out.bundle.images[0].sha256,before.images[0].sha256);
  assert.equal(out.receipt.publication_verified,false);
});
test('batch correction replaces all requested images atomically and refuses duplicates or stale targets',()=>{
  const f=fixture(['s1','s2']);assert.equal(applyImageCorrectionBatch(f).receipt.images.length,2);
  const before=structuredClone(f.bundle);f.corrections[1].target.expected_sha256='stale';
  assert.throws(()=>applyImageCorrectionBatch(f),/stale_image/);assert.deepEqual(f.bundle,before);
  const d=fixture(['s1','s2']);d.corrections[1]=structuredClone(d.corrections[0]);assert.throws(()=>applyImageCorrectionBatch(d),/duplicate/);
});
test('mismatched bytes, unreviewed canonical hash, existing paths, and strategy changes fail closed',()=>{
  for(const mutate of [f=>{f.assets.s1[24]++},f=>{f.corrections[0].replacement.image.visual_review.reviewed_sha256='x'},f=>{f.corrections[0].replacement.image.path='old1.png'},f=>{f.corrections[0].replacement.image_system={strategy:'different'}}]){
    const f=fixture();mutate(f);assert.throws(()=>applyImageCorrectionBatch(f));
  }
});
const handoff={edition:'2026-10-09',executionId:'e1',branch:'shadow/2026-10-09',requestPath:'requests/r1.json',requestSha256:'a'.repeat(64),readyAt:'2026-10-09T00:00:00Z',now:'2026-10-09T00:02:00Z'};
test('handoff arms same Work task after readiness with exact edition and hourly limit',()=>{
  const h=buildImageLaneHandoff({...handoff,lastRunAt:'2026-10-09T00:00:00Z'});
  assert.equal(h.due_at,'2026-10-09T01:00:00.000Z');assert.equal(h.automation_update.jawbone_id,IMAGE_TASK_ID);
  assert.equal(h.automation_update.schedule,'BEGIN:VEVENT\nDTSTART:20261009T010000Z\nEND:VEVENT');
  assert.equal(h.scheduler_readback_verified,false);
});
test('verified identical handoff does not reschedule; unverified or changed handoff does',()=>{
  const h=buildImageLaneHandoff(handoff);
  assert.equal(buildImageLaneHandoff({...handoff,previous:h}).action,'ARM_EXISTING_TASK');
  assert.equal(buildImageLaneHandoff({...handoff,previous:{...h,scheduler_readback_verified:true}}).action,'NOOP');
  assert.equal(buildImageLaneHandoff({...handoff,requestSha256:'b'.repeat(64),previous:{...h,scheduler_readback_verified:true}}).action,'ARM_EXISTING_TASK');
});
