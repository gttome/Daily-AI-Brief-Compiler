import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {adaptCompilerBundle,mediaDurationLabel,mediaDurationSeconds} from './reader-adapter.mjs';
import {readerEnvironment} from './reader-environment.mjs';
import {compilerFeedbackRegistry} from './feedback-identity.mjs';
import {includeCoreReaderPath,prepareCoreReaderRenderer} from './reader-core-projection.mjs';

const compilerRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshotRoot=path.join(compilerRoot,'vendor','production-reader','snapshot');
const TEXT_EXT=new Set(['.md','.html','.mjs','.js','.json','.xml','.yml','.yaml','.css','.ics','.txt']);

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const p=path.join(dir,entry.name);
    return entry.isDirectory()?walk(p):[p];
  });
}
function writeText(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const text=String(content);
  fs.writeFileSync(file,text.endsWith('\n')?text:text+'\n','utf8');
}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}

// The imported renderer historically calls a video's Why field `connection`.
// Supply that alias only to its transient input, keeping the saved canonical
// media fields independent and the vendored renderer/golden fixture unchanged.
export function mediaRendererEdition(edition){
  const copy=structuredClone(edition);
  for(const slot of Object.values(copy.worth_watching||{})){
    if(slot?.status==='included'){
      slot.connection=slot.why_it_matters;
      slot.upload_date=slot.upload_date?.slice(0,10);
    }
  }
  for(const slot of copy.podcasts||[])slot.publication_date=slot.publication_date?.slice(0,10);
  return copy;
}

function currentMediaRows(bundle,edition){
  const date=bundle.edition_date;
  return [
    ...bundle.videos.map((item,index)=>({
      item,type:'Video',id:`dab-video-${date}-${index?'agent-skills':'general'}`,
      route:`videos/${date}/${index?'agent-skills':'general'}.md`
    })),
    ...bundle.podcasts.map((item,index)=>({
      item,type:'Podcast',id:edition.podcasts[index].item_id,
      route:edition.podcasts[index].permanent_url.replace(/^\//,'').replace(/\/$/,'.md')
    }))
  ].map(row=>({...row,seconds:mediaDurationSeconds(row.item,bundle)}));
}

function mediaHtml(row){
  const item=row.item;
  const fields=[['Summary',item.summary],['Why it matters',item.why_it_matters]];
  if(item.connection_to_brief)fields.push(['Connection to the Brief',item.connection_to_brief]);
  fields.push(['Duration',mediaDurationLabel(row.seconds)]);
  if(row.type==='Podcast')fields.push(['Written page',`${item.written_reading_time_minutes} min read`]);
  return fields.map(([label,value])=>`<p><strong>${label}:</strong> ${esc(value)}</p>`).join('')+
    `<p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${row.type==='Video'?'Watch the selected video':'Listen to the selected episode'}</a></p>`;
}

function mediaPublicRecord(row){
  const item=row.item;
  return {
    summary:item.summary,
    why_it_matters:item.why_it_matters,
    connection_to_brief:item.connection_to_brief||null,
    related_story_ids:[...(item.related_story_ids||[])],
    source_url:item.url,
    selected_item_url:item.url,
    canonical_source_url:item.source_url||null,
    selected_item_id:item.item_id||null,
    source_id:item.source_id||null,
    publication:item.publication?structuredClone(item.publication):null,
    research_cutoff_at:item.research_cutoff_at||null,
    duration_seconds:row.seconds,
    ...(row.type==='Podcast'?{written_reading_time_minutes:item.written_reading_time_minutes}:{})
  };
}

function projectMediaMarkdown(content,rows,date,name){
  let output=String(content);
  for(const row of rows){
    const marker=name===row.route&&row.type==='Video'
      ?`data-story-id="${row.id}" hidden`
      :`data-item-id="${row.id}" data-edition-date="${date}" data-action="permanent_page_clicks"`;
    const start=output.indexOf(marker);
    if(start<0)throw new Error('media reader identity hook missing: '+row.id+' in '+name);
    const followingMarkers=rows.filter(candidate=>candidate.id!==row.id).map(candidate=>
      output.indexOf(`data-item-id="${candidate.id}" data-edition-date="${date}" data-action="permanent_page_clicks"`,start)
    ).filter(index=>index>start);
    const end=followingMarkers.length?Math.min(...followingMarkers):output.length;
    const pair=`**Summary:** ${row.item.summary}\n\n**Why it matters:** ${row.item.why_it_matters}`;
    const before=pair+(row.type==='Podcast'?`\n\n**Connection to the brief:** ${row.item.connection_to_brief||''}`:'');
    const index=output.indexOf(before,start);
    if(index<0||index+before.length>end)throw new Error('media reader copy hook changed: '+row.id+' in '+name);
    const after=pair+(row.item.connection_to_brief?`\n\n**Connection to the Brief:** ${row.item.connection_to_brief}`:'');
    output=output.slice(0,index)+after+output.slice(index+before.length);

    // Replace only this item's metadata. Original timestamp/date precision is
    // retained, and canned renderer fallback claims are not new evidence.
    const metadata=output.slice(start,index);
    if(!/^\*\*Duration:\*\*[^\n]*$/m.test(metadata)||!/^\*\*Date:\*\*[^\n]*$/m.test(metadata))throw new Error('media reader metadata hook changed: '+row.id+' in '+name);
    const updated=metadata
      .replace(/^\*\*Date:\*\*[^\n]*$/m,`**Date:** ${row.item.publication?.original_value||row.item.original_date}  `)
      .replace(/^\*\*Duration:\*\*[^\n]*$/m,`**Duration:** ${mediaDurationLabel(row.seconds)}  `+(row.type==='Podcast'?`\n**Written page:** ${row.item.written_reading_time_minutes} min read  `:''));
    output=output.slice(0,start)+updated+output.slice(index);
  }
  return output;
}

// A bounded projection over existing renderer output, never historical pages.
// Missing hooks fail explicitly so a renderer update cannot silently lose copy.
export function projectMediaReaderFiles(generated,bundle,edition){
  const files=new Map(generated),date=bundle.edition_date;
  const rows=currentMediaRows(bundle,edition);
  for(const name of ['index.md','latest.md',`briefs/${date}.md`]){
    if(!files.has(name))throw new Error('media reader surface missing: '+name);
    files.set(name,projectMediaMarkdown(files.get(name),rows,date,name));
  }
  for(const row of rows){
    if(!files.has(row.route))throw new Error('permanent media reader surface missing: '+row.route);
    files.set(row.route,projectMediaMarkdown(files.get(row.route),[row],date,row.route));
  }
  for(const [name,key] of [['feed.json','items'],['data/archive-index.json','stories']]){
    if(!files.has(name))throw new Error('media reader feed missing: '+name);
    const data=JSON.parse(files.get(name));
    for(const row of rows){
      const matches=data[key].filter(item=>(item.id||item.story_id)===row.id);
      if(matches.length!==1)throw new Error('media reader feed identity missing/duplicate: '+row.id+' in '+name);
      const target=matches[0],record=mediaPublicRecord(row);
      if(name==='feed.json'){
        // Custom JSON Feed extensions begin with an underscore. date_published
        // continues to identify the Brief entry, not an invented source instant.
        target.summary=record.summary;
        target.content_html=mediaHtml(row);
        target.external_url=row.item.url;
        target._daily_compiler_media=record;
      }else Object.assign(target,record);
    }
    files.set(name,JSON.stringify(data,null,2));
  }
  if(!files.has('feed.xml'))throw new Error('media reader feed missing: feed.xml');
  let atom=files.get('feed.xml');
  for(const row of rows){
    let found=0;
    atom=atom.replace(/<entry>[\s\S]*?<\/entry>/g,entry=>{
      if(!entry.includes(`<id>${esc(row.id)}</id>`))return entry;
      found++;
      return entry.replace('</entry>',`  <content type="html">${esc(mediaHtml(row))}</content>\n  </entry>`);
    });
    if(found!==1)throw new Error('Atom media identity missing/duplicate: '+row.id);
  }
  files.set('feed.xml',atom);
  return files;
}

function patchWatchlistImmediateSelection(root){
  const file=path.join(root,'assets','js','watchlist.js');
  const source=fs.readFileSync(file,'utf8');
  const before="article.querySelectorAll('[data-choice]').forEach(b=>b.disabled=true);status.textContent='Saving…';";
  const after="article.querySelectorAll('[data-choice]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.choice===choice));b.disabled=true;});status.textContent='Saving…';";
  if(!source.includes(before))throw new Error('canonical watchlist vote hook changed; immediate-selection patch must be reviewed');
  fs.writeFileSync(file,source.replace(before,after),'utf8');
}

function patchFeedbackRuntime(root,environment){
  const replacements=[
    ['assets/js/feedback.js','https://daily-ai-brief-ratings.gtome.chatgpt.site/api/ratings',environment.feedbackBase+'/api/ratings'],
    ['assets/js/comments.js','https://daily-ai-brief-ratings.gtome.chatgpt.site/api/comments',environment.feedbackBase+'/api/comments'],
    ['assets/js/watchlist.js','https://daily-ai-brief-ratings.gtome.chatgpt.site/api/watchlist',environment.feedbackBase+'/api/watchlist'],
    ['assets/js/share.js','https://daily-ai-brief-ratings.gtome.chatgpt.site/api/events',environment.feedbackBase+'/api/events']
  ];
  for(const [relative,before,after] of replacements){
    const file=path.join(root,relative);
    const source=fs.readFileSync(file,'utf8');
    if(!source.includes(before))throw new Error('reader feedback endpoint changed: '+relative);
    fs.writeFileSync(file,source.replaceAll(before,after),'utf8');
  }
  const commentsPath=path.join(root,'assets','js','comments.js');
  let comments=fs.readFileSync(commentsPath,'utf8');
  comments=comments
    .replace('Sent privately to the brief’s editor. Please avoid personal or confidential information. Comments are retained for 90 days.','Saved anonymously in the public Daily AI Brief Compiler feedback store. Do not include personal or confidential information.')
    .replace('Comment sent privately. Thank you.','Comment saved. Thank you.');
  fs.writeFileSync(commentsPath,comments,'utf8');

  const feedbackPage=path.join(root,'feedback','index.md');
  let page=fs.readFileSync(feedbackPage,'utf8');
  page=page
    .replace('submissions are sent for private aggregation','submissions are stored by the independent Daily AI Brief Compiler feedback service')
    .replace('Optional comments are sent privately to the editor and retained for 90 days; please avoid personal or confidential information.','Optional comments are stored anonymously in the Compiler feedback store and may be readable through its public data endpoint; do not include personal or confidential information.');
  fs.writeFileSync(feedbackPage,page,'utf8');
}

function applyFeedbackIdentities(content,registry){
  let next=String(content);
  for(const item of registry.items){
    next=next.replaceAll(`data-feedback-story-id="${item.canonical_reader_id}"`,`data-feedback-story-id="${item.feedback_id}"`);
  }
  return next;
}

function rewriteReaderEnvironment(root,environment){
  const absoluteToken='__DAILY_COMPILER_PUBLIC_BASE__';
  for(const file of walk(root)){
    if(!TEXT_EXT.has(path.extname(file).toLowerCase()))continue;
    const text=fs.readFileSync(file,'utf8');
    const next=text
      .replaceAll(environment.productionReferenceBase,absoluteToken)
      .replaceAll(environment.productionReferenceBaseurl,environment.baseurl)
      .replaceAll('gttome.github.io\\/Daily-AI-Brief\\/','gttome.github.io\\/(?:Daily-AI-Brief|Daily-AI-Brief-Compiler)\\/')
      .replaceAll(absoluteToken,environment.publicBase);
    if(next!==text)fs.writeFileSync(file,next,'utf8');
  }
  const configPath=path.join(root,'_config.yml');
  const config=fs.readFileSync(configPath,'utf8')
    .replace(/^url:.*$/m,'')
    .replace(/^baseurl:.*$/m,'')
    .replace(/^repository:.*$/m,'');
  // The public-safe manifest binds the built/history artifact to its edition.
  // Operational compile/verification receipts stay outside the published site.
  writeText(configPath,config.trimEnd()+'\nurl: "https://gttome.github.io"\nbaseurl: "'+environment.baseurl+'"\nrepository: "'+environment.repository+'"\nexclude:\n  - compile-receipt.json\n  - verification-receipt.json\n');
}

function mergeBookOverlay(root,date,overlay){
  const file=path.join(root,'_data','book-reading.json');
  const data=readJson(file);
  data.references={...(data.references||{}),...(overlay.references||{})};
  data.editions={...(data.editions||{}),[date]:overlay.selections||[]};
  if(data.frozen_migrations)delete data.frozen_migrations[date];
  writeText(file,JSON.stringify(data,null,2));
}

function coverageLabel(story){
  if(story.freshness?.tier==='fallback')return story.freshness?.fallback_band==='extended'?'Extended recency fallback':'Recency fallback';
  return 'New development';
}
function latestPreviousEdition(root,date){
  const dir=path.join(root,'_data','editions');
  const names=fs.readdirSync(dir).filter(n=>/^\d{4}-\d{2}-\d{2}\.json$/.test(n)&&n.slice(0,10)<date).sort();
  return names.length?readJson(path.join(dir,names.at(-1))):null;
}
function mergeReadingSupport(root,bundle,edition,environment){
  const file=path.join(root,'_data','reading-support.json');
  const data=readJson(file);
  const prior=latestPreviousEdition(root,edition.brief_date);
  const originalById=new Map(bundle.stories.map(s=>[s.id,s]));
  const entries=[];
  for(const story of edition.stories){
    const original=originalById.get(story.compiler_story_id);
    const priorStory=(prior?.stories||[]).find(s=>s.focus===story.focus) || prior?.stories?.[0] || null;
    const row={
      item_id:story.story_id,
      coverage_label:coverageLabel(story),
      label_reason:'Preserved edition freshness and evidence represented in the canonical reader contract.',
      learning_outcome:story.why_it_matters,
      context_term:story.topics?.[0]||'Context',
      context:story.summary
    };
    if(priorStory){
      row.related={
        label:'Earlier Brief',
        title:priorStory.headline,
        brief_date:prior.brief_date,
        url:environment.publicBase+priorStory.permanent_url,
        connection:original?.related_coverage||'Earlier coverage provides useful context for this development.'
      };
    }
    entries.push(row);
  }
  for(const pair of [['general','general'],['agents_non_technical_people','agent-skills']]){
    const key=pair[0],suffix=pair[1];
    const slot=edition.worth_watching?.[key];
    if(slot?.status!=='included')continue;
    entries.push({
      item_id:'dab-video-'+edition.brief_date+'-'+suffix,
      coverage_label:'New development',
      label_reason:'Verified media selection preserved from the edition bundle.',
      learning_outcome:slot.why_it_matters,
      context_term:'Video context',
      context:slot.why_useful
    });
  }
  for(const podcast of edition.podcasts||[]){
    entries.push({
      item_id:podcast.item_id,
      coverage_label:'New development',
      label_reason:'Verified podcast selection preserved from the edition bundle.',
      learning_outcome:podcast.why_useful,
      context_term:'Podcast context',
      context:podcast.summary
    });
  }
  data.editions={...(data.editions||{}),[edition.brief_date]:entries};
  writeText(file,JSON.stringify(data,null,2));
}

function writeWatchlistData(root,watchlist){
  writeText(path.join(root,'_data','watchlist.json'),JSON.stringify(watchlist,null,2));
  writeText(path.join(root,'data','watchlist.json'),JSON.stringify(watchlist,null,2));
  writeText(path.join(root,'_data','watchlist-history',watchlist.edition_date+'.json'),JSON.stringify(watchlist,null,2));
}

async function writeWatchlistResearch(root,watchlist){
  const daily=await import(pathToFileURL(path.join(root,'assets','js','watchlist-daily.js')).href);
  const evidence=await import(pathToFileURL(path.join(root,'assets','js','watchlist-evidence.js')).href);
  const cards=(watchlist.topics||[]).map(topic=>
    '<section class="wl-card" id="'+esc(topic.topic_id)+'"><h2>'+esc(topic.name)+'</h2><p>'+esc(topic.summary)+'</p><p><strong>Why now:</strong> '+esc(topic.why_now)+'</p><p><strong>Potential value:</strong> '+esc(topic.practical_value)+'</p>'+evidence.renderWatchlistEvidence(topic)+'</section>'
  ).join('\n');
  const markdown='---\nlayout: default\ntitle: Watchlist research\npermalink: /watchlist/research/\nbrief_date: '+watchlist.edition_date+'\nreader_release: true\n---\n\n[Back to the watchlist and voting]({{ \'/watchlist/\' | relative_url }})\n\nResearch updated '+watchlist.updated_at+'. The current Compiler edition preserves the evidence references and Watchlist decisions already sealed in the semantic bundle.\n\n'+daily.renderDailyTopicGroups(watchlist)+'\n\n'+cards+'\n';
  writeText(path.join(root,'watchlist','research','index.md'),markdown);
}

function copyCurrentImages(root,repoRoot,bindings,date){
  const dir=path.join(root,'briefs','images',date);
  fs.mkdirSync(dir,{recursive:true});
  for(const binding of bindings){
    const source=path.resolve(repoRoot,binding.source_path);
    if(!fs.existsSync(source))throw new Error('accepted image source missing: '+binding.source_path);
    fs.copyFileSync(source,path.join(dir,binding.reader_filename));
  }
}

function requiredRoutes(adapted){
  const date=adapted.edition.brief_date;
  const stories=adapted.edition.stories.map(s=>s.permanent_url.replace(/^\//,'')+'index.html');
  const podcasts=adapted.edition.podcasts.map(p=>p.permanent_url.replace(/^\//,'')+'index.html');
  return [
    'index.html',
    'latest.md',
    'briefs/'+date+'/index.html',
    'briefs-archive/index.html',
    'watchlist/index.html',
    'watchlist/research/index.html',
    'sources/index.html',
    'about/index.html',
    'subscribe/index.html',
    'calendar/index.html',
    'feedback/index.html',
    'daily-feed.xml',
    'feed.xml',
    'feed.json',
    'assets/js/feedback.js',
    'assets/js/share.js',
    'assets/js/comments.js',
    'assets/js/watchlist.js',
    ...stories,
    'videos/'+date+'/general/index.html',
    'videos/'+date+'/agent-skills/index.html',
    ...podcasts
  ];
}

export async function materializeReaderSource({bundle,bundleDigest,repoRoot='.',outDir,environment=readerEnvironment}){
  if(!outDir)throw new Error('outDir required');
  if(!/^[a-f0-9]{64}$/.test(bundleDigest||''))throw new Error('sealed bundle digest required for reader source');
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(snapshotRoot,outDir,{recursive:true,filter:source=>includeCoreReaderPath(path.relative(snapshotRoot,source))});
  prepareCoreReaderRenderer(outDir);
  rewriteReaderEnvironment(outDir,environment);
  patchWatchlistImmediateSelection(outDir);
  patchFeedbackRuntime(outDir,environment);
  if(!fs.existsSync(path.join(outDir,'README.md')))writeText(path.join(outDir,'README.md'),'# Daily Generative AI Brief\n\n## Archive\n');

  const priorWatchlist=readJson(path.join(outDir,'_data','watchlist.json'));
  const adapted=adaptCompilerBundle(bundle,{environment,priorWatchlist});
  const feedbackRegistry=compilerFeedbackRegistry(bundle,adapted.edition,adapted.watchlist);
  mergeBookOverlay(outDir,bundle.edition_date,adapted.bookOverlay);
  mergeReadingSupport(outDir,bundle,adapted.edition,environment);
  writeWatchlistData(outDir,adapted.watchlist);
  copyCurrentImages(outDir,repoRoot,adapted.imageBindings,bundle.edition_date);
  writeText(path.join(outDir,'_data','editions',bundle.edition_date+'.json'),JSON.stringify(adapted.edition,null,2));

  const watchModule=await import(pathToFileURL(path.join(outDir,'_generator','lib','watchlist.mjs')).href);
  const watchErrors=watchModule.validateWatchlist(adapted.watchlist);
  if(watchErrors.length)throw new Error('adapted Watchlist invalid: '+watchErrors.join('; '));

  const render=await import(pathToFileURL(path.join(outDir,'_generator','lib','render.mjs')).href);
  const generated=projectMediaReaderFiles(
    render.generatedFiles(mediaRendererEdition(adapted.edition),outDir,{watchlist:adapted.watchlist}),
    bundle,adapted.edition
  );
  for(const [name,content] of generated)writeText(path.join(outDir,name),applyFeedbackIdentities(content,feedbackRegistry));
  await writeWatchlistResearch(outDir,adapted.watchlist);
  writeText(path.join(outDir,'data','compiler-feedback-registry.json'),JSON.stringify(feedbackRegistry,null,2));

  const manifest={
    schema_version:'daily-compiler-canonical-reader-source-v1',
    edition_date:bundle.edition_date,
    bundle_sha256:bundleDigest,
    renderer:'vendored-production-reader',
    production_reader_source_sha:'912248e5add14b2ec08d7a5eefed43cbf3af485f',
    environment:{public_base:environment.publicBase,baseurl:environment.baseurl},
    feedback:{
      store:environment.feedbackStore,
      base_url:environment.feedbackBase,
      registry_route:'data/compiler-feedback-registry.json',
      public_comments:true,
      item_namespace:'dab-*-compiler-YYYY-MM-DD-*'
    },
    required_routes:[...requiredRoutes(adapted),'data/compiler-feedback-registry.json'],
    current_images:adapted.imageBindings.map(x=>{
      const story=adapted.edition.stories.find(row=>row.compiler_story_id===x.story_id);
      const feedback=feedbackRegistry.items.find(row=>row.type==='story'&&row.semantic_id===x.story_id);
      return {
        story_id:x.story_id,
        reader_story_id:story.story_id,
        permanent_route:story.permanent_url.replace(/^\//,'')+'index.html',
        route:'briefs/images/'+bundle.edition_date+'/'+x.reader_filename,
        public_url:story.image.public_url,
        alt:story.image.alt,
        source_url:story.source.url,
        feedback_id:feedback.feedback_id,
        sha256:x.sha256,
        git_blob_sha:x.git_blob_sha
      };
    }),
    current_media:currentMediaRows(bundle,adapted.edition).map(row=>({
      reader_id:row.id,
      type:row.type.toLowerCase(),
      permanent_route:row.route.replace(/\.md$/,'/index.html'),
      selected_url:row.item.url,
      summary:row.item.summary,
      why_it_matters:row.item.why_it_matters,
      connection_to_brief:row.item.connection_to_brief||null,
      duration:mediaDurationLabel(row.seconds),
      original_date:row.item.publication?.original_value||row.item.original_date,
      written_reading_time_minutes:row.type==='Podcast'?row.item.written_reading_time_minutes:null
    })),
    semantic_rework:0,
    accepted_image_regenerations:bundle.producer_receipt?.accepted_image_regenerations ?? 0,
    production_runtime_dependency:false,
    reader_behavior_fixes:['watchlist-interest-selection-immediate-visual-state','compiler-owned-feedback-store','compiler-feedback-item-namespace','distinct-media-reader-fields','exact-media-duration-and-publication','media-page-and-feed-parity'],
    media_contract_version:bundle.media_contract_version||null
  };
  writeText(path.join(outDir,'build-manifest.json'),JSON.stringify(manifest,null,2));
  return {manifest,adapted};
}
