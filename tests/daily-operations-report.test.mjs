import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDailyReports,renderMarkdown} from '../scripts/compile-daily-aar.mjs';
test('two no-start AARs + rollup are created from absent source receipts without fake failure or success',()=>{
 const x=compileDailyReports({cycleDate:'2026-10-11'});
 for(const lane of ['compiler','images']){
  assert.equal(x[lane].execution,'NO_START_RECEIPT');
  assert.equal(x[lane].result,'NOT_OBSERVED');
  assert.equal(x[lane].publication,'UNKNOWN');
  assert.equal(x[lane].scheduled_host_mode,'UNPROVEN');
 }
 assert.equal(x['daily-rollup'].combined_result,'NOT_OBSERVED');
 assert.equal(x['daily-rollup'].edition_date,'2026-10-12');
 assert.match(renderMarkdown(x.images),/NO_START_RECEIPT/);
});
test('actual public integrity can establish Compiler publication, but NOT scheduled mode',()=>{
 const date='2026-10-12';
 const evidence={
  'compiler-state':{edition_date:date,execution_id:'r1',state:'SHADOW_VERIFIED',
    reader_parity:{result:'PASS'},started_at:'2026-10-11T23:00:00Z',updated_at:'2026-10-12T00:00:00Z'},
  'producer-receipt':{edition_date:date,execution_id:'r1',result:'PASS',scheduled_execution:false},
  'compile-receipt':{edition_date:date,result:'PASS'},
  'postpublish-integrity':{edition_date:date,result:'PASS',mode:'postdeploy',oct8_protected_count:17,
    live_http_and_sha256:[{url:'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/'+date+'/',status:200,sha256:'a'.repeat(64)}]}
 };
 const x=compileDailyReports({cycleDate:'2026-10-11',evidence});
 assert.equal(x.compiler.publication,'VERIFIED');
 assert.equal(x.compiler.result,'SUCCESS');
 assert.equal(x.compiler.elapsed_minutes,60);
 assert.equal(x.compiler.scheduled_host_mode,'UNPROVEN');
 assert.equal(x.images.result,'NOT_OBSERVED');
});
test('an image released with six hashes but no 24 pixel reviews stays PARTIAL overall',()=>{
 const date='2026-10-12',source={commit_sha:'b'.repeat(40),bundle_sha256:'c'.repeat(64)};
 const evidence={
  'image-job':{edition_date:date,execution_id:'j1',source,lifecycle:'PUBLISHED_PENDING'},
  'image-release':{edition_date:date,execution_id:'j1',result:'RELEASED_VERIFIED',
    immutable_job_sha256:'d'.repeat(64),original_source_commit_sha:source.commit_sha,
    original_bundle_sha256:source.bundle_sha256,independent_http_sha256_checks:44,
    protected_oct8_objects_verified:17,verified_at:'2026-10-12T03:00:00Z',
    images:Array.from({length:6},(_,i)=>({story_id:'a'+i,sha256:String(i).repeat(64)}))}
 };
 evidence['image-manifest']={schema_version:'external-compiler-image-package-v1',edition_date:date,job_sha256:'d'.repeat(64),
  original_bundle_sha256:source.bundle_sha256,original_source_commit_sha:source.commit_sha,
  images:evidence['image-release'].images.map(x=>({story_id:x.story_id,sha256:x.sha256,accepted_locked:true}))};
 const x=compileDailyReports({cycleDate:'2026-10-11',evidence,hashes:{'image-job':'d'.repeat(64)}});
 assert.equal(x.images.publication,'VERIFIED');
 assert.equal(x.images.result,'PARTIAL');
 assert.equal(x.images.reviewed_24_contexts,null);
 assert.equal(x.images.scheduled_host_mode,'UNPROVEN');
 const reviews=evidence['image-release'].images.flatMap(x=>
  ['dated_brief','permanent_story'].flatMap(context=>['desktop','mobile'].map(device=>({
   target_id:x.story_id+':'+context+':'+device,result:'PASS',
   inspection_method:'semantic_pixel_inspection',screenshot_sha256:'e'.repeat(64),
   accepted_image_sha256:x.sha256,small_text_legible:true,
   no_clipping_overlap_pseudotext:true,story_mechanism_correct:true}))));
 evidence['image-context-verification']={schema_version:'external-image-element24-verification-v1',
  result:'VISUAL_24_VERIFIED',expected_targets:24,captured_targets:24,
  reviewed_pass:24,defects:[],automatic_screenshot_count_not_visual_pass:true};
 evidence['image-context-reviews']={schema_version:'external-image-element24-semantic-review-v7',
  edition_date:date,reviews};
 const y=compileDailyReports({cycleDate:'2026-10-11',evidence,
  hashes:{'image-job':'d'.repeat(64),'image-context-reviews':'a'.repeat(64)}});
 assert.equal(y.images.result,'SUCCESS');
 assert.equal(y.images.reviewed_24_contexts,24);
 evidence['image-context-reviews'].reviews[0].accepted_image_sha256='0'.repeat(64);
 assert.equal(compileDailyReports({cycleDate:'2026-10-11',evidence,
  hashes:{'image-job':'d'.repeat(64)}}).images.reviewed_24_contexts,null);
 assert.equal(x['daily-rollup'].combined_result,'PARTIAL');
});
test('stale previous-day state never contaminates current-cycle reports',()=>{
 const x=compileDailyReports({cycleDate:'2026-10-11',
  evidence:{'compiler-state':{edition_date:'2026-10-11',state:'SHADOW_VERIFIED'},
   'image-release':{edition_date:'2026-10-11',result:'RELEASED_VERIFIED'}}});
 assert.equal(x.compiler.execution,'NO_START_RECEIPT');
 assert.equal(x.images.execution,'NO_START_RECEIPT');
});
test('workflow cannot trigger publisher, generate content, enable AI tasks, or target protected main',()=>{
 const w=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');
 assert.match(w,/operations-reports/);
 assert.match(w,/America\/Chicago/);
 assert.match(w,/compile-daily-aar\.mjs/);
 assert.match(w,/NO.?START.?RECEIPT|Reconcile previous 14 cycles/);
 assert.doesNotMatch(w,/\b(?:repository_dispatch|actions\/deploy-pages|render-shadow-images|image-only-replacement)\b/);
 assert.doesNotMatch(w,/\b(?:openai|codex|work-execution|genai)\b/i);
});
