import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {adaptCompilerBundle} from './reader-adapter.mjs';
import {readerEnvironment} from './reader-environment.mjs';
import {compilerFeedbackRegistry} from './feedback-identity.mjs';

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
      learning_outcome:slot.connection,
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

export async function materializeReaderSource({bundle,repoRoot='.',outDir,environment=readerEnvironment}){
  if(!outDir)throw new Error('outDir required');
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(snapshotRoot,outDir,{recursive:true});
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
  const generated=render.generatedFiles(adapted.edition,outDir,{watchlist:adapted.watchlist});
  for(const [name,content] of generated)writeText(path.join(outDir,name),applyFeedbackIdentities(content,feedbackRegistry));
  await writeWatchlistResearch(outDir,adapted.watchlist);
  writeText(path.join(outDir,'data','compiler-feedback-registry.json'),JSON.stringify(feedbackRegistry,null,2));

  const manifest={
    schema_version:'daily-compiler-canonical-reader-source-v1',
    edition_date:bundle.edition_date,
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
