// Independently inspect only real live post-publication mobile image viewers.
// No local history writes, image generation or accepted PNG mutations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const fail=s=>{throw Error('live_premium_zoom:'+s);};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function verifyZoomStagedObjectIdentity({route,actual,expected}){
 if(!/^((briefs\/\d{4}-\d{2}-\d{2}|stories\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+)\/index\.html|assets\/(js|css)\/premium-image-zoom\.(js|css))$/.test(route))
   fail('unexpected_staged_route:'+route);
 if(!Buffer.isBuffer(actual)||!Buffer.isBuffer(expected)||actual.length!==expected.length||
   digest(actual)!==digest(expected))fail('public_image_viewer_site_object_hash_mismatch:'+route);
 return {route,bytes:actual.length,sha256:digest(actual),result:'PASS'};
}
export async function inspectLiveMobileViewer({receipt,siteRoot,outDir,chromium,fetchImpl=fetch,base=BASE}){
 if(receipt?.schema_version!=='published-premium-mobile-zoom-staging-v1'||
   receipt.result!=='STAGED_ONLY_NOT_PUBLISHED'||receipt.edition_date!=='2026-10-10'||
   receipt.reader_routes?.length!==7||receipt.allowed_changed_paths?.length!==9||
   receipt.protected_oct8_objects!==17||receipt.six_accepted_png_sha256s?.length!==6||
   receipt.accepted_pngs_regenerated!==0||receipt.original_placeholders_restored!==false)
   fail('unqualified_source_safe_staged_reader');
 if(base!==BASE||!chromium)fail('verified_live_base_and_real_browser_required');
 const targets=receipt.reader_routes.map(x=>x.route).concat(receipt.added_assets);
 if(new Set(targets).size!==9||new Set(targets).size!==receipt.allowed_changed_paths.length)
   fail('duplicate_or_missing_nine_allowed_paths');
 const verified=[];
 for(const route of targets){
   const response=await fetchImpl(BASE+route,{headers:{'Cache-Control':'no-cache'}});
   if(response.status!==200)fail('live_http_'+response.status+':'+route);
   const got=Buffer.from(await response.arrayBuffer());
   const expected=fs.readFileSync(path.join(siteRoot,route));
   verified.push(verifyZoomStagedObjectIdentity({route,actual:got,expected}));
 }
 const job=JSON.parse(fs.readFileSync(path.join(siteRoot,'image-jobs','2026-10-10','job.json'),'utf8'));
 const dated='briefs/2026-10-10/';
 const pages=[dated,...job.stories.map(s=>{
   if(typeof s.permanent_url!=='string'||!s.permanent_url.startsWith(BASE+'stories/2026-10-10/'))
     fail('unexpected_original_article_path');
   return s.permanent_url.slice(BASE.length);
 })];
 if(pages.length!==7||new Set(pages).size!==7)fail('seven_distinct_pages_required');
 fs.mkdirSync(outDir,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BINARY,
   args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const checks=[];
 try{
  for(const [index,route] of pages.entries()){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
   try{
    const response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:45000});
    if(response?.status()!==200)fail('live_page_http:'+route);
    const expectedN=index===0?6:1;
    await page.locator('.premium-image-enlarge-button').first().waitFor({timeout:20000});
    if(await page.locator('.premium-image-enlarge-button').count()!==expectedN)
       fail('missing_exact_viewer_controls:'+route);
    const image=page.locator('main img[src*="/dab-edition-"]');
    if(await image.count()!==expectedN)fail('wrong_six_original_image_pairs:'+route);
    for(let j=0;j<expectedN;j++){
     await image.nth(j).scrollIntoViewIfNeeded({timeout:20000});
     await image.nth(j).evaluate(async el=>{
       if(!el.complete)await new Promise((resolve,reject)=>{
         el.addEventListener('load',resolve,{once:true});
         el.addEventListener('error',()=>reject(Error('image_load_failed')),{once:true});
         setTimeout(()=>reject(Error('image_load_timeout')),20000);
       });
     });
     const orig=await image.nth(j).evaluate(el=>({src:el.src,alt:el.alt,width:el.naturalWidth,height:el.naturalHeight}));
     if(orig.width!==1200||orig.height!==630||!orig.alt||!orig.src.startsWith(BASE+'briefs/images/2026-10-10/'))
       fail('original_accepted_image_broken:'+route+':'+j);
     await page.locator('.premium-image-enlarge-button').nth(j).click();
     await page.locator('dialog.premium-image-viewer img.premium-image-full-resolution').evaluate(async el=>{
       if(!el.complete)await new Promise((resolve,reject)=>{
         el.addEventListener('load',resolve,{once:true});
         el.addEventListener('error',()=>reject(Error('fullsize_image_load_failed')),{once:true});
         setTimeout(()=>reject(Error('fullsize_image_load_timeout')),20000);
       });
     });
     const data=await page.locator('dialog.premium-image-viewer').evaluate(d=>{
      const view=d.querySelector('.premium-image-viewer-viewport');
      const img=view?.querySelector('img');
      const rect=img?.getBoundingClientRect();
      return {open:d.open,src:img?.src,alt:img?.alt,naturalWidth:img?.naturalWidth,
        naturalHeight:img?.naturalHeight,cssWidth:rect?.width,
        clientWidth:view?.clientWidth,scrollWidth:view?.scrollWidth};
     });
     if(!data.open||data.src!==orig.src||data.alt!==orig.alt||
        data.naturalWidth!==1200||data.naturalHeight!==630||
        !(data.cssWidth>=1199&&data.clientWidth<390&&data.scrollWidth>=1200))
       fail('live_original_full_res_presentation_failed:'+route+':'+j);
     const file='live-mobile-'+index+'-'+j+'.png';
     await page.locator('.premium-image-viewer-viewport').screenshot({path:path.join(outDir,file)});
     await page.locator('.premium-image-viewer-viewport').evaluate(el=>{el.scrollLeft=350;});
     const pan=await page.locator('.premium-image-viewer-viewport').evaluate(el=>el.scrollLeft);
     if(pan<300)fail('live_mobile_pan_does_not_work:'+route+':'+j);
     await page.locator('.premium-image-viewer-toolbar button').click();
     if(await page.locator('dialog.premium-image-viewer').evaluate(el=>el.open))
        fail('live_mobile_dialog_did_not_close:'+route+':'+j);
     checks.push({page:route,index:j,original:orig,viewer:data,pan,
       screenshot:file,semantic_pixel_quality_not_inferred:true});
    }
   }finally{await page.close();}
  }
 }finally{await browser.close();}
 if(checks.length!==12)fail('twelve_live_mobile_viewer_routes_required');
 return {schema_version:'published-premium-mobile-zoom-live-verification-v1',
   result:'TWELVE_MOBILE_FULL_RESOLUTION_VIEWERS_LIVE_VERIFIED',
   edition_date:'2026-10-10',site_bytes_verified:verified,
   viewport:{width:390,height:844},interactive_viewers:checks,
   accepted_png_regenerations:0,altered_source_images:0,
   native_mobile_thumb_text_legibility_not_claimed:true,
   individual_semantic_text_signoff:'UNPROVEN' };
}
async function main(){
 const [stagedReceipt,siteRoot,outDir]=process.argv.slice(2);
 if(!outDir)fail('usage: node scripts/verify-live-premium-mobile-zoom.mjs <staging-receipt> <staged-site-root> <out-dir>');
 const {chromium}=await import('playwright-core');
 const result=await inspectLiveMobileViewer({receipt:JSON.parse(fs.readFileSync(stagedReceipt)),
   siteRoot,outDir,chromium});
 fs.writeFileSync(path.join(outDir,'live-zoom-verify.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({result:result.result,site_objects:result.site_bytes_verified.length,
   fullsize_viewers:result.interactive_viewers.length,accepted_images_regenerated:0}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
