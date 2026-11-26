// Fail closed before ANY Pages deploy that could revert a previously accepted
// premium image. The published history is the authority; no regeneration or
// editorial recompilation occurs here.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error('published_image_continuity:'+message);};
const read=(root,relative)=>{
  if(relative.includes('..')||relative.startsWith('/')||relative.includes('\\'))
    fail('unsafe_relative_path:'+relative);
  const file=path.join(root,relative);
  if(!fs.existsSync(file))fail('missing_published_file:'+relative);
  return fs.readFileSync(file);
};
const json=(root,relative)=>JSON.parse(read(root,relative).toString('utf8'));
const html=(root,relative)=>read(root,relative).toString('utf8');
const slug=url=>{
  if(typeof url!=='string'||!url.startsWith(BASE+'stories/'))
    fail('untrusted_permanent_story_url');
  const rest=url.slice(BASE.length);
  if(!/^stories\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\/$/.test(rest))
    fail('invalid_permanent_story_route');
  return rest+'index.html';
};
const approvedRevision=(historyRoot,candidateRoot,date,storyIds)=>{
  // Owner-authorized corrections are deliberately versioned: original accepted
  // PNGs and release receipts stay immutable while public pages may point at a
  // separately verified all-image or mixed retained/replacement revision.
  const spec={
    '2026-11-18':{revisionId:'owner-quality-r2',schema:'owner-nov18-image-revision-release-v1',mixed:false},
    '2026-11-25':{revisionId:'owner-layout-r2',schema:'owner-nov25-image-revision-release-v1',mixed:true,
      replaced:new Set(['nov25-a1-agentic-eval-chain','nov25-g1-workspace-mcp','nov25-g2-switchcraft-routing'])}
  }[date];
  if(!spec)return null;
  const {revisionId}=spec;
  const route=`image-revisions/${date}/${revisionId}/release.json`;
  if(!fs.existsSync(path.join(historyRoot,route)))return null;
  const oldReceipt=read(historyRoot,route),newReceipt=read(candidateRoot,route);
  if(!oldReceipt.equals(newReceipt))fail('image_revision_receipt_drift:'+date+':'+revisionId);
  const release=JSON.parse(oldReceipt.toString('utf8'));
  if(release.schema_version!==spec.schema||
     release.edition_date!==date||release.revision_id!==revisionId||
     release.result!=='LIVE_HASH_AND_24_CAPTURES_VERIFIED'||
     release.original_accepted_images_preserved!==true||
     release.original_release_receipt_preserved!==true||
     release.original_bundle_unchanged!==true||release.owner_requested!==true||
     release.images?.length!==6)
    fail('untrusted_image_revision_receipt:'+date+':'+revisionId);
  const byStory=new Map(release.images.map(x=>[x.story_id,x]));
  if(byStory.size!==6||storyIds.some(id=>!byStory.has(id)))
    fail('image_revision_story_set_mismatch:'+date+':'+revisionId);
  for(const image of byStory.values()){
    const revisedRoute=image.route.startsWith(`briefs/images/${date}/${revisionId}/dab-edition-${date}-`);
    const retainedRoute=image.route.startsWith(`briefs/images/${date}/dab-edition-${date}-`);
    const routeAllowed=spec.mixed?
      (spec.replaced.has(image.story_id)?image.replaced===true&&revisedRoute:
        image.replaced===false&&retainedRoute&&!revisedRoute):revisedRoute;
    if(!routeAllowed||
       !image.route.endsWith('.png')||!/^[a-f0-9]{64}$/.test(image.sha256)||
       !Number.isSafeInteger(image.bytes)||image.bytes<100)
      fail('image_revision_identity_incomplete:'+date+':'+image.story_id);
    const prior=read(historyRoot,image.route),currentImage=read(candidateRoot,image.route);
    if(prior.length!==image.bytes||hash(prior)!==image.sha256||
       currentImage.length!==image.bytes||hash(currentImage)!==image.sha256)
      fail('accepted_image_revision_bytes_changed:'+image.route);
  }
  return byStory;
};
export function assertPublishedImageContinuity({historyRoot,candidateRoot}){
  if(!historyRoot||historyRoot==='-'||!fs.existsSync(historyRoot))
    return {result:'PASS',released_editions:0,accepted_images:0,article_image_pairings:0};
  if(!candidateRoot||!fs.existsSync(candidateRoot))fail('candidate_site_missing');
  const historyIndexPath='image-jobs/index.json';
  const old=json(historyRoot,historyIndexPath);
  const current=json(candidateRoot,historyIndexPath);
  if(old.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(old.editions)||
     current.schema_version!==old.schema_version||!Array.isArray(current.editions))
    fail('image_job_index_not_preserved');
  const released=old.editions.filter(x=>x.status==='RELEASED_VERIFIED');
  const seen=new Set();
  let acceptedImages=0,pairings=0;
  for(const row of released){
    const date=row.edition_date;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||seen.has(date))
      fail('duplicate_or_invalid_released_edition');
    seen.add(date);
    if(current.editions.filter(x=>x.edition_date===date&&x.status==='RELEASED_VERIFIED'&&
       x.job_sha256===row.job_sha256).length!==1)
      fail('released_image_status_lost:'+date);
    const route='image-jobs/'+date+'/release.json';
    const oldReceipt=read(historyRoot,route),newReceipt=read(candidateRoot,route);
    if(!oldReceipt.equals(newReceipt))fail('release_receipt_drift:'+date);
    const release=JSON.parse(oldReceipt.toString('utf8'));
    const job=json(historyRoot,'image-jobs/'+date+'/job.json');
    if(release.result!=='RELEASED_VERIFIED'||release.edition_date!==date||
       release.images?.length!==6||job.stories?.length!==6)
      fail('incomplete_verified_image_release:'+date);
    const imageByStory=new Map(release.images.map(x=>[x.story_id,x]));
    if(imageByStory.size!==6)fail('duplicate_released_image_story:'+date);
    const datedPage=html(candidateRoot,'briefs/'+date+'/index.html');
    for(const story of job.stories){
      const image=imageByStory.get(story.story_id);
      if(!image||!image.route.startsWith('briefs/images/'+date+'/dab-edition-'+date+'-')||
         !image.route.endsWith('.png')||!/^[a-f0-9]{64}$/.test(image.sha256)||
         !Number.isSafeInteger(image.bytes)||image.bytes<100)
        fail('release_story_identity_incomplete:'+date);
      const prior=read(historyRoot,image.route),currentImage=read(candidateRoot,image.route);
      if(prior.length!==image.bytes||hash(prior)!==image.sha256||
         currentImage.length!==image.bytes||hash(currentImage)!==image.sha256)
        fail('accepted_image_bytes_changed:'+image.route);
      acceptedImages++;
    }
    const pairingByStory=approvedRevision(
      historyRoot,candidateRoot,date,job.stories.map(story=>story.story_id)
    )||imageByStory;
    for(const story of job.stories){
      const image=pairingByStory.get(story.story_id);
      const imageUrl=BASE+image.route+'?v='+image.sha256.slice(0,12);
      for(const [pageName,content] of [
        ['briefs/'+date+'/index.html',datedPage],
        [slug(story.permanent_url),html(candidateRoot,slug(story.permanent_url))]
      ]){
        const tags=[...content.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
        if(tags.filter(tag=>tag.includes('src="'+imageUrl+'"')).length!==1||
           content.includes('Illustration pending for '+story.complete_compiler_story?.headline))
          fail('accepted_story_image_pairing_lost:'+pageName+':'+story.story_id);
        pairings++;
      }
    }
  }
  return {result:'PASS',released_editions:released.length,accepted_images:acceptedImages,
    article_image_pairings:pairings,accepted_image_regenerations:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [historyRoot,candidateRoot]=process.argv.slice(2);
  if(!historyRoot||!candidateRoot)fail('usage: node scripts/assert-published-image-continuity.mjs <history-site-or-dash> <candidate-site>');
  console.log(JSON.stringify(assertPublishedImageContinuity({historyRoot,candidateRoot})));
}
