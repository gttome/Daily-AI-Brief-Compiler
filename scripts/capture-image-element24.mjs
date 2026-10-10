// I3: actual loaded image-region evidence, not header screenshot counts.
// No semantic image PASS is inferred from browser automation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readImageProcessVersions} from './image-process-versions.mjs';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('image_element24:'+s);};
const VIEWPORTS={desktop:{width:1440,height:1000},mobile:{width:390,height:844}};
const FOCUS_SLOTS={
 'Technical AI Engineering':['t1','t2'],
 'Applied Generative AI for Knowledge Workers':['k1','k2'],
 'Agents for Everyone':['a1','a2']
};
export function planImageElementTargets({job,manifest}){
 if(job?.schema_version!=='external-compiler-image-job-v1'||manifest?.schema_version!=='external-compiler-image-package-v1'||
   job.edition_date!==manifest.edition_date||job.execution_id!==manifest.execution_id||
   !Array.isArray(job.stories)||job.stories.length!==6||
   !Array.isArray(manifest.images)||manifest.images.length!==6)fail('invalid_six_image_source');
 const map=new Map(manifest.images.map(x=>[x.story_id,x])),counts=new Map(),slots=new Set(),targets=[];
 if(map.size!==6)fail('duplicate_manifest_story_id');
 for(const story of job.stories){
   const focus=story.complete_compiler_story?.focus,choices=FOCUS_SLOTS[focus];
   const pos=counts.get(focus)||0;counts.set(focus,pos+1);
   const img=map.get(story.story_id),slot=choices?.[pos];
   if(!img||!slot||slots.has(slot)||img.width!==1200||img.height!==630||
     img.accepted_locked!==true||img.visual_review?.result!=='PASS'||
     img.visual_review.inspected_png_sha256!==img.sha256||
     !/^[a-f0-9]{64}$/.test(img.sha256||'')||!img.alt_text?.trim()||
     !story.permanent_url?.startsWith(BASE+'stories/'+job.edition_date+'/'))
     fail('unreviewed_or_incorrect_story_binding:'+story.story_id);
   slots.add(slot);
   const imageRoute='briefs/images/'+job.edition_date+'/dab-edition-'+job.edition_date+'-'+slot+'.png';
   const imageUrl=BASE+imageRoute+'?v='+img.sha256.slice(0,12);
   for(const context of ['dated_brief','permanent_story']){
     const pageUrl=context==='dated_brief'?BASE+'briefs/'+job.edition_date+'/':story.permanent_url;
     for(const viewport of Object.keys(VIEWPORTS)){
       targets.push({target_id:story.story_id+':'+context+':'+viewport,story_id:story.story_id,slot,
         context,viewport,page_url:pageUrl,image_url:imageUrl,expected_sha256:img.sha256,
         expected_alt_text:img.alt_text,headline:story.complete_compiler_story.headline});
     }
   }
 }
 if(targets.length!==24||slots.size!==6||[...counts.values()].some(v=>v!==2))fail('incorrect_24_matrix');
 return targets;
}
export function evaluateImageTargetEvidence({targets,rows,reviews=[]}){
 const expected=new Map(targets.map(x=>[x.target_id,x]));
 const captured=new Map(),reviewed=new Map(reviews.map(x=>[x.target_id,x]));
 if(expected.size!==24||!Array.isArray(rows)||!Array.isArray(reviews))fail('invalid_matrix');
 const defects=[];
 for(const row of rows){
   if(!expected.has(row.target_id)||captured.has(row.target_id))defects.push('duplicate_or_unexpected_target:'+row.target_id);
   else captured.set(row.target_id,row);
 }
 if(reviewed.size!==reviews.length)defects.push('duplicate_review');
 for(const [key,t] of expected){
   const row=captured.get(key),r=reviewed.get(key);
   if(!row||row.page_url!==t.page_url||row.image_url!==t.image_url||
     row.live_image_sha256!==t.expected_sha256||row.alt_text!==t.expected_alt_text||
     row.natural_width!==1200||row.natural_height!==630||
     row.img_complete!==true||row.image_in_capture!==true||
     row.horizontal_overflow!==false||!row.screenshot_sha256||!row.screenshot_path||
     row.clip_pass!==true)defects.push('target_unproven:'+key);
   if(!r||r.result!=='PASS'||!['human','semantic_pixel_inspection'].includes(r.inspection_method)||
     typeof r.reviewer!=='string'||r.reviewer.length<3||
     r.screenshot_sha256!==row?.screenshot_sha256||
     r.accepted_image_sha256!==t.expected_sha256||
     r.small_text_legible!==true||r.no_clipping_overlap_pseudotext!==true||
     r.story_mechanism_correct!==true)
     defects.push('pixel_review_unproven:'+key);
 }
 return {schema_version:'external-image-element24-verification-v1',
   result:defects.length?'BLOCKED_INCOMPLETE':'VISUAL_24_VERIFIED',
   expected_targets:24,captured_targets:captured.size,
   reviewed_pass:24-defects.filter(x=>x.startsWith('pixel_review_unproven:')).length,
   defects,automatic_screenshot_count_not_visual_pass:true};
}
export async function captureImageTargetEvidence({job,manifest,outDir,chromium,fetchImpl=fetch}){
 const targets=planImageElementTargets({job,manifest});
 if(!chromium)fail('real_chromium_driver_required');
 fs.mkdirSync(outDir,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_BINARY,
   headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const rows=[];
 try{
  for(const target of targets){
   const vp=VIEWPORTS[target.viewport],page=await browser.newPage({viewport:vp,deviceScaleFactor:1});
   try{
    const response=await page.goto(target.page_url,{waitUntil:'domcontentloaded',timeout:45000});
    if(response?.status()!==200)fail('target_page_http:'+target.target_id);
    const image=page.locator('img').filter({hasNot:page.locator('svg')}); // locator narrowed by exact src below
    const matching=page.locator('img[src*="'+target.image_url.split('/').pop().split('?')[0]+'"]');
    if(await matching.count()!==1)fail('not_exactly_one_target_image:'+target.target_id);
    await matching.evaluate(async el=>{
       if(!el.complete)await new Promise((resolve,reject)=>{
         el.addEventListener('load',resolve,{once:true});el.addEventListener('error',reject,{once:true});
         setTimeout(()=>reject(Error('image load timeout')),20000);
       });
       el.scrollIntoView({block:'center',inline:'nearest'});
    });
    const meta=await matching.evaluate(el=>{
      const b=el.getBoundingClientRect();
      const headings=Array.from(document.querySelectorAll('h1,h2,h3')).filter(h=>h.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING);
      return {src:el.src,alt:el.alt,complete:el.complete,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,
        box:{x:b.x,y:b.y,width:b.width,height:b.height},heading:headings.at(-1)?.textContent?.trim()??'',
        overflow:document.documentElement.scrollWidth>window.innerWidth+1};
    });
    if(meta.src!==target.image_url||meta.alt!==target.expected_alt_text||!meta.complete||
      meta.naturalWidth!==1200||meta.naturalHeight!==630||
      meta.box.width<150||meta.box.height<75||meta.overflow||
      meta.box.x<0||meta.box.y<0||meta.box.x+meta.box.width>vp.width+1||
      meta.box.y+meta.box.height>vp.height+1)fail('image_area_or_size_invalid:'+target.target_id);
    const imgResponse=await fetchImpl(meta.src);
    if(imgResponse.status!==200||hash(Buffer.from(await imgResponse.arrayBuffer()))!==target.expected_sha256)
      fail('live_image_hash_mismatch:'+target.target_id);
    const clip={x:Math.max(0,Math.floor(meta.box.x)-14),y:Math.max(0,Math.floor(meta.box.y)-105)};
    clip.width=Math.min(vp.width-clip.x,Math.ceil(meta.box.width)+28);
    clip.height=Math.min(vp.height-clip.y,Math.ceil(meta.box.height)+125);
    if(clip.x>meta.box.x||clip.y>meta.box.y||clip.x+clip.width<meta.box.x+meta.box.width-1||
      clip.y+clip.height<meta.box.y+meta.box.height-1)fail('capture_excludes_image:'+target.target_id);
    const file=target.target_id.replaceAll(':','--')+'.png',screenshotPath=path.join(outDir,file);
    const screenshot=await page.screenshot({path:screenshotPath,type:'png',clip});
    rows.push({target_id:target.target_id,page_url:target.page_url,image_url:meta.src,
      live_image_sha256:target.expected_sha256,alt_text:meta.alt,
      natural_width:meta.naturalWidth,natural_height:meta.naturalHeight,
      img_complete:true,image_in_capture:true,clip_pass:true,horizontal_overflow:false,
      screenshot_path:file,screenshot_sha256:hash(screenshot),
      viewport:target.viewport,viewport_size:vp,image_box:meta.box,context_heading:meta.heading,
      pixel_review_status:'UNREVIEWED',captured_at:new Date().toISOString()});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
 const output={schema_version:'external-image-element24-captures-v1',edition_date:job.edition_date,
   targets,rows,automated_capture_is_not_visual_review:true};
 fs.writeFileSync(path.join(outDir,'captures.json'),JSON.stringify(output,null,2)+'\n');
 return output;
}
async function main(){
 const [jobFile,manifestFile,outDir]=process.argv.slice(2);
 if(!outDir)fail('usage: node scripts/capture-image-element24.mjs <job> <manifest> <output-dir>');
 if(readImageProcessVersions().image_target_capture_policy!=='element24_v1'){
   console.log(JSON.stringify({result:'LEGACY_CAPTURE_SELECTED_NO_NEW_TARGETS'}));return;
 }
 const {chromium}=await import('playwright-core');
 const result=await captureImageTargetEvidence({job:JSON.parse(fs.readFileSync(jobFile)),
   manifest:JSON.parse(fs.readFileSync(manifestFile)),outDir,chromium});
 const assessment=evaluateImageTargetEvidence({targets:result.targets,rows:result.rows});
 fs.writeFileSync(path.join(outDir,'status.json'),JSON.stringify(assessment,null,2)+'\n');
 console.log(JSON.stringify(assessment));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
