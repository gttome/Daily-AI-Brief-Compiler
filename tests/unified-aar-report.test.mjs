import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compileDailyReports} from '../scripts/compile-daily-aar.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'scripts/render-unified-production-aar.mjs');
const ed='2026-10-13', cy='2026-10-12';
const url='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const name=i=>'oct13-test-'+i;
const sha=i=>i.toString(16).padStart(64,'0');
const imgs=Array.from({length:6},(_,i)=>({story_id:name(i),sha256:sha(i+1),route:'briefs/images/'+ed+'/test'+i+'.png',bytes:800000}));
const evidence={
  'compiler-state':{edition_date:ed,state:'SHADOW_VERIFIED',bundle:{status:'BUNDLE_READY'},started_at:'2026-10-13T00:21:02Z',updated_at:'2026-10-13T00:39:04Z',reader_parity:{result:'PASS'}},
  'compile-receipt':{edition_date:ed,result:'PASS'},
  'postpublish-integrity':{edition_date:ed,result:'PASS',oct8_protected_count:17,live_http_and_sha256:[{url:url+'briefs/'+ed+'/',status:200}]},
  'edition-bundle':{edition_date:ed,stories:imgs.map((x,i)=>({id:x.story_id,headline:'Test mechanism '+i,focus:i<2?'Technical AI Engineering':i<4?'Applied AI':'Agents for Everyone'})),videos:[{},{}],podcasts:[{},{}]},
  'image-release':{edition_date:ed,result:'RELEASED_VERIFIED',images:imgs,independent_http_sha256_checks:44,protected_oct8_objects_verified:17},
  'image-manifest':{edition_date:ed,images:imgs},
  'image-after-action':{edition_date:ed,production:{actual_generation_count:8,accepted_count:6,rejected_count:2,accepted_art_regenerated_after_lock:0},errors:[{phase:'quality',issue:'Initial label defect',correction:'Corrected before acceptance'}]},
  'image-context-reviews':{edition_date:ed,result:'PASS',reviewed_targets:24,expected_targets:24,criteria:{semantic_defects:0},stories:imgs.map(x=>({story_id:x.story_id,result:'PASS',live_image_sha256:x.sha256,targets:Array.from({length:4},()=>({result:'PASS'}))}))},
  'image-timing':{edition_date:ed,result:'DURATIONS_VERIFIED',events:{
    scheduled_image_task_start:'2026-10-13T01:15:00Z',
    first_accepted_binary_commit:'2026-10-13T01:35:05Z',
    six_image_package_commit:'2026-10-13T01:39:30Z',
    protected_image_merge_commit:'2026-10-13T01:42:22Z',
    public_release_verified_at:'2026-10-13T01:43:06.955Z',
    final_live_review_approved_commit:'2026-10-13T01:53:09Z'},
    durations_seconds:{first_accepted_binary_to_final_review:1084,
      first_accepted_binary_to_public_release:481.955,
      scheduled_start_to_final_review:2289}},
  'owner-usage':{cycle_date:cy,edition_date:ed,work_usage_percent:2,source:'owner_reported_in_chat'}
};
function run(overrides={},relocated=false){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'combined-aar-test-'));
 const input=path.join(tmp,'in'),output=path.join(tmp,'out');
 fs.mkdirSync(input,{recursive:true});
 const items={...evidence,...overrides};
 for(const [key,value] of Object.entries(items))if(value!==null)fs.writeFileSync(path.join(input,key+'.json'),JSON.stringify(value));
 let executable=script;
 if(relocated){
  executable=path.join(tmp,'render-unified-production-aar.mjs');
  fs.copyFileSync(script,executable);
  fs.copyFileSync(path.join(root,'scripts/image-aar-contract.mjs'),path.join(tmp,'image-aar-contract.mjs'));
 }
 const res=spawnSync(process.execPath,[executable,cy,input,output],{encoding:'utf8'});
 assert.equal(res.status,0,res.stderr||res.stdout);
 const meta=JSON.parse(fs.readFileSync(path.join(output,'combined.json'),'utf8'));
 const md=fs.readFileSync(path.join(output,'combined.md'),'utf8');
 fs.rmSync(tmp,{recursive:true,force:true});
 return {meta,md};
}
test('full source, final release and direct reviews => complete combined report',()=>{
 const {meta,md}=run();
 assert.equal(meta.result,'COMPLETE');
 assert.equal(meta.visual_24_pass,true);
 assert.equal(meta.image_count,6);
 assert.equal(meta.work_usage_percent,2);
 assert.match(md,/2%/);
 assert.match(md,/mermaid/);
 assert.match(md,/<table>/);
 assert.match(md,/44/);
 assert.match(md,/Production stage durations/);
 assert.match(md,/Compiler 18m 02s/);
 assert.match(md,/Image processing stage duration/);
 assert.match(md,/18m 04s/);
 // Keep both stage durations visible together in the management dashboard.
 assert.match(md,/\| \*\*Compiler stage duration\*\* \| \*\*18m 02s \(18\.0 min\)\*\* \|[^\n]*\n\| \*\*Image processing stage duration\*\* \|/);
 assert.match(md,/38m 09s/);
 assert.match(md,/8:35:05 PM/);
 assert.doesNotMatch(md,/img\.shields\.io/);
 assert.doesNotMatch(md,/> \[!(?:IMPORTANT|TIP|NOTE|WARNING)\]/);
 assert.match(md,/🟩/);
});
test('owner usage is truly optional and never copied from previous cycles',()=>{
 const {meta,md}=run({'owner-usage':null});
 assert.equal(meta.result,'COMPLETE');
 assert.equal(meta.work_usage_percent,null);
 assert.match(md,/Not reported/);
 assert.doesNotMatch(md,/weekly Work usage reported by owner \| \*\*2%/i);
 const stale=run({'owner-usage':{cycle_date:'2026-10-11',edition_date:ed,work_usage_percent:2}});
 assert.equal(stale.meta.work_usage_percent,null);
});
test('public reader alone never promotes missing six-image release to complete',()=>{
 const {meta}=run({'image-release':null});
 assert.equal(meta.result,'PARTIAL');
 assert.equal(meta.images_released,false);
});
test('screenshots without 24 passing actual context reviews cannot certify quality',()=>{
 const v={...evidence['image-context-reviews'],reviewed_targets:0};
 const {meta}=run({'image-context-reviews':v});
 assert.equal(meta.result,'PARTIAL');
 assert.equal(meta.visual_24_pass,false);
});

test('missing auditable image timestamps never fabricates active runtime',()=>{
 const {md}=run({'image-timing':null});
 assert.match(md,/Image processing stage duration/);
 assert.match(md,/Not independently recorded/);
 assert.doesNotMatch(md,/18m 04s/);
});


const pixelReview={
  schema_version:'external-image-semantic-pixel-review-v1',
  edition_date:ed,result:'PASS',
  evidence_source:{workflow_run_id:12345,artifact_id:999},
  expected_targets:24,captured_targets:24,reviewed_pass:24,defects:[],
  targets:imgs.flatMap((im,index)=>['dated_brief','permanent_story'].flatMap(context=>
    ['desktop','mobile'].map(viewport=>({
      target_id:im.story_id+':'+context+':'+viewport,
      story_id:im.story_id,context,viewport,capture_sha256:sha(index+31),capture_bytes:2048,
      actual_pixels_inspected:true,correct_story_asset_visible:true,full_diagram_visible:true,
      clipped_or_overlapped:false,placeholder_visible:false,
      primary_explanatory_labels_recognizable:true,result:'PASS'
    }))))
};
const pixelRelease={...evidence['image-release'],
  actions_run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/12345'};
test('new exact 24-target saved-pixel review certifies a completed combined AAR',()=>{
  const {meta,md}=run({'image-release':pixelRelease,'image-context-reviews':pixelReview});
  assert.equal(meta.result,'COMPLETE');
  assert.equal(meta.visual_24_pass,true);
  assert.match(md,/semantic-pixel-review\.json/);
  assert.match(md,/24\/24 PASS/);
});
test('24 screenshots alone do not certify visual success without actual pixel inspection',()=>{
  const changed={...pixelReview,targets:pixelReview.targets.map((t,i)=>i===0?
    {...t,actual_pixels_inspected:false}:t)};
  const {meta}=run({'image-release':pixelRelease,'image-context-reviews':changed});
  assert.equal(meta.result,'PARTIAL');
  assert.equal(meta.visual_24_pass,false);
});
test('strict per-lane AAR accepts the same live release and real 24-pixel receipt',()=>{
  const digest='c'.repeat(64);
  const src='a'.repeat(40),bundleSha='b'.repeat(64);
  const job={edition_date:ed,source:{commit_sha:src,bundle_sha256:bundleSha}};
  const release={...pixelRelease,original_source_commit_sha:src,original_bundle_sha256:bundleSha,
    immutable_job_sha256:digest};
  const manifest={schema_version:'external-compiler-image-package-v1',edition_date:ed,
    job_sha256:digest,original_bundle_sha256:bundleSha,original_source_commit_sha:src,
    images:imgs.map(i=>({...i,accepted_locked:true}))};
  const compiled=compileDailyReports({cycleDate:cy,evidence:{
    'image-job':job,'image-release':release,'image-manifest':manifest,
    'image-context-reviews':pixelReview
  },hashes:{'image-job':digest,'image-context-reviews':'d'.repeat(64)}});
  assert.equal(compiled.images.result,'SUCCESS');
  assert.equal(compiled.images.publication,'VERIFIED');
  assert.equal(compiled.images.reviewed_24_contexts,24);
  const incomplete=compileDailyReports({cycleDate:cy,evidence:{
    'image-job':job,'image-release':release,'image-manifest':manifest,
    'image-context-reviews':{...pixelReview,targets:pixelReview.targets.slice(1)}
  },hashes:{'image-job':digest}});
  assert.equal(incomplete.images.result,'PARTIAL');
  assert.equal(incomplete.images.reviewed_24_contexts,null);
});
test('daily reporting collects and watches both semantic-review schemas without publishing',()=>{
  const wf=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');
  assert.match(wf,/reviews\/live\/semantic-pixel-review\.json/);
  assert.match(wf,/reviews\/live\/image-element24\/semantic-reviews\.json/);
  assert.doesNotMatch(wf,/uses: actions\/deploy-pages@/);
});
test('contradictory source chronology is visible and cannot become full COMPLETE',()=>{
 const b=structuredClone(evidence['edition-bundle']);b.stories[0].source={retrieved_at:'2026-10-13T01:12:00Z',read_evidence:{read_at:'2026-10-13T01:12:00Z'}};
 const {meta,md}=run({'edition-bundle':b});
 assert.equal(meta.result,'PARTIAL');assert.equal(meta.publication_and_visual_complete,true);
 assert.ok(meta.provenance_warnings.length);assert.match(md,/PROVENANCE WARNING/);
});

test('report renderer runs from the workflow temporary directory with its copied dependency',()=>{
 const {meta}=run({},true);assert.equal(meta.result,'COMPLETE');
 const workflow=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');
 assert.match(workflow,/cp scripts\/image-aar-contract\.mjs/);
});
