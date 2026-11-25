#!/usr/bin/env node
// Owner-authorized postpublication revision for the six November 25 illustrations.
// Original immutable editorial bundle, accepted images and historical release receipt are never rewritten.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {checkRealPng} from './stage-external-image-package.mjs';
import {verifyNoOtherChanges} from './prepare-external-image-replacement.mjs';
import {OCT8_LIVE_BASELINE,OCT8_PUBLIC_BASE} from './audit-oct8-live.mjs';

const DATE='2026-11-25', REV='owner-layout-r2', BASE=OCT8_PUBLIC_BASE;
const fail=s=>{throw Error('owner_nov25_revision:'+s)};
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const validHex=(x,n)=>typeof x==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(x);
const safePath=p=>typeof p==='string'&&!p.startsWith('/')&&!p.split('/').includes('..')&&!p.includes('\\');
const ensure=(ok,why)=>{if(!ok)fail(why)};
function readManifest(root){
 const m=read(path.join(root,'external-image-revisions/2026-11-25/owner-layout-r2/manifest.json'));
 ensure(m.schema_version==='daily-compiler-owner-image-revision-v1'&&m.edition_date===DATE&&m.revision_id===REV&&m.authorized_by==='owner-explicit-nov25-layout-correction'&&m.preserve_accepted_originals===true&&m.semantic_rework===0,'manifest_contract');
 ensure(m.source_commit_sha==='c78d2b5ffa0fb0b0d42a82d8646209c327b4ee68'&&m.source_bundle_sha256==='1c19ce9e731d1538adfa49e0e38bbcf4a6f4a0a9795767d46c4f16cf0ce0571f','source_identity');
 ensure(Array.isArray(m.images)&&m.images.length===6&&new Set(m.images.map(i=>i.story_id)).size===6&&new Set(m.images.map(i=>i.sha256)).size===6&&m.images.filter(i=>i.replaced===true).length===3&&m.images.every(i=>i.replaced===['nov25-a1-agentic-eval-chain','nov25-g1-workspace-mcp','nov25-g2-switchcraft-routing'].includes(i.story_id)),'exact_three_replacements');
 return m;
}
function activePolicy(repo){
 const policy=fs.readFileSync(path.join(repo,'docs/automation/current/IMAGES.md'),'utf8');
 ensure(policy.includes('vary visible composition within and across editions')&&policy.includes('At most two images'),'new_art_direction_missing');
}
function inspectOriginal({history,manifest}){
 const job=read(path.join(history,'image-jobs/2026-11-25/job.json'));
 const index=read(path.join(history,'image-jobs/index.json'));
 const release=read(path.join(history,'image-jobs/2026-11-25/release.json'));
 ensure(job.edition_date===DATE&&job.source?.commit_sha===manifest.source_commit_sha&&job.source?.bundle_sha256===manifest.source_bundle_sha256&&job.stories?.length===6,'original_job_mismatch');
 ensure(index.editions?.filter(r=>r.edition_date===DATE).length===1&&index.editions.find(r=>r.edition_date===DATE).status==='RELEASED_VERIFIED','original_image_index_unreleased');
 ensure(release.result==='RELEASED_VERIFIED'&&release.edition_date===DATE&&release.original_bundle_sha256===manifest.source_bundle_sha256&&release.images?.length===6,'original_release_missing');
 const byRelease=new Map(release.images.map(r=>[r.story_id,r]));
 const byStory=new Map(job.stories.map(s=>[s.story_id,s]));
 ensure(byRelease.size===6&&byStory.size===6,'original_duplicate_story');
 const legacy=[];
 for(const entry of manifest.images){
  const source=byRelease.get(entry.story_id),story=byStory.get(entry.story_id);
  ensure(source&&story&&source.sha256===entry.old_sha256&&source.route===`briefs/images/${DATE}/dab-edition-${DATE}-${entry.slot}.png`,'original_pair_mismatch:'+entry.story_id);
  ensure(story.permanent_url?.startsWith(BASE+`stories/${DATE}/`),'unsafe_permanent_route:'+entry.story_id);
  const b=fs.readFileSync(path.join(history,source.route));
  ensure(b.length===source.bytes&&digest(b)===entry.old_sha256,'original_png_changed:'+entry.story_id);
  legacy.push({story_id:entry.story_id,original_bytes:source.bytes,original_sha256:source.sha256,route:source.route});
 }
 for(const [relative,[sha,bytes]] of Object.entries(OCT8_LIVE_BASELINE)){
  const b=fs.readFileSync(path.join(history,relative));
  ensure(b.length===bytes&&digest(b)===sha,'oct8_local_drift:'+relative);
 }
 ensure(Object.keys(OCT8_LIVE_BASELINE).length===17,'oct8_not_17');
 return {job,index,release,byStory,legacy};
}
function fileWalk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(e.isSymbolicLink())fail('symlink');const p=path.join(dir,e.name);return e.isDirectory()?fileWalk(p):[p]});}
function replaceUrlOnce(text,oldUrl,newUrl,where){
 const count=text.split(oldUrl).length-1;
 ensure(count>=1&&count<=5,'unexpected_image_reference_count:'+where+':'+count);
 ensure(!text.includes(newUrl),'replacement_already_present:'+where);
 return text.replaceAll(oldUrl,newUrl);
}
function stage(repo,history,out,receiptFile,historyHead){
 ensure(validHex(historyHead,40),'history_head_required');
 activePolicy(repo);
 const manifest=readManifest(repo),base=inspectOriginal({history,manifest});
 ensure(path.resolve(out)!==path.resolve(history)&&!path.resolve(out).startsWith(path.resolve(history)+path.sep),'unsafe_output_directory');
 fs.rmSync(out,{recursive:true,force:true});fs.cpSync(history,out,{recursive:true});
 const allowed=new Set(),pages=new Map(),images=[];
 const dated=`briefs/${DATE}/index.html`;
 const homeText=fs.readFileSync(path.join(out,'index.html'),'utf8');
 const homepageIsEdition=homeText.includes(`data-brief-date="${DATE}"`);
 const home=homepageIsEdition?'index.html':null;
 for(const i of manifest.images){
  const oldUrl=BASE+`briefs/images/${DATE}/dab-edition-${DATE}-${i.slot}.png?v=${i.old_sha256.slice(0,12)}`;
  if(!i.replaced){
   ensure(i.old_sha256===i.sha256&&BASE+i.published_route+`?v=${i.sha256.slice(0,12)}`===oldUrl,'retained_image_mismatch:'+i.story_id);
   images.push({story_id:i.story_id,slot:i.slot,old_url:oldUrl,new_url:oldUrl,sha256:i.sha256,old_sha256:i.old_sha256,bytes:i.bytes,route:i.published_route,replaced:false});
   continue;
  }
  ensure(safePath(i.path)&&safePath(i.published_route)&&i.path===`external-image-revisions/${DATE}/${REV}/images/${i.story_id}.png`&&i.published_route===`briefs/images/${DATE}/${REV}/dab-edition-${DATE}-${i.slot}.png`,'unsafe_revision_path:'+i.story_id);
  const source=path.join(repo,i.path),bytes=fs.readFileSync(source),check=checkRealPng(bytes);
  ensure(bytes.length===i.bytes&&check.sha256===i.sha256&&check.git_blob_sha===i.git_blob_sha&&check.width===1200&&check.height===630,'replacement_png_byte_mismatch:'+i.story_id);
  const destination=path.join(out,i.published_route);
  ensure(!fs.existsSync(destination),'versioned_route_already_exists:'+i.story_id);
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});allowed.add(i.published_route);
  const newUrl=BASE+i.published_route+`?v=${i.sha256.slice(0,12)}`;
  const s=base.byStory.get(i.story_id),url=new URL(s.permanent_url),permanent=url.pathname.replace('/Daily-AI-Brief-Compiler/','')+'index.html';
  ensure(permanent.startsWith(`stories/${DATE}/`)&&safePath(permanent),'unsafe_story_route');
  for(const route of [dated,permanent,...(home?[home]:[])]){
   const original=pages.has(route)?pages.get(route):fs.readFileSync(path.join(out,route),'utf8');
   const replaced=replaceUrlOnce(original,oldUrl,newUrl,route+':'+i.story_id);
   const escaped=i.alt_text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
   let matched=0;
   const accessible=replaced.replace(/<img\b[^>]*>/g,tag=>{
    if(!tag.includes(newUrl))return tag;
    ensure(tag.includes(' alt="')&&escaped.length>=40,'updated_alt_missing:'+route);
    matched++;
    return tag.replace(/ alt="[^"]*"/,()=>` alt="${escaped}"`);
   });
   ensure(matched===1,'unexpected_alt_match_count:'+route+':'+matched);
   pages.set(route,accessible);
   allowed.add(route);
  }
  images.push({story_id:i.story_id,slot:i.slot,old_url:oldUrl,new_url:newUrl,sha256:i.sha256,old_sha256:i.old_sha256,bytes:i.bytes,route:i.published_route,replaced:true});
 }
 for(const [route,content] of pages)fs.writeFileSync(path.join(out,route),content,'utf8');
 const kept=verifyNoOtherChanges(history,out,allowed);
 ensure(kept>=17,'unrelated_history_missing');
 const changeRows=[...allowed].sort().map(relative=>({route:relative,sha256:digest(fs.readFileSync(path.join(out,relative)))}));
 const receipt={schema_version:'owner-nov25-image-revision-stage-v1',revision_id:REV,edition_date:DATE,history_head:historyHead,original_publication_preserved:true,original_six_png_bytes_preserved:true,original_release_receipt_preserved:true,original_index_unchanged:true,oct8_objects_preserved:17,unrelated_files_unchanged:kept,homepage_changed:homepageIsEdition,images,change_rows:changeRows,changed_count:allowed.size,source_bundle_sha256:manifest.source_bundle_sha256,publication_verified:false,visual_qa:'REQUIRES_POSTDEPLOY_24_CONTEXT_REVIEW'};
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({result:'PREPARED_ONLY',images:images.length,changed:allowed.size,homepage_changed:homepageIsEdition,old_release_preserved:true}));
}
async function verify(stagingPath){
 const s=read(stagingPath);ensure(s?.schema_version==='owner-nov25-image-revision-stage-v1'&&s.images?.length===6&&!s.publication_verified,'bad_staging_receipt');
 const fetchHash=async(url,sha)=>{let res;try{res=await fetch(url,{headers:{'Cache-Control':'no-cache'}})}catch(e){fail('http_fetch_failed:'+url)};ensure(res.status===200,'http_status:'+res.status+':'+url);const b=Buffer.from(await res.arrayBuffer());ensure(digest(b)===sha,'live_sha_mismatch:'+url);return b.length};
 const dated=BASE+`briefs/${DATE}/`;
 const htmls=new Map();
 const routes=[dated,...new Set(s.images.map(i=>i.story_id))];
 const repo=process.cwd();
 const histJob=read(path.join(repo,'history/site/image-jobs/2026-11-25/job.json'));
 const storyById=new Map(histJob.stories.map(x=>[x.story_id,x]));
 for(const [url] of [[dated],...s.images.map(i=>[storyById.get(i.story_id).permanent_url])]){
  const res=await fetch(url);ensure(res.status===200,'html_http:'+url);htmls.set(url,await res.text());
 }
 let count=0;
 for(const i of s.images){
  await fetchHash(i.new_url,i.sha256);await fetchHash(i.old_url,i.old_sha256);count+=2;
  for(const url of [dated,storyById.get(i.story_id).permanent_url]){
   const html=htmls.get(url);ensure(html.includes(i.new_url)&&(!i.replaced||!html.includes(i.old_url)),'live_page_stale:'+url+':'+i.story_id);count++;
  }
 }
 if(s.homepage_changed){const h=await fetch(BASE).then(r=>r.text());for(const i of s.images)ensure(h.includes(i.new_url)&&(!i.replaced||!h.includes(i.old_url)),'homepage_stale:'+i.story_id)}
 const protectedRows=Object.entries(OCT8_LIVE_BASELINE);
 for(const [rel,[sha]] of protectedRows)await fetchHash(BASE+rel,sha);
 console.log(JSON.stringify({result:'LIVE_REVISION_PNGS_AND_PAGES_VERIFIED',edition_date:DATE,revision_id:REV,live_png_hash_checks:12,story_pair_checks:12,oct8_hash_checks:17,homepage_verified:s.homepage_changed,semantic_review_not_inferred:true}));
}
const [mode,...args]=process.argv.slice(2);
if(mode==='stage'){
 const [repo,history,out,receipt,historyHead]=args;
 ensure(repo&&history&&out&&receipt&&historyHead,'stage_args');stage(repo,history,out,receipt,historyHead);
}else if(mode==='verify'){
 ensure(args.length===1,'verify_args');await verify(args[0]);
}else{fail('usage: stage <repo-root> <history-site> <out-site> <receipt-file> <expected-history-head> | verify <staging-receipt>')}