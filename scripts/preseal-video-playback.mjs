import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {validateVideoPrequalification,videoPublisherKey} from '../compiler/production-evidence.mjs';
import playback from './verify-selected-video-playback.cjs';
import {reviewVideoArchive} from './verify-media-freshness.mjs';

const require=createRequire(import.meta.url);
const ARCHIVE_PREFLIGHT_EFFECTIVE = '2026-11-13';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error('PRESEAL_VIDEO_'+message);};
const key=v=>JSON.stringify([playback.safeUrl(v.url),v.title,v.duration_minutes*60]);
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):NaN;

export function presealCandidates(request,edition){
 if(request?.edition_date!==edition||request.schema_version!=='daily-compiler-preseal-video-request-v1'||
    !Array.isArray(request.urls)||request.urls.length!==3||new Set(request.urls).size!==3)fail('REQUEST_INVALID');
 validateVideoPrequalification(request);
 const pool=new Map(request.video_prequalification.candidates.map(c=>[c.url,c]));
 const chosen=request.urls.map(url=>pool.get(url));
 if(chosen.some(v=>!v)||new Set(chosen.map(videoPublisherKey)).size!==3)fail('THREE_DISTINCT_PUBLISHERS_REQUIRED');
 return chosen;
}

export function verifyPresealReceipt({requestBytes,receipt,bundle}){
 const requested=presealCandidates(JSON.parse(requestBytes),bundle.edition_date);
 const lock=stamp(bundle.editorial_provenance?.selection_locked_at);
 const finished=stamp(receipt?.checked_at);
 if(receipt?.schema_version!=='daily-compiler-preseal-video-receipt-v1'||receipt.edition_date!==bundle.edition_date||
    receipt.request_sha256!==digest(requestBytes)||receipt.result!=='PASS'||!Number.isFinite(lock)||
    !Number.isFinite(finished)||finished>lock||lock-finished>4*60*60000||
    !/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+$/.test(receipt.run_url||'')||
    !Array.isArray(receipt.checks)||receipt.checks.length!==3)fail('BOUND_FRESH_PROTECTED_RECEIPT_REQUIRED');
 if (bundle.edition_date >= ARCHIVE_PREFLIGHT_EFFECTIVE) {
  const archive = receipt.archive_review;
  if (archive?.result !== 'CLEAR' || !/^[a-f0-9]{40}$/.test(archive.history_commit || '') ||
      !Number.isSafeInteger(archive.checked_editions) || archive.checked_editions < 1 ||
      !Array.isArray(archive.programs) || archive.programs.length !== requested.length ||
      archive.programs.some((row, i) => row.url !== requested[i].url ||
        row.publisher !== videoPublisherKey(requested[i]) || !Array.isArray(row.matches) || row.matches.length)) {
   fail('BOUND_ARCHIVE_REVIEW_REQUIRED');
  }
 }
 for(const [i,candidate] of requested.entries()){
  const c=receipt.checks[i],checked=stamp(c?.checked_at);
  if(!c||c.url!==playback.safeUrl(candidate.url)||c.title!==candidate.title||c.expected_seconds!==candidate.duration_minutes*60||
     !Number.isFinite(checked)||checked>finished||checked<finished-5*60000||c.signed_out!==true||
     !playback.assessPlaybackAdmission(bundle.edition_date,[c]).approved||
     !playback.durationOk(c.expected_seconds,c.observed_duration_seconds)||!(c.playback_end_seconds-c.playback_start_seconds>1.2))
    fail('MATCHED_ADVANCING_PLAYER_REQUIRED');
 }
 if(bundle.videos?.length!==2||new Set(bundle.videos.map(key)).size!==2||
    bundle.videos.some(v=>!requested.some(c=>key(c)===key(v))))fail('FINAL_SELECTION_CHANGED');
}

function archiveReview(edition, candidates, historyRoot, historyCommit) {
 const review = reviewVideoArchive({edition, candidates, historyRoot, historyCommit});
 review.programs = review.programs.map((program, i) => ({
  ...program, title:candidates[i].title, publisher:videoPublisherKey(candidates[i])
 }));
 return review;
}

async function main(){
 const [mode,edition,statePath,requestPath,receiptPath,extraPath,historyCommit]=process.argv.slice(2);
 if(edition<'2026-11-09')return;
 if (mode === 'archive') {
  const [file, historyRoot, commit] = [statePath, requestPath, receiptPath];
  const candidates = presealCandidates(JSON.parse(fs.readFileSync(file)), edition);
  const review = archiveReview(edition, candidates, historyRoot, commit);
  console.log(JSON.stringify(review, null, 2));
  if (review.result === 'BLOCKED') process.exitCode = 1;
  return;
 }
 const state=JSON.parse(fs.readFileSync(statePath));
 const requestBytes=fs.readFileSync(requestPath);
 if(mode==='check'){
  verifyPresealReceipt({requestBytes,receipt:JSON.parse(fs.readFileSync(receiptPath)),bundle:JSON.parse(fs.readFileSync(extraPath))});
  return;
 }
 if(mode!=='probe'||state.edition_date!==edition||state.state!=='RESEARCH'||state.selection_locked_at||state.sealed_at)
  fail('UNLOCKED_RESEARCH_REQUIRED');
 const request=JSON.parse(requestBytes), candidates=presealCandidates(request,edition);
 const archive = edition >= ARCHIVE_PREFLIGHT_EFFECTIVE ? archiveReview(edition, candidates, extraPath, historyCommit) : null;
 let checks;
 if (archive?.result === 'BLOCKED') {
  checks = archive.programs.map((program, i) => ({
   index:i+1, title:program.title, url:playback.safeUrl(program.url),
   checked_at:new Date().toISOString(),
   result:program.matches.length ? 'PRESEAL_ARCHIVE_REPEAT' : 'NOT_PROBED_ARCHIVE_REPEAT'
  }));
 } else {
  const {chromium}=require('/tmp/browser/node_modules/playwright-core');
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  try {
   checks=await Promise.all(candidates.map(async (v,i)=>(await playback.verifyCandidates(browser,[{
     index:i+1,title:v.title,url:playback.safeUrl(v.url),expected_seconds:v.duration_minutes*60
   }],playback.proveVideo))[0]));
  } finally {await browser.close();}
 }
 const result=archive?.result !== 'BLOCKED' && playback.assessPlaybackAdmission(edition,checks).approved ? 'PASS' : 'BLOCKED';
 const receipt={schema_version:'daily-compiler-preseal-video-receipt-v1',edition_date:edition,result,
  request_sha256:digest(requestBytes),source_head:process.env.GITHUB_SHA,checked_at:new Date().toISOString(),
  run_url:'https://github.com/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID,
  ...(archive && {archive_review:archive}), checks};
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
