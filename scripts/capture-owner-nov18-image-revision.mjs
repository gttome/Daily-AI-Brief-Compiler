#!/usr/bin/env node
// Actual 24 image-element captures for owner-approved November 18 correction.
// Captures and DOM checks do not substitute for human visual/semantic judgment.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright-core';
const [manifestPath,outDir]=process.argv.slice(2);
if(!manifestPath||!outDir)throw Error('usage: node scripts/capture-owner-nov18-image-revision.mjs <manifest> <output-dir>');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.edition_date!=='2026-11-18'||manifest.images?.length!==6)throw Error('wrong_revision');
const chrome=process.env.CHROME_BINARY;
if(!chrome)throw Error('CHROME_BINARY_missing');
fs.mkdirSync(outDir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const width of [320,1440]){
  const page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:1});
  for(const img of manifest.images){
   const routes=[{context:'dated',url:'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/2026-11-18/'},
     {context:'permanent',url:null}];
   const job=JSON.parse(fs.readFileSync('history/site/image-jobs/2026-11-18/job.json','utf8'));
   const story=job.stories.find(s=>s.story_id===img.story_id);
   if(!story)throw Error('story_not_found:'+img.story_id);
   routes[1].url=story.permanent_url;
   for(const target of routes){
    await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:45000});
    const sel=`img[src*="${img.published_route}"]`;
    const el=page.locator(sel);
    if(await el.count()!==1)throw Error('missing_exact_image:'+img.story_id+':'+target.context+':'+width);
    await el.scrollIntoViewIfNeeded();
    await el.evaluate(async e=>{if(!e.complete)await new Promise((resolve,reject)=>{e.addEventListener('load',resolve,{once:true});e.addEventListener('error',()=>reject(Error('image_load_error')),{once:true})});await e.decode()});
    const state=await el.evaluate(e=>({naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,displayWidth:e.getBoundingClientRect().width,displayHeight:e.getBoundingClientRect().height,currentSrc:e.currentSrc,alt:e.alt}));
    if(state.naturalWidth!==1200||state.naturalHeight!==630||!state.alt||!state.currentSrc.includes(img.sha256.slice(0,12)))throw Error('image_dom_validation_failed:'+img.story_id);
    const relative=`${img.story_id}-${target.context}-${width}.png`,dest=path.join(outDir,relative);
    await el.screenshot({path:dest,timeout:20000});
    const bytes=fs.readFileSync(dest);
    results.push({story_id:img.story_id,context:target.context,viewport_width:width,...state,screenshot:relative,screenshot_sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
   }
  }
  await page.close();
 }
}finally{await browser.close()}
if(results.length!==24)throw Error('missing_24_contexts');
const receipt={schema_version:'owner-nov18-image-context-captures-v1',edition_date:'2026-11-18',revision_id:'owner-quality-r2',status:'CAPTURED_UNREVIEWED',actual_captures:24,source:'real_chromium_image_element_screenshots',contexts:results};
fs.writeFileSync(path.join(outDir,'status.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,actual_captures:results.length,native_1200x630_checked:24}));