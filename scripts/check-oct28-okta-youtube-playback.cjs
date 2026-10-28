'use strict';
// Read-only signed-out public playback probe. Reject merely indexed identity.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const {proveVideo}=require('./verify-selected-video-playback.cjs');

const VIDEO={
 index:2,title:'Todd’s Take: Securing Identity in the Age of AI',
 url:'https://www.youtube.com/watch?v=TpJsRDZ29Os',
 expected_seconds:391.792,
 original_identity_verified:true,original_duration_verified:true
};
(async()=>{
 const p='build/oct28-okta-public-youtube-check.json';
 let browser,record;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
   args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const report=await proveVideo(browser,VIDEO,{maxAttempts:18,pollingMs:1100});
  record={schema_version:'daily-compiler-video-replacement-playback-proof-v1',
   result:report.result,video_id:'TpJsRDZ29Os',
   signed_out:report.signed_out,
   public_episode_advancing:report.duration_matched_player_advanced===true,
   expected_seconds:VIDEO.expected_seconds,
   checked_at:report.checked_at,verified_evidence:report};
 }catch(e){
  record={schema_version:'daily-compiler-video-replacement-playback-proof-v1',
   result:'PLAYBACK_UNVERIFIED',video_id:'TpJsRDZ29Os',
   error:String(e).slice(0,2500),expected_seconds:VIDEO.expected_seconds};
 }finally{if(browser)await browser.close();}
 fs.mkdirSync(path.dirname(p),{recursive:true});
 fs.writeFileSync(p,JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify(record));
 if(record.result!=='SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS'||
    record.public_episode_advancing!==true)throw Error('Public signed-out playback not proven: '+record.error);
})().catch(e=>{console.error(e.message);process.exitCode=1});
