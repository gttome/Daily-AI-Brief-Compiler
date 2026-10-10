// I4: read-only proof for an ALREADY DEPLOYED six-image edition. Never patch placeholders.
// Metadata synchronization is separately selectable and guarded by current Pages history.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('image_postrelease:'+x);};
function htmlAttrText(v){
 return v.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&#x27;',"'").replaceAll('&amp;','&');
}
export function bindAlreadyReleasedJob({jobBytes,index,release,manifest}){
 if(!Buffer.isBuffer(jobBytes))fail('exact_original_job_bytes_required');
 const job=JSON.parse(jobBytes),date=job.edition_date;
 if(job.schema_version!=='external-compiler-image-job-v1'||!Array.isArray(job.stories)||job.stories.length!==6||
   index?.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(index.editions)||
   index.editions.filter(x=>x.edition_date===date).length!==1||
   index.editions.find(x=>x.edition_date===date).status!=='RELEASED_VERIFIED'||
   release?.schema_version!=='external-compiler-image-release-v1'||release.result!=='RELEASED_VERIFIED'||
   release.edition_date!==date||release.immutable_job_sha256!==sha(jobBytes)||
   release.original_bundle_sha256!==job.source.bundle_sha256||
   manifest?.schema_version!=='external-compiler-image-package-v1'||
   manifest.edition_date!==date||manifest.job_sha256!==sha(jobBytes)||
   release.images?.length!==6||manifest.images?.length!==6)
   fail('no_exact_completed_six_image_release');
 const byRelease=new Map(release.images.map(x=>[x.story_id,x]));
 const byManifest=new Map(manifest.images.map(x=>[x.story_id,x]));
 const stories=[];
 if(byRelease.size!==6||byManifest.size!==6)fail('duplicate_story');
 for(const story of job.stories){
   const row=byRelease.get(story.story_id),m=byManifest.get(story.story_id);
   if(!row||!m||row.sha256!==m.sha256||row.bytes!==m.bytes||
     !row.route?.startsWith('briefs/images/'+date+'/dab-edition-'+date+'-')||
     !row.route.endsWith('.png')||m.alt_text?.length<10||m.accepted_locked!==true||
     m.visual_review?.inspected_png_sha256!==row.sha256||
     !story.permanent_url?.startsWith(BASE+'stories/'+date+'/'))
     fail('immutable_published_image_pair_mismatch:'+story.story_id);
   stories.push({story_id:story.story_id,permanent_url:story.permanent_url,headline:story.complete_compiler_story.headline,
     image_url:BASE+row.route+'?v='+row.sha256.slice(0,12),image_sha256:row.sha256,image_bytes:row.bytes,
     image_alt_text:m.alt_text});
 }
 return {date,stories,job_sha256:sha(jobBytes),release_sha256:sha(Buffer.from(JSON.stringify(release)))};
}
export async function verifyAlreadyLiveImages({jobBytes,index,release,manifest,fetchImpl=fetch}){
 const binding=bindAlreadyReleasedJob({jobBytes,index,release,manifest});
 const routes=[{context:'dated',url:BASE+'briefs/'+binding.date+'/'},
   ...binding.stories.map(s=>({context:s.story_id,url:s.permanent_url}))];
 const html=new Map(),imageChecks=[],pageChecks=[];
 for(const p of routes){
   const resp=await fetchImpl(p.url);
   if(resp.status!==200)fail('live_page_http:'+p.url+':'+resp.status);
   html.set(p.url,await resp.text());
 }
 for(const story of binding.stories){
   const resp=await fetchImpl(story.image_url);
   if(resp.status!==200)fail('live_image_http:'+story.story_id);
   const bytes=Buffer.from(await resp.arrayBuffer());
   if(bytes.length!==story.image_bytes||sha(bytes)!==story.image_sha256)fail('live_image_sha_mismatch:'+story.story_id);
   imageChecks.push({story_id:story.story_id,image_url:story.image_url,sha256:story.image_sha256,bytes:bytes.length});
   for(const url of [BASE+'briefs/'+binding.date+'/',story.permanent_url]){
     const page=html.get(url),tags=[...page.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
     const found=tags.filter(tag=>{
       const src=/\bsrc="([^"]+)"/.exec(tag),alt=/\balt="([^"]*)"/.exec(tag);
       return src&&alt&&htmlAttrText(src[1])===story.image_url&&htmlAttrText(alt[1])===story.image_alt_text;
     });
     if(found.length!==1)fail('live_story_image_pairing:'+story.story_id+':'+url);
     // The seven *current* published pages must not contain any of this
     // story's old placeholder, but may contain unrelated editorial text.
     if(page.includes('Illustration pending for '+story.headline))fail('stale_story_placeholder:'+story.story_id);
     pageChecks.push({story_id:story.story_id,url,pairing:'PASS'});
   }
 }
 return {schema_version:'external-image-postrelease-verify-only-v1',result:'LIVE_SIX_IMAGE_BYTES_AND_BINDINGS_PASS',
   edition_date:binding.date,immutable_job_sha256:binding.job_sha256,
   live_images:imageChecks,article_contexts:pageChecks,
   accepted_image_regenerations:0,placeholder_replacement_invocations:0,
   protected_initial_editorial_publisher_not_modified:true,
   status_and_semantic_pixel_review_separate:true};
}
export async function publicImageStatusMirror({date,indexBytes,releaseBytes,fetchImpl=fetch}){
 const indexUrl=BASE+'image-jobs/index.json',receiptUrl=BASE+'image-jobs/'+date+'/release.json';
 const urls=[indexUrl,receiptUrl],expected=[sha(indexBytes),sha(releaseBytes)],observed=[];
 for(let i=0;i<2;i++){
   try{
    const res=await fetchImpl(urls[i]);
    const bytes=Buffer.from(await res.arrayBuffer());
    observed.push({url:urls[i],http_status:res.status,sha256:res.status===200?sha(bytes):null,
      expected_sha256:expected[i],match:res.status===200&&sha(bytes)===expected[i]});
   }catch(e){observed.push({url:urls[i],http_status:null,match:false,reason:'network_unavailable'});}
 }
 const consistent=observed.every(x=>x.match);
 return {schema_version:'external-image-public-status-mirror-v2',
   result:consistent?'PUBLIC_STATUS_VERIFIED':'STATUS_SYNC_PENDING',
   edition_date:date,observed,published_complete_not_inferred:true};
}
async function main(){
 const [jobFile,indexFile,releaseFile,manifestFile,outputFile]=process.argv.slice(2);
 if(!outputFile)fail('usage: node scripts/verify-external-image-postrelease.mjs <historical-job> <history-index> <history-release> <accepted-package-manifest> <output>');
 const jobBytes=fs.readFileSync(jobFile),indexBytes=fs.readFileSync(indexFile),releaseBytes=fs.readFileSync(releaseFile);
 const date=JSON.parse(jobBytes).edition_date;
 const check=await verifyAlreadyLiveImages({jobBytes,index:JSON.parse(indexBytes),release:JSON.parse(releaseBytes),
   manifest:JSON.parse(fs.readFileSync(manifestFile))});
 const mirror=await publicImageStatusMirror({date,indexBytes,releaseBytes});
 const receipt={...check,public_status:mirror,final_completion:'BLOCKED_INCOMPLETE_UNTIL_ACTUAL_24_PIXEL_REVIEWS'};
 fs.mkdirSync(path.dirname(outputFile),{recursive:true});
 fs.writeFileSync(outputFile,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({result:check.result,public_status:mirror.result,
   accepted_image_regenerations:0,placeholder_replacement_invocations:0}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
