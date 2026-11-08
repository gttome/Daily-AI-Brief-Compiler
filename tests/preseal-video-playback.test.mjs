import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {presealCandidates,verifyPresealReceipt} from '../scripts/preseal-video-playback.mjs';
const edition='2026-11-09',checked='2026-11-09T01:30:00Z';
function fixture(){
 const pool=Array.from({length:6},(_,i)=>({
  url:'https://publisher'+i+'.org/video',title:'An archive-new video '+i,duration_minutes:5,
  editorial_evidence:'Complete original program reviewed with detailed and independent evidence.',
  research_disposition:'Reviewed substantive and distinct original reporting in full.',
  content_reviewed:true,public_player_checked:true,checked_at:checked
 }));
 const request={edition_date:edition,schema_version:'daily-compiler-preseal-video-request-v1',
  video_prequalification:{candidates:pool},urls:pool.slice(0,3).map(x=>x.url)};
 const requestBytes=Buffer.from(JSON.stringify(request));
 const receipt={edition_date:edition,schema_version:'daily-compiler-preseal-video-receipt-v1',result:'PASS',
  run_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/1234',
  request_sha256:crypto.createHash('sha256').update(requestBytes).digest('hex'),checked_at:checked,
  checks:pool.slice(0,3).map(v=>({url:v.url,title:v.title,result:'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS',
   expected_seconds:300,observed_duration_seconds:300,playback_start_seconds:0,playback_end_seconds:3,
   checked_at:checked,signed_out:true,full_episode_watched:false,playback_verified:true,duration_matched_player_advanced:true}))};
 return {request,requestBytes,receipt,bundle:{edition_date:edition,
  editorial_provenance:{selection_locked_at:'2026-11-09T01:35:00Z'},videos:pool.slice(0,2)}};
}
test('pre-seal evidence binds three programs and both actual final selections',()=>{
 const f=fixture();assert.equal(presealCandidates(f.request,edition).length,3);verifyPresealReceipt(f);
 f.bundle.videos[1]=f.request.video_prequalification.candidates[2];verifyPresealReceipt(f);
 f.bundle.videos[1]=f.request.video_prequalification.candidates[3];
 assert.throws(()=>verifyPresealReceipt(f),/FINAL_SELECTION_CHANGED/);
});
test('reject later evidence, changed request and a backup that only has metadata',()=>{
 const f=fixture();
 f.receipt.checks[2].playback_verified=false;
 assert.throws(()=>verifyPresealReceipt(f),/MATCHED_ADVANCING_PLAYER_REQUIRED/);
 assert.throws(()=>verifyPresealReceipt({...fixture(),requestBytes:Buffer.concat([f.requestBytes,Buffer.from(' ')])}),/BOUND_FRESH/);
 const g=fixture();g.bundle.editorial_provenance.selection_locked_at='2026-11-09T01:25:00Z';
 assert.throws(()=>verifyPresealReceipt(g),/BOUND_FRESH/);
});
