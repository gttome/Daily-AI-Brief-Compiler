import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {canonicalSha} from '../image-capsules/util.mjs';
import {readerDestination} from '../compiler/reader-environment.mjs';

const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
function fail(message){throw new Error(message);}
const safeRoute=route=>typeof route==='string'&&route.length>0&&!path.isAbsolute(route)&&!/[\\?#]/.test(route)&&!route.split('/').some(part=>!part||part==='.'||part==='..');
const decodeHtml=value=>String(value).replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[a-f0-9]+|\d+);/gi,entity=>{
  const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
  if(named[entity.toLowerCase()])return named[entity.toLowerCase()];
  return String.fromCodePoint(parseInt(entity.slice(2,-1).replace(/^x/i,''),/^&#x/i.test(entity)?16:10));
});
const attribute=(tag,name)=>{
  const match=new RegExp('(?:\\s|^)'+name+'\\s*=\\s*(["\\\'])([\\s\\S]*?)\\1','i').exec(tag);
  return match?decodeHtml(match[2]):null;
};

export function readerRoutePath(root,route){
  if(!safeRoute(route))fail('unsafe reader route: '+route);
  const base=fs.realpathSync(root),file=fs.realpathSync(path.resolve(base,route));
  if(!file.startsWith(base+path.sep)||!fs.statSync(file).isFile())fail('reader route escapes artifact: '+route);
  return file;
}

export function readReleaseManifest({sourceDir}){
  const manifest=JSON.parse(fs.readFileSync(path.join(sourceDir,'build-manifest.json'),'utf8'));
  const compile=JSON.parse(fs.readFileSync(path.join(sourceDir,'compile-receipt.json'),'utf8'));
  if(manifest.schema_version!=='daily-compiler-canonical-reader-source-v1'||!/^\d{4}-\d{2}-\d{2}$/.test(manifest.edition_date||''))fail('reader source manifest identity invalid');
  if(!/^[a-f0-9]{64}$/.test(manifest.bundle_sha256||''))fail('reader source bundle digest missing');
  if(compile.schema_version!=='daily-compiler-compile-receipt-v2'||compile.result!=='PASS'||compile.reader_parity_gate?.result!=='PASS')fail('sealed compile receipt required for built reader');
  if(compile.edition_date!==manifest.edition_date||compile.bundle_sha256!==manifest.bundle_sha256||canonicalSha(compile.source_manifest)!==canonicalSha(manifest)||compile.production_reader_source_sha!==manifest.production_reader_source_sha)fail('built reader compile/manifest binding mismatch');
  readerDestination({publicBase:manifest.environment?.public_base,baseurl:manifest.environment?.baseurl});
  if(!Array.isArray(manifest.required_routes)||new Set(manifest.required_routes).size!==manifest.required_routes.length||manifest.required_routes.some(route=>!safeRoute(route)))fail('reader required routes invalid');
  if(!Array.isArray(manifest.current_images)||manifest.current_images.length!==6)fail('six exact reader image bindings required');
  for(const field of ['story_id','reader_story_id','permanent_route','route','feedback_id'])if(new Set(manifest.current_images.map(image=>image[field])).size!==6)fail('duplicate reader image '+field);
  for(const image of manifest.current_images){
    if(!safeRoute(image.route)||!safeRoute(image.permanent_route)||!image.permanent_route.startsWith('stories/'+manifest.edition_date+'/')||!image.permanent_route.endsWith('/index.html'))fail('reader image story route invalid');
    if(!/^[a-f0-9]{64}$/.test(image.sha256||'')||!image.reader_story_id||!image.alt||!image.source_url||!image.feedback_id)fail('reader image evidence incomplete');
    let url,expected;
    try{url=new URL(image.public_url);expected=new URL(image.route,manifest.environment.public_base.replace(/\/?$/,'/'));}catch{fail('reader image public URL invalid');}
    if(url.protocol!=='https:'||url.username||url.password||url.origin!==expected.origin||url.pathname!==expected.pathname||url.searchParams.get('v')!==image.sha256.slice(0,12))fail('reader image public URL binding mismatch');
  }
  for(const route of ['index.html','latest.md','briefs/'+manifest.edition_date+'/index.html',...manifest.current_images.map(image=>image.permanent_route)])if(!manifest.required_routes.includes(route))fail('reader product route omitted: '+route);
  if(!Array.isArray(manifest.current_media)||manifest.current_media.length!==4||manifest.current_media.filter(item=>item.type==='video').length!==2||manifest.current_media.filter(item=>item.type==='podcast').length!==2||new Set(manifest.current_media.map(item=>item.reader_id)).size!==4)fail('four exact reader media bindings required');
  for(const item of manifest.current_media)if(!safeRoute(item.permanent_route)||!manifest.required_routes.includes(item.permanent_route)||!item.permanent_route.startsWith((item.type==='video'?'videos/':'podcasts/')+manifest.edition_date+'/')||!item.selected_url||!item.summary||!item.why_it_matters||!item.duration||!item.original_date)fail('reader media binding incomplete');
  return {manifest,compile};
}

function storySection(html,id,route){
  const markers=[...html.matchAll(/<span\b[^>]*>/gi)].filter(match=>(attribute(match[0],'class')||'').split(/\s+/).includes('story-data'));
  const own=markers.filter(match=>attribute(match[0],'data-story-id')===id);
  if(own.length!==1)fail('reader story identity missing or duplicate: '+id+' in '+route);
  const start=own[0].index,end=markers.find(marker=>marker.index>start)?.index??html.length;
  return html.slice(start,end);
}

export function verifyReaderImageBindings({manifest,siteDir,includeShared=true}){
  const edition='briefs/'+manifest.edition_date+'/index.html';
  const pages=new Map();
  for(const image of manifest.current_images){
    for(const route of [edition,image.permanent_route,...(includeShared?['index.html']:[])]){
      if(!pages.has(route))pages.set(route,fs.readFileSync(readerRoutePath(siteDir,route),'utf8'));
      const section=storySection(pages.get(route),image.reader_story_id,route);
      const tags=[...section.matchAll(/<img\b[^>]*>/gi)];
      if(tags.length!==1||attribute(tags[0][0],'src')!==image.public_url)fail('reader story image reference mismatch: '+image.story_id+' in '+route);
      if(attribute(tags[0][0],'alt')!==image.alt)fail('reader story image alt mismatch: '+image.story_id+' in '+route);
      if(attribute(tags[0][0],'srcset')||/<source\b[^>]*\bsrcset\s*=/i.test(section))fail('reader story image alternate bytes unverified: '+image.story_id+' in '+route);
      const links=[...section.matchAll(/<a\b[^>]*>/gi)].map(match=>attribute(match[0],'href'));
      if(!links.includes(image.source_url))fail('reader story source reference mismatch: '+image.story_id+' in '+route);
      if(!section.includes('data-feedback-story-id="'+image.feedback_id+'"'))fail('reader story feedback identity mismatch: '+image.story_id+' in '+route);
    }
  }
  return {result:'PASS',story_count:manifest.current_images.length,checked_pages:pages.size};
}

export function verifyReaderMediaBindings({manifest,siteDir,includeShared=true}){
  const edition='briefs/'+manifest.edition_date+'/index.html',rows=manifest.current_media;
  const normalize=value=>decodeHtml(String(value).replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
  for(const item of rows){
    for(const route of [edition,item.permanent_route,...(includeShared?['index.html']:[])]){
      const html=fs.readFileSync(readerRoutePath(siteDir,route),'utf8');
      let section=html;
      if(route!==item.permanent_route){
        const markers=[...html.matchAll(/<a\b[^>]*>/gi)].filter(match=>attribute(match[0],'data-action')==='permanent_page_clicks'&&rows.some(row=>row.reader_id===attribute(match[0],'data-item-id')));
        const own=markers.filter(match=>attribute(match[0],'data-item-id')===item.reader_id);
        if(own.length!==1)fail('reader media identity missing or duplicate: '+item.reader_id+' in '+route);
        const start=own[0].index,end=markers.find(marker=>marker.index>start)?.index??html.length;
        section=html.slice(start,end);
      }
      const links=[...section.matchAll(/<a\b[^>]*>/gi)].filter(match=>attribute(match[0],'href')===item.selected_url);
      if(!links.length||links.some(match=>attribute(match[0],'target')!=='_blank'||!['noopener','noreferrer'].every(value=>(attribute(match[0],'rel')||'').split(/\s+/).includes(value))))fail('reader selected media link mismatch or unsafe: '+item.reader_id+' in '+route);
      const text=normalize(section);
      const fields=[['Summary',item.summary],['Why it matters',item.why_it_matters],['Duration',item.duration],['Date',item.original_date]];
      if(item.connection_to_brief)fields.push(['Connection to the Brief',item.connection_to_brief]);
      if(item.type==='podcast')fields.push(['Written page',item.written_reading_time_minutes+' min read']);
      for(const [label,value] of fields)if(!text.includes(label+': '+normalize(value)))fail('reader media '+label+' mismatch: '+item.reader_id+' in '+route);
    }
  }
  return {result:'PASS',media_count:rows.length};
}
function allHtml(root){
  const out=[];
  const walk=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,entry.name);
      if(entry.isDirectory())walk(p);
      else if(entry.name.endsWith('.html'))out.push(p);
    }
  };
  walk(root);
  return out;
}

export function verifyBuiltReader({siteDir,sourceDir}){
  const {manifest}=readReleaseManifest({sourceDir});
  const routeEvidence=[];
  for(const route of manifest.required_routes){
    if(!fs.existsSync(path.join(siteDir,route)))fail('missing canonical reader route: '+route);
    const bytes=fs.readFileSync(readerRoutePath(siteDir,route));
    routeEvidence.push({route,sha256:sha256(bytes),bytes:bytes.length});
  }
  for(const image of manifest.current_images){
    if(!fs.existsSync(path.join(siteDir,image.route)))fail('missing current image: '+image.route);
    const file=readerRoutePath(siteDir,image.route);
    if(sha256(fs.readFileSync(file))!==image.sha256)fail('current image hash mismatch: '+image.route);
  }
  verifyReaderImageBindings({manifest,siteDir});
  verifyReaderMediaBindings({manifest,siteDir});

  const edition=fs.readFileSync(path.join(siteDir,'briefs',manifest.edition_date,'index.html'),'utf8');
  const home=fs.readFileSync(path.join(siteDir,'index.html'),'utf8');
  for(const marker of ['research-ledger-header','The Daily Generative AI Brief','Briefs Archive','Emerging AI Watchlist','Sources','About This Brief']){
    if(!edition.includes(marker))fail('canonical reader marker missing: '+marker);
  }
  if((edition.match(/class="story-feedback story-feedback-compact star-feedback"/g)||[]).length!==10)fail('expected ratings on 6 articles, 2 videos, and 2 podcasts');
  if((edition.match(/data-feedback-rating="[1-5]"/g)||[]).length!==50)fail('five-star rating controls incomplete');
  const feedbackRegistry=JSON.parse(fs.readFileSync(path.join(sourceDir,manifest.feedback.registry_route),'utf8'));
  if(feedbackRegistry.items.length!==10)fail('Compiler feedback registry must contain 10 reader items');
  for(const item of feedbackRegistry.items){
    if(!item.feedback_id.includes('-compiler-'))fail('Compiler feedback item namespace missing: '+item.feedback_id);
    if(!edition.includes(`data-feedback-story-id="${item.feedback_id}"`))fail('Compiler feedback identity missing from reader: '+item.feedback_id);
    if(edition.includes(`data-feedback-story-id="${item.canonical_reader_id}"`))fail('production-style feedback identity leaked into current Compiler reader: '+item.canonical_reader_id);
  }
  const watchlistData=JSON.parse(fs.readFileSync(path.join(sourceDir,'data','watchlist.json'),'utf8'));
  if((watchlistData.topics||[]).some(topic=>String(topic.topic_id||'').startsWith('dab-topic-compiler-')))fail('Compiler-only Watchlist topic identity leaked into reader');
  if((watchlistData.topics||[]).some(topic=>String(topic.topic_id||'').length>64))fail('Watchlist topic identity exceeds feedback-service contract');
  if((watchlistData.topics||[]).length<20)fail('rolling Watchlist history was not preserved');
  if(!edition.includes('assets/js/share.js'))fail('share runtime missing');
  if(!edition.includes('assets/js/feedback.js'))fail('rating runtime missing');
  if(!home.includes('subscription')||!home.includes('daily-feed.xml'))fail('subscription surface missing');
  const watchlistRuntime=fs.readFileSync(path.join(siteDir,'assets','js','watchlist.js'),'utf8');
  const ratingRuntime=fs.readFileSync(path.join(siteDir,'assets','js','feedback.js'),'utf8');
  const commentRuntime=fs.readFileSync(path.join(siteDir,'assets','js','comments.js'),'utf8');
  const shareRuntime=fs.readFileSync(path.join(siteDir,'assets','js','share.js'),'utf8');
  for(const [name,source] of [['ratings',ratingRuntime],['comments',commentRuntime],['watchlist',watchlistRuntime],['share',shareRuntime]]){
    if(!source.includes(manifest.feedback.base_url))fail(name+' runtime does not use Compiler feedback store');
    if(source.includes('daily-ai-brief-ratings.gtome.chatgpt.site'))fail(name+' runtime still depends on legacy Ratings Site');
  }
  if(!commentRuntime.includes('Comment saved. Thank you.'))fail('Compiler public comment success message missing');
  if(commentRuntime.includes('Sent privately'))fail('Compiler comment copy still claims private storage');
  const watchlistCss=fs.readFileSync(path.join(siteDir,'assets','css','watchlist.css'),'utf8');
  if(!watchlistRuntime.includes("b.setAttribute('aria-pressed',String(b.dataset.choice===choice))"))fail('watchlist interest selection is not visually immediate');
  if(!watchlistCss.includes('.wl-votes button[aria-pressed=true]'))fail('watchlist selected-interest styling missing');
  if(!edition.includes('id="skip-to-content"')||!edition.includes('aria-label="Primary navigation"'))fail('accessibility navigation missing');
  if(/<img[^>]+alt=""/i.test(edition))fail('empty image alt text');
  if(!/<meta name="viewport"/i.test(edition))fail('responsive viewport missing');

  for(const file of allHtml(siteDir)){
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const ref=match[1].split('#')[0].split('?')[0];
      if(!ref||/^(?:https?:|mailto:|javascript:|data:)/i.test(ref))continue;
      let relative=ref;
      if(relative.startsWith('/')){
        const baseurl=manifest.environment.baseurl;
        if(baseurl&&relative!==baseurl&&!relative.startsWith(baseurl+'/'))continue;
        relative=relative.slice(baseurl.length).replace(/^\//,'')||'index.html';
      }
      else {
        const from=path.relative(siteDir,path.dirname(file)).replaceAll(path.sep,'/');
        relative=path.posix.normalize(path.posix.join(from,relative));
      }
      if(relative==='favicon.ico')continue;
      const target=relative.endsWith('/')?path.join(siteDir,relative,'index.html'):path.join(siteDir,relative);
      if(!fs.existsSync(target))fail('broken internal reader link '+ref+' in '+path.relative(siteDir,file));
    }
  }

  return {
    schema_version:'daily-compiler-built-reader-verification-v2',
    result:'PASS',
    edition_date:manifest.edition_date,
    bundle_sha256:manifest.bundle_sha256,
    source_manifest_sha256:canonicalSha(manifest),
    production_reader_source_sha:manifest.production_reader_source_sha,
    route_evidence:routeEvidence,
    route_evidence_sha256:canonicalSha(routeEvidence),
    required_routes:manifest.required_routes.length,
    current_images:manifest.current_images.length,
    canonical_layout:true,
    ratings:true,
    sharing:true,
    subscriptions:true,
    feedback_backend_identity:true,
    feedback_store:manifest.feedback.store,
    feedback_item_namespace:true,
    public_comments:true,
    watchlist_stable_identity:true,
    watchlist_immediate_selection:true,
    responsive:true,
    accessibility:true,
    internal_links_valid:true,
    story_image_bindings:true,
    media_reader_bindings:true,
    semantic_rework:0,
    accepted_image_regenerations:manifest.accepted_image_regenerations ?? 0
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const siteDir=process.argv[2],sourceDir=process.argv[3];
  if(!siteDir||!sourceDir)throw new Error('usage: node scripts/verify-built-reader.mjs <site-dir> <source-dir> [receipt]');
  const receipt=verifyBuiltReader({siteDir,sourceDir});
  if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
}
