import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const EXPECTED_FOCUS = new Map([
  ['Technical AI Engineering', 2],
  ['Applied Generative AI for Knowledge Workers', 2],
  ['Agents for Everyone', 2]
]);
const REQUIRED_BOOKS = new Set([
  'Reliable Generative AI',
  'Reliable Generative AI Context Engineering',
  'Generative AI Professional Prompt Engineering Guide',
  'Generative AI Prompt Engineering Learning Ecosystem'
]);
const PROD_MUTATION_PATTERNS = [
  /github\.com\/gttome\/Daily-AI-Brief(?:\/|$)/i,
  /api\.github\.com\/repos\/gttome\/Daily-AI-Brief(?:\/|$)/i
];

function fail(message) { throw new Error(message); }
function esc(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function ensureArray(value,name,n,min=0){
  if(!Array.isArray(value)||(n!==undefined&&value.length!==n)||value.length<min) fail(name+' invalid');
}
function ensureText(value,name){ if(typeof value!=='string'||!value.trim()) fail(name+' missing'); }
function scanStrings(value,visit){
  if(typeof value==='string') visit(value);
  else if(Array.isArray(value)) value.forEach(v=>scanStrings(v,visit));
  else if(value&&typeof value==='object') Object.values(value).forEach(v=>scanStrings(v,visit));
}
function pngDimensions(bytes){
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') fail('invalid PNG signature');
  if(bytes.subarray(12,16).toString('ascii')!=='IHDR') fail('PNG IHDR missing');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
export function sha256(data){ return crypto.createHash('sha256').update(data).digest('hex'); }
export function gitBlobSha(data){
  const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
}
function slugFromStory(story,date){
  const m=String(story.permanent_route||'').match(new RegExp('^/stories/'+date.replaceAll('-','\\-')+'/([^/]+)/$'));
  if(!m) fail('invalid permanent_route '+story.id);
  return m[1];
}
function sourceDate(record){ return String(record.published_at||'').slice(0,10); }

export function validateEdition({statePath,bundlePath,repoRoot='.'}){
  const stateText=fs.readFileSync(statePath,'utf8');
  const bundleText=fs.readFileSync(bundlePath,'utf8');
  const state=JSON.parse(stateText);
  const bundle=JSON.parse(bundleText);
  const digest=sha256(Buffer.from(bundleText,'utf8'));

  if(state.schema_version!=='daily-compiler-state-v1') fail('state schema_version mismatch');
  if(!['BUNDLE_READY','COMPILING','PREVIEW_READY','SHADOW_VERIFIED'].includes(state.state)) fail('state not compilable');
  if(state.bundle?.status!=='BUNDLE_READY'||state.bundle?.digest!==digest) fail('state bundle digest mismatch');
  if(bundle.schema_version!=='daily-compiler-edition-bundle-v1') fail('bundle schema_version mismatch');
  if(bundle.status!=='BUNDLE_READY') fail('bundle status mismatch');
  if(bundle.editorial_contract_version!=='daily-compiler-editorial-contract-v1') fail('editorial contract mismatch');
  if(bundle.edition_date!==state.edition_date) fail('edition date mismatch');

  ensureArray(bundle.stories,'stories',6);
  const focusCounts=new Map([...EXPECTED_FOCUS.keys()].map(k=>[k,0]));
  const slugs=new Set();
  for(const story of bundle.stories){
    for(const f of ['id','headline','focus','summary','why_it_matters','related_coverage','image_alt','permanent_route']) ensureText(story[f],'story '+story.id+' '+f);
    if(!focusCounts.has(story.focus)) fail('unknown focus '+story.focus);
    focusCounts.set(story.focus,focusCounts.get(story.focus)+1);
    if(!story.source?.url||!story.source?.publisher||!story.source?.title||!story.source?.published_at) fail('story source evidence missing '+story.id);
    if(!Number.isInteger(story.reading_time_minutes)||story.reading_time_minutes<1) fail('reading time invalid '+story.id);
    ensureArray(story.topics,'story topics',undefined,1);
    ensureArray(story.coverage_labels,'coverage labels',undefined,1);
    const slug=slugFromStory(story,bundle.edition_date);
    if(slugs.has(slug)) fail('duplicate story route');
    slugs.add(slug);
  }
  for(const [focus,count] of EXPECTED_FOCUS) if(focusCounts.get(focus)!==count) fail('focus allocation mismatch '+focus);
  if(bundle.stories.filter(s=>s.agent_skills===true).length!==1) fail('exactly one Agent Skills story required');

  ensureArray(bundle.videos,'videos',2);
  for(const v of bundle.videos){
    for(const f of ['title','source','url','published_at','focus','summary','why_it_matters']) ensureText(v[f],'video '+f);
    if(v.verified!==true||!Number.isFinite(v.duration_minutes)||v.duration_minutes<=0||v.duration_minutes>20) fail('video invalid');
  }
  ensureArray(bundle.podcasts,'podcasts',2);
  for(const p of bundle.podcasts){
    for(const f of ['title','source','url','published_at','summary','why_it_matters']) ensureText(p[f],'podcast '+f);
    if(p.verified!==true||!Number.isFinite(p.duration_minutes)||p.duration_minutes<=0) fail('podcast invalid');
    if(!Number.isInteger(p.written_reading_time_minutes)||p.written_reading_time_minutes<1) fail('podcast reading time invalid');
  }
  if(new Set(bundle.podcasts.map(p=>p.source)).size!==2) fail('podcast sources must be diverse');

  for(const key of ['new','updated','carried_forward','dropped']) ensureArray(bundle.watchlist?.[key],'watchlist.'+key);
  if(bundle.watchlist.new.length<1||bundle.watchlist.updated.length<1||bundle.watchlist.carried_forward.length<1) fail('watchlist core states must be populated');
  for(const x of bundle.watchlist.new){ensureText(x.topic,'watchlist new topic');ensureText(x.why,'watchlist new why');}
  for(const x of bundle.watchlist.updated){ensureText(x.topic,'watchlist updated topic');ensureText(x.what_changed,'watchlist updated change');}
  for(const x of bundle.watchlist.carried_forward){ensureText(x.topic,'watchlist carried topic');ensureText(x.why,'watchlist carried why');}
  for(const x of bundle.watchlist.dropped){ensureText(x.topic,'watchlist dropped topic');ensureText(x.why,'watchlist dropped why');}

  ensureArray(bundle.book_mappings,'book_mappings',undefined,6);
  const mappedStories=new Set();
  const booksSeen=new Set();
  for(const b of bundle.book_mappings){
    ensureText(b.story_id,'book story_id'); ensureText(b.book,'book title'); ensureText(b.connection,'book connection'); ensureText(b.what_to_study_next,'book study next');
    mappedStories.add(b.story_id); booksSeen.add(b.book);
  }
  for(const story of bundle.stories) if(!mappedStories.has(story.id)) fail('story missing book mapping '+story.id);
  for(const title of REQUIRED_BOOKS) if(!booksSeen.has(title)) fail('required book not covered '+title);

  ensureArray(bundle.images,'images',6);
  const imageEvidence=[];
  for(const image of bundle.images){
    if(!image.story_id||!image.path||image.accepted!==true) fail('image acceptance record invalid');
    if(!/^[a-f0-9]{64}$/.test(image.sha256||'')) fail('image sha256 invalid');
    if(!/^[a-f0-9]{40}$/.test(image.git_blob_sha||'')) fail('image git blob sha invalid');
    if(image.visual_review?.result!=='PASS'||image.visual_review?.reviewed_sha256!==image.sha256) fail('image visual review mismatch');
    const asset=path.resolve(repoRoot,image.path);
    if(!fs.existsSync(asset)) fail('image missing '+image.path);
    const bytes=fs.readFileSync(asset);
    const dims=pngDimensions(bytes);
    if(dims.width!==1200||dims.height!==630) fail('image dimensions invalid '+image.path);
    if(sha256(bytes)!==image.sha256) fail('image SHA mismatch '+image.path);
    if(gitBlobSha(bytes)!==image.git_blob_sha) fail('image Git blob mismatch '+image.path);
    imageEvidence.push({story_id:image.story_id,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,width:dims.width,height:dims.height});
  }

  if(bundle.producer_receipt?.result!=='PASS') fail('producer receipt missing PASS');
  if(bundle.producer_receipt.owner_intervention!==false) fail('owner intervention must be false');
  for(const key of ['work_used','codex_used','paid_model_api_used']) if(bundle.producer_receipt[key]!==false) fail(key+' must be false');

  scanStrings(bundle,value=>{for(const pattern of PROD_MUTATION_PATTERNS) if(pattern.test(value)) fail('production repository mutation target forbidden');});
  return {state,bundle,bundleDigest:digest,stateSha256:sha256(Buffer.from(stateText,'utf8')),imageEvidence};
}

function ratingShare(story,sharePath){
  const id=esc(story.id);
  return '<div class="actions"><div class="rating" aria-label="Usefulness rating" data-rating-story="'+id+'">'+
    [1,2,3,4,5].map(n=>'<button type="button" data-rating-value="'+n+'" aria-label="'+n+' stars">★</button>').join('')+
    '</div><button class="share" type="button" data-share-button="'+id+'" data-share-path="'+esc(sharePath)+'">Share</button><span class="share-count" data-share-count="'+id+'">0 shares</span></div>';
}
function clientScript(){
  return `<script>
  (()=>{const qs=(s,r=document)=>[...r.querySelectorAll(s)];
  qs('[data-rating-story]').forEach(box=>{const id=box.dataset.ratingStory,key='dab-rating:'+id;const set=v=>qs('[data-rating-value]',box).forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.ratingValue)<=v)));set(Number(localStorage.getItem(key)||0));qs('[data-rating-value]',box).forEach(b=>b.addEventListener('click',()=>{const v=Number(b.dataset.ratingValue);localStorage.setItem(key,String(v));set(v);}));});
  qs('[data-share-button]').forEach(btn=>{const id=btn.dataset.shareButton,key='dab-share-count:'+id,count=document.querySelector('[data-share-count="'+id+'"]');const set=()=>{const n=Number(localStorage.getItem(key)||0);if(count)count.textContent=n+' share'+(n===1?'':'s');};set();btn.addEventListener('click',async()=>{const url=new URL(btn.dataset.sharePath,location.href).href;try{if(navigator.share)await navigator.share({title:document.title,url});else if(navigator.clipboard)await navigator.clipboard.writeText(url);localStorage.setItem(key,String(Number(localStorage.getItem(key)||0)+1));set();}catch{}});});})();</script>`;
}
function shell(title,body,navPrefix=''){
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+
  'body{font-family:Arial,sans-serif;margin:0;background:#f5f7fa;color:#17202a;line-height:1.55}header{background:#10243e;color:white}header .inner,main{max-width:1100px;margin:auto;padding:22px}nav a{color:white;margin-right:18px}section,article{background:white;border:1px solid #dfe4ea;border-radius:14px;padding:20px;margin:18px 0;box-shadow:0 3px 12px rgba(20,40,65,.05)}img{max-width:100%;height:auto;border-radius:10px}a{color:#164ea6}.meta,.source-date{color:#5c6773;font-size:.92rem}.tags{display:flex;gap:7px;flex-wrap:wrap}.tag{background:#edf4ff;border-radius:999px;padding:4px 9px;font-size:.82rem}.rating button{border:0;background:transparent;font-size:1.3rem;cursor:pointer}.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}.share{padding:7px 12px}.share-count{font-size:.86rem;color:#5c6773}.watch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.watch-card{border:1px solid #dfe4ea;border-radius:12px;padding:14px}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}@media(max-width:700px){main,header .inner{padding:15px}h1{font-size:1.75rem}}'+
  '</style></head><body><header><div class="inner"><strong>Daily AI Brief Compiler</strong><nav><a href="'+navPrefix+'index.html">Latest</a><a href="'+navPrefix+'archive/">Archive</a></nav></div></header><main>'+body+'</main>'+clientScript()+'</body></html>\n';
}
function tags(values){return '<div class="tags">'+values.map(v=>'<span class="tag">'+esc(v)+'</span>').join('')+'</div>';}
function watchlistMarkup(w){
  const group=(title,items,key)=>'<div class="watch-card"><h3>'+title+'</h3>'+items.map(x=>'<p><strong>'+esc(x.topic)+'</strong><br>'+esc(x[key])+'</p>').join('')+'</div>';
  return '<div class="watch-grid">'+group('New',w.new,'why')+group('Updated',w.updated,'what_changed')+group('Carried forward',w.carried_forward,'why')+group('Dropped',w.dropped,'why')+'</div>';
}
function mediaCards(items,type){
  return '<div class="media-grid">'+items.map(x=>'<article><h3><a target="_blank" rel="noopener" href="'+esc(x.url)+'">'+esc(x.title)+'</a></h3><p class="meta">'+esc(x.source)+' · '+esc(sourceDate(x))+' · Duration '+esc(x.duration_minutes)+' min'+(type==='podcast'?' · '+esc(x.written_reading_time_minutes)+' min read':'')+'</p><p>'+esc(x.summary)+'</p><p><strong>Why it matters:</strong> '+esc(x.why_it_matters)+'</p></article>').join('')+'</div>';
}
function storyCard(story,imageSrc,storyHref){
  return '<article><h2><a href="'+esc(storyHref)+'">'+esc(story.headline)+'</a></h2><p class="meta">'+esc(story.focus)+' · '+esc(sourceDate(story.source))+' · '+story.reading_time_minutes+' min read'+(story.agent_skills?' · Agent Skills':'')+'</p>'+
    tags([...story.topics,...story.coverage_labels])+'<img src="'+esc(imageSrc)+'" alt="'+esc(story.image_alt)+'"><p>'+esc(story.summary)+'</p><p><strong>Why it matters:</strong> '+esc(story.why_it_matters)+'</p><p><strong>Related coverage:</strong> '+esc(story.related_coverage)+'</p>'+ratingShare(story,storyHref)+'</article>';
}
function editionBody(bundle,prefix='../../'){
  const cards=bundle.stories.map(s=>{
    const image=bundle.images.find(i=>i.story_id===s.id);
    return storyCard(s,prefix+'assets/'+bundle.edition_date+'/'+path.basename(image.path),prefix+'stories/'+bundle.edition_date+'/'+slugFromStory(s,bundle.edition_date)+'/');
  }).join('');
  return '<h1>Daily AI Brief — '+esc(bundle.edition_date)+'</h1><p class="meta">Six current generative AI developments selected for professional readers.</p>'+cards+
    '<section><h2>Videos</h2>'+mediaCards(bundle.videos,'video')+'<p><a href="'+prefix+'media/'+bundle.edition_date+'/videos/">Open video page</a></p></section>'+
    '<section><h2>Podcasts</h2>'+mediaCards(bundle.podcasts,'podcast')+'<p><a href="'+prefix+'media/'+bundle.edition_date+'/podcasts/">Open podcast page</a></p></section>'+
    '<section><h2>Emerging AI Watchlist</h2>'+watchlistMarkup(bundle.watchlist)+'<p><a href="'+prefix+'watchlist/'+bundle.edition_date+'/">Open Watchlist page</a></p></section>'+
    '<p><a href="'+prefix+'archive/">Earlier Briefs</a></p>';
}
function copyDir(src,dst){fs.mkdirSync(dst,{recursive:true});for(const e of fs.readdirSync(src,{withFileTypes:true})){const a=path.join(src,e.name),b=path.join(dst,e.name);if(e.isDirectory())copyDir(a,b);else fs.copyFileSync(a,b);}}

export function buildSite({validation,outDir,repoRoot='.'}){
  const {bundle}=validation;
  fs.rmSync(outDir,{recursive:true,force:true}); fs.mkdirSync(outDir,{recursive:true});
  const editionDir=path.join(outDir,'briefs',bundle.edition_date);
  const storyRoot=path.join(outDir,'stories',bundle.edition_date);
  const assetDir=path.join(outDir,'assets',bundle.edition_date);
  const watchDir=path.join(outDir,'watchlist',bundle.edition_date);
  const videoDir=path.join(outDir,'media',bundle.edition_date,'videos');
  const podcastDir=path.join(outDir,'media',bundle.edition_date,'podcasts');
  [editionDir,storyRoot,assetDir,watchDir,videoDir,podcastDir].forEach(d=>fs.mkdirSync(d,{recursive:true}));

  for(const image of bundle.images) fs.copyFileSync(path.resolve(repoRoot,image.path),path.join(assetDir,path.basename(image.path)));

  fs.writeFileSync(path.join(editionDir,'index.html'),shell('Daily AI Brief '+bundle.edition_date,editionBody(bundle,'../../'),'../../'));
  fs.writeFileSync(path.join(outDir,'index.html'),shell('Daily AI Brief '+bundle.edition_date,editionBody(bundle,''),''));

  for(const story of bundle.stories){
    const slug=slugFromStory(story,bundle.edition_date);
    const image=bundle.images.find(i=>i.story_id===story.id);
    const books=bundle.book_mappings.filter(b=>b.story_id===story.id);
    const body='<p><a href="../../../briefs/'+bundle.edition_date+'/">← Edition</a></p><article><h1>'+esc(story.headline)+'</h1>'+
      '<p class="meta">'+esc(story.focus)+' · '+esc(sourceDate(story.source))+' · '+story.reading_time_minutes+' min read'+(story.agent_skills?' · Agent Skills':'')+'</p>'+
      tags([...story.topics,...story.coverage_labels])+'<img src="../../../assets/'+bundle.edition_date+'/'+path.basename(image.path)+'" alt="'+esc(story.image_alt)+'"><p>'+esc(story.summary)+'</p><p><strong>Why it matters:</strong> '+esc(story.why_it_matters)+'</p>'+
      '<p><strong>Related coverage:</strong> '+esc(story.related_coverage)+'</p><p><a target="_blank" rel="noopener" href="'+esc(story.source.url)+'">Source: '+esc(story.source.publisher)+' — '+esc(story.source.title)+' ('+esc(sourceDate(story.source))+')</a></p>'+
      books.map(b=>'<section><h2>Continue Learning</h2><p><strong>'+esc(b.book)+'</strong>'+ (b.concept_or_chapter?' — '+esc(b.concept_or_chapter):'')+'</p><p>'+esc(b.connection)+'</p><p><strong>Study next:</strong> '+esc(b.what_to_study_next)+'</p></section>').join('')+
      ratingShare(story,'../../../stories/'+bundle.edition_date+'/'+slug+'/')+'</article><p><a href="../../../archive/">Earlier Briefs</a></p>';
    const dir=path.join(storyRoot,slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),shell(story.headline,body,'../../../'));
  }

  fs.writeFileSync(path.join(watchDir,'index.html'),shell('Emerging AI Watchlist '+bundle.edition_date,'<h1>Emerging AI Watchlist — '+bundle.edition_date+'</h1><p><a href="../../briefs/'+bundle.edition_date+'/">← Edition</a></p>'+watchlistMarkup(bundle.watchlist)+'<p><a href="../../archive/">Earlier Briefs</a></p>','../../'));
  fs.writeFileSync(path.join(videoDir,'index.html'),shell('Videos '+bundle.edition_date,'<h1>Videos — '+bundle.edition_date+'</h1><p><a href="../../../briefs/'+bundle.edition_date+'/">← Edition</a></p>'+mediaCards(bundle.videos,'video'),'../../../'));
  fs.writeFileSync(path.join(podcastDir,'index.html'),shell('Podcasts '+bundle.edition_date,'<h1>Podcasts — '+bundle.edition_date+'</h1><p><a href="../../../briefs/'+bundle.edition_date+'/">← Edition</a></p>'+mediaCards(bundle.podcasts,'podcast'),'../../../'));

  fs.mkdirSync(path.join(outDir,'archive'),{recursive:true});
  fs.writeFileSync(path.join(outDir,'archive','index.html'),shell('Daily AI Brief Archive','<h1>Archive</h1><p><a href="../briefs/'+bundle.edition_date+'/">'+bundle.edition_date+'</a></p>','../'));

  const feed={version:'https://jsonfeed.org/version/1.1',title:'Daily AI Brief Compiler',home_page_url:'./',items:bundle.stories.map(s=>({id:s.permanent_route,url:s.permanent_route,title:s.headline,date_published:s.source.published_at,summary:s.summary,tags:[...s.topics,...s.coverage_labels]}))};
  fs.writeFileSync(path.join(outDir,'feed.json'),JSON.stringify(feed,null,2)+'\n');
  const rss='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Daily AI Brief Compiler</title><link>/</link><description>Daily AI Brief Compiler shadow feed</description>'+bundle.stories.map(s=>'<item><title>'+esc(s.headline)+'</title><link>'+esc(s.permanent_route)+'</link><guid>'+esc(s.permanent_route)+'</guid><pubDate>'+esc(s.source.published_at)+'</pubDate><description>'+esc(s.summary)+'</description></item>').join('')+'</channel></rss>\n';
  fs.writeFileSync(path.join(outDir,'rss.xml'),rss);

  const routes=[
    'index.html','archive/index.html','feed.json','rss.xml',
    'briefs/'+bundle.edition_date+'/index.html',
    'watchlist/'+bundle.edition_date+'/index.html',
    'media/'+bundle.edition_date+'/videos/index.html',
    'media/'+bundle.edition_date+'/podcasts/index.html',
    ...bundle.stories.map(s=>'stories/'+bundle.edition_date+'/'+slugFromStory(s,bundle.edition_date)+'/index.html')
  ];
  const manifest={schema_version:'daily-compiler-build-manifest-v2',edition_date:bundle.edition_date,bundle_sha256:validation.bundleDigest,routes,images:validation.imageEvidence.map(e=>({story_id:e.story_id,asset:'assets/'+bundle.edition_date+'/'+path.basename(e.path),sha256:e.sha256,git_blob_sha:e.git_blob_sha}))};
  fs.writeFileSync(path.join(outDir,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

function resolveInternal(htmlFile,ref){
  const clean=ref.split('#')[0].split('?')[0];
  if(!clean||/^(https?:|mailto:|javascript:)/i.test(clean)) return null;
  const base=path.dirname(htmlFile),abs=path.resolve(base,clean);
  return clean.endsWith('/')?path.join(abs,'index.html'):abs;
}
export function verifySite({outDir,validation,manifest}){
  for(const route of manifest.routes) if(!fs.existsSync(path.join(outDir,route))) fail('missing route '+route);
  const htmlFiles=manifest.routes.filter(r=>r.endsWith('.html')).map(r=>path.join(outDir,r));
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    if(/Original Commentary|What do stars mean/i.test(html)) fail('removed reader element present');
    for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const target=resolveInternal(file,m[1]);if(target&&!fs.existsSync(target)) fail('broken internal link '+m[1]+' in '+file);}
  }
  const assets=fs.readdirSync(path.join(outDir,'assets',validation.bundle.edition_date)).filter(x=>x.endsWith('.png'));
  if(assets.length!==6) fail('compiled site must contain six images');
  const edition=fs.readFileSync(path.join(outDir,'briefs',validation.bundle.edition_date,'index.html'),'utf8');
  if((edition.match(/data-rating-value=/g)||[]).length!==30) fail('rating controls missing');
  if((edition.match(/data-share-button=/g)||[]).length!==6) fail('share controls missing');
  if((edition.match(/data-share-count=/g)||[]).length!==6) fail('share counts missing');
  if((edition.match(/<img /g)||[]).length!==6||/<img[^>]*alt=""/i.test(edition)) fail('accessible image alt missing');
  for(const term of ['Emerging AI Watchlist','New','Updated','Carried forward','Dropped','Earlier Briefs','Videos','Podcasts']) if(!edition.includes(term)) fail('reader section missing '+term);
  for(const story of validation.bundle.stories){
    const slug=slugFromStory(story,validation.bundle.edition_date);
    const page=fs.readFileSync(path.join(outDir,'stories',validation.bundle.edition_date,slug,'index.html'),'utf8');
    for(const term of ['Related coverage','Continue Learning','Usefulness rating','Share']) if(!page.includes(term)) fail('story reader element missing '+term+' '+story.id);
  }
  return {schema_version:'daily-compiler-shadow-verification-receipt-v2',result:'PASS',edition_date:validation.bundle.edition_date,bundle_sha256:validation.bundleDigest,route_count:manifest.routes.length,permanent_story_pages:6,watchlist_page:true,video_page:true,podcast_page:true,archive:true,json_feed:true,rss_feed:true,ratings:true,share:true,share_count:true,accessible_alt:true,images_present:6,internal_links_valid:true,production_mutation_target_absent:true,owner_intervention:false};
}

export function compileShadow({statePath,bundlePath,outDir,repoRoot='.'}){
  const validation=validateEdition({statePath,bundlePath,repoRoot});
  const manifest=buildSite({validation,outDir,repoRoot});
  const verification=verifySite({outDir,validation,manifest});
  const receipt={schema_version:'daily-compiler-compile-receipt-v2',result:'PASS',edition_date:validation.bundle.edition_date,state_sha256:validation.stateSha256,bundle_sha256:validation.bundleDigest,deterministic:true,chatgpt_required_after_bundle_ready:false,owner_intervention:false,verification};
  fs.writeFileSync(path.join(outDir,'compile-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'verification-receipt.json'),JSON.stringify(verification,null,2)+'\n');
  return receipt;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{if(v.startsWith('--'))a.push([v.slice(2),arr[i+1]]);return a;},[]));
  if(!args.state||!args.bundle||!args.out) fail('usage: node compiler/compile.mjs --state <file> --bundle <file> --out <dir> [--repo-root <dir>]');
  console.log(JSON.stringify(compileShadow({statePath:args.state,bundlePath:args.bundle,outDir:args.out,repoRoot:args['repo-root']||'.'}),null,2));
}
