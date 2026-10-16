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
function commitExists(cwd,sha){
 if(!sha40.test(sha??''))return false;
 try{execFileSync('git',['cat-file','-e',sha+'^{commit}'],{cwd,stdio:'ignore'});return true;}
 catch{return false;}
}
function commitTime(cwd,sha,ref='refs/remotes/origin/main'){
 if(!commitExists(cwd,sha)||!sha40.test(ref??'')&&!ref?.startsWith('refs/'))return null;
 try{execFileSync('git',['merge-base','--is-ancestor',sha,ref],{cwd,stdio:'ignore'});}
 catch{return null;}
 return iso(git(cwd,'show','-s','--format=%cI',sha));
}
function fetchBoundPackageHead(cwd,edition,sha){
 // The accepted feature commits often disappear from protected main after a squash merge.
 // Fetch the *exact receipt-bound* feature head, never a guessed previous cycle or another PR.
 if(!sha40.test(sha??''))return false;
 if(commitExists(cwd,sha))return true;
 // Prefer an advertised exact-cycle image package branch, if still retained.
 // Validate it resolves to the same immutable package head bound by the release.
 const advertised=git(cwd,'ls-remote','--heads','origin','refs/heads/image-package/'+edition+'-*')||'';
 const exact=advertised.split('\n').map(s=>s.trim().split(/\s+/))
   .find(([head,ref])=>head===sha&&ref?.startsWith('refs/heads/image-package/'+edition+'-'));
 if(exact){
   try{execFileSync('git',['fetch','-q','origin',exact[1]],{cwd,stdio:'ignore',timeout:20000});}
   catch{/* Fall through to immutable SHA fetching. */}
   if(commitExists(cwd,sha))return true;
 }
 try{
   execFileSync('git',['fetch','-q','origin',sha],{cwd,stdio:'ignore',timeout:20000});
   return commitExists(cwd,sha);
 }catch{return false;}
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
 // This is still the original protected PR source head if main used squash merge.
 // Its Git parent history proves the accepted original binary staging commit.
 const packageResolved=fetchBoundPackageHead(cwd,edition,packageSha);
 const mergeSha=release?.edition_date===edition?release?.protected_main_commit:null;
 const validRelease=release?.edition_date===edition&&release?.result==='RELEASED_VERIFIED'&&
   release?.images?.length===6;
 const firstAt=packageResolved?commitTime(cwd,firstSha,packageSha):null;
 const packageAt=packageResolved?commitTime(cwd,packageSha,packageSha):null;
 const mergeAt=commitTime(cwd,mergeSha,ref);
 const releaseAt=validRelease?iso(release.verified_at):null;
 const oldProof=review?.edition_date===edition&&review?.result==='PASS'&&review?.reviewed_targets===24&&
   review?.expected_targets===24&&review?.criteria?.semantic_defects===0;
 const expectedTargets=new Set((release?.images||[]).flatMap(i=>['dated_brief','permanent_story'].flatMap(c=>
   ['desktop','mobile'].map(v=>i.story_id+':'+c+':'+v))));
 const pixelRows=review?.targets;
 const pixelProof=validRelease&&review?.schema_version==='external-image-semantic-pixel-review-v1'&&
   review.edition_date===edition&&review.result==='PASS'&&review.expected_targets===24&&
   review.captured_targets===24&&review.reviewed_pass===24&&
   Array.isArray(review.defects)&&review.defects.length===0&&
   release.actions_run_url==='https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/'+review.evidence_source?.workflow_run_id&&
   Array.isArray(pixelRows)&&pixelRows.length===24&&new Set(pixelRows.map(x=>x.target_id)).size===24&&
   pixelRows.every(x=>expectedTargets.has(x.target_id)&&x.target_id===x.story_id+':'+x.context+':'+x.viewport&&
     x.result==='PASS'&&x.actual_pixels_inspected===true&&x.correct_story_asset_visible===true&&
     x.full_diagram_visible===true&&x.clipped_or_overlapped===false&&x.placeholder_visible===false&&
     x.primary_explanatory_labels_recognizable===true&&/^[a-f0-9]{64}$/.test(x.capture_sha256||''));
 const qaPath='external-image-packages/'+edition+'/reviews/live/'+
   (pixelProof?'semantic-pixel-review.json':'image-element24/semantic-reviews.json');
 const qa=(oldProof||pixelProof)?firstPathCommit(cwd,ref,qaPath):null;
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
  result:stageSeconds!==null&&validRelease&&packageResolved?'DURATIONS_VERIFIED':'INCOMPLETE_SOURCE_TIMING',
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
  timestamp_provenance:'Exact source PR head (fetched separately if a squash merge removed ancestry), original accepted binary staging commit as its ancestor, protected main merge, public Pages release receipt and first final semantic review commit; all tied to the exact edition.',
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
