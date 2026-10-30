import {validateMediaPrecision,validateNontechnicalAudience} from '../compiler/production-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {articlePublisherKey,validateArticleSourceDiversity} from '../compiler/source-diversity.mjs';
import {findEditorialValueOverlap,EDITORIAL_NOVELTY_EFFECTIVE} from '../compiler/editorial-novelty.mjs';

const EFFECTIVE_DATE='2026-10-19';
// Oct 26 onward: whole preserved archive, not only the seven latest editions.
const FULL_ARCHIVE_UNIQUENESS_EFFECTIVE='2026-10-26';
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

// Canonical prior published video pages, including protected media-only
// corrections, supply the preceding edition's publisher identity. Publisher
// reuse is NOT the same as a repeated program or URL.
export function summarizeVideoEditorialContinuity({videos,previousVideos,editionDate,previousEditionDate}){
 const now=Array.isArray(videos)?videos:[],prior=Array.isArray(previousVideos)?previousVideos:[];
 const key=v=>normalText(v?.source);
 const priorKeys=new Set(prior.map(key).filter(Boolean));
 const publisherRepeats=now.filter(v=>key(v)&&priorKeys.has(key(v)))
   .map(v=>({title:v.title,publisher:v.source}));
 const publicationAges=now.map(v=>{
   const original=v?.original_date??null,originalDay=typeof original==='string'?original.slice(0,10):null;
   const age=DATE.test(originalDay||'')&&DATE.test(editionDate||'')?
     Math.round((Date.parse(editionDate+'T00:00:00Z')-Date.parse(originalDay+'T00:00:00Z'))/86400000):null;
   return {title:v.title,original_date:original,calendar_age_days:age,
     outside_seven_day_preference:age!==null&&age>7};
 });
 return {status:'EDITORIAL_ADVISORY_NOT_DUPLICATE_PROOF',
   prior_edition_date:previousEditionDate??null,
   current_distinct_publisher_count:new Set(now.map(key).filter(Boolean)).size,
   adjacent_edition_publisher_repeat_count:publisherRepeats.length,
   adjacent_edition_publisher_repeats:publisherRepeats,
   original_publication_ages:publicationAges,
   outside_seven_day_preference:publicationAges.filter(x=>x.outside_seven_day_preference).length,
   missing_original_dates:publicationAges.filter(x=>x.calendar_age_days===null).length,
   rule:'Actual URL/title repeats are prohibited separately; publisher rotation and video age are review advisories, never fabricated duplicate evidence.'};
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

/**
 * Read all prior permanent pages; never rewrite their accepted article/media
 * history. Compare exact canonical source identity and substantive item titles.
 */
export function findFullArchiveRepeats({bundle,historyRoot,dates}){
  const media=dates.flatMap(d=>[
    ...previousItems(historyRoot,d,'video'),
    ...previousItems(historyRoot,d,'podcast')
  ]);
  const articles=dates.flatMap(d=>previousItems(historyRoot,d,'article'));
  const selected=[
    ...(bundle.videos||[]).map(x=>({type:'video',title:x.title,url:x.url})),
    ...(bundle.podcasts||[]).map(x=>({type:'podcast',title:x.title,url:x.url}))
  ];
  const media_duplicates=[],article_duplicates=[];
  for(const item of selected){
    for(const old of media)if(sameMedia(item,old))
      media_duplicates.push({item:item.title,prior_title:old.title,type:item.type,
        prior_date:old.date,prior_page:old.file});
  }
  for(const item of bundle.stories||[]){
    const source=urlIdentity(item.source?.url);
    const title=normalText(item.headline);
    for(const old of articles){
      const exactSource=Boolean(source&&source===urlIdentity(old.url));
      const exactTitle=Boolean(title.length>15&&title===normalText(old.title));
      if(exactSource||exactTitle)
        article_duplicates.push({item:item.headline,prior_title:old.title,
          prior_date:old.date,prior_page:old.file,
          reason:exactSource?'same_source_url':'same_headline'});
    }
  }
  return {checked_dates:dates.length,media_pages:media.length,
    article_pages:articles.length,media_duplicates,article_duplicates};
}

// Reporting-only source-age posture: distinguish original publisher calendar dates
// from clock-precision 24-hour evidence. Do not fabricate timestamps from dates.
export function summarizeArticleSourceRecency(bundle){
 const date=bundle?.edition_date;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Array.isArray(bundle.stories))
  throw Error('EDITORIAL_RECENCY_SOURCE_IDENTITY_REQUIRED');
 const day=Date.parse(date+'T00:00:00Z');
 const cutoffRaw=bundle?.editorial_provenance?.selection_locked_at;
 // A precise rolling window requires an actual recorded selection clock, not
 // a fabricated publication-hour approximation derived from a date string.
 const preciseCutoff=typeof cutoffRaw==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d\d:\d\d)$/.test(cutoffRaw)&&
   Number.isFinite(Date.parse(cutoffRaw))?Date.parse(cutoffRaw):null;
 const seen={calendar_0_to_1_days:0,calendar_2_to_3_days:0,
  calendar_4_to_7_days:0,older_than_7_calendar_days:0,unknown:0,
  precise_24h_original_timestamps:0,date_only_source_records:0};
 for(const story of bundle.stories){
  const published=story?.source?.published_at;
  if(typeof published!=='string'||!Number.isFinite(Date.parse(published))){
    seen.unknown++;continue;
  }
  const sourceDay=Date.parse(published.slice(0,10)+'T00:00:00Z');
  if(!Number.isFinite(sourceDay)||sourceDay>day){seen.unknown++;continue;}
  const delta=Math.round((day-sourceDay)/86400000);
  if(delta<=1)seen.calendar_0_to_1_days++;
  else if(delta<=3)seen.calendar_2_to_3_days++;
  else if(delta<=7)seen.calendar_4_to_7_days++;
  else seen.older_than_7_calendar_days++;
  if(/^\d{4}-\d{2}-\d{2}$/.test(published))seen.date_only_source_records++;
  else if(/^\d{4}-\d{2}-\d{2}T/.test(published)&&/[Zz]|[+-]\d\d:\d\d$/.test(published)){
    const at=Date.parse(published);
    if(preciseCutoff!==null&&at<=preciseCutoff&&preciseCutoff-at<=86400000)
      seen.precise_24h_original_timestamps++;
  }else seen.date_only_source_records++;
 }
 return {scope:'ORIGINAL_PUBLISHER_DATES_NOT_RETRIEVAL_TIMES',
  edition_date:date,stories:bundle.stories.length,counts:seen,
  original_timestamp_cutoff_at:preciseCutoff===null?null:new Date(preciseCutoff).toISOString(),
  priority_under_24h:'FIRST_PREFERENCE_WHEN_INDEPENDENTLY_VERIFIED',
  preferred_six_independent_article_publishers:true,
  recency_advisory:seen.calendar_0_to_1_days===0?'NO_NEAR_DAY_ORIGINALS_REVIEW_DISCOVERY':
    seen.older_than_7_calendar_days>0?'OLDER_THAN_SEVEN_DAY_SOURCE_FALLBACK_REVIEW':'DOCUMENTED_FALLBACKS_MAY_BE_NEEDED',
  date_only_cannot_prove_rolling_24h:true,
  never_downgrade_source_reading_or_article_novelty_gates:true};
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
  const publishedDates=fs.readdirSync(path.join(historyRoot,'briefs'),{withFileTypes:true})
    .filter(x=>x.isDirectory()&&DATE.test(x.name)&&x.name<date&&fs.existsSync(path.join(historyRoot,'briefs',x.name,'index.html')))
    .map(x=>x.name).sort().reverse();
  const historyDates=publishedDates.slice(0,lookback);
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
  const videoEditorialAudit=summarizeVideoEditorialContinuity({videos:bundle.videos,
    previousVideos:past.filter(x=>x.type==='video'&&x.date===historyDates[0]),
    editionDate:date,previousEditionDate:historyDates[0]});
  const duplicateMatches=[];
  for(let i=0;i<selected.length;i++){
    for(let j=0;j<i;j++)if(sameMedia(selected[i],selected[j]))
      duplicateMatches.push({item:selected[i].title,type:selected[i].type,prior_date:date,reason:'duplicate within edition'});
    for(const old of past)if(sameMedia(selected[i],old))
      duplicateMatches.push({item:selected[i].title,type:selected[i].type,prior_date:old.date,reason:'reused published media'});
  }
  if(duplicateMatches.length)throw new Error('MEDIA_REUSE_VIOLATION '+JSON.stringify(duplicateMatches));
  // Forward-only, because immutable Oct25 source bundles may still contain an
  // earlier superseded media selection. Do not retroactively invalidate them.
  const archiveUniqueness=date>=FULL_ARCHIVE_UNIQUENESS_EFFECTIVE?
    findFullArchiveRepeats({bundle,historyRoot,dates:publishedDates}):null;
  if(archiveUniqueness?.media_duplicates.length)
    throw new Error('MEDIA_REUSE_VIOLATION '+JSON.stringify(archiveUniqueness.media_duplicates));
  if(archiveUniqueness?.article_duplicates.length)
    throw new Error('ARTICLE_REUSE_VIOLATION '+JSON.stringify(archiveUniqueness.article_duplicates));
  // Oct 27+: reader learning value can repeat even with distinct original URLs.
  // Canonical archive summaries are compared at the existing two publish gates.
  // The machine hard stop is intentionally narrow; the editor also reviews
  // topical candidates whose meaning cannot be adjudicated by keywords.
  let editorialNovelty=null;
  if(date>=EDITORIAL_NOVELTY_EFFECTIVE){
    const archiveFile=path.join(historyRoot,'data','archive-index.json');
    if(!fs.existsSync(archiveFile))
      throw new Error('EDITORIAL_NOVELTY_HISTORY_REQUIRED: published archive-index.json missing');
    editorialNovelty=findEditorialValueOverlap({bundle,
      archive:JSON.parse(fs.readFileSync(archiveFile,'utf8')),
      priorEditionDates:historyDates});
    if(editorialNovelty.violations.length)
      throw new Error('EDITORIAL_NEAR_DUPLICATE_REQUIRES_RESELECTION '+
        JSON.stringify(editorialNovelty.violations));
  }
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
    full_archive_uniqueness:archiveUniqueness?{
      result:'PASS',checked_dates:archiveUniqueness.checked_dates,
      media_pages:archiveUniqueness.media_pages,
      article_pages:archiveUniqueness.article_pages
    }:null,
    video_editorial_audit:videoEditorialAudit,
    podcast_show_cooldown_editions:3,podcast_show_history_dates:showDates,
    selected_podcast_shows:selectedPodcasts.map(x=>({source:x.source,identity:podcastShowKeys(x)})),
    seven_edition_article_publisher_counts:Object.fromEntries(
      Object.entries(publisherHistory).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))),
    seven_edition_article_pages_identified:identified,
    seven_edition_article_history_complete:identified===historyDates.length*6,
    editorial_novelty:editorialNovelty,
    article_source_recency:summarizeArticleSourceRecency(bundle),
    six_independent_publishers_preferred:articleDiversity?.distinct_publishers===6,
    publisher_variety_advisory:articleDiversity?.distinct_publishers===6?'PREFERENCE_MET':'SIX_PUBLISHERS_PREFERRED_IF_QUALIFIED'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [bundleFile,historyRoot,receiptFile]=process.argv.slice(2);
  if(!bundleFile||!historyRoot)throw new Error('usage: verify-media-freshness.mjs <edition-bundle.json> <history-site-dir> [receipt.json]');
  const receipt=validateMediaFreshness({bundle:JSON.parse(fs.readFileSync(bundleFile,'utf8')),historyRoot});
  if(receiptFile){fs.mkdirSync(path.dirname(receiptFile),{recursive:true});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');}
  console.log(JSON.stringify(receipt));
}
