import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planImageElementTargets,evaluateImageTargetEvidence} from '../scripts/capture-image-element24.mjs';
const job=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/source/job.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/manifest.json','utf8'));
test('I3 uses actual Oct10 six-image receipt, story/slot pairing regardless of manifest order',()=>{
 const a=planImageElementTargets({job,manifest});
 const b=planImageElementTargets({job,manifest:{...manifest,images:[...manifest.images].reverse()}});
 assert.equal(a.length,24);
 assert.deepEqual(a,b);
 assert.equal(a.filter(x=>x.viewport==='desktop').length,12);
 assert.equal(a.filter(x=>x.viewport==='mobile').length,12);
 assert.equal(new Set(a.map(x=>x.image_url)).size,6);
});
test('I3 header-only automated screenshots never prove actual target or semantic pixels',()=>{
 const targets=planImageElementTargets({job,manifest});
 assert.equal(evaluateImageTargetEvidence({targets,rows:[]}).result,'BLOCKED_INCOMPLETE');
 const headerOnly=targets.map(t=>({...t,target_id:t.target_id,page_url:t.page_url,
  image_url:t.image_url,live_image_sha256:t.expected_sha256,alt_text:t.expected_alt_text,
  natural_width:1200,natural_height:630,img_complete:true,
  image_in_capture:false,horizontal_overflow:false,clip_pass:true,
  screenshot_sha256:'a'.repeat(64),screenshot_path:'header.png'}));
 assert.equal(evaluateImageTargetEvidence({targets,rows:headerOnly}).result,'BLOCKED_INCOMPLETE');
 const actual=headerOnly.map(x=>({...x,image_in_capture:true}));
 assert.equal(evaluateImageTargetEvidence({targets,rows:actual}).result,'BLOCKED_INCOMPLETE');
 const reviews=targets.map(t=>({target_id:t.target_id,result:'PASS',inspection_method:'semantic_pixel_inspection',reviewer:'actual-reviewer',
  screenshot_sha256:'a'.repeat(64),accepted_image_sha256:t.expected_sha256,
  small_text_legible:true,no_clipping_overlap_pseudotext:true,story_mechanism_correct:true}));
 assert.equal(evaluateImageTargetEvidence({targets,rows:actual,reviews}).result,'VISUAL_24_VERIFIED');
 assert.equal(evaluateImageTargetEvidence({targets,rows:actual,reviews:reviews.slice(0,12)}).result,'BLOCKED_INCOMPLETE');
});
