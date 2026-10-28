#!/usr/bin/env node
// Zero-paid, bounded first-party editorial item-index inspection.
// Distinct from route reachability, full article reading, video playback and
// final source admission. Never auto-enable disabled sources or reseal a bundle.
import fs from 'node:fs';
import path from 'node:path';
import {buildEditorialSourceCensus,recordEditorialSourceObservation,
  validateEditorialSourceCensus} from '../operations/source-item-census.mjs';

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const clean=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
 .replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
 .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
 .replace(/\s+/g,' ').trim();
function dateIso(value){
 const t=Date.parse(value);
 return Number.isFinite(t)?new Date(t).toISOString():null;
}
function attr(tag,key){
 const m=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]+)"|\\x27([^\\x27]+)\\x27)','i'));
 return m?.[1]||m?.[2]||null;
}
function tagText(xml,name){
 const re=new RegExp('<(?:\\w+:)?'+name+'\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?'+name+'>','i');
 return xml.match(re)?.[1]||'';
}
function itemFromXml(fragment,base){
 const title=clean(tagText(fragment,'title'));
 const linkTag=fragment.match(/<link\b[^>]*\/?>/i)?.[0]||'';
 const link=attr(linkTag,'href')||clean(tagText(fragment,'link'));
 const date=dateIso(clean(tagText(fragment,'pubDate')||tagText(fragment,'published')||tagText(fragment,'date')));
 return {title,url:link,date};
}
function itemFromHtml(fragment){
 const time=fragment.match(/<time\b[^>]*>/i)?.[0]||'';
 const date=dateIso(attr(time,'datetime')||null);
 const anchors=[...fragment.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi)];
 const useful=anchors.map(x=>({url:x[1]||x[2],title:clean(x[3])})).find(x=>x.title.length>=8);
 return {title:useful?.title,url:useful?.url,date};
}
export function extractDatedCandidates(body,{baseUrl,now,limit=15,maxAgeHours=168}){
 const nowMs=Date.parse(now);if(!Number.isFinite(nowMs))throw Error('invalid observation clock');
 const raw=String(body||''),xmlItems=[...raw.matchAll(/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)>/gi)];
 const fragments=xmlItems.length?xmlItems.map(x=>itemFromXml(x[0],baseUrl)):
   [...raw.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)].map(x=>itemFromHtml(x[0]));
 const items=[],seen=new Set();
 const base=new URL(baseUrl),host=base.hostname.toLowerCase().replace(/^www\./,'');
 for(const item of fragments){
  if(!item.title||item.title.length<8||!item.url||!item.date)continue;
  const age=nowMs-Date.parse(item.date);
  if(age<0||age>maxAgeHours*3600000)continue;
  let url;
  try{url=new URL(item.url.replace(/&amp;/g,'&'),base);
    const itemHost=url.hostname.toLowerCase().replace(/^www\./,'');
    if(url.protocol!=='https:'||url.username||url.password||
      !(itemHost===host||itemHost.endsWith('.'+host)))continue;
    url.hash='';
  }catch{continue;}
  if(seen.has(url.href))continue;seen.add(url.href);
  items.push({url:url.href,title:item.title,original_date:item.date});
  if(items.length>=limit)break;
 }
 return items;
}
async function boundedGet(url,{timeoutMs=5000,maxBytes=1048576,fetchImpl=fetch}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const r=await fetchImpl(url,{method:'GET',redirect:'follow',signal:controller.signal,
   headers:{'user-agent':'Daily-AI-Brief-Compiler-editorial-index-audit/1.0 (public-read-only)',
     'accept':'application/rss+xml,application/atom+xml,application/xml,text/html;q=0.8'}});
  const resolved=new URL(r.url||url),requested=new URL(url);
  if(resolved.protocol!=='https:'||resolved.hostname.replace(/^www\./,'')!==
     requested.hostname.replace(/^www\./,''))throw Error('cross publisher redirect not independently verified');
  if(!r.ok)return {status:r.status,text:null};
  const contentType=r.headers.get('content-type')||'';
  if(!/(?:html|xml|rss|atom|text\/plain)/i.test(contentType))
    throw Error('index did not return HTML/RSS/Atom text');
  const reader=r.body?.getReader();
  if(!reader)throw Error('response body unavailable');
  const chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;
   size+=part.value.length;if(size>maxBytes){await reader.cancel();throw Error('source index exceeds 1 MiB');}
   chunks.push(part.value);
  }
  return {status:r.status,text:Buffer.concat(chunks).toString('utf8')};
 }finally{clearTimeout(timer);}
}
export async function inspectEditorialIndex(row,{now=new Date().toISOString(),fetchImpl=fetch}={}){
 let outcome='SOURCE_ERROR',items=[],reason='';
 const isPodcast=row.roles.includes('podcast'),isVideo=row.roles.includes('video');
 let evidence_method=isPodcast?'podcast_show':isVideo?'video_channel':'publisher_index';
 try{
  const response=await boundedGet(row.url,{fetchImpl});
  if([401,403,407,429,451].includes(response.status)){
    outcome='ACCESS_BLOCKED';reason='Original publisher index refused a public reading with HTTP '+response.status+'; no item is qualified.';
  }else if(response.status!==200){
    outcome='SOURCE_ERROR';reason='Original publisher index returned HTTP '+response.status+'; no editorial claim is made.';
  }else{
    evidence_method=/<(?:rss|feed)\b/i.test(response.text)?'rss_or_atom':evidence_method;
    items=extractDatedCandidates(response.text,{baseUrl:row.url,now});
    outcome=items.length?'CANDIDATES_FOUND':'NO_ELIGIBLE_ITEMS';
    reason=items.length?
      'Visited first-party index; found '+items.length+' linked items with explicit original dates within 168 hours; content and media are not verified.':
      'Visited first-party index but found no qualifying dated first-party linked item within 168 hours; this is not a full-content assessment.';
  }
 }catch(e){reason='Could not inspect original publisher index: '+String(e?.message||e).slice(0,220)+'; no items qualified.';}
 return {resource_id:row.resource_id,outcome,checked_at:now,source_index_url:row.url,evidence_method,items,reason};
}
async function run(){
 const [edition_date,execution_id,outputPath,registryPath='config/resource-registry.json']=process.argv.slice(2);
 if(!DATE.test(edition_date||'')||!execution_id||!outputPath)
  throw Error('usage: qualify-editorial-source-items.mjs YYYY-MM-DD execution-id output.json [registry.json]');
 const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 if(fs.existsSync(outputPath)){
  const previous=JSON.parse(fs.readFileSync(outputPath,'utf8'));
  if(previous.edition_date===edition_date&&previous.execution_id===execution_id&&
    previous.counts?.all_sources_attempted===true){
   validateEditorialSourceCensus(registry,previous,{requireAllVisited:true});
   console.log(JSON.stringify({result:'ALREADY_INSPECTED_NO_REWORK',counts:previous.counts}));return;
  }
 }
 const census=buildEditorialSourceCensus(registry,{edition_date,execution_id,created_at:new Date().toISOString()});
 const rows=[...census.resources];let cursor=0;const concurrency=6;
 async function worker(){
  while(cursor<rows.length){
   const row=rows[cursor++];
   const observation=await inspectEditorialIndex(row);
   recordEditorialSourceObservation(census,observation);
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,rows.length)},()=>worker()));
 const checked=validateEditorialSourceCensus(registry,census,{requireAllVisited:true});
 fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});
 fs.writeFileSync(outputPath,JSON.stringify(census,null,2)+'\n');
 console.log(JSON.stringify({result:checked.result,edition_date,counts:census.counts,
  limitation:'Index candidates only; real story source reading, media playback and disabled-source activation remain separate.'}));
}
if(process.argv[1]?.endsWith('/qualify-editorial-source-items.mjs'))
 run().catch(e=>{console.error(e);process.exitCode=1;});
