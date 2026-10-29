'use strict';
// Read-only bounded discovery of publisher-hosted HTML5 player availability.
// Each public site receives an isolated signed-out Chrome process with a hard
// process timeout. No player metadata is mislabeled a playback PASS.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const items=[
 ['PBS NewsHour AI agent regulation 6:30','https://www.pbs.org/video/ai-going-rogue-1788205111/'],
 ['TED Julie Bedard','https://www.ted.com/talks/julie_bedard_ai_brain_fry_is_real_here_s_what_leaders_can_do'],
 ['TED Julie Bedard official embed','https://embed.ted.com/talks/julie_bedard_ai_brain_fry_is_real_here_s_what_leaders_can_do'],
 ['Yahoo Finance Cisco interview','https://finance.yahoo.com/video/ai-agent-safety-will-be-the-issue-of-our-time-cisco-president-143905775.html'],
 ['DW primary non-Amp','https://www.dw.com/en/what-is-ais-biggest-risk-speed-or-autonomy/video-79250154']
];
async function single(name,url){
 const {chromium}=require('/tmp/browser/node_modules/playwright-core');
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const result={name,url,status:'UNVERIFIED',checked_at:new Date().toISOString(),frames:[],observations:[]};
 try{
  const context=await browser.newContext({viewport:{width:1365,height:850},acceptDownloads:false});
  const page=await context.newPage();page.setDefaultTimeout(1500);
  const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:12000});
  result.http=r?.status();result.title=(await page.title().catch(()=>'' )).slice(0,100);
  try{await page.evaluate(()=>{
   for(const b of document.querySelectorAll('button,[role=button]')){
    const name=(b.getAttribute('aria-label')||b.textContent||'').toLowerCase().trim();
    if(/^(accept all|accept cookies|i agree|play video|play|watch video)$/.test(name))b.click();
   }
  });}catch{}
  await page.waitForTimeout(1500);
  for(let attempt=0;attempt<4;attempt++){
   for(const frame of page.frames().slice(0,10)){
    const urlFrame=frame.url();
    const inspect=frame.evaluate(()=>{
     const items=Array.from(document.querySelectorAll('video')).slice(0,3);
     return items.map(v=>{
      v.muted=true;
      if(v.paused){const p=v.play();if(p&&typeof p.catch==='function')p.catch(()=>{});}
      return {duration:Number.isFinite(v.duration)?v.duration:null,currentTime:v.currentTime,readyState:v.readyState,paused:v.paused};
     });
    });
    let snapshots;
    try{
      snapshots=await Promise.race([inspect,new Promise((_,reject)=>setTimeout(()=>reject(Error('frame evaluation timeout')),900))]);
    }catch{continue}
    if(!snapshots?.length)continue;
    await page.waitForTimeout(1550);
    let after;
    try{after=await Promise.race([frame.evaluate(()=>Array.from(document.querySelectorAll('video')).slice(0,3).map(v=>({duration:Number.isFinite(v.duration)?v.duration:null,currentTime:v.currentTime,readyState:v.readyState,paused:v.paused}))),new Promise((_,reject)=>setTimeout(()=>reject(Error('frame read timeout')),900))])}catch{after=[]}
    const samples=snapshots.map((before,i)=>({before,after:after[i],frame:urlFrame.slice(0,130)}));
    result.observations.push(...samples.slice(0,2));
    const passing=samples.find(s=>s.after&&s.after.currentTime>s.before.currentTime+0.65&&s.after.readyState>=2&&!s.after.paused&&s.after.duration>180&&s.after.duration<1205);
    if(passing){
     result.status='ADVANCING_DURATION_MATCHED_HTML5';
     result.observed_duration_seconds=passing.after.duration;
     break;
    }
   }
   if(result.status==='ADVANCING_DURATION_MATCHED_HTML5')break;
   await page.waitForTimeout(450);
  }
  result.frames=page.frames().slice(0,8).map(f=>f.url().slice(0,130));
  await context.close().catch(()=>{});
 }catch(e){result.error=String(e).slice(0,250);}
 finally{await browser.close().catch(()=>{});}
 console.log('OCT29_SINGLE_CANDIDATE '+JSON.stringify(result));
}
if(process.argv[2]==='--single'){
 single(process.argv[3],process.argv[4]).catch(e=>{console.error('OCT29_SINGLE_ERROR',String(e));process.exitCode=1;});
}else{
 const results=[];
 for(const [name,url] of items){
  console.log('OCT29_CANDIDATE_PROBE_START '+name);
  const r=spawnSync(process.execPath,[path.resolve(__filename),'--single',name,url],{encoding:'utf8',timeout:27000,maxBuffer:500000});
  const line=(r.stdout||'').split('\n').find(l=>l.startsWith('OCT29_SINGLE_CANDIDATE '));
  if(line){
   try{const v=JSON.parse(line.slice('OCT29_SINGLE_CANDIDATE '.length));results.push(v);console.log('OCT29_CANDIDATE_PROBE '+JSON.stringify(v));}
   catch{console.log('OCT29_CANDIDATE_PARSE_FAILED '+name);}
  }else{
    const rec={name,url,status:'FAILED_OR_TIMED_OUT',error:r.error?.code||r.status,stderr:(r.stderr||'').slice(-300)};
    results.push(rec);console.log('OCT29_CANDIDATE_PROBE '+JSON.stringify(rec));
  }
 }
 require('node:fs').mkdirSync('build',{recursive:true});
 require('node:fs').writeFileSync('build/oct29-publisher-player-probes.json',JSON.stringify(results,null,2)+'\n');
 console.log('OCT29_PROBE_SUMMARY '+JSON.stringify(results.map(v=>({name:v.name,status:v.status,seconds:v.observed_duration_seconds}))));
}
