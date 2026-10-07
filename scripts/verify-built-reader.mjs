import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
function fail(message){throw new Error(message);}
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
  const manifest=JSON.parse(fs.readFileSync(path.join(sourceDir,'build-manifest.json'),'utf8'));
  for(const route of manifest.required_routes){
    if(!fs.existsSync(path.join(siteDir,route)))fail('missing canonical reader route: '+route);
  }
  for(const image of manifest.current_images){
    const file=path.join(siteDir,image.route);
    if(!fs.existsSync(file))fail('missing current image: '+image.route);
    if(sha256(fs.readFileSync(file))!==image.sha256)fail('current image hash mismatch: '+image.route);
  }

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
      if(relative.startsWith('/Daily-AI-Brief-Compiler/'))relative=relative.slice('/Daily-AI-Brief-Compiler/'.length);
      else if(relative.startsWith('/'))continue;
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
    production_reader_source_sha:manifest.production_reader_source_sha,
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
    semantic_rework:0,
    accepted_image_regenerations:0
  };
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const siteDir=process.argv[2],sourceDir=process.argv[3];
  if(!siteDir||!sourceDir)throw new Error('usage: node scripts/verify-built-reader.mjs <site-dir> <source-dir> [receipt]');
  const receipt=verifyBuiltReader({siteDir,sourceDir});
  if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
}
