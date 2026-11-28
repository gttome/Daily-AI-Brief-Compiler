import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {summarizeImageFirstExports,summarizeImageLiveFindings,renderImageLiveFindings} from '../scripts/image-aar-contract.mjs';
import {reportImageLayoutRollout} from '../scripts/report-image-layout-rollout.mjs';

const edition='2026-11-29', hash=n=>n.toString(16).padStart(64,'0');
function fixture(){
 const images=Array.from({length:6},(_,i)=>({story_id:'story-'+i,sha256:hash(i+1)}));
 const manifest={edition_date:edition,job_sha256:hash(100),images};
 const aar={edition_date:edition,job_sha256:manifest.job_sha256,images:images.map((i,n)=>({...i,generation_attempts:n<4?1:2})),
  production:{accepted_count:6,actual_generation_count:8,rejected_count:2},first_export_observations:images.map((i,n)=>({
   story_id:i.story_id,first_export_sha256:hash(n+50),insets_px:{left:60,top:60,right:60,bottom:n===1?38:60},
   mobile_320:n===1?'ISSUE':'PASS',export_only_reexports:n===1?1:0,evidence_path:'external-image-packages/'+edition+'/reviews/first-'+n+'.json'
 }))};
 return {manifest,aar};
}
test('first export metrics preserve true zeros and do not inflate native call count',()=>{
 const f=fixture();
 const q=summarizeImageFirstExports({edition,...f});
 assert.deepEqual([q.first_native_accepts,q.native_calls,q.rejected_native_candidates,q.export_only_reexports,q.first_export_margin_failures,q.work_usage_percent],[4,8,2,1,1,null]);
 f.aar.first_export_observations[0].evidence_path='external-image-packages/'+edition+'/reviews/../unknown';
 f.aar.usage={work_usage_percent:0};
 const partial=summarizeImageFirstExports({edition,...f});
 assert.equal(partial.export_only_reexports,null);assert.equal(partial.first_export_margin_failures,null);
 assert.equal(partial.rows[0].mobile_320,'UNKNOWN');assert.equal(partial.work_usage_percent,0);
 assert.equal(summarizeImageFirstExports({edition:'2026-11-28',...f}),null);
});
test('live findings distinguish inspected issues, explicit gaps, and technical capture only',()=>{
 const {manifest}=fixture(), i=manifest.images[0];
 const release={edition_date:edition,actions_run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/123'};
 const t={target_id:i.story_id+':dated_brief:desktop',story_id:i.story_id,context:'dated_brief',viewport:'desktop',
  live_image_sha256:i.sha256,capture_sha256:hash(150),capture_bytes:100,actual_pixels_inspected:true,result:'PASS',
  correct_story_asset_visible:true,full_diagram_visible:true,clipped_or_overlapped:false,placeholder_visible:false,primary_explanatory_labels_recognizable:true};
 const review={edition_date:edition,schema_version:'external-image-semantic-pixel-review-v1',evidence_source:{workflow_run_id:123},targets:[
  t,{...t,target_id:i.story_id+':dated_brief:mobile',viewport:'mobile',result:'ISSUE',finding:'Small labels cannot be read.'},
  {...t,target_id:i.story_id+':permanent_story:desktop',context:'permanent_story',result:'GAP',actual_pixels_inspected:false,finding:'Capture could not be retrieved.'}]};
 const q=summarizeImageLiveFindings({edition,manifest,release,review,liveVerified:true});
 assert.equal(q.targets.length,24);assert.deepEqual([q.pass_count,q.issue_count,q.gap_count],[1,1,22]);
 assert.match(renderImageLiveFindings(q).join('\n'),/Capture could not be retrieved/);
 assert.equal(summarizeImageLiveFindings({edition,manifest,release,review:{...review,evidence_source:{workflow_run_id:124}},liveVerified:true}).pass_count,0);
 review.targets.push(t);
 assert.equal(summarizeImageLiveFindings({edition,manifest,release,review,liveVerified:true}).pass_count,0);
});
test('three-edition follow-up preserves the earlier seven-edition window and missing evidence',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nov28-rollout-'));
 try{
  const dir=path.join(tmp,'image-jobs');fs.mkdirSync(dir);
  const dates=['2026-11-26','2026-11-27','2026-11-28','2026-11-29','2026-12-01','2026-12-02','2026-12-03'];
  fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({editions:dates.map(edition_date=>({edition_date,status:'PUBLISHED_PENDING'}))}));
  const r=reportImageLayoutRollout({repo:tmp,site:tmp,through:'2026-12-03'});
  assert.deepEqual(r.rows.map(e=>e.edition),dates);
  assert.deepEqual(r.november28_followup.rows.map(e=>e.edition),dates.slice(3,6));
  assert.ok(r.november28_followup.rows.every(e=>e.efficiency==='NOT_EVIDENCED'&&e.export_only_reexports===null));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
