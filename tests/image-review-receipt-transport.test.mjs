import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectCompleteImageReview,prepareImageReviewReceipt} from '../scripts/prepare-image-review-receipt.mjs';
const hex=n=>n.toString(16).padStart(64,'0');
function fixture(){
 const manifest={edition_date:'2026-11-20',images:Array.from({length:6},(_,i)=>({story_id:'story-'+i,sha256:hex(i+1)}))};
 const r={schema_version:'external-image-semantic-pixel-review-v1',edition_date:manifest.edition_date,result:'PASS',expected_targets:24,captured_targets:24,reviewed_pass:24,defects:[],
  targets:manifest.images.flatMap(i=>['dated_brief','permanent_story'].flatMap(context=>['desktop','mobile'].map(viewport=>({
   target_id:`${i.story_id}:${context}:${viewport}`,story_id:i.story_id,context,viewport,
   live_image_sha256:i.sha256,result:'PASS',actual_pixels_inspected:true,correct_story_asset_visible:true,full_diagram_visible:true,
   clipped_or_overlapped:false,placeholder_visible:false,primary_explanatory_labels_recognizable:true,capture_sha256:hex(100),capture_bytes:1000,
   notes:'Original actually inspected saved-pixel findings. '.repeat(100)
  }))))};return {manifest,r,bytes:Buffer.from(JSON.stringify(r,null,2)+'\n')};
}
test('truncated JSON, a missing context, duplicate IDs and wrong image hashes are rejected',()=>{
 const f=fixture();assert.equal(inspectCompleteImageReview(f.bytes,f.manifest).targets,24);
 assert.throws(()=>inspectCompleteImageReview(f.bytes.subarray(0,2000),f.manifest),/truncated_json/);
 for(const mutate of [r=>r.targets.pop(),r=>{r.targets[1]={...r.targets[0]};},r=>{r.targets[0].live_image_sha256=hex(999);},r=>{r.edition_date='2026-11-19';},r=>{r.targets[0].actual_pixels_inspected=false;}]){
  const r=structuredClone(f.r);mutate(r);assert.throws(()=>inspectCompleteImageReview(Buffer.from(JSON.stringify(r)),f.manifest),/required|incomplete_target/);
 }
});
test('complete bytes survive staging and exact readback without stdout payload or overwritten originals',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'image-review-bytes-'));
 try{
  const {manifest,bytes}=fixture(),src=path.join(dir,'original.json'),staged=path.join(dir,'new.json'),remote=path.join(dir,'readback.json'),mf=path.join(dir,'manifest.json');
  fs.writeFileSync(src,bytes);fs.writeFileSync(mf,JSON.stringify(manifest));
  const result=prepareImageReviewReceipt({sourcePath:src,stagedPath:staged,manifest});
  assert.equal(result.result,'COMPLETE_REVIEW_STAGED');assert.ok(fs.readFileSync(staged).equals(bytes));
  assert.throws(()=>prepareImageReviewReceipt({sourcePath:src,stagedPath:src,manifest}),/distinct_new/);
  assert.throws(()=>prepareImageReviewReceipt({sourcePath:src,stagedPath:staged,manifest}),/EEXIST/);
  fs.writeFileSync(remote,bytes);assert.equal(prepareImageReviewReceipt({sourcePath:src,readbackPath:remote,manifest}).result,'COMPLETE_REMOTE_READBACK_MATCH');
  const output=execFileSync(process.execPath,['scripts/prepare-image-review-receipt.mjs','verify-readback',mf,src,remote],{encoding:'utf8'});
  assert.ok(output.length<700);assert.equal(JSON.parse(output).targets,24);assert.doesNotMatch(output,/Original actually inspected/);
  fs.appendFileSync(remote,' ');assert.throws(()=>prepareImageReviewReceipt({sourcePath:src,readbackPath:remote,manifest}),/readback_bytes_differ/);
  assert.ok(fs.readFileSync(src).equals(bytes));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
