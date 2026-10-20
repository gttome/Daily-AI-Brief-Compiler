import {validateMediaPrecision,validateNontechnicalAudience} from '../compiler/production-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {articlePublisherKey,validateArticleSourceDiversity} from '../compiler/source-diversity.mjs';

const EFFECTIVE_DATE='2026-10-19';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const decode=s=>String(s??'').replace(/&(?:amp|quot|apos|lt|gt|#39);/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'"}[x]));
const normalText=s=>decode(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const sourceLink=html=>{
  const m=html.match(/<strong>(?:Source|Watch|Listen \/ watch):<\/strong>\s*<a\b[^>]*href="([^"]+)"/i);
  return decode(m?.[1]||'');
};
const sourceLabel=html=>{
  const m=html.match(/<strong>(?:Source|Watch|Listen \/ watch):<\/strong>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i);
  return decode((m?.[1]||'').replace(/<[^>]+>/g,'')).trim();
};
const pageTitle=html=>decode(html.match(/<h1 class="project-name">([^<]+)<\/h1>/i)?.[1]||
  html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]||'');
function urlIdentity(raw){
  if(!raw)return '';
  try{
    const u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='youtube.com'||host==='m.youtube.com'||host==='youtu.be'){
      const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');
      if(id)return 'youtube:'+id.toLowerCase();
    }
    if(host.endsWith('podcasts.apple.com')){
      const ep=u.searchParams.get('i');
      if(ep)return 'apple-episode:'+ep;
    }
    return 'url:'+host+u.pathname.replace(/\/+$/,'').toLowerCase();
  }catch{return 'url:'+raw.trim().toLowerCase();}
}
export function sameMedia(a,b){
  if(a.type!==b.type)return false;
  const aId=urlIdentity(a.url),bId=urlIdentity(b.url);
  return Boolean(aId&&bId&&aId===bId ||
    normalText(a.title).length>15&&normalText(a.title)===normalText(b.title));
}
function previousItems(root,date,type){
  const folder=path.join(root,type==='video'?'videos':type==='podcast'?'podcasts':'stories',date);
  if(!fs.existsSync(folder))return [];
  const files=[];
  const walk=dir=>{
    for(const item of fs.readdirSync(dir,{withFileTypes:true})){
      const next=path.join(dir,item.name);
      if(item.isDirectory())walk(next);
      else if(item.name==='index.html')files.push(next);
    }
  };
  walk(folder);
  return files.map(file=>{
    const html=fs.readFileSync(file,'utf8');
    return {type,date,title:pageTitle(html),url:sourceLink(html),source:sourceLabel(html),file};
  }).filter(x=>x.title&&x.url);
}
// Compare the podcast PROGRAM, not only the specific episode URL.
// Keep source labels and Apple's stable show ID as independent equivalence keys.
export function podcastShowKeys(item){
  const keys=new Set();
  let label=normalText(item?.source);
  // Historical source credits sometimes append host or syndication metadata.
  label=label.replace(/\b(?:original apple podcasts listing|original buzzsprout episode|buzzsprout publisher)\b.*$/,'').trim();
  if(/^(?:the )?a16z show(?: andreessen horowitz)?$/.test(label))label='a16z show';
  if(/^agora intelligence the briefing$/.test(label))label='agora briefing';
  if(/^(?:the )?ai daily brief(?: nathaniel whittemore)?$/.test(label))label='ai daily brief';
  if(!['','source','listen','podcast','unknown'].includes(label))keys.add('show:'+label);
  try{
    const u=new URL(item?.url||'');
    if(u.hostname.toLowerCase().endsWith('podcasts.apple.com')){
      const id=u.pathname.match(/\/id(\d+)(?:\/|$)/)?.[1];
      if(id)keys.add('apple-show:'+id);
    }
  }catch{/* Missing/corrupt source links fail in the main identity gate. */}
  return [...keys];
}
export function samePodcastShow(a,b){
  const first=podcastShowKeys(a),second=new Set(podcastShowKeys(b));
  return first.some(x=>second.has(x));
}
export function validateMediaFreshness({bundle,historyRoot,lookback=7}){
  const date=bundle?.edition_date;
  if(typeof date!=='string'||!DATE.test(date))throw new Error('media freshness requires a dated sealed bundle');
  if(date<EFFECTIVE_DATE)return {result:'SKIPPED_HISTORICAL',date,duplicates:[],checked_dates:[]};
  // Reuse the same protected signal and Pages gate for editorial selection.
  const articleDiversity=validateArticleSourceDiversity(bundle);
  validateMediaPrecision(bundle);
  validateNontechnicalAudience(bundle);
  if(!historyRoot||!fs.existsSync(path.join(historyRoot,'briefs')))
    throw new Error('media history unavailable: cannot certify freshness');
  const historyDates=fs.readdirSync(path.join(historyRoot,'briefs'),{withFileTypes:true})
    .filter(x=>x.isDirectory()&&DATE.test(x.name)&&x.name<date&&fs.existsSync(path.join(historyRoot,'briefs',x.name,'index.html')))
    .map(x=>x.name).sort().reverse().slice(0,lookback);
  if(!historyDates.length)throw new Error('no published predecessor to check for media repeats');
  const selected=[
    ...(bundle.videos||[]).map(x=>({type:'video',title:x.title,url:x.url,date})),
    ...(bundle.podcasts||[]).map(x=>({type:'podcast',title:x.title,url:x.url,source:x.source,date}))
  ];
  if(bundle.videos?.length!==2||bundle.podcasts?.length!==2||selected.some(x=>!x.title||!x.url))
    throw new Error('media freshness requires exactly two videos and two podcasts with identities');
  const selectedPodcasts=selected.filter(x=>x.type==='podcast');
  if(selectedPodcasts.some(x=>!x.source||!podcastShowKeys(x).length))
    throw new Error('PODCAST_SHOW_IDENTITY_REQUIRED: each selection needs a verified program identity');
  if(samePodcastShow(selectedPodcasts[0],selectedPodcasts[1]))
    throw new Error('PODCAST_SHOW_ROTATION_VIOLATION: both episodes are from the same program');
  const past=historyDates.flatMap(d=>[...previousItems(historyRoot,d,'video'),...previousItems(historyRoot,d,'podcast')]);
  if(!past.some(x=>x.date===historyDates[0]&&x.type==='video')||
     !past.some(x=>x.date===historyDates[0]&&x.type==='podcast'))
    throw new Error('newest prior edition media unavailable: cannot certify non-repetition');
  const duplicateMatches=[];
  for(let i=0;i<selected.length;i++){
    for(let j=0;j<i;j++)if(sameMedia(selected[i],selected[j]))
      duplicateMatches.push({item:selected[i].title,type:selected[i].type,prior_date:date,reason:'duplicate within edition'});
    for(const old of past)if(sameMedia(selected[i],old))
      duplicateMatches.push({item:selected[i].title,type:selected[i].type,prior_date:old.date,reason:'reused published media'});
  }
  if(duplicateMatches.length)throw new Error('MEDIA_REUSE_VIOLATION '+JSON.stringify(duplicateMatches));
  // Three *previous published editions* are the hard show cooldown; aim for seven
  // when qualified fresh content exists. Missing source history cannot silently pass.
  const showDates=historyDates.slice(0,3);
  const priorShows=showDates.flatMap(d=>{
    const shows=past.filter(x=>x.date===d&&x.type==='podcast');
    if(shows.length!==2||shows.some(x=>!podcastShowKeys(x).length))
      throw new Error('PODCAST_SHOW_HISTORY_INCOMPLETE '+d);
    return shows;
  });
  const showRepeats=[];
  for(const chosen of selectedPodcasts){
    for(const old of priorShows)if(samePodcastShow(chosen,old))
      showRepeats.push({show:chosen.source,prior_date:old.date,prior_show:old.source});
  }
  if(showRepeats.length)throw new Error('PODCAST_SHOW_ROTATION_VIOLATION '+JSON.stringify(showRepeats));
  // Seven-edition publisher exposure is evidence for research prioritization,
  // not a backdated gate or a reason to invent lower-quality article sources.
  const priorArticles=historyDates.flatMap(d=>previousItems(historyRoot,d,'article'));
  const publisherHistory={};
  let identified=0;
  for(const article of priorArticles){
    try{
      const key=articlePublisherKey(article.url);
      publisherHistory[key]=(publisherHistory[key]||0)+1;
      identified++;
    }catch{/* Report the missing evidence instead of fabricating an identity. */}
  }
  return {result:'PASS',date,checked_dates:historyDates,selected_count:selected.length,
    previous_count:past.length,duplicates:[],article_diversity:articleDiversity,
    podcast_show_cooldown_editions:3,podcast_show_history_dates:showDates,
    selected_podcast_shows:selectedPodcasts.map(x=>({source:x.source,identity:podcastShowKeys(x)})),
    seven_edition_article_publisher_counts:Object.fromEntries(
      Object.entries(publisherHistory).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))),
    seven_edition_article_pages_identified:identified,
    seven_edition_article_history_complete:identified===historyDates.length*6};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [bundleFile,historyRoot,receiptFile]=process.argv.slice(2);
  if(!bundleFile||!historyRoot)throw new Error('usage: verify-media-freshness.mjs <edition-bundle.json> <history-site-dir> [receipt.json]');
  const receipt=validateMediaFreshness({bundle:JSON.parse(fs.readFileSync(bundleFile,'utf8')),historyRoot});
  if(receiptFile){fs.mkdirSync(path.dirname(receiptFile),{recursive:true});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');}
  console.log(JSON.stringify(receipt));
}
