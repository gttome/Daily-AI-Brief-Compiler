// Signed-out smoke test: require full-episode playback, never a background preview.
const { chromium } = require('/tmp/browser/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const url = 'https://www.ibm.com/think/videos/ai-academy/reimagine-business-productivity-with-ai';
  const browser = await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const manifests = [];
    page.on('response', r => {
      if (/playManifest/.test(r.url())) manifests.push({url:r.url().split('?')[0],status:r.status()});
    });
    const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    if (response.status() !== 200) throw Error('Publisher page not publicly available');
    await page.waitForTimeout(7000);
    // The visible slotted text overlays the inner anchor in IBM's Web Component.
    await page.getByText('Watch this episode (7:58)',{exact:true}).first().click({timeout:15000});
    let observation = null;
    for (let attempt=0; attempt<25 && !observation; attempt++) {
      await page.waitForTimeout(1000);
      for (const frame of page.frames()) {
        const videos = frame.locator('video');
        for (let i=0; i<await videos.count(); i++) {
          const video = videos.nth(i);
          const duration = await video.evaluate(v=>v.duration);
          if (!(duration>=477 && duration<=480)) continue;
          await video.evaluate(v=>{v.muted=true;return Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('play timed out')),10000))]);});
          const before = await video.evaluate(v=>({time:v.currentTime,duration:v.duration,ready:v.readyState}));
          await page.waitForTimeout(4000);
          const after = await video.evaluate(v=>({time:v.currentTime,duration:v.duration,ready:v.readyState,paused:v.paused,error:v.error?.message??null}));
          if (after.time<=before.time+1 || after.ready<2 || after.paused || after.error) throw Error('Full episode did not play');
          observation={before,after}; break;
        }
        if(observation) break;
      }
    }
    if (!observation) {
      console.error('PLAYER_DIAGNOSTICS',JSON.stringify({frames:page.frames().map(f=>f.url()),videos:await page.locator('video').evaluateAll(vs=>vs.map(v=>({duration:v.duration,ready:v.readyState})))}));
      throw Error('Full episode not observed; no background-preview substitution');
    }
    const result={schema_version:'public-video-playback-check-v1',result:'FULL_EPISODE_PUBLIC_PLAYBACK_PASS',url,http_status:200,publisher:'IBM AI Academy',title:'Reimagine business productivity with AI agents and assistants',original_date:'2025-03-17',listed_duration_seconds:478,checked_at:new Date().toISOString(),signed_in:false,...observation,manifests,full_episode_watched:false,content_summary_basis:'Official publisher episode description; short playback test verifies access, not full-content review'};
    const out=process.argv[2]||'build/video-playback.json';
    fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
    console.log('FULL_EPISODE_PLAYBACK',JSON.stringify(result));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
