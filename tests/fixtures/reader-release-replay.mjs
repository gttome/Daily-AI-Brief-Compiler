import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {verifyBuiltReader} from '../../scripts/verify-built-reader.mjs';
import {mergeShadowHistory} from '../../scripts/merge-shadow-history.mjs';

const json=value=>JSON.stringify(value,null,2)+'\n';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:json(value));};
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// This fixture replays rendered HTML shape over genuine compiler source output.
// It is not a Jekyll build, native image review, HTTP deployment, or live proof.
// The existing GitHub Pages Jekyll action supplies the real rendering check.
export function makeBuiltReaderReplay({sourceDir:compiledSource,root,historyDir='-'}){
  if(!compiledSource||!root)throw new Error('compiled source and distinct replay root required');
  const sourceDir=path.join(root,'reader-source'),currentDir=path.join(root,'current'),siteDir=path.join(root,'shadow');
  if(path.resolve(sourceDir)!==path.resolve(compiledSource))for(const route of ['build-manifest.json','compile-receipt.json','data/compiler-feedback-registry.json','data/watchlist.json'])write(path.join(sourceDir,route),fs.readFileSync(path.join(compiledSource,route)));
  const manifest=read(path.join(sourceDir,'build-manifest.json')),registry=read(path.join(sourceDir,manifest.feedback.registry_route));
  const base=manifest.environment.baseurl;
  const rating=id=>'<div class="story-feedback story-feedback-compact star-feedback" data-feedback-story-id="'+esc(id)+'">'+[1,2,3,4,5].map(n=>'<button data-feedback-rating="'+n+'">'+n+'</button>').join('')+'</div>';
  const wrap=body=>'<html><head><meta name="viewport" content="width=device-width"></head><body><a id="skip-to-content" href="#main">Skip</a><nav aria-label="Primary navigation">research-ledger-header The Daily Generative AI Brief Briefs Archive Emerging AI Watchlist Sources About This Brief</nav><main id="main">'+body+'</main><script src="'+base+'/assets/js/share.js"></script><script src="'+base+'/assets/js/feedback.js"></script><p class="subscription"><a href="'+base+'/daily-feed.xml">Subscribe</a></p></body></html>';
  const story=image=>'<span class="story-data" data-story-id="'+esc(image.reader_story_id)+'" hidden></span><img src="'+esc(image.public_url)+'" alt="'+esc(image.alt)+'"><a href="'+esc(image.source_url)+'">Source</a>'+rating(image.feedback_id);
  const media=item=>{
    const fields=[['Summary',item.summary],['Why it matters',item.why_it_matters],['Duration',item.duration],['Date',item.original_date]];
    if(item.connection_to_brief)fields.push(['Connection to the Brief',item.connection_to_brief]);
    if(item.type==='podcast')fields.push(['Written page',item.written_reading_time_minutes+' min read']);
    const feedback=registry.items.find(row=>row.canonical_reader_id===item.reader_id);
    return '<a href="'+base+'/'+item.permanent_route.replace(/index.html$/,'')+'" data-item-id="'+item.reader_id+'" data-edition-date="'+manifest.edition_date+'" data-action="permanent_page_clicks">Permanent media page</a>'+fields.map(([label,value])=>'<p><strong>'+label+':</strong> '+esc(value)+'</p>').join('')+'<a href="'+esc(item.selected_url)+'" target="_blank" rel="noopener noreferrer">Selected media</a>'+rating(feedback.feedback_id);
  };
  for(const route of manifest.required_routes){
    const source=path.join(compiledSource,route);
    write(path.join(currentDir,route),route.endsWith('.html')?wrap('TEST_ONLY route replay'):fs.existsSync(source)?fs.readFileSync(source):'TEST_ONLY static route');
  }
  for(const route of ['assets/js/comments.js','assets/js/watchlist.js','assets/css/watchlist.css'])write(path.join(currentDir,route),fs.readFileSync(path.join(compiledSource,route)));
  const edition=wrap(manifest.current_images.map(story).join('')+manifest.current_media.map(media).join(''));
  write(path.join(currentDir,'index.html'),edition);
  write(path.join(currentDir,'briefs',manifest.edition_date,'index.html'),edition);
  for(const image of manifest.current_images){
    write(path.join(currentDir,image.permanent_route),wrap(story(image)));
    write(path.join(currentDir,image.route),fs.readFileSync(path.join(compiledSource,image.route)));
  }
  for(const item of manifest.current_media)write(path.join(currentDir,item.permanent_route),wrap(media(item)));
  write(path.join(currentDir,'build-manifest.json'),manifest);
  const result=verifyBuiltReader({siteDir:currentDir,sourceDir});
  write(path.join(root,'built-verification.json'),result);
  const history=mergeShadowHistory({historyDir,currentDir,outDir:siteDir,currentDate:manifest.edition_date,receiptPath:path.join(root,'history-merge-receipt.json')});
  const options={baseUrl:manifest.environment.public_base+'/',editionDate:manifest.edition_date,sourceDir,siteDir};
  return {root,sourceDir,currentDir,siteDir,manifest,registry,built:result,history,options};
}
export function replayReaderFetch(f,{mutate,feedback=false}={}){
  const calls=[],comments=[];
  const fetchImpl=async(url,options={})=>{
    calls.push({url,method:options.method||'GET'});
    if(url.startsWith(f.manifest.feedback.base_url+'/')){
      if(!feedback)throw new Error('read-only artifact check invoked feedback');
      const parsed=new URL(url);
      if(options.method==='POST'){
        const body=JSON.parse(options.body);
        if(parsed.pathname==='/api/comments')comments.push({body:body.body});
        return Response.json({recorded:true,...(parsed.pathname==='/api/watchlist'?{choice:body.choice,revision:body.revision}:{})});
      }
      return Response.json(parsed.pathname==='/api/ratings'?{totals:{'5':1}}:{comments});
    }
    assert.equal(options.method,undefined,'artifact probes must be GET only');
    const parsed=new URL(url),prefix=new URL(f.options.baseUrl).pathname;
    assert.ok(parsed.pathname.startsWith(prefix),'fixture URL stays in target reader');
    const route=parsed.pathname.slice(prefix.length)||'index.html';
    let bytes=fs.readFileSync(path.join(f.siteDir,route));
    if(mutate)bytes=mutate({route,bytes,url})||bytes;
    return new Response(bytes,{status:200});
  };
  return {fetchImpl,calls};
}
