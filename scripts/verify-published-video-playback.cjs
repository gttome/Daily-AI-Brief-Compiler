'use strict';
// Independently revisit the TWO VIDEO LINKS ACTUALLY RENDERED IN THE PUBLIC BRIEF.
// A metadata-only/anti-bot result is UNVERIFIED, never an advancing player PASS.
// Non-blocking after deployment; the exact receipt is preserved for AAR/correction.
const fs=require('node:fs');
const path=require('node:path');
const {validateBundle,proveVideo,safeUrl}=require('./verify-selected-video-playback.cjs');
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const normal=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function matchRenderedLinks(links,candidates,edition){
  if(!Array.isArray(links)||links.length!==2||new Set(links.map(x=>x.id)).size!==2)
    throw Error('EXPECTED_TWO_UNIQUE_PUBLISHED_VIDEO_LINKS');
  return candidates.map((item,i)=>{
    const link=links[i];
    if(!link.id.startsWith('dab-video-'+edition+'-')||normal(link.heading)!==normal(item.title))
      throw Error('PUBLISHED_VIDEO_TITLE_OR_EDITION_BINDING_MISMATCH_'+(i+1));
    return {...item,url:safeUrl(link.url),rendered_item_id:link.id};
  });
}
async function scanLiveLinks(browser,readerUrl){
  const context=await browser.newContext({acceptDownloads:false});
  try{
    const page=await context.newPage();
    const response=await page.goto(readerUrl,{waitUntil:'domcontentloaded',timeout:40000});
    if(response?.status()!==200)throw Error('PUBLIC_READER_NOT_200_'+String(response?.status()));
    return await page.locator('a[data-action="source_clicks"][data-item-id^="dab-video-"]')
      .evaluateAll(anchors=>anchors.map(a=>{
        const headers=[...document.querySelectorAll('h3')];
        const prior=headers.filter(h=>Boolean(h.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);
        return {url:a.href,id:a.dataset.itemId,heading:prior?.textContent?.trim()||''};
      }));
  }finally{await context.close();}
}
async function verify({edition,bundle,readerUrl,browser}){
  const candidates=validateBundle(bundle);
  if(edition!==bundle.edition_date)throw Error('EDITION_BUNDLE_MISMATCH');
  const bound=matchRenderedLinks(await scanLiveLinks(browser,readerUrl),candidates,edition);
  const checks=[];
  for(const item of bound){
    try{checks.push({...await proveVideo(browser,item,{maxAttempts:14}),rendered_item_id:item.rendered_item_id});}
    catch(e){checks.push({index:item.index,title:item.title,url:item.url,rendered_item_id:item.rendered_item_id,
      result:'PUBLIC_PLAYBACK_UNVERIFIED',playback_verified:false,reason:String(e?.message||e).slice(0,1600),
      checked_at:new Date().toISOString()});}
  }
  return {result:checks.every(x=>x.playback_verified===true)?'TWO_PUBLISHED_VIDEOS_PLAYBACK_PASS':'PUBLISHED_MEDIA_REVIEW_REQUIRED',
    checked_videos:checks};
}
async function main(){
  const [edition,bundlePath,readerRoot=BASE,outPath]=process.argv.slice(2);
  if(!edition||!bundlePath||!outPath)throw Error('Usage: verify-published-video-playback.cjs YYYY-MM-DD bundle.json reader-root output.json');
  const receipt={schema_version:'daily-compiler-postpublished-video-playback-v1',edition_date:edition,
    reader_url:new URL('briefs/'+edition+'/',readerRoot).href,checked_at:new Date().toISOString(),
    post_publication:true,prepublication_bundle_unchanged:true};
  let browser;
  try{
    const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
    const {chromium}=require('/tmp/browser/node_modules/playwright-core');
    browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
      args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
    Object.assign(receipt,await verify({edition,bundle,readerUrl:receipt.reader_url,browser}));
  }catch(e){
    receipt.result='PUBLISHED_MEDIA_REVIEW_REQUIRED';
    receipt.error=String(e?.message||e).slice(0,1600);
    receipt.checked_videos=[];
  }finally{await browser?.close();}
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({result:receipt.result,edition_date:edition,
    verified:receipt.checked_videos?.filter(v=>v.playback_verified).length||0,
    follow_up_required:receipt.result!=='TWO_PUBLISHED_VIDEOS_PLAYBACK_PASS'}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={normal,matchRenderedLinks,verify};
