// Read-only-source, staging-only mobile full-size image viewer for published
// articles. Never regenerates or changes accepted PNGs or editorial story text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {OCT8_LIVE_BASELINE} from './audit-oct8-live.mjs';
import {verifyNoOtherChanges} from './prepare-external-image-replacement.mjs';

const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('premium_mobile_zoom:'+x);};
const cssLink='<link rel="stylesheet" href="/Daily-AI-Brief-Compiler/assets/css/premium-image-zoom.css?v=1">';
const scriptLink='<script defer src="/Daily-AI-Brief-Compiler/assets/js/premium-image-zoom.js?v=1"></script>';

export function injectZoomIntoAcceptedPage(original,{date,expectedCount}){
 if(typeof original!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(date||'')||
   !original.includes('<body class="reader-release" data-brief-date="'+date+'"')||
   original.includes('premium-image-zoom.js')||original.includes('premium-image-zoom.css')||
   original.split('</head>').length!==2||original.split('</body>').length!==2)
   fail('noncanonical_or_previously_patched_page');
 const targets=[...original.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]).filter(tag=>
   tag.includes('/briefs/images/'+date+'/dab-edition-'+date+'-') &&tag.includes('.png?v='));
 if(targets.length!==expectedCount||targets.some(tag=>!/alt="[^"]+"/.test(tag)))
   fail('wrong_number_of_persisted_premium_images');
 const patched=original.replace('</head>','  '+cssLink+'\n</head>')
   .replace('</body>','  '+scriptLink+'\n</body>');
 if(patched.replace('  '+cssLink+'\n','').replace('  '+scriptLink+'\n','')!==original)
   fail('non_image_reader_copy_changed');
 return patched;
}
function validatedRelease(site,repo,date){
 const jobBytes=fs.readFileSync(path.join(site,'image-jobs',date,'job.json'));
 const job=JSON.parse(jobBytes);
 const release=JSON.parse(fs.readFileSync(path.join(site,'image-jobs',date,'release.json')));
 const index=JSON.parse(fs.readFileSync(path.join(site,'image-jobs','index.json')));
 const manifest=JSON.parse(fs.readFileSync(path.join(repo,'external-image-packages',date,'manifest.json')));
 if(job.schema_version!=='external-compiler-image-job-v1'||job.edition_date!==date||
    job.stories?.length!==6||release.result!=='RELEASED_VERIFIED'||
    release.immutable_job_sha256!==hash(jobBytes)||
    manifest.job_sha256!==hash(jobBytes)||manifest.images?.length!==6||
    index.editions?.find(e=>e.edition_date===date)?.status!=='RELEASED_VERIFIED')
    fail('must_be_exact_six_image_already_published_edition');
 const imageChecks=[];
 for(const item of release.images){
   const m=manifest.images.find(x=>x.story_id===item.story_id);
   const file=path.resolve(site,item.route);
   if(!m||!file.startsWith(path.resolve(site)+path.sep)||item.sha256!==m.sha256||
      !fs.existsSync(file)||hash(fs.readFileSync(file))!==m.sha256||
      fs.statSync(file).size!==m.bytes)fail('accepted_original_png_or_mapping_modified:'+item.story_id);
   imageChecks.push({story_id:item.story_id,sha256:item.sha256,route:item.route});
 }
 if(imageChecks.length!==6||new Set(imageChecks.map(x=>x.story_id)).size!==6)fail('six_distinct_accepted');
 return {job,manifest,images:imageChecks};
}
function assertOct8Pins(site){
 for(const [route,[digest,bytes]] of Object.entries(OCT8_LIVE_BASELINE)){
   const f=path.join(site,route);
   if(!fs.existsSync(f))fail('protected_oct8_missing:'+route);
   const b=fs.readFileSync(f);
   if(b.length!==bytes||hash(b)!==digest)fail('protected_oct8_drift:'+route);
 }
 return 17;
}
export function stagePublishedMobileZoom({historySiteRoot,outSiteRoot,repoRoot='.',date='2026-10-10'}){
 if(date!=='2026-10-10')fail('only_real_qualified_oct10_edition');
 const origin=path.resolve(historySiteRoot),output=path.resolve(outSiteRoot),repo=path.resolve(repoRoot);
 if(output===origin||output.startsWith(origin+path.sep)||origin.startsWith(output+path.sep))
   fail('history_is_read_only');
 const before=validatedRelease(origin,repo,date);
 assertOct8Pins(origin);
 const dates=['briefs/'+date+'/index.html'];
 const urls=before.job.stories.map(s=>{
   if(typeof s.permanent_url!=='string'||!s.permanent_url.startsWith(BASE+'stories/'+date+'/')||
     !s.permanent_url.endsWith('/'))fail('invalid_story_permanent_route');
   return s.permanent_url.slice(BASE.length)+'index.html';
 });
 const all=[...dates,...urls];
 if(all.length!==7||new Set(all).size!==7)fail('exact_seven_reader_routes_required');
 fs.rmSync(output,{recursive:true,force:true});
 fs.cpSync(origin,output,{recursive:true});
 const allowed=new Set();
 const htmlChanges=[];
 for(const [i,relative] of all.entries()){
   const f=path.join(origin,relative),dest=path.join(output,relative);
   const original=fs.readFileSync(f,'utf8');
   const patched=injectZoomIntoAcceptedPage(original,{date,expectedCount:i===0?6:1});
   fs.writeFileSync(dest,patched);
   allowed.add(relative);
   htmlChanges.push({route:relative,original_sha256:hash(Buffer.from(original)),
     staged_sha256:hash(Buffer.from(patched)),original_html_recoverable:true});
 }
 for(const [src,dst] of [
 ['assets/premium-image-zoom.js','assets/js/premium-image-zoom.js'],
 ['assets/premium-image-zoom.css','assets/css/premium-image-zoom.css']]){
   const dest=path.join(output,dst);
   if(fs.existsSync(path.join(origin,dst)))fail('zoom_asset_already_published');
   fs.copyFileSync(path.join(repo,src),dest,fs.constants.COPYFILE_EXCL);
   allowed.add(dst);
 }
 const unrelated=verifyNoOtherChanges(origin,output,allowed);
 const after=validatedRelease(output,repo,date);
 assertOct8Pins(output);
 if(JSON.stringify(before.images)!==JSON.stringify(after.images))
   fail('accepted_image_digest_modified');
 return {
   schema_version:'published-premium-mobile-zoom-staging-v1',result:'STAGED_ONLY_NOT_PUBLISHED',
   edition_date:date,history_snapshot_read_only:true,
   reader_routes:htmlChanges,added_assets:['assets/js/premium-image-zoom.js','assets/css/premium-image-zoom.css'],
   allowed_changed_paths:[...allowed].sort(),unrelated_byte_identical_files:unrelated,
   six_accepted_png_sha256s:after.images,protected_oct8_objects:17,
   accepted_pngs_regenerated:0,editorial_story_content_changed:false,original_placeholders_restored:false,
   mobile_full_resolution_native_width:1200,live_visual_review_not_inferred:true
 };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [historicalRoot,outputRoot,receiptPath]=process.argv.slice(2);
 if(!receiptPath)fail('usage: node scripts/stage-published-mobile-zoom.mjs <current-read-only-history-site> <staging-output-site> <receipt>');
 const result=stagePublishedMobileZoom({historySiteRoot:historicalRoot,outSiteRoot:outputRoot});
 fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
 fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({result:result.result,changed_paths:result.allowed_changed_paths.length,oct8:17,accepted_pngs:6}));
}
