'use strict';
// Hermetic Chrome integration test: real HTML5 video playback, NO external publishers,
// tokens, accounts, or remote network. Runtime production check remains strict.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {chromium} = require('/tmp/browser/node_modules/playwright-core');
const {proveVideo} = require('../scripts/verify-selected-video-playback.cjs');

function makeClip(dir,name,seconds) {
  const target=path.join(dir,name+'.mp4');
  const proc=spawnSync('ffmpeg',[
    '-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=160x90:r=5',
    '-t',String(seconds),'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
    '-movflags','+faststart','-y',target
  ],{encoding:'utf8'});
  if(proc.status!==0)throw new Error('Synthetic video creation failed: '+(proc.stderr||'').slice(0,500));
  return fs.readFileSync(target);
}

function playbackFixtureBrowser(realBrowser,clips) {
  return {newContext:async options=>{
    const context=await realBrowser.newContext(options);
    await context.route('**/*', async route=>{
      let url;
      try{url=new URL(route.request().url())}catch{return route.abort();}
      if(url.hostname!=='public-video-test.example')return route.abort();
      if(url.pathname.startsWith('/watch/')){
        const key=url.pathname.split('/').pop();
        if(key==='unavailable')return route.fulfill({status:403,contentType:'text/html',body:'Unavailable'});
        if(!clips[key])return route.fulfill({status:404,body:'Missing fixture'});
        const html='<!doctype html><html><body><button onclick="document.querySelector(\'video\').play()">Watch this episode</button>'+
          '<video muted playsinline controls preload="auto" src="/media/'+key+'.mp4"></video></body></html>';
        return route.fulfill({status:200,contentType:'text/html',body:html});
      }
      if(url.pathname.startsWith('/media/')){
        const key=url.pathname.split('/').pop().replace(/\.mp4$/,'');
        if(!clips[key])return route.fulfill({status:404,body:'Missing video'});
        return route.fulfill({status:200,contentType:'video/mp4',body:clips[key]});
      }
      return route.abort();
    });
    return context;
  }};
}

async function main() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'video-gate-rehearsal-'));
  const clips={
    fullone:makeClip(dir,'fullone',24),
    fulltwo:makeClip(dir,'fulltwo',26),
    preview:makeClip(dir,'preview',2)
  };
  const actual=await chromium.launch({
    headless:true,executablePath:'/usr/bin/google-chrome',
    args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']
  });
  try {
    const browser=playbackFixtureBrowser(actual,clips);
    for(const key of ['fullone','fulltwo']){
      const result=await proveVideo(browser,{
        index:key==='fullone'?1:2,title:'Known isolated full episode '+key,
        url:'https://public-video-test.example/watch/'+key,expected_seconds:key==='fullone'?24:26
      },{maxAttempts:6,pollingMs:250});
      assert.equal(result.result,'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS');
      assert.ok(result.playback_end_seconds-result.playback_start_seconds>1.2);
      assert.ok(result.observed_duration_seconds>=24);
      assert.equal(result.signed_out,true);
    }
    await assert.rejects(()=>proveVideo(browser,{
      index:3,title:'Preview is not episode',
      url:'https://public-video-test.example/watch/preview',expected_seconds:24
    },{maxAttempts:3,pollingMs:200}),/full-episode playback UNVERIFIED/);
    await assert.rejects(()=>proveVideo(browser,{
      index:4,title:'Inaccessible private fixture',
      url:'https://public-video-test.example/watch/unavailable',expected_seconds:24
    },{maxAttempts:2,pollingMs:200}),/HTTP 403/);
    process.stdout.write('HERMETIC_SIGNED_OUT_CHROME_VIDEO_PROOF_PASS: 2 full clips, preview rejected, access error rejected\n');
  } finally {
    await actual.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error('HERMETIC_VIDEO_REHEARSAL_FAILED',e.stack||e);process.exitCode=1});
