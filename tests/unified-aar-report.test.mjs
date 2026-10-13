import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

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
function run(overrides={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'combined-aar-test-'));
 const input=path.join(tmp,'in'),output=path.join(tmp,'out');
 fs.mkdirSync(input,{recursive:true});
 const items={...evidence,...overrides};
 for(const [key,value] of Object.entries(items))if(value!==null)fs.writeFileSync(path.join(input,key+'.json'),JSON.stringify(value));
 const res=spawnSync(process.execPath,[script,cy,input,output],{encoding:'utf8'});
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
 assert.match(md,/Image processing stage duration/);
 assert.match(md,/18m 04s/);
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
