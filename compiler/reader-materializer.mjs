import fs from 'node:fs';
import {requireDistinctWatchlistTitles} from './watchlist-identity.mjs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {adaptCompilerBundle} from './reader-adapter.mjs';
import {readerEnvironment} from './reader-environment.mjs';
import {compilerFeedbackRegistry} from './feedback-identity.mjs';
import {verifiedHistoricalRelation} from './historical-related.mjs';
import {renderSourcesMarkdown} from './source-transparency.mjs';
import {BRIEF_BUILDER_MD,addBuilderToJekyllLayout,assertBuilderMarkdown} from './brief-builder-pages.mjs';

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

// Future-only overlay: the frozen vendored production renderer stays byte-identical.
// Insert the exact fragment ID advertised by renderEditionOverview above each
// podcast heading in the temporary compilation copy, never in the immutable vendor.
export function podcastNavigationRendererOverlay(source){
  const before='  return `### ${ordinal}. ${slot.title}';
  const after='  return `<span id="podcast-${xml(slot.item_id)}"></span>\n\n### ${ordinal}. ${slot.title}';
  if(source.split(before).length!==2||source.includes('<span id="podcast-${xml(slot.item_id)}"></span>'))
    throw Error('podcast navigation renderer contract changed: review anchor overlay');
  return source.replace(before,()=>after);
}
function patchPodcastNavigationTargets(root){
  const file=path.join(root,'_generator','lib','reader.mjs');
  const source=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,podcastNavigationRendererOverlay(source),'utf8');
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


// Preserve the vendored reader source: apply only targeted, reversible rendering overlays.
function restrictCoveragePeriodToArticles(root){
  const file=path.join(root,'_generator','lib','render.mjs');
  const content=fs.readFileSync(file,'utf8');
  const video="  for(const slot of Object.values(edition.worth_watching||{}))if(slot?.status==='included'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(slot.upload_date||''))dates.push(slot.upload_date);";
  const audio="  for(const slot of podcasts)if(slot?.status==='included'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(slot.publication_date||''))dates.push(slot.publication_date);";
  if(content.split(video).length!==2||content.split(audio).length!==2)
    throw Error('upstream coverage renderer changed: review date-range overlay');
  fs.writeFileSync(file,content.replace(video,'  // Older evergreen media are excluded from article coverage dates.')
    .replace(audio,'  // Podcast dates stay in media metadata, not article coverage period.'));
}
// Remove only demonstrably empty metadata and exact duplicated podcast explanations.
export function removeEmptyAndRepeatedMediaCopy(value){
  return String(value)
    .replace(/^\*\*Topics:\*\*[ \t]*\r?\n/gm,'')
    .replace(/<p><strong>Topics:<\/strong>\s*<\/p>\s*/g,'')
    .replace(/<br\s*\/>\s*<strong>Topics:<\/strong>\s*(?=<\/p>)/g,'')
    .replace(/<strong>Topics:<\/strong><br \/>/g,'')
    // Keep the preceding Show line break so Show and Focus never run together.
    .replace(/<strong>Host \/ guest:<\/strong>[ \t]*(?:Not listed)?[ \t]*<br\s*\/?>[ \t]*(?:\r?\n)?/gi,'')
    .replace(/^[ \t]*\*\*Host \/ guest:\*\*[ \t]*(?:Not listed)?[ \t]*(?:\r?\n)/gm,'')
    .replace(/(\*\*Why it matters:\*\* ([^\r\n]+))\r?\n(?:\r?\n){1,3}\*\*Connection to the brief:\*\* \2(?=\r?\n|$)/g,'$1')
    .replace(/(<p><strong>Why it matters:<\/strong> ([^<]+)<\/p>)\s*<p><strong>Connection to the brief:<\/strong> \2<\/p>/g,'$1');
}
function suppressRepeatedReaderContext(root){
  // Preserve the upstream vendor snapshot and its strict reading-support validation.
  // The generated reader already has canonical Summary and Why it matters sections.
  // From Oct 14 on, do not display those same paragraphs in the supplemental panel.
  const file=path.join(root,'_generator','lib','reading-support.mjs');
  const source=fs.readFileSync(file,'utf8');
  const marker='const contextBlock=x?';
  if(source.split(marker).length!==2)
    throw new Error('vendored reading-support template changed; duplicate-copy prevention must be reviewed');
  const corrected=source.replace(marker,"const contextBlock=date>='2026-10-14'?'':x?");
  fs.writeFileSync(file,corrected,'utf8');
}

function applyFeedbackIdentities(content,registry){
  let next=String(content);
  for(const item of registry.items){
    next=next.replaceAll(`data-feedback-story-id="${item.canonical_reader_id}"`,`data-feedback-story-id="${item.feedback_id}"`);
  }
  return next;
}

export function rewriteReaderEnvironment(root,environment){
  const absoluteToken='__DAILY_COMPILER_PUBLIC_BASE__';
  const existingBaseurlToken='__DAILY_COMPILER_EXISTING_BASEURL__';
  for(const file of walk(root)){
    if(!TEXT_EXT.has(path.extname(file).toLowerCase()))continue;
    const text=fs.readFileSync(file,'utf8');
    const next=text
      .replaceAll(environment.baseurl,existingBaseurlToken)
      .replaceAll(environment.productionReferenceBase,absoluteToken)
      .replaceAll(environment.productionReferenceBaseurl,environment.baseurl)
      .replaceAll('gttome.github.io\\/Daily-AI-Brief\\/','gttome.github.io\\/(?:Daily-AI-Brief|Daily-AI-Brief-Compiler)\\/')
      .replaceAll(absoluteToken,environment.publicBase)
      .replaceAll(existingBaseurlToken,environment.baseurl);
    if(next!==text)fs.writeFileSync(file,next,'utf8');
  }
  const configPath=path.join(root,'_config.yml');
  const config=fs.readFileSync(configPath,'utf8')
    .replace(/^url:.*$/m,'')
    .replace(/^baseurl:.*$/m,'')
    .replace(/^repository:.*$/m,'');
  writeText(configPath,config.trimEnd()+'\nurl: "https://gttome.github.io"\nbaseurl: "'+environment.baseurl+'"\nrepository: "'+environment.repository+'"\nexclude:\n  - build-manifest.json\n  - compile-receipt.json\n  - verification-receipt.json\n');
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
// Media labels reflect the original program date, not the Brief's current date.
export function mediaCoverageLabel(editionDate,originalDate,type){
  if(editionDate<'2026-10-23')return 'New development'; // Historical snapshots replay unchanged.
  const day=String(originalDate??'').slice(0,10);
  const parsed=Date.parse(day+'T12:00:00Z'),published=Date.parse(editionDate+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(parsed)||!Number.isFinite(published)||parsed>published)
    throw Error('media_original_date_invalid:'+type+':'+originalDate);
  const age=Math.floor((published-parsed)/86400000);
  const noun=type==='video'?'instructional video':'AI podcast episode';
  return age<=1?'New '+noun:age<=7?'Recent '+noun+' fallback':'Evergreen '+noun;
}
function mergeReadingSupport(root,bundle,edition,environment,priorArchive){
  const file=path.join(root,'_data','reading-support.json');
  const data=readJson(file);
  const originalById=new Map(bundle.stories.map(s=>[s.id,s]));
  const entries=[];
  for(const story of edition.stories){
    const original=originalById.get(story.compiler_story_id);
    const verifiedRelated=verifiedHistoricalRelation({candidate:original?.historical_related,editionDate:edition.brief_date,archive:priorArchive,publicBase:environment.publicBase});
    const row={
      item_id:story.story_id,
      coverage_label:coverageLabel(story),
      label_reason:'Preserved edition freshness and evidence represented in the canonical reader contract.',
      learning_outcome:story.why_it_matters,
      context_term:story.topics?.[0]||'Context',
      context:story.summary
    };
    if(verifiedRelated)row.related=verifiedRelated;
    entries.push(row);
  }
  for(const pair of [['general','general'],['agents_non_technical_people','agent-skills']]){
    const key=pair[0],suffix=pair[1];
    const slot=edition.worth_watching?.[key];
    if(slot?.status!=='included')continue;
    entries.push({
      item_id:'dab-video-'+edition.brief_date+'-'+suffix,
      coverage_label:mediaCoverageLabel(edition.brief_date,slot.upload_date,'video'),
      label_reason:'Original video publication date determines the age label.',
      learning_outcome:slot.connection,
      context_term:'Video context',
      context:slot.why_useful
    });
  }
  for(const podcast of edition.podcasts||[]){
    entries.push({
      item_id:podcast.item_id,
      coverage_label:mediaCoverageLabel(edition.brief_date,podcast.publication_date,'podcast'),
      label_reason:'Original podcast episode date determines the age label.',
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
    if(!fs.existsSync(source))throw new Error('reader figure source missing: '+binding.source_path);
    fs.copyFileSync(source,path.join(dir,binding.reader_filename));
  }
}

function requiredRoutes(adapted){
  const date=adapted.edition.brief_date;
  const stories=adapted.edition.stories.map(s=>s.permanent_url.replace(/^\//,'')+'index.html');
  const podcasts=adapted.edition.podcasts.map(p=>p.permanent_url.replace(/^\//,'')+'index.html');
  return [
    'index.html',
    'briefs/'+date+'/index.html',
    'briefs-archive/index.html',
    'watchlist/index.html',
    'watchlist/research/index.html',
    'sources/index.html',
    ...(date>='2026-10-28'?['build-your-own-brief-compiler/index.html']:[]),
    'about/index.html',
    'subscribe/index.html',
    'calendar/index.html',
    'feedback/index.html',
    'daily-feed.xml',
    'feed.xml',
    'feed.json',
    ...stories,
    'videos/'+date+'/general/index.html',
    'videos/'+date+'/agent-skills/index.html',
    ...podcasts
  ];
}

// Future public editions must carry forward the actual last published research ledger,
// not reset to the static vendored reference corpus. This is read-only.
export function requirePublishedPriorWatchlist(prior,editionDate,scoreTopic){
  if(!prior||prior.schema_version!=='1.0.0'||typeof prior.edition_date!=='string'||
     !/^\d{4}-\d{2}-\d{2}$/.test(prior.edition_date)||prior.edition_date>=editionDate||
     !Array.isArray(prior.topics)||prior.topics.length<20||prior.topics.length>200)
    throw new Error('published prior Watchlist identity, date or count invalid');
  if(typeof scoreTopic!=='function')throw new Error('canonical Watchlist scorer required');
  const ids=new Set();
  for(const topic of prior.topics){
    const id=topic?.topic_id;
    if(typeof id!=='string'||!/^dab-topic-[a-z0-9-]{3,90}$/.test(id)||ids.has(id))
      throw new Error('published prior Watchlist has missing or duplicate identity');
    ids.add(id);
    const score=scoreTopic(topic);
    if(!Number.isInteger(topic.research_score)||topic.research_score!==score||
       score<0||score>100)
      throw new Error('published prior Watchlist has missing or inconsistent research score: '+id);
  }
  return structuredClone(prior);
}

export async function materializeReaderSource({bundle,repoRoot='.',outDir,environment=readerEnvironment,priorWatchlist=null,priorArchive=null}){
  if(!outDir)throw new Error('outDir required');
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(snapshotRoot,outDir,{recursive:true});
  if(bundle.edition_date>='2026-10-28')patchPodcastNavigationTargets(outDir);
  if(bundle.edition_date>='2026-10-28'){
    // Expose the already published website concept page in every future build.
    // Never change the immutable vendor snapshot or historical complete editions.
    const md=fs.readFileSync(path.join(compilerRoot,BRIEF_BUILDER_MD),'utf8');
    assertBuilderMarkdown(md);
    writeText(path.join(outDir,'build-your-own-brief-compiler.md'),md);
    const layout=path.join(outDir,'_layouts','default.html');
    fs.writeFileSync(layout,addBuilderToJekyllLayout(fs.readFileSync(layout,'utf8')),'utf8');
  }
  // Only Oct28+ compilations regenerate this informational page from the
  // protected Compiler registry. The frozen reader snapshot stays immutable.
  if(bundle.edition_date>='2026-10-28'){
    const registry=readJson(path.join(compilerRoot,'config','resource-registry.json'));
    writeText(path.join(outDir,'sources.md'),renderSourcesMarkdown(registry));
  }
  rewriteReaderEnvironment(outDir,environment);
  patchWatchlistImmediateSelection(outDir);
  patchFeedbackRuntime(outDir,environment);
  suppressRepeatedReaderContext(outDir);
  restrictCoveragePeriodToArticles(outDir);
  if(!fs.existsSync(path.join(outDir,'README.md')))writeText(path.join(outDir,'README.md'),'# Daily Generative AI Brief\n\n## Archive\n');

  const watchModule=await import(pathToFileURL(path.join(outDir,'_generator','lib','watchlist.mjs')).href);
  const baseline=priorWatchlist===null
    ? readJson(path.join(outDir,'_data','watchlist.json'))
    : requirePublishedPriorWatchlist(priorWatchlist,bundle.edition_date,watchModule.scoreTopic);
  const adapted=adaptCompilerBundle(bundle,{environment,priorWatchlist:baseline});
  if(priorWatchlist!==null){
    const actual=new Set(adapted.watchlist.topics.map(topic=>topic.topic_id));
    for(const previous of baseline.topics){
      if(!actual.has(previous.topic_id))
        throw new Error('published Watchlist topic silently dropped: '+previous.topic_id);
    }
  }
  if(bundle.edition_date>='2026-10-24')requireDistinctWatchlistTitles(adapted.watchlist.topics);
  const watchErrors=watchModule.validateWatchlist(adapted.watchlist);
  if(watchErrors.length)throw new Error('adapted Watchlist invalid: '+watchErrors.join('; '));
  // Score every topic using the same weighted rubric displayed to readers.
  // Vendored prior topics do not carry a precomputed score; do not publish blank /100.
  adapted.watchlist=watchModule.publicWatchlist(adapted.watchlist);
  const feedbackRegistry=compilerFeedbackRegistry(bundle,adapted.edition,adapted.watchlist);
  mergeBookOverlay(outDir,bundle.edition_date,adapted.bookOverlay);
  mergeReadingSupport(outDir,bundle,adapted.edition,environment,priorArchive);
  writeWatchlistData(outDir,adapted.watchlist);
  copyCurrentImages(outDir,repoRoot,adapted.imageBindings,bundle.edition_date);
  writeText(path.join(outDir,'_data','editions',bundle.edition_date+'.json'),JSON.stringify(adapted.edition,null,2));

  const render=await import(pathToFileURL(path.join(outDir,'_generator','lib','render.mjs')).href);
  const generated=render.generatedFiles(adapted.edition,outDir,{watchlist:adapted.watchlist});
  for(const [name,content] of generated)writeText(path.join(outDir,name),removeEmptyAndRepeatedMediaCopy(applyFeedbackIdentities(content,feedbackRegistry)));
  await writeWatchlistResearch(outDir,adapted.watchlist);
  writeText(path.join(outDir,'data','compiler-feedback-registry.json'),JSON.stringify(feedbackRegistry,null,2));

  const manifest={
    schema_version:'daily-compiler-canonical-reader-source-v1',
    edition_date:bundle.edition_date,
    renderer:'vendored-production-reader',
    ...(priorWatchlist!==null?{watchlist_continuity:{
      previous_edition:baseline.edition_date,
      previous_topic_count:baseline.topics.length,
      previous_topic_ids:baseline.topics.map(topic=>topic.topic_id)
    }}:{}),
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
    current_images:adapted.imageBindings.map(x=>({
      story_id:x.story_id,
      route:'briefs/images/'+bundle.edition_date+'/'+x.reader_filename,
      sha256:x.sha256,
      git_blob_sha:x.git_blob_sha,
      status:x.status||'accepted',
      accepted:x.accepted!==false,
      placeholder_id:x.placeholder_id||null
    })),
    image_representation:bundle.image_representation?.status||'accepted',
    semantic_rework:0,
    accepted_image_regenerations:bundle.producer_receipt?.accepted_image_regenerations ?? 0,
    production_runtime_dependency:false,
    reader_behavior_fixes:['watchlist-interest-selection-immediate-visual-state','compiler-owned-feedback-store','compiler-feedback-item-namespace']
  };
  writeText(path.join(outDir,'build-manifest.json'),JSON.stringify(manifest,null,2));
  return {manifest,adapted};
}
