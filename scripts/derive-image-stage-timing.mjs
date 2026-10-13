// Deterministically derive image stage durations from exact edition Git commit and release records.
// Read-only Git operation; not an invocation tracker, scheduler probe, or image producer.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const sha40=/^[a-f0-9]{40}$/;
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
const read=(p)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
function plusOne(cycle){
 if(!DATE.test(cycle))throw Error('invalid cycle date');
 const d=new Date(cycle+'T00:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==cycle)throw Error('invalid calendar date');
 d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
}
function git(cwd,...args){
 try{return execFileSync('git',args,{cwd,encoding:'utf8',timeout:12000,maxBuffer:1024*1024}).trim();}
 catch{return null;}
}
const iso=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))?new Date(t).toISOString():null;
const difference=(a,b)=>a&&b&&Date.parse(b)>=Date.parse(a)?Number(((Date.parse(b)-Date.parse(a))/1000).toFixed(3)):null;
function commitTime(cwd,sha,ref='refs/remotes/origin/main'){
 if(!sha40.test(sha??''))return null;
 if(!git(cwd,'cat-file','-e',sha+'^{commit}')){ // cat-file -e emits no output on success; check below
   try{execFileSync('git',['cat-file','-e',sha+'^{commit}'],{cwd,stdio:'ignore'});}
   catch{return null;}
 }
 try{execFileSync('git',['merge-base','--is-ancestor',sha,ref],{cwd,stdio:'ignore'});}
 catch{return null;}
 return iso(git(cwd,'show','-s','--format=%cI',sha));
}
function firstPathCommit(cwd,ref,gitPath){
 // First addition of the real approval receipt, not a subsequent editorial/doc edit.
 const sha=git(cwd,'log','--diff-filter=A','--format=%H','--reverse',ref,'--',gitPath)?.split('\n')[0];
 return sha40.test(sha??'')?{sha,at:commitTime(cwd,sha,ref)}:null;
}
export function deriveImageStageTiming(cycle,evidenceDir,cwd){
 const edition=plusOne(cycle);
 const release=read(path.join(evidenceDir,'image-release.json'));
 const aar=read(path.join(evidenceDir,'image-after-action.json'));
 const review=read(path.join(evidenceDir,'image-context-reviews.json'));
 const start=read(path.join(evidenceDir,'image-scheduled-start.json'));
 const ref='refs/remotes/origin/main';
 const firstSha=aar?.edition_date===edition?aar?.production?.github_binary_stage_commit:null;
 const packageSha=release?.edition_date===edition?release?.exact_head_ci_sha:null;
 const mergeSha=release?.edition_date===edition?release?.protected_main_commit:null;
 const validRelease=release?.edition_date===edition&&release?.result==='RELEASED_VERIFIED'&&
   release?.images?.length===6;
 const firstAt=commitTime(cwd,firstSha,ref);
 const packageAt=commitTime(cwd,packageSha,ref);
 const mergeAt=commitTime(cwd,mergeSha,ref);
 const releaseAt=validRelease?iso(release.verified_at):null;
 const qaPath='external-image-packages/'+edition+'/reviews/live/image-element24/semantic-reviews.json';
 const qa=review?.edition_date===edition&&review?.result==='PASS'&&review?.reviewed_targets===24&&
   review?.expected_targets===24&&review?.criteria?.semantic_defects===0?
   firstPathCommit(cwd,ref,qaPath):null;
 const scheduleAt=start?.cycle_date===cycle&&start?.edition_date===edition&&
   start.host_execution_start_independently_observed===false?iso(start.scheduled_start_at):null;
 const events={
  scheduled_image_task_start:scheduleAt,
  first_accepted_binary_commit:firstAt,
  six_image_package_commit:packageAt,
  protected_image_merge_commit:mergeAt,
  public_release_verified_at:releaseAt,
  final_live_review_approved_commit:qa?.at||null
 };
 const stageSeconds=difference(firstAt,qa?.at||null);
 const releaseSeconds=difference(firstAt,releaseAt);
 const scheduledSeconds=difference(scheduleAt,qa?.at||null);
 const result={
  schema_version:'daily-ai-brief-image-stage-timing-v1',
  cycle_date:cycle,edition_date:edition,
  result:stageSeconds!==null&&validRelease?'DURATIONS_VERIFIED':'INCOMPLETE_SOURCE_TIMING',
  interpretation:'First accepted binary Git checkpoint to final approved 24-context Git review is an auditable persisted-stage duration, not the precise image-generation runtime.',
  actual_generation_start_attested:false,
  events,
  commits:{first_binary_stage:firstSha??null,package_head:packageSha??null,protected_merge:mergeSha??null,final_review_merge:qa?.sha??null},
  durations_seconds:{
   first_accepted_binary_to_final_review:stageSeconds,
   first_accepted_binary_to_public_release:releaseSeconds,
   package_to_protected_merge:difference(packageAt,mergeAt),
   protected_merge_to_public_release:difference(mergeAt,releaseAt),
   public_release_to_final_review:difference(releaseAt,qa?.at||null),
   scheduled_start_to_first_binary:difference(scheduleAt,firstAt),
   scheduled_start_to_final_review:scheduledSeconds
  },
  schedule_duration_provenance:scheduleAt?'Owner-approved one-cycle scheduled clock time; not a verified execution-start event.':'No verified per-cycle scheduled start record. Do not infer precise task start from a saved GitHub contract.',
  timestamp_provenance:'Original accepted binary staging commit, source PR head, protected merge, public Pages release receipt, and first final semantic review commit; all tied to the exact edition.',
  source_refs:{image_production_aar:aar?.edition_date===edition?'external-image-packages/'+edition+'/reviews/after-action.json':null,
    final_context_review:qa?.at?qaPath:null}
 };
 fs.writeFileSync(path.join(evidenceDir,'image-timing.json'),JSON.stringify(result,null,2)+'\n');
 return result;
}
const [cycle,evidenceDir,cwd=process.cwd()]=process.argv.slice(2);
if(!cycle||!evidenceDir)throw Error('usage: node scripts/derive-image-stage-timing.mjs YYYY-MM-DD evidence_dir [git_worktree]');
const output=deriveImageStageTiming(cycle,evidenceDir,cwd);
console.log(JSON.stringify({result:output.result,edition_date:output.edition_date,
  stage_seconds:output.durations_seconds.first_accepted_binary_to_final_review,
  scheduled_window_seconds:output.durations_seconds.scheduled_start_to_final_review}));
