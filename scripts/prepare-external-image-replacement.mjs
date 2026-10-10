// Deterministic, fail-closed postpublication HTML/media-only staging.
// Never runs the semantic compiler, editor, image generator or Primary schedule.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {checkRealPng} from './stage-external-image-package.mjs';
import {OCT8_LIVE_BASELINE,OCT8_PUBLIC_BASE} from './audit-oct8-live.mjs';

const fail=s=>{throw new Error('external_image_replacement:'+s);};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function decodeAttribute(value){
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi,(match,entity)=>{
    if(entity[0]!=='#')return named[entity.toLowerCase()];
    const hex=entity[1].toLowerCase()==='x';
    const point=Number.parseInt(entity.slice(hex?2:1),hex?16:10);
    return point>0&&point<=0x10ffff&&!(point>=0xd800&&point<=0xdfff)?String.fromCodePoint(point):match;
  });
}
const SLOTS={
  'Technical AI Engineering':['m01','m02'],
  'Applied Generative AI for Knowledge Workers':['m10','m11'],
  'Agents for Everyone':['m12','m14']
};
function cleanRelative(route,date){
  if(typeof route!=='string'||!new RegExp('^/stories/'+date+'/[a-z0-9-]+/$').test(route))fail('unsafe_story_route');
  return route.slice(1)+'index.html';
}
function fileWalk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    if(e.isSymbolicLink())fail('history_symlink_not_allowed');
    const p=path.join(dir,e.name);
    return e.isDirectory()?fileWalk(p):[p];
  });
}
function protectedOctober8(root){
  const rows=[];
  for(const [relative,[expected,bytes]] of Object.entries(OCT8_LIVE_BASELINE)){
    const file=path.join(root,relative);
    if(!fs.existsSync(file))fail('oct8_missing:'+relative);
    const actual=fs.readFileSync(file);
    if(actual.length!==bytes||digest(actual)!==expected)fail('oct8_local_history_drift:'+relative);
    rows.push({route:relative,sha256:expected,bytes});
  }
  if(rows.length!==17)fail('oct8_incomplete');
  return rows;
}
export function slotsFor(bundle){
  const positions=new Map();
  const counters=new Map();
  for(const s of bundle.stories){
    const arr=SLOTS[s.focus],i=counters.get(s.focus)||0;
    if(!arr||!arr[i]||positions.has(s.id))fail('canonical_image_slot_mismatch');
    counters.set(s.focus,i+1);positions.set(s.id,arr[i]);
  }
  if(positions.size!==6||[...counters.values()].some(n=>n!==2))fail('six_canonical_slots_required');
  return positions;
}
export function replaceSingleTag(document,story,imageUrl,acceptedAlt=story.image_alt_intent){
  const expectedAlt='Illustration pending for '+story.headline+'. Planned illustration: '+story.image_alt_intent;
  if(typeof acceptedAlt!=='string'||!acceptedAlt.trim())fail('missing_reviewed_alt:'+story.id);
  const expectedPath='/Daily-AI-Brief-Compiler/briefs/images/'+story.permanent_route.split('/')[2]+'/illustration-pending.svg';
  let replacements=0;
  const result=document.replace(/<img\b[^>]*>/g,tag=>{
    const alt=/\balt="([^"]*)"/.exec(tag),src=/\bsrc="([^"]+)"/.exec(tag);
    // Compare attribute values, not equivalent serialization choices made by Jekyll.
    // The full story-specific text, original source path and unique match remain required.
    if(!alt||decodeAttribute(alt[1])!==expectedAlt)return tag;
    if(!src)fail('missing_img_source_for_story:'+story.id);
    let url;try{url=new URL(src[1].replaceAll('&amp;','&'),OCT8_PUBLIC_BASE);}catch{fail('invalid_original_image_url');}
    if(url.pathname!==expectedPath)fail('not_an_original_pending_image:'+story.id);
    replacements++;
    return tag.replace(src[0],'src="'+imageUrl+'"').replace(alt[0],'alt="'+escapeHtml(acceptedAlt)+'"');
  });
  if(replacements!==1)fail('exactly_one_original_placeholder_per_story:'+story.id+':'+replacements);
  return result;
}
function replaceHtml(file,stories,urls,alts){
  if(!fs.existsSync(file))fail('reader_html_missing:'+file);
  const original=fs.readFileSync(file,'utf8');
  let next=original;
  for(const story of stories)next=replaceSingleTag(next,story,urls.get(story.id),alts.get(story.id));
  if(next===original)fail('reader_html_unchanged');
  fs.writeFileSync(file,next,'utf8');
}
export function verifyNoOtherChanges(historyRoot,outRoot,allowed){
  const previous=fileWalk(historyRoot),next=fileWalk(outRoot);
  const toRelative=p=>path.relative(historyRoot,p).split(path.sep).join('/');
  const fromOutput=p=>path.relative(outRoot,p).split(path.sep).join('/');
  let kept=0;
  for(const original of previous){
    const relative=toRelative(original),candidate=path.join(outRoot,relative);
    if(!fs.existsSync(candidate))fail('historic_reader_path_deleted:'+relative);
    if(!allowed.has(relative)){
      if(!fs.readFileSync(original).equals(fs.readFileSync(candidate)))fail('unrelated_reader_byte_modified:'+relative);
      kept++;
    }
  }
  const oldSet=new Set(previous.map(toRelative));
  for(const output of next){
    const relative=fromOutput(output);
    if(!oldSet.has(relative)&&!allowed.has(relative))fail('unexpected_new_site_file:'+relative);
  }
  return kept;
}
export function prepareExternalImageReplacement({job,jobBytes,bundleBytes,state,manifest,stagingReceipt,
  historyRoot,outputRoot,repoRoot,historyHead}){
  if(!Buffer.isBuffer(jobBytes)||!Buffer.isBuffer(bundleBytes))fail('exact_job_and_bundle_bytes_required');
  const bundle=JSON.parse(bundleBytes.toString('utf8')),date=job.edition_date;
  if(job.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
    date<='2026-10-08'||!/^20\d{2}-\d{2}-\d{2}$/.test(date||'')||
    bundle.edition_date!==date||bundle.image_representation?.status!=='images_pending'||
    state?.state!=='SHADOW_VERIFIED'||state.stage!=='VERIFY'||state.edition_date!==date||
    state.execution_id!==job.execution_id||state.images?.mode!=='images_pending'||
    state.images.accepted.length!==0||state.branch!==job.source.branch||
    digest(bundleBytes)!==job.source.bundle_sha256||state.bundle.digest!==job.source.bundle_sha256||
    manifest.job_sha256!==digest(jobBytes)||manifest.original_bundle_sha256!==job.source.bundle_sha256||
    manifest.original_source_commit_sha!==job.source.commit_sha||
    stagingReceipt?.result!=='STAGED_ONLY'||stagingReceipt.remote_git_readback!==true||
    stagingReceipt.images?.length!==6||stagingReceipt.job_sha256!==manifest.job_sha256||
    stagingReceipt.original_bundle_sha256!==job.source.bundle_sha256||
    stagingReceipt.expected_pages_history_head!==manifest.expected_pages_history_head)
      fail('unqualified_stale_or_unpublished_source');
  if(!/^[a-f0-9]{40}$/.test(historyHead||'')||historyHead!==manifest.expected_pages_history_head)fail('stale_history_head');
  if(!Array.isArray(bundle.stories)||bundle.stories.length!==6||
    !Array.isArray(manifest.images)||manifest.images.length!==6||
    !Array.isArray(job.stories)||job.stories.length!==6)fail('six_story_package_required');
  if(path.resolve(outputRoot)===path.resolve(historyRoot)||path.resolve(outputRoot).startsWith(path.resolve(historyRoot)+path.sep)||path.resolve(historyRoot).startsWith(path.resolve(outputRoot)+path.sep))fail('history_read_only');
  const oct8=protectedOctober8(historyRoot),slots=slotsFor(bundle);
  const stageMap=new Map(stagingReceipt.images.map(x=>[x.story_id,x]));
  const inputs=new Map(job.stories.map(x=>[x.story_id,x]));
  const packageMap=new Map(manifest.images.map(x=>[x.story_id,x]));
  if(stageMap.size!==6||inputs.size!==6||packageMap.size!==6)fail('duplicate_story_binding');
  const output=path.resolve(outputRoot),source=path.resolve(historyRoot),root=path.resolve(repoRoot);
  fs.rmSync(output,{recursive:true,force:true});
  fs.cpSync(source,output,{recursive:true});
  const images=[],urls=new Map(),alts=new Map(),allowed=new Set();
  for(const story of bundle.stories){
    const pkg=packageMap.get(story.id),stage=stageMap.get(story.id),input=inputs.get(story.id);
    if(!pkg||!stage||!input||input.permanent_url!==OCT8_PUBLIC_BASE+story.permanent_route.slice(1)||
      pkg.sha256!==stage.sha256||pkg.git_blob_sha!==stage.git_blob_sha||pkg.path!==stage.path||
      pkg.bytes!==stage.bytes||pkg.accepted_locked!==true)fail('wrong_story_or_reviewed_image_binding:'+story.id);
    const src=path.resolve(root,pkg.path);
    if(!src.startsWith(root+path.sep))fail('package_path_traversal');
    const bytes=fs.readFileSync(src);
    const actual=checkRealPng(bytes);
    if(actual.sha256!==pkg.sha256||actual.git_blob_sha!==pkg.git_blob_sha||actual.bytes!==pkg.bytes)fail('staged_png_drift:'+story.id);
    const relative='briefs/images/'+date+'/dab-edition-'+date+'-'+slots.get(story.id)+'.png';
    const dest=path.join(output,relative);
    if(fs.existsSync(path.join(source,relative)))fail('replacement_asset_already_exists:'+story.id);
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});
    allowed.add(relative);
    const url=OCT8_PUBLIC_BASE+relative+'?v='+pkg.sha256.slice(0,12);
    urls.set(story.id,url);
    // Current packages carry reviewed descriptions of the actual accepted pixels.
    // Older packages retain their original image intent when no reviewed alt is supplied.
    alts.set(story.id,pkg.alt_text??story.image_alt_intent);
    images.push({story_id:story.id,slot:slots.get(story.id),route:relative,url,sha256:actual.sha256,git_blob_sha:gitBlob(bytes),bytes:actual.bytes});
  }
  const dated='briefs/'+date+'/index.html';
  replaceHtml(path.join(output,dated),bundle.stories,urls,alts);
  allowed.add(dated);
  for(const story of bundle.stories){
    const relative=cleanRelative(story.permanent_route,date);
    replaceHtml(path.join(output,relative),[story],urls,alts);
    allowed.add(relative);
  }
  const home=path.join(output,'index.html');
  const homeText=fs.readFileSync(home,'utf8');
  const homeIsEdition=homeText.includes('data-brief-date="'+date+'"');
  if(homeIsEdition){
    replaceHtml(home,bundle.stories,urls,alts);allowed.add('index.html');
  }
  const unrelatedVerified=verifyNoOtherChanges(source,output,allowed);
  protectedOctober8(output);
  const changes=[...allowed].sort().map(relative=>{
    const bytes=fs.readFileSync(path.join(output,relative));
    return {route:relative,bytes:bytes.length,sha256:digest(bytes)};
  });
  return {
    schema_version:'external-compiler-image-only-replacement-preparation-v1',
    result:'PREPARED_ONLY',publication_verified:false,visual_review_not_inferred:true,
    edition_date:date,execution_id:job.execution_id,source_bundle_sha256:job.source.bundle_sha256,
    source_commit_sha:job.source.commit_sha,job_sha256:manifest.job_sha256,
    expected_pages_history_head:historyHead,staged_package_head:stagingReceipt.package_head_sha,
    images,homepage_changed:homeIsEdition,changed_paths:changes,changed_count:changes.length,
    oct8_pinned_count:oct8.length,unrelated_byte_identical_files:unrelatedVerified,
    semantic_rework:0,accepted_image_regenerations:0,
    original_publication_bundle_untouched:true
  };
}
function main(){
  const [jobPath,bundlePath,statePath,manifestPath,stagePath,historyRoot,outRoot,repoRoot,historyHead,receiptPath]=process.argv.slice(2);
  if(!receiptPath)fail('usage: node scripts/prepare-external-image-replacement.mjs <job> <original-bundle> <original-state> <manifest> <remote-stage-receipt> <history-site> <output-site> <repo-root> <exact-history-head> <receipt>');
  const jobBytes=fs.readFileSync(jobPath),bundleBytes=fs.readFileSync(bundlePath);
  const receipt=prepareExternalImageReplacement({job:JSON.parse(jobBytes),jobBytes,bundleBytes,
    state:JSON.parse(fs.readFileSync(statePath,'utf8')),manifest:JSON.parse(fs.readFileSync(manifestPath,'utf8')),
    stagingReceipt:JSON.parse(fs.readFileSync(stagePath,'utf8')),historyRoot,outputRoot:outRoot,repoRoot,historyHead});
  fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({result:receipt.result,edition_date:receipt.edition_date,changed_count:receipt.changed_count,oct8_pinned_count:receipt.oct8_pinned_count,release_ready:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
