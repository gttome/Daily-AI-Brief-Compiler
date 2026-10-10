// Browser-only, nonpublishing proof of twelve actual mobile image-reader controls.
// Never edits actual history, article HTML, or six accepted PNGs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const [siteRoot,outRoot]=process.argv.slice(2);
if(!outRoot)throw Error('usage: node tests/published-mobile-zoom-playwright.mjs <staged-site> <output>');
const site=path.resolve(siteRoot),out=path.resolve(outRoot);
fs.mkdirSync(out,{recursive:true});
const job=JSON.parse(fs.readFileSync(path.join(site,'image-jobs/2026-10-10/job.json'),'utf8'));
const base='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const pages=['briefs/2026-10-10/index.html',...job.stories.map(s=>s.permanent_url.slice(base.length)+'index.html')];
assert.equal(new Set(pages).size,7);
const browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const evidence=[];
try{
 for(const [pageNum,route] of pages.entries()){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
   const location='file://'+path.join(site,route);
   await page.goto(location,{waitUntil:'domcontentloaded',timeout:35000});
   await page.addStyleTag({path:path.join(site,'assets/css/premium-image-zoom.css')});
   await page.addScriptTag({path:path.join(site,'assets/js/premium-image-zoom.js')});
   const n=pageNum===0?6:1;
   await page.locator('.premium-image-enlarge-button').first().waitFor({timeout:20000});
   assert.equal(await page.locator('.premium-image-enlarge-button').count(),n);
   const imgs=page.locator('main img[src*="/dab-edition-"]');
   assert.equal(await imgs.count(),n);
   for(let i=0;i<n;i++){
    await imgs.nth(i).evaluate(async el=>{
     if(!el.complete)await new Promise((resolve,reject)=>{
       el.addEventListener('load',resolve,{once:true});el.addEventListener('error',reject,{once:true});
       setTimeout(()=>reject(Error('image-load-timeout')),20000);
     });
    });
    const orig=await imgs.nth(i).evaluate(img=>({src:img.src,alt:img.alt,width:img.naturalWidth,height:img.naturalHeight}));
    assert.equal(orig.width,1200);assert.equal(orig.height,630);
    await page.locator('.premium-image-enlarge-button').nth(i).click();
    const details=await page.locator('dialog.premium-image-viewer').evaluate(dialog=>{
      const viewport=dialog.querySelector('.premium-image-viewer-viewport');
      const img=viewport?.querySelector('img');
      return {open:dialog.open,source:img?.src,alt:img?.alt,
        naturalWidth:img?.naturalWidth,naturalHeight:img?.naturalHeight,
        cssWidth:img?.getBoundingClientRect().width,clientWidth:viewport?.clientWidth,scrollWidth:viewport?.scrollWidth};
    });
    assert.equal(details.open,true);assert.equal(details.source,orig.src);assert.equal(details.alt,orig.alt);
    assert.equal(details.naturalWidth,1200);assert.equal(details.naturalHeight,630);
    assert.ok(details.cssWidth>=1199&&details.scrollWidth>=1200&&details.clientWidth<390);
    const filename='mobile-'+pageNum+'-'+i+'.png';
    await page.locator('.premium-image-viewer-viewport').screenshot({path:path.join(out,filename)});
    await page.locator('.premium-image-viewer-viewport').evaluate(x=>{x.scrollLeft=350;});
    const x=await page.locator('.premium-image-viewer-viewport').evaluate(el=>el.scrollLeft);
    assert.ok(x>=300,'must be horizontally pannable');
    evidence.push({route,image_index:i,source:orig,viewer:details,horizontal_pan:x,
      screenshot:filename,visual_text_semantic_acceptance:'UNPROVEN_UNTIL_REVIEWED'});
    await page.locator('.premium-image-viewer-toolbar button').click();
    assert.equal(await page.locator('dialog.premium-image-viewer').evaluate(d=>d.open),false);
   }
  }finally{await page.close();}
 }
}finally{await browser.close();}
assert.equal(evidence.length,12);
const receipt={schema_version:'nonpublishing-mobile-full-resolution-image-viewport-v1',
 result:'TWELVE_MOBILE_INTERACTIVE_ZOOM_ROUTES_PROVEN_NOT_PUBLISHED',source_edition:'2026-10-10',
 width:390,height:844,approved_source_pngs_mutated:0,semantic_visual_review_not_inferred:true,checks:evidence};
fs.writeFileSync(path.join(out,'zoom-browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({result:receipt.result,contexts:evidence.length,accepted_image_regenerations:0}));
