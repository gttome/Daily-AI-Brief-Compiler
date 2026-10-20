'use strict';
// Read-only public playback gate. Metadata, oEmbed, transcripts and previews cannot pass.
// A full-length HTML5 player must advance in a fresh signed-out browser session.
const fs = require('node:fs');
const path = require('node:path');
const FORBIDDEN_HOST = /(^localhost$|(^|\.)localhost$|^127\.|^0\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^\[?::1\]?$)/i;
function safeUrl(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || FORBIDDEN_HOST.test(u.hostname)) throw new Error('Public HTTPS video URL required');
  return u.href;
}
function durationOk(expected, observed) {
  return Number.isFinite(expected) && expected > 15 && Number.isFinite(observed) && observed >= expected - Math.max(12, expected * 0.12) && observed <= expected + Math.max(12, expected * 0.12);
}
function youtubePlayabilityStatus(response) {
  const p = response?.playabilityStatus;
  if (!p) return 'UNOBSERVED';
  return String(p.status || 'UNOBSERVED');
}
function validateBundle(bundle) {
  if (!/^20\d\d-\d\d-\d\d$/.test(bundle.edition_date || '')) throw new Error('Invalid edition date');
  if (!Array.isArray(bundle.videos) || bundle.videos.length !== 2) throw new Error('Exactly two videos required');
  const items = bundle.videos.map((v, i) => {
    const url = safeUrl(v.url);
    const minutes = Number(v.duration_minutes);
    if (!v.title || !Number.isFinite(minutes) || minutes <= 0 || minutes > 20) throw new Error('Video ' + (i+1) + ': invalid identity or runtime');
    return { index:i+1, title:v.title, url, expected_seconds:minutes*60 };
  });
  if (new Set(items.map(x=>x.url)).size !== 2) throw new Error('Selected videos must be distinct');
  return items;
}
async function proveVideo(browser, item) {
  // No existing sign-in, persisted profile, cookies, credentials or extensions.
  const context = await browser.newContext({viewport:{width:1365,height:850},acceptDownloads:false});
  const page = await context.newPage();
  try {
    const response = await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:40000});
    if (!response || response.status() >= 400) throw new Error('Public publisher page HTTP ' + (response?.status() ?? 'unavailable'));
    const isYoutube = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(new URL(item.url).hostname);
    let playerStatus = 'NOT_YOUTUBE';
    if (isYoutube) {
      await page.waitForTimeout(1600);
      playerStatus = await page.evaluate(() => {
        const response = window.ytInitialPlayerResponse || window.ytplayer?.config?.args?.player_response;
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        return parsed?.playabilityStatus?.status || 'UNOBSERVED';
      }).catch(() => 'UNOBSERVED');
      if (playerStatus === 'LOGIN_REQUIRED') {
        // A signed-out watch URL can be robot-gated despite public playback; try
        // the official privacy-enhanced YouTube embed in the same empty context.
        const u = new URL(item.url);
        const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
        if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) throw new Error('YouTube has no valid public video ID');
        await page.goto('https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&playsinline=1',{waitUntil:'domcontentloaded',timeout:30000});
        playerStatus = 'WATCH_LOGIN_REQUIRED_EMBED_ATTEMPTED';
      } else if (playerStatus !== 'OK' && playerStatus !== 'UNOBSERVED') {
        throw new Error('YouTube playability status ' + playerStatus);
      }
      await page.locator('button.ytp-large-play-button').first().click({timeout:4500}).catch(() => {});
    } else {
      // Publisher launch control, e.g. IBM Academy's full-episode player.
      await page.getByText(/Watch this episode/i).first().click({timeout:6500}).catch(() => {});
    }
    let proof = null;
    for (let attempt=0; attempt<28 && !proof; attempt++) {
      await page.waitForTimeout(1100);
      for (const frame of page.frames()) {
        const nodes = frame.locator('video');
        const count = await nodes.count().catch(() => 0);
        for (let i=0; i<count; i++) {
          const video = nodes.nth(i);
          const duration = await video.evaluate(v => v.duration).catch(() => NaN);
          if (!durationOk(item.expected_seconds,duration)) continue;
          try { await video.evaluate(v => {v.muted=true;return v.play()}); } catch { continue; }
          const before = await video.evaluate(v => ({at:v.currentTime,ready:v.readyState}));
          await page.waitForTimeout(2600);
          const after = await video.evaluate(v => ({at:v.currentTime,ready:v.readyState,paused:v.paused,error:v.error?.message||null}));
          if (after.at > before.at+1.2 && after.ready >= 2 && !after.paused && !after.error) {
            proof = {observed_duration_seconds:duration,playback_start_seconds:before.at,playback_end_seconds:after.at,ready_state:after.ready,player_status:playerStatus,frame_host:new URL(frame.url()).host || 'origin'};
            break;
          }
        }
        if (proof) break;
      }
    }
    if (!proof) {
      const contexts = [];
      for (const frame of page.frames().slice(0,12)) {
        const found = await frame.locator('video').evaluateAll(nodes => nodes.slice(0,8).map(v => ({
          duration: Number.isFinite(v.duration) ? Math.round(v.duration*10)/10 : String(v.duration),
          currentTime: v.currentTime, readyState: v.readyState, paused: v.paused,
          errorCode: v.error?.code ?? null, networkState: v.networkState
        }))).catch(() => []);
        contexts.push({host:(()=>{try{return new URL(frame.url()).hostname}catch{return 'invalid-frame-url'}})(),players:found});
      }
      throw new Error('Video '+item.index+' ('+item.title+'): full-episode playback UNVERIFIED; status='+playerStatus+
        '; player_evidence='+JSON.stringify(contexts).slice(0,3000)+
        '; no observed advancing duration-matched HTML5 episode; previews and metadata insufficient');
    }
    return {index:item.index,title:item.title,url:item.url,result:'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS',checked_at:new Date().toISOString(),signed_out:true,full_episode_watched:false,expected_seconds:item.expected_seconds,...proof};
  } finally {await context.close();}
}
async function main() {
  const [bundlePath,outPath] = process.argv.slice(2);
  if (!bundlePath || !outPath) throw new Error('Usage: node scripts/verify-selected-video-playback.cjs <edition-bundle.json> <output.json>');
  const bundle = JSON.parse(fs.readFileSync(bundlePath,'utf8'));
  const candidates = validateBundle(bundle);
  const {chromium} = require('/tmp/browser/node_modules/playwright-core');
  const browser = await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  let outcome;
  try {
    const checks = [];
    for (const candidate of candidates) checks.push(await proveVideo(browser,candidate));
    outcome = {schema_version:'daily-compiler-public-video-playback-v1',result:'TWO_SIGNED_OUT_FULL_EPISODES_PASS',edition_date:bundle.edition_date,checked_at:new Date().toISOString(),signed_out:true,checked_videos:checks};
  } finally {await browser.close();}
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(outcome,null,2)+'\n');
  process.stdout.write('PUBLIC_VIDEO_PLAYBACK_PASS '+outcome.edition_date+' '+outcome.checked_videos.length+'\n');
}
if (require.main === module) main().catch(e => {console.error('PUBLIC_VIDEO_PLAYBACK_BLOCKED:',e.message);process.exitCode=1;});
module.exports={safeUrl,durationOk,youtubePlayabilityStatus,validateBundle,proveVideo};
