import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const EFFECTIVE_DATE='2026-10-19';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const decode=s=>String(s??'').replace(/&(?:amp|quot|apos|lt|gt|#39);/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'"}[x]));
const normalText=s=>decode(s).toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,' ').trim();
const attr=(html,name)=>decode(html.match(new RegExp('(?:^|\\s)'+name+'="([^"]+)"','i'))?.[1]||'');
const sourceLink=html=>{
  const m=html.match(/<strong>(?:Source|Watch|Listen \/ watch):<\/strong>\s*<a\b[^>]*href="([^"]+)"/i);
  return decode(m?.[1]||'');
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
  const folder=path.join(root,type==='video'?'videos':'podcasts',date);
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
    return {type,date,title:pageTitle(html),url:sourceLink(html),file};
  }).filter(x=>x.title&&x.url);
}
export function validateMediaFreshness({bundle,historyRoot,lookback=7}){
  const date=bundle?.edition_date;
  if(typeof date!=='string'||!DATE.test(date))throw new Error('media freshness requires a dated sealed bundle');
  if(date<EFFECTIVE_DATE)return {result:'SKIPPED_HISTORICAL',date,duplicates:[],checked_dates:[]};
  if(!historyRoot||!fs.existsSync(path.join(historyRoot,'briefs')))
    throw new Error('media history unavailable: cannot certify freshness');
  const historyDates=fs.readdirSync(path.join(historyRoot,'briefs'),{withFileTypes:true})
    .filter(x=>x.isDirectory()&&DATE.test(x.name)&&x.name<date&&fs.existsSync(path.join(historyRoot,'briefs',x.name,'index.html')))
    .map(x=>x.name).sort().reverse().slice(0,lookback);
  if(!historyDates.length)throw new Error('no published predecessor to check for media repeats');
  const selected=[
    ...(bundle.videos||[]).map(x=>({type:'video',title:x.title,url:x.url,date})),
    ...(bundle.podcasts||[]).map(x=>({type:'podcast',title:x.title,url:x.url,date}))
  ];
  if(bundle.videos?.length!==2||bundle.podcasts?.length!==2||selected.some(x=>!x.title||!x.url))
    throw new Error('media freshness requires exactly two videos and two podcasts with identities');
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
  return {result:'PASS',date,checked_dates:historyDates,selected_count:selected.length,previous_count:past.length,duplicates:[]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [bundleFile,historyRoot,receiptFile]=process.argv.slice(2);
  if(!bundleFile||!historyRoot)throw new Error('usage: verify-media-freshness.mjs <edition-bundle.json> <history-site-dir> [receipt.json]');
  const receipt=validateMediaFreshness({bundle:JSON.parse(fs.readFileSync(bundleFile,'utf8')),historyRoot});
  if(receiptFile){fs.mkdirSync(path.dirname(receiptFile),{recursive:true});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');}
  console.log(JSON.stringify(receipt));
}
