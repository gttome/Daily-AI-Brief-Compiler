import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {validateEdition,sha256} from '../compiler/compile.mjs';
import {assessUnattendedCertification} from '../compiler/unattended-certification.mjs';
import {summarizeFailedVideoPlayback} from '../scripts/record-video-playback-failure.mjs';
const require=createRequire(import.meta.url);
const {verifyCandidates,assessPlaybackAdmission}=require('../scripts/verify-selected-video-playback.cjs');

function pending(date='2026-11-02') {
  const b=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json'));
  const s=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json'));
  b.edition_date=s.edition_date=date;
  for(const story of b.stories)story.permanent_route='/stories/'+date+'/'+story.id+'/';
  // Isolate receipt admission; existing production-evidence tests exercise copy.
  b.watchlist={new:[],updated:[],carried_forward:[],dropped:[]};
  const id='illustration-pending-1200x630-v1';
  b.image_representation={status:'images_pending',placeholder_id:id,width:1200,height:630};
  b.images=b.stories.map(x=>({story_id:x.id,status:'pending',accepted:false,placeholder_id:id,alt:x.image_alt_intent}));
  s.images={required:6,accepted:[],mode:'images_pending',placeholder_id:id};
  Object.assign(b.producer_receipt,{owner_intervention:true,work_used:true,codex_used:true,local_computer_used:true,paid_model_api_used:false,scheduled_execution:false});
  return {b,s};
}
function validate({b,s}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nov02-provenance-'));
  try {
    const bundlePath=path.join(dir,'bundle.json'),statePath=path.join(dir,'state.json');
    const bytes=JSON.stringify(b);s.bundle.digest=sha256(bytes);
    fs.writeFileSync(bundlePath,bytes);fs.writeFileSync(statePath,JSON.stringify(s));
    return validateEdition({bundlePath,statePath,allowPendingImages:true});
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('new pending edition admits truthful interactive provenance without autonomous certification',()=>{
  const p=pending();assert.equal(validate(p).bundle.producer_receipt.owner_intervention,true);
  assert.equal(assessUnattendedCertification(p.b.producer_receipt).status,'NOT_SCHEDULED');
});
test('paid API, absent provenance, allocation and accepted-art constraints remain enforced',()=>{
  for(const mutate of [
    p=>p.b.producer_receipt.paid_model_api_used=true,
    p=>delete p.b.producer_receipt.work_used,
    p=>p.b.producer_receipt.owner_intervention='false',
    p=>p.b.stories[0].focus='Agents for Everyone',
    p=>p.b.images[0].accepted=true
  ]){const p=pending();mutate(p);assert.throws(()=>validate(p));}
});
test('historical pending editions retain prior admission',()=>{
  assert.throws(()=>validate(pending('2026-11-01')),/owner intervention/);
});
test('provider exception preserves exact failed identity and still checks the other video',async()=>{
  const items=[{index:1,title:'First',url:'https://first.test/video',expected_seconds:50},{index:2,title:'Second',url:'https://second.test/video',expected_seconds:60}];
  const seen=[];
  const checks=await verifyCandidates(null,items,async(_,item)=>{
    seen.push(item.index);if(item.index===1)throw Error('Public publisher page HTTP 401');
    return {...item,result:'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS',playback_verified:true,duration_matched_player_advanced:true,full_episode_watched:false};
  });
  assert.deepEqual(seen,[1,2]);assert.equal(checks[0].url,items[0].url);
  assert.equal(checks[0].error,'Public publisher page HTTP 401');
  assert.equal(checks[0].playback_verified,false);
  assert.deepEqual(assessPlaybackAdmission('2026-11-02',checks),{result:'BLOCKED_PLAYBACK_UNVERIFIED',approved:false,failed_indices:[1]});
  assert.equal(assessPlaybackAdmission('2026-10-21',checks).approved,false);
  const receipt=summarizeFailedVideoPlayback({schema_version:'daily-compiler-public-video-playback-v1',edition_date:'2026-11-02',publication_approved:false,result:'BLOCKED_PLAYBACK_UNVERIFIED',checked_videos:checks,failed_indices:[1]},'2026-11-02','PREPUBLISH_SIGNAL');
  assert.equal(receipt.failed_videos[0].headless_browser_limitation,'Public publisher page HTTP 401');
});
