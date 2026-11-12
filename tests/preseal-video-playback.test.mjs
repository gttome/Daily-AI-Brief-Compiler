import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {videoPublisherKey} from '../compiler/production-evidence.mjs';
import {presealCandidates,verifyPresealReceipt} from '../scripts/preseal-video-playback.mjs';
import {reviewVideoArchive} from '../scripts/verify-media-freshness.mjs';
const edition='2026-11-09';
function fixture(date=edition){
 const checked=date+'T01:30:00Z';
 const pool=Array.from({length:6},(_,i)=>({
  url:'https://publisher'+i+'.org/video',title:'An archive-new video '+i,duration_minutes:5,
  editorial_evidence:'Complete original program reviewed with detailed and independent evidence.',
  research_disposition:'Reviewed substantive and distinct original reporting in full.',
  content_reviewed:true,public_player_checked:true,checked_at:checked
 }));
 const request={edition_date:date,schema_version:'daily-compiler-preseal-video-request-v1',
  video_prequalification:{candidates:pool},urls:pool.slice(0,3).map(x=>x.url)};
 const requestBytes=Buffer.from(JSON.stringify(request));
 const receipt={edition_date:date,schema_version:'daily-compiler-preseal-video-receipt-v1',result:'PASS',
  run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/1234',
  request_sha256:crypto.createHash('sha256').update(requestBytes).digest('hex'),checked_at:checked,
  checks:pool.slice(0,3).map(v=>({url:v.url,title:v.title,result:'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS',
   expected_seconds:300,observed_duration_seconds:300,playback_start_seconds:0,playback_end_seconds:3,
   checked_at:checked,signed_out:true,full_episode_watched:false,playback_verified:true,duration_matched_player_advanced:true}))};
 return {request,requestBytes,receipt,bundle:{edition_date:date,
  editorial_provenance:{selection_locked_at:date+'T01:35:00Z'},videos:pool.slice(0,2)}};
}
test('pre-seal evidence binds three programs and both actual final selections',()=>{
 const f=fixture();assert.equal(presealCandidates(f.request,edition).length,3);verifyPresealReceipt(f);
 f.bundle.videos[1]=f.request.video_prequalification.candidates[2];verifyPresealReceipt(f);
 f.bundle.videos[1]=f.request.video_prequalification.candidates[3];
 assert.throws(()=>verifyPresealReceipt(f),/FINAL_SELECTION_CHANGED/);
});

test('the preseal reserve is screened against older permanent video pages', t => {
 const historyRoot=fs.mkdtempSync(path.join(os.tmpdir(),'preseal-archive-'));
 t.after(()=>fs.rmSync(historyRoot,{recursive:true,force:true}));
 const f=fixture('2026-11-13');
 const candidates=presealCandidates(f.request,f.bundle.edition_date);
 const prior=path.join(historyRoot,'videos','2026-10-28','general');
 fs.mkdirSync(prior,{recursive:true});
 fs.writeFileSync(path.join(prior,'index.html'),
  '<h1 class="project-name">Previously published report</h1><strong>Source:</strong> <a href="'+candidates[2].url+'?tracking=yes">Publisher</a>');
 const archive=reviewVideoArchive({edition:f.bundle.edition_date,candidates,historyRoot,historyCommit:'a'.repeat(40)});
 assert.equal(archive.result,'BLOCKED');
 assert.deepEqual(archive.programs.map(program=>program.matches.length),[0,0,1]);
 assert.equal(archive.programs[2].matches[0].date,'2026-10-28');
 assert.throws(()=>verifyPresealReceipt(f),/BOUND_ARCHIVE_REVIEW_REQUIRED/);
 f.receipt.archive_review={...archive,result:'CLEAR',
  programs:archive.programs.map((program,i)=>({...program,publisher:videoPublisherKey(candidates[i])}))};
 assert.throws(()=>verifyPresealReceipt(f),/BOUND_ARCHIVE_REVIEW_REQUIRED/);
 f.receipt.archive_review.programs[2].matches=[];
 verifyPresealReceipt(f);
});
test('reject later evidence, changed request and a backup that only has metadata',()=>{
 const f=fixture();
 f.receipt.checks[2].playback_verified=false;
 assert.throws(()=>verifyPresealReceipt(f),/MATCHED_ADVANCING_PLAYER_REQUIRED/);
 assert.throws(()=>verifyPresealReceipt({...fixture(),requestBytes:Buffer.concat([f.requestBytes,Buffer.from(' ')])}),/BOUND_FRESH/);
 const g=fixture();g.bundle.editorial_provenance.selection_locked_at='2026-11-09T01:25:00Z';
 assert.throws(()=>verifyPresealReceipt(g),/BOUND_FRESH/);
});
