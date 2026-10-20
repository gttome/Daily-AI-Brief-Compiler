import {renderImageAar} from './render-image-aar.mjs';
import {verifySixFrozenImageSpecifications} from './preflight-image-firstpass.mjs';
import {validateImageAfterAction,IMAGE_AAR_EFFECTIVE} from './image-aar-contract.mjs';
// Exact-current-cycle, pre-FIRST-image-PR admission. Run on a pushed candidate
// branch with current origin/main, origin/shadow-pages-history and source fetched.
// This is deterministic receipt and byte validation, NOT a semantic pixel review.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {nextEditionDate,selectCurrentCycleImageJob,checkedDate} from './two-task-cycle.mjs';
import {verifyRecurringImageReleaseAdmission} from './recurring-image-admission.mjs';
import {validateExternalImagePackage,verifyRemoteStagedPackage} from './stage-external-image-package.mjs';

const SHA40=/^[0-9a-f]{40}$/;
const SHA64=/^[0-9a-f]{64}$/;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=(code)=>{throw Error('image_prepr:'+code);};
const run=(root,args)=>execFileSync('git',args,{cwd:root,maxBuffer:8*1024*1024});
const git=(root,args)=>run(root,args).toString('utf8').trim();
const readGit=(root,revPath)=>run(root,['show',revPath]);
const readJson=(bytes,label)=>{try{return JSON.parse(bytes.toString('utf8'));}catch{fail('INVALID_JSON_'+label);}};
const chicagoParts=now=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now)
    .filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:parts.year+'-'+parts.month+'-'+parts.day,hour:Number(parts.hour)};
};
function committedFile(root,relative){
  if(!relative||relative.startsWith('/')||relative.split('/').includes('..'))fail('UNSAFE_PACKAGE_FILE_PATH');
  const stored=readGit(root,'HEAD:'+relative),working=fs.readFileSync(path.join(root,relative));
  if(!stored.equals(working))fail('UNCOMMITTED_PACKAGE_CONTENT:'+relative);
  return stored;
}
function enforceChangedPaths(root,date,mainRef,manifest){
  const prefix='external-image-packages/'+date+'/';
  const diff=git(root,['diff','--name-status','--no-renames',mainRef,'HEAD']);
  if(!diff)fail('EMPTY_PACKAGE_DIFF');
  const rows=diff.split('\n').map(line=>line.split('\t'));
  const imagePaths=new Set(),changes=new Set();
  for(const [status,relative] of rows){
    if(status!=='A'||!relative?.startsWith(prefix))fail('FORBIDDEN_OR_MODIFIED_PATH:'+relative);
    const tail=relative.slice(prefix.length);
    if(tail==='manifest.json'||tail==='recurring-assignment.json'){}
    else if(/^images\/[A-Za-z0-9][A-Za-z0-9_-]*\.png$/.test(tail))imagePaths.add(relative);
    else if(/^reviews\/[A-Za-z0-9][A-Za-z0-9._-]*\.(json|md|png)$/.test(tail)){}
    else fail('FORBIDDEN_PACKAGE_PATH:'+relative);
    changes.add(relative);
  }
  if(imagePaths.size!==6||!changes.has(prefix+'manifest.json')||
    !changes.has(prefix+'recurring-assignment.json'))fail('REQUIRED_SIX_IMAGE_MANIFEST_ASSIGNMENT_DIFF');
  const claimed=new Set(manifest.images?.map(x=>x.path));
  if(claimed.size!==6||[...imagePaths].some(p=>!claimed.has(p)))
    fail('SIX_IMAGE_PATHS_NOT_EXACTLY_DIFF');
  for(const img of manifest.images){
    const p=img.visual_review?.review_evidence_path;
    if(typeof p!=='string'||!p.startsWith(prefix+'reviews/')||!p.endsWith('.json')||
      !changes.has(p))fail('INDIVIDUAL_REVIEW_PATH_MISSING:'+img.story_id);
  }
  if(manifest.after_action_path!==undefined){
    const p=manifest.after_action_path;
    if(typeof p!=='string'||!p.startsWith(prefix+'reviews/')||!changes.has(p))
      fail('AFTER_ACTION_NOT_UNDER_REVIEWS');
  }
  return [...changes].sort();
}
function verifyReviewFiles(root,manifest,job){
  const stories=new Map(job.stories.map(s=>[s.story_id,s]));
  for(const img of manifest.images){
    const p=img.visual_review.review_evidence_path;
    const r=readJson(committedFile(root,p),'REVIEW');
    const story=stories.get(img.story_id);
    if(r.schema_version!=='external-image-acceptance-review-v8'||r.edition_date!==job.edition_date||
      r.story_id!==img.story_id||r.result!=='PASS'||
      r.inspected_saved_png_sha256!==img.sha256||r.bytes!==img.bytes||
      r.width!==1200||r.height!==630||r.bit_depth!==8||
      !['RGB','RGBA'].includes(r.color_type)||r.interlace!=='none'||
      r.verified_original_source_url!==story?.primary_source?.url||
      typeof r.mechanism_notes!=='string'||r.mechanism_notes.length<40||
      !Array.isArray(r.required_labels)||r.required_labels.length===0||
      ['factual_fidelity_verified','quality_and_visual_text_verified',
       'distinct_from_other_five_verified','no_people_humanoids_faces',
       'no_logos_brands','no_photorealism','no_pseudo_writing',
       'no_clipped_labels','safe_margins_verified'].some(k=>r[k]!==true))
      fail('REVIEW_RECEIPT_NOT_BOUND_TO_SAVED_PIXELS:'+img.story_id);
    if(img.visual_review.mechanism_and_quality_notes.length<40)
      fail('MANIFEST_REVIEW_NOT_SUBSTANTIVE:'+img.story_id);
  }
  if(manifest.after_action_path)committedFile(root,manifest.after_action_path);
}
function verifySourceBundle(root,job){
  const date=job.edition_date,src=job.source;
  if(!SHA40.test(src?.commit_sha||'')||!SHA64.test(src?.bundle_sha256||'')||
    src.branch!=='shadow/'+date||
    src.bundle_path!=='shadow-runs/'+date+'/edition-bundle.json')
    fail('SOURCE_COMMIT_AND_BUNDLE_PATH_INVALID');
  git(root,['cat-file','-e',src.commit_sha+'^{commit}']);
  // An existent object is insufficient: it must be reachable from the current
  // exact-date production source branch fetched immediately before admission.
  const sourceRef='refs/remotes/origin/shadow/'+date;
  try{
    git(root,['rev-parse','--verify',sourceRef]);
    git(root,['merge-base','--is-ancestor',src.commit_sha,sourceRef]);
  }catch{fail('SOURCE_COMMIT_NOT_IN_CURRENT_DATE_BRANCH');}
  const bytes=readGit(root,src.commit_sha+':'+src.bundle_path);
  if(hash(bytes)!==src.bundle_sha256)fail('SOURCE_BUNDLE_BYTES_HASH_MISMATCH');
  return {source_commit_sha:src.commit_sha,source_bundle_sha256:hash(bytes)};
}
export async function preflightRecurringImagePackage({
  repoRoot='.',cycleDate,now=new Date(),fetchImpl=fetch
}={}){
  const root=path.resolve(repoRoot),cycle=checkedDate(cycleDate),date=nextEditionDate(cycle);
  const local=chicagoParts(now);
  if(local.date!==cycle && !(local.date===date && local.hour<19))
    fail('NOT_CURRENT_CHICAGO_CYCLE');
  const branch=git(root,['branch','--show-current']);
  if(!branch||branch==='main'||!branch.startsWith('image-package/'+date+'-'))
    fail('NOT_SINGLE_CURRENT_DATE_IMAGE_PACKAGE_BRANCH');
  const mainRef='refs/remotes/origin/main';
  const historyRef='refs/remotes/origin/shadow-pages-history';
  const main=git(root,['rev-parse','--verify',mainRef]);
  const historyHead=git(root,['rev-parse','--verify',historyRef]);
  git(root,['merge-base','--is-ancestor',main,'HEAD']);
  const head=git(root,['rev-parse','HEAD']);
  if(head===main)fail('EMPTY_CANDIDATE_BRANCH');
  const prefix='external-image-packages/'+date+'/';
  const manifestBytes=committedFile(root,prefix+'manifest.json');
  const manifest=readJson(manifestBytes,'MANIFEST');
  const assignment=readJson(committedFile(root,prefix+'recurring-assignment.json'),'ASSIGNMENT');
  const changed=enforceChangedPaths(root,date,mainRef,manifest);
  if(manifest.expected_pages_history_head!==historyHead)
    fail('STALE_PAGES_HISTORY_HEAD');
  const jobPath='site/image-jobs/'+date+'/job.json';
  const jobBytes=readGit(root,historyRef+':'+jobPath);
  const job=readJson(jobBytes,'JOB');
  const index=readJson(readGit(root,historyRef+':site/image-jobs/index.json'),'INDEX');
  const current=selectCurrentCycleImageJob({cycleDate:cycle,index,job,jobBytes,sha256:hash});
  if(current.result!=='CURRENT_JOB_READY')fail(current.result+':'+(current.reason||'CURRENT_JOB_NOT_READY'));
  verifySourceBundle(root,job);
  const admission=verifyRecurringImageReleaseAdmission({jobBytes,index,manifestBytes,assignment});
  if(admission.edition_date!==date||assignment.cycle_date!==cycle)
    fail('ASSIGNMENT_NOT_CURRENT_CHICAGO_CYCLE');
  verifyReviewFiles(root,manifest,job);
  if(date>=IMAGE_AAR_EFFECTIVE){
    verifySixFrozenImageSpecifications({job,specifications:readJson(committedFile(root,prefix+'reviews/six-frozen-specs.json'),'FROZEN_SPECS')});
    const aarPath=prefix+'reviews/after-action.json';
    const aar=readJson(committedFile(root,aarPath),'AFTER_ACTION');
    validateImageAfterAction({aar,job,manifest});
    git(root,['merge-base','--is-ancestor',aar.production.github_binary_stage_commit,'HEAD']);
    if(!manifest.images.some(img=>{
      try{return hash(readGit(root,aar.production.github_binary_stage_commit+':'+img.path))===img.sha256;}
      catch{return false;}
    }))fail('FIRST_BINARY_CHECKPOINT_HAS_NO_ACCEPTED_PNG');
    if(committedFile(root,prefix+'reviews/after-action.md').toString('utf8')!==renderImageAar({aar,job,manifest}))fail('HUMAN_AAR_DIFFERS_FROM_STRUCTURED_FACTS');
    if(manifest.after_action_path!==prefix+'reviews/after-action.md')fail('CANONICAL_AFTER_ACTION_PATH_REQUIRED');
  }
  const staged=validateExternalImagePackage({job,jobBytes,manifest,repoRoot:root});
  if(staged.package_head_sha!==head||staged.exact_git_readback!==true)
    fail('NOT_EXACT_CANDIDATE_COMMIT');
  // Exact immutable GitHub readback is required before the FIRST PR, not only
  // after merging. The caller must push/fetch the candidate branch first.
  const remote=await verifyRemoteStagedPackage(staged,{fetchImpl});
  if(remote.remote_git_readback!==true||remote.remote_assets.length!==6)
    fail('SIX_REMOTE_GIT_READBACK_MISSING');
  return {schema_version:'external-image-prepr-package-v1',result:'PRE_PR_PACKAGE_PASS',
    cycle_date:cycle,edition_date:date,branch,head_sha:head,base_main_sha:main,
    history_head_sha:historyHead,job_sha256:hash(jobBytes),
    source_commit_sha:job.source.commit_sha,bundle_sha256:job.source.bundle_sha256,
    manifest_sha256:hash(manifestBytes),changed_paths:changed,
    image_sha256s:remote.remote_assets.map(i=>({story_id:i.story_id,
      sha256:i.sha256,git_blob_sha:i.git_blob_sha,bytes:i.bytes})),
    genuine_semantic_pixel_review_not_inferred:true,
    next_step:'OPEN_ONE_PROTECTED_IMAGE_PACKAGE_PR'};
}
function failure(e,cycle){
  const reason=String(e?.message||e);
  return {schema_version:'external-image-prepr-package-v1',result:'PRE_PR_PACKAGE_FAIL',
    cycle_date:cycle||null,reason,fingerprint:hash(Buffer.from(reason)).slice(0,16),
    publication_authorized:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [, ,cycleDate,root='.']=process.argv;
  try{
    if(!cycleDate)fail('USAGE_EXPECT_CYCLE_DATE_AND_OPTIONAL_REPO_ROOT');
    process.stdout.write(JSON.stringify(await preflightRecurringImagePackage({
      cycleDate,repoRoot:root
    }),null,2)+'\n');
  }catch(e){
    process.stderr.write(JSON.stringify(failure(e,cycleDate),null,2)+'\n');
    process.exitCode=1;
  }
}
