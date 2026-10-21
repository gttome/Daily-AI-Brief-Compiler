import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'scripts/derive-image-stage-timing.mjs');
const cycle='2026-10-12', edition='2026-10-13';
const runGit=(cwd,args,env={})=>execFileSync('git',args,{cwd,env:{...process.env,...env},encoding:'utf8'}).trim();

function setup(){
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'image-stage-duration-'));
 const evidence=path.join(d,'evidence');fs.mkdirSync(evidence);
 runGit(d,['init','-q']);
 runGit(d,['config','user.name','Test']);
 runGit(d,['config','user.email','test@example.com']);
 const commit=(name,time)=>{
   const p=path.join(d,name);fs.mkdirSync(path.dirname(p),{recursive:true});
   fs.writeFileSync(p,time+'\n');runGit(d,['add','--',name]);
   runGit(d,['commit','-q','-m',name],{GIT_AUTHOR_DATE:time,GIT_COMMITTER_DATE:time});
   return runGit(d,['rev-parse','HEAD']);
 };
 // Emulate the real protected GitHub squash merge: original image source branch
 // contains the first binary+package commits, while main has an independent merge.
 const base=commit('README.md','2026-10-13T01:30:00+00:00');
 const first=commit('external-image-packages/2026-10-13/images/first.png','2026-10-13T01:35:05+00:00');
 const pkg=commit('external-image-packages/2026-10-13/manifest.json','2026-10-13T01:39:30+00:00');
 runGit(d,['update-ref','refs/heads/image-package/2026-10-13-recurring-v8',pkg]);
 runGit(d,['reset','--hard',base]);
 const merge=commit('packages/merge-receipt.txt','2026-10-13T01:42:22+00:00');
 const review=commit('external-image-packages/2026-10-13/reviews/live/image-element24/semantic-reviews.json','2026-10-13T01:53:09+00:00');
 runGit(d,['update-ref','refs/remotes/origin/main',review]);
 const input=(name,data)=>fs.writeFileSync(path.join(evidence,name+'.json'),JSON.stringify(data));
 input('image-after-action',{edition_date:edition,production:{github_binary_stage_commit:first}});
 input('image-release',{edition_date:edition,result:'RELEASED_VERIFIED',
   images:Array.from({length:6},(_,i)=>({story_id:'story-'+i,sha256:String(i).repeat(64)})),
   exact_head_ci_sha:pkg,protected_main_commit:merge,verified_at:'2026-10-13T01:43:06.955Z'});
 input('image-context-reviews',{edition_date:edition,result:'PASS',reviewed_targets:24,expected_targets:24,criteria:{semantic_defects:0}});
 input('image-scheduled-start',{cycle_date:cycle,edition_date:edition,scheduled_start_at:'2026-10-12T20:15:00-05:00',host_execution_start_independently_observed:false});
 const run=()=>{
   const x=spawnSync(process.execPath,[script,cycle,evidence,d],{encoding:'utf8'});
   assert.equal(x.status,0,x.stderr);
   return JSON.parse(fs.readFileSync(path.join(evidence,'image-timing.json'),'utf8'));
 };
 return {d,evidence,input,run,first,pkg,merge,review};
}

test('verified image stage uses original git binary and approved review, not inferred host start',()=>{
 const ctx=setup();
 try{
  const x=ctx.run();
  assert.equal(x.result,'DURATIONS_VERIFIED');
  assert.equal(x.actual_generation_start_attested,false);
  assert.equal(x.durations_seconds.first_accepted_binary_to_final_review,1084);
  assert.equal(x.durations_seconds.scheduled_start_to_final_review,2289);
  assert.equal(x.durations_seconds.scheduled_start_to_first_binary,1205);
  assert.equal(x.durations_seconds.package_to_protected_merge,172);
  assert.equal(x.durations_seconds.first_accepted_binary_to_public_release,481.955);
  assert.equal(x.commits.final_review_merge,ctx.review);
 }finally{fs.rmSync(ctx.d,{force:true,recursive:true});}
});

test('missing special schedule anchor never fabricates scheduled-to-end elapsed time',()=>{
 const ctx=setup();
 try{
  fs.unlinkSync(path.join(ctx.evidence,'image-scheduled-start.json'));
  const x=ctx.run();
  assert.equal(x.result,'DURATIONS_VERIFIED');
  assert.equal(x.durations_seconds.first_accepted_binary_to_final_review,1084);
  assert.equal(x.durations_seconds.scheduled_start_to_final_review,null);
  assert.equal(x.events.scheduled_image_task_start,null);
 }finally{fs.rmSync(ctx.d,{force:true,recursive:true});}
});

test('missing direct 24-context review fails closed for terminal stage duration',()=>{
 const ctx=setup();
 try{
  ctx.input('image-context-reviews',{edition_date:edition,result:'CAPTURED_UNREVIEWED',reviewed_targets:0,expected_targets:24});
  const x=ctx.run();
  assert.equal(x.result,'INCOMPLETE_SOURCE_TIMING');
  assert.equal(x.events.final_live_review_approved_commit,null);
  assert.equal(x.durations_seconds.first_accepted_binary_to_final_review,null);
 }finally{fs.rmSync(ctx.d,{force:true,recursive:true});}
});

test('invalid or inaccessible binary-stage commit cannot produce duration',()=>{
 const ctx=setup();
 try{
  ctx.input('image-after-action',{edition_date:edition,production:{github_binary_stage_commit:'f'.repeat(40)}});
  const x=ctx.run();
  assert.equal(x.result,'INCOMPLETE_SOURCE_TIMING');
  assert.equal(x.durations_seconds.first_accepted_binary_to_final_review,null);
 }finally{fs.rmSync(ctx.d,{force:true,recursive:true});}
});
test('read-only cloned main retrieves exact date-bound original package commit after squash',()=>{
 const ctx=setup();
 try{
  const bare=path.join(ctx.d,'remote.git');
  execFileSync('git',['init','--bare','-q',bare],{cwd:ctx.d});
  runGit(ctx.d,['remote','add','origin',bare]);
  runGit(ctx.d,['push','-q','origin','HEAD:refs/heads/main']);
  runGit(ctx.d,['push','-q','origin','refs/heads/image-package/2026-10-13-recurring-v8:refs/heads/image-package/2026-10-13-recurring-v8']);
  const checkout=path.join(ctx.d,'isolated-checkout');
  execFileSync('git',['clone','-q','--no-local','--single-branch','--branch','main','file://'+bare,checkout],{cwd:ctx.d});
  // The accepted feature commits were squash-merged, so this clone lacks them.
  assert.throws(()=>execFileSync('git',['cat-file','-e',ctx.pkg+'^{commit}'],{cwd:checkout,stdio:'ignore'}));
  const proc=spawnSync(process.execPath,[script,cycle,ctx.evidence,checkout],{encoding:'utf8'});
  assert.equal(proc.status,0,proc.stderr);
  const rec=JSON.parse(fs.readFileSync(path.join(ctx.evidence,'image-timing.json'),'utf8'));
  assert.equal(rec.result,'DURATIONS_VERIFIED');
  assert.equal(rec.durations_seconds.first_accepted_binary_to_final_review,1084);
  assert.equal(rec.durations_seconds.scheduled_start_to_final_review,2289);
 }finally{fs.rmSync(ctx.d,{force:true,recursive:true});}
});

test('source-bound, executor-reported generation clock is separate from planned schedule and checkpoint',()=>{
 const ctx=setup();
 try {
  ctx.input('image-after-action',{edition_date:edition,production:{
   github_binary_stage_commit:ctx.first,
   host_execution_observed_at:'2026-10-13T01:33:50Z',
   host_execution_observation_source:'executor_observed_in_same_invocation',
   generation_started_at:'2026-10-13T01:34:15Z',
   generation_start_source:'executor_observed_before_first_native_call'
  }});
  ctx.input('image-worker-state',{edition_date:edition,claimed_at:'2026-10-13T01:33:55Z'});
  const x=ctx.run();
  assert.equal(x.actual_generation_start_attested,true);
  assert.equal(x.scheduler_actual_invocation_attested,false);
  assert.equal(x.events.host_execution_first_observed_at,'2026-10-13T01:33:50.000Z');
  assert.equal(x.events.native_generation_first_observed_at,'2026-10-13T01:34:15.000Z');
  assert.equal(x.durations_seconds.executor_observed_generation_to_first_binary,50);
  const aar=JSON.parse(fs.readFileSync(path.join(ctx.evidence,'image-after-action.json')));
  aar.production.generation_started_at='2026-10-13T01:36:00Z';
  ctx.input('image-after-action',aar);
  const invalid=ctx.run();
  assert.equal(invalid.actual_generation_start_attested,false);
  assert.equal(invalid.durations_seconds.executor_observed_generation_to_final_review,null);
 }finally{fs.rmSync(ctx.d,{force:true,recursive:true});}
});
