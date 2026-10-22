import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preflightLocalImagePromotion} from '../scripts/preflight-image-branch-promotion.mjs';
const prefix='external-image-packages/2026-10-22/';
const manifest=JSON.parse(fs.readFileSync(prefix+'manifest.json','utf8'));
const aar=JSON.parse(fs.readFileSync(prefix+'reviews/after-action.json','utf8'));
test('six real accepted Oct22 PNGs pass local byte-and-AAR prebranch preflight',()=>{
 const r=preflightLocalImagePromotion({manifest,aar,root:'.'});
 assert.equal(r.result,'SIX_LOCAL_IMAGE_BYTES_AND_AAR_READY');
 assert.equal(r.verified_images.length,6);
 assert.equal(r.actual_generation_count,14);
 assert.equal(r.first_pass_count,1);
 assert.equal(r.remote_git_and_ci_and_publication_still_required,true);
});
test('refuse incomplete, unsafe, unreviewed, or modified original images',()=>{
 for(const edit of [
   m=>m.images.pop(),
   m=>m.images[0].path='../unsafe.png',
   m=>m.images[0].sha256='0'.repeat(64),
   m=>m.images[0].visual_review.result='UNVERIFIED'
 ]){
   const m=structuredClone(manifest);edit(m);
   assert.throws(()=>preflightLocalImagePromotion({manifest:m,aar,root:'.'}),/image_local_promotion_preflight/);
 }
 const bad=structuredClone(aar);bad.production.actual_generation_count=6;
 assert.throws(()=>preflightLocalImagePromotion({manifest,aar:bad,root:'.'}),/image_local_promotion_preflight/);
});
