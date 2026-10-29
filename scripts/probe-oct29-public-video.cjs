'use strict';
// Existing protected CI job only. Read-only public, signed-out exploration;
// no invented playback PASS from page identity, metadata or preview thumbnails.
const {chromium}=require('/tmp/browser/node_modules/playwright-core');
const sources=[
 {name:'TED Julie Bedard',url:'https://www.ted.com/talks/julie_bedard_ai_brain_fry_is_real_here_s_what_leaders_can_do'},
 {name:'PBS NewsHour AI agent regulation 6:30',url:'https://www.pbs.org/video/ai-going-rogue-1788205111/'},
 {name:'DW primary non-amp',url:'https://www.dw.com/en/what-is-ais-biggest-risk-speed-or-autonomy/video-79250154'},
 {name:'Yahoo Finance Cisco interview',url:'https://finance.yahoo.com/video/ai-agent-safety-will-be-the-issue-of-our-time-cisco-president-143905775.html'},
 {name:'TED official embed Bedard',url:'https://embed.ted.com/talks/julie_bedard_ai_brain_fry_is_real_here_s_what_leaders_can_do'}
];
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const report=[];
 for(const source of sources){
  const context=await browser.newContext({viewport:{width:1360,height:850},acceptDownloads:false});
  const page=await context.newPage();
  const record={name:source.name,url:source.url,checked_at:new Date().toISOString(),result:'UNVERIFIED',players:[],errors:[]};
  try{
   const response=await page.goto(source.url,{waitUntil:'domcontentloaded',timeout:18000});
   record.http=response?.status();
   await page.waitForTimeout(900);
   const patterns=[/accept all/i,/agree to all/i,/accept cookies/i,/i agree/i,/watch video/i,/play video/i,/play talk/i,/play/i];
   for(const re of patterns){
    try{
     const buttons=page.getByRole('button',{name:re});
     if(await buttons.count()>0){await buttons.first().click({timeout:1400});await page.waitForTimeout(900);}
    }catch{}
   }
   for(let attempt=0;attempt<6;attempt++){
    for(const frame of page.frames().slice(0,16)){
     const nodes=frame.locator('video');
     const count=await nodes.count().catch(()=>0);
     for(let i=0;i<Math.min(count,4);i++){
      let v=nodes.nth(i);
      let init=await v.evaluate(x=>({duration:x.duration,time:x.currentTime,ready:x.readyState,paused:x.paused,network:x.networkState})).catch(()=>null);
      if(!init)continue;
      try{await v.evaluate(x=>{x.muted=true;return x.play()})}catch{}
      await page.waitForTimeout(1000);
      let after=await v.evaluate(x=>({duration:x.duration,time:x.currentTime,ready:x.readyState,paused:x.paused,error:x.error?.message||null})).catch(()=>null);
      const result={frame:frame.url().slice(0,160),before:init,after,advanced:!!after && after.time>init.time+.5 && !after.paused && after.ready>=2};
      record.players.push(result);
      if(result.advanced){record.result='ADVANCING_HTML5_PLAYBACK';record.observed_duration=after.duration;break;}
     }
     if(record.result==='ADVANCING_HTML5_PLAYBACK')break;
    }
    if(record.result==='ADVANCING_HTML5_PLAYBACK')break;
    await page.waitForTimeout(600);
   }
   if(record.result==='UNVERIFIED'){
    record.frame_urls=page.frames().slice(0,8).map(f=>f.url().slice(0,160));
    record.title=(await page.title().catch(()=>'' )).slice(0,160);
   }
  }catch(e){record.errors.push(String(e).slice(0,500));}
  finally {await context.close();}
  report.push(record);
  console.log('OCT29_CANDIDATE_PROBE '+JSON.stringify({name:record.name,result:record.result,http:record.http,observed_duration:record.observed_duration,frames:record.frame_urls,players:record.players.slice(-2),errors:record.errors}));
 }
 await browser.close();
 const fs=require('node:fs');
 fs.mkdirSync('build',{recursive:true});
 fs.writeFileSync('build/oct29-publisher-player-probes.json',JSON.stringify(report,null,2)+'\n');
 console.log('OCT29_PROBE_SUMMARY '+JSON.stringify(report.map(x=>({name:x.name,result:x.result,seconds:x.observed_duration}))));
}
run().catch(e=>{console.error(e);process.exitCode=1});
