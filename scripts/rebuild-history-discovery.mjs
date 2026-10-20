import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Reconcile discoverability only after the immutable prior pages have been copied.
// Never regenerate editorial content, permanent pages, premium images or release jobs.
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const XML_BASE='https://gttome.github.io/Daily-AI-Brief-Compiler';
const decode=s=>String(s??'').replace(/&(?:amp|quot|apos|lt|gt|#39|#x27|#\d+);/gi,entity=>{
  const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'"};
  const k=entity.toLowerCase();
  return named[k]??(/&#\d+;/i.test(k)?String.fromCodePoint(Number(k.slice(2,-1))):entity);
});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clearHtml=s=>decode(String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
const dateAsHuman=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
const read=file=>fs.readFileSync(file,'utf8');
const write=(file,value)=>fs.writeFileSync(file,String(value).endsWith('\n')?value:value+'\n','utf8');
function editionDates(site){
  const dir=path.join(site,'briefs');
  if(!fs.existsSync(dir))throw new Error('published Brief directory missing');
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&DATE.test(e.name)&&fs.existsSync(path.join(dir,e.name,'index.html')))
    .map(e=>e.name).sort().reverse();
}
function pageFiles(dir){
  if(!fs.existsSync(dir))return [];
  const out=[];
  const walk=p=>{for(const e of fs.readdirSync(p,{withFileTypes:true})){
    const f=path.join(p,e.name);
    if(e.isDirectory())walk(f);else if(e.name==='index.html')out.push(f);
  }};
  walk(dir);return out;
}
function pageDetails(site,file,type,date){
  const html=read(file);
  const match=(re)=>decode(html.match(re)?.[1]||'');
  const title=clearHtml(match(/<h1 class="project-name">([\s\S]*?)<\/h1>/i)||
    match(/<meta property="og:title" content="([^"]+)"/i)||
    match(/<title>([^<]+)<\/title>/i).split(' | ')[0]);
  const summary=clearHtml(match(/<p><strong>Summary:<\/strong>\s*([\s\S]*?)<\/p>/i)||
    match(/<meta name="description" content="([^"]+)"/i));
  const id=match(/<body[^>]*\bdata-story-id="([^"]+)"/i)||
    match(/<span class="story-data" data-story-id="([^"]+)"/i);
  const source=clearHtml(match(/<p><strong>(?:Source|Listen \/ watch):<\/strong>\s*<a [^>]*>([\s\S]*?)<\/a>/i));
  const topics=clearHtml(match(/<strong>Topics:<\/strong>\s*([^<]+)/i)).split(/,\s*/).filter(Boolean);
  const eventLabel=clearHtml(match(/<strong>Date:<\/strong>\s*([^<]+)/i));
  const eventParsed=Date.parse(eventLabel),event_date=Number.isFinite(eventParsed)?new Date(eventParsed).toISOString().slice(0,10):date;
  const relative=path.relative(site,file).split(path.sep).join('/');
  const url='/'+relative.slice(0,-'index.html'.length);
  const generatedId='dab-archive-'+type.toLowerCase()+'-'+date+'-'+path.basename(path.dirname(file));
  if(!title||!summary)return null; // Never create a false searchable record from an unreadable page.
  return {
    content_type:type,story_id:id||generatedId,brief_date:date,event_date,headline:title,url,
    focus:'historical_unspecified',topics,companies:source?[source]:[],
    evidence_type:'historical_unspecified',availability_status:'available',trends:[],summary
  };
}
function replaceSection(html,start,end,content){
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error('canonical archive HTML layout changed near '+start);
  return html.slice(0,a+start.length)+'\n'+content+'\n'+html.slice(b);
}
function archiveMarkup(site,dates,records){
  const file=path.join(site,'briefs-archive','index.html');
  let html=read(file);
  const label={technical_ai_engineering:'Technical AI Engineering',applied_genai_knowledge_workers:'Applied Generative AI for Knowledge Workers',agents_non_technical_people:'Agents for Everyone',historical_unspecified:'Earlier edition'};
  const items=records.map(x=>
    '<article class="archive-story"><p class="archive-story-meta"><span class="archive-type">'+esc(x.content_type||'Article')+
    '</span> '+esc(dateAsHuman(x.brief_date))+' · '+esc(label[x.focus]||String(x.focus||'Earlier edition'))+
    '</p><h2><a href="/Daily-AI-Brief-Compiler'+esc(x.url)+'" data-item-id="'+esc(x.story_id)+
    '" data-edition-date="'+esc(x.brief_date)+'" data-action="permanent_page_clicks">'+esc(x.headline)+
    '</a></h2><p>'+esc(x.summary)+'</p><a class="archive-edition-link" href="/Daily-AI-Brief-Compiler/briefs/'+esc(x.brief_date)+
    '/">Read the complete '+esc(dateAsHuman(x.brief_date))+' edition →</a></article>').join('\n');
  html=replaceSection(html,'<div id="archive-results" class="archive-results">',
    '</div>\n</section>\n<noscript>',items);
  const editions=dates.map(date=>
    '<article class="archive-story" data-archive-edition="'+date+'"><h3><a href="/Daily-AI-Brief-Compiler/briefs/'+
    date+'/">'+esc(dateAsHuman(date))+'</a></h3><p>Open the complete preserved edition, including its editorial context and media availability notes.</p>'+
    '<button type="button" data-archive-show-date="'+date+'" hidden>Show archived items from this edition</button></article>').join('\n');
  html=replaceSection(html,'<div id="archive-editions">',
    '</div>\n<p id="archive-editions-empty"',editions);
  html=html.replace(/(<p id="archive-result-count"[^>]*>)[^<]*/,'$1'+records.length+' items');
  html=html.replace(/(<p id="archive-edition-count"[^>]*>)[^<]*/,'$1'+dates.length+' complete editions');
  write(file,html);
}
function feedRecords(site,dates,rows){
  const jsonFile=path.join(site,'feed.json'),data=JSON.parse(read(jsonFile));
  const map=new Map((data.items||[]).map(x=>[String(x.id),x]));
  const base=(data.home_page_url||XML_BASE+'/').replace(/\/+$/,'');
  for(const row of rows)if(!map.has(row.story_id)){
    // A recovered page has an edition date, not a proven clock time;
    // leave date_published absent rather than inventing a timestamp.
    const item={id:row.story_id,url:base+row.url,title:row.headline,summary:row.summary,
      tags:[...(row.topics||[]),...(row.companies||[])]};
    const sourcePage=path.join(site,row.url.slice(1),'index.html');
    if(fs.existsSync(sourcePage)){
      const img=read(sourcePage).match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
      if(img)item.image=decode(img);
    }
    map.set(row.story_id,item);
  }
  const dateOf=item=>{
    const fromUrl=String(item.url||'').match(/\/(?:stories|videos|podcasts)\/(\d{4}-\d{2}-\d{2})\//);
    return fromUrl?.[1]||'0000-00-00';
  };
  data.items=[...map.values()].sort((a,b)=>dateOf(b).localeCompare(dateOf(a))||String(a.id).localeCompare(String(b.id)));
  write(jsonFile,JSON.stringify(data,null,2));
  const atomFile=path.join(site,'feed.xml');
  const atom=read(atomFile),entryPattern=/<entry>[\s\S]*?<\/entry>/g;
  const oldEntries=[...atom.matchAll(entryPattern)].map(x=>x[0]),byId=new Map();
  for(const entry of oldEntries){
    const id=decode(entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]||'');
    if(id)byId.set(id,entry);
  }
  for(const row of rows)if(!byId.has(row.story_id)){
    byId.set(row.story_id,
      '  <entry>\n    <title>'+esc(row.headline)+'</title>\n    <id>'+esc(row.story_id)+
      '</id>\n    <link href="'+esc(base+row.url)+'" />\n    <updated>'+row.brief_date+
      'T00:00:00Z</updated>\n    <summary>'+esc(row.summary)+'</summary>\n  </entry>');
  }
  const cutoff=atom.indexOf('<entry>'),closing=atom.lastIndexOf('</feed>');
  if(closing<0)throw new Error('Atom feed closing tag missing');
  const before=(cutoff<0?atom.slice(0,closing):atom.slice(0,cutoff)).trimEnd();
  const entries=[...byId].sort((a,b)=>{
    const date=id=>id.match(/20\d{2}-\d{2}-\d{2}/)?.[0]||'0000-00-00';
    return date(b[0]).localeCompare(date(a[0]))||a[0].localeCompare(b[0]);
  }).map(x=>x[1]);
  write(atomFile,before+'\n'+entries.join('\n')+'\n</feed>');
  const dailyFile=path.join(site,'daily-feed.xml'),daily=read(dailyFile);
  const start=daily.indexOf('<item>'),end=daily.lastIndexOf('</channel>');
  if(end<0)throw new Error('Daily RSS closing tag missing');
  const intro=(start<0?daily.slice(0,end):daily.slice(0,start)).trimEnd();
  const dateItems=dates.map(date=>{
    const link=base+'/briefs/'+date+'/?dab_source=rss';
    const edition=base+'/briefs/'+date+'/';
    const desc='<p>Your Daily AI Brief for '+date+' is ready.</p><p><a href="'+link+'">Read this complete edition</a> · <a href="'+base+'/?dab_source=rss">Latest brief</a> · <a href="'+base+'/briefs-archive/">Browse archive</a></p>';
    return '<item><title>Daily AI Brief — '+date+'</title><link>'+esc(link)+'</link>'+
      '<guid isPermaLink="true">'+esc(edition)+'</guid><description>'+esc(desc)+'</description></item>';
  });
  write(dailyFile,intro+'\n'+dateItems.join('\n')+'\n</channel></rss>');
  return {json_items:data.items.length,atom_items:byId.size,daily_editions:dateItems.length};
}
export function rebuildHistoryDiscovery(site,receiptFile=null){
  const dates=editionDates(site);
  const indexFile=path.join(site,'data','archive-index.json');
  const source=JSON.parse(read(indexFile)),priorDateCount=new Set((source.stories||[]).map(x=>x.brief_date)).size;
  const recordByUrl=new Map();
  for(const row of source.stories||[]){
    if(!DATE.test(row.brief_date)||typeof row.url!=='string'||!row.url.startsWith('/'))continue;
    const target=path.join(site,row.url.slice(1),'index.html');
    if(fs.existsSync(target))recordByUrl.set(row.url,row);
  }
  let recovered=0,unreadable=0,visited=0;
  for(const type of ['Article','Video','Podcast']){
    const dirName={Article:'stories',Video:'videos',Podcast:'podcasts'}[type];
    for(const date of dates){
      const directory=path.join(site,dirName,date);
      for(const file of pageFiles(directory)){
        visited++;
        const url='/'+path.relative(site,file).split(path.sep).join('/').slice(0,-'index.html'.length);
        if(recordByUrl.has(url))continue;
        const row=pageDetails(site,file,type,date);
        if(!row){unreadable++;continue;}
        recordByUrl.set(url,row);recovered++;
      }
    }
  }
  const records=[...recordByUrl.values()]
    .sort((a,b)=>b.brief_date.localeCompare(a.brief_date)||
      String(a.content_type).localeCompare(String(b.content_type))||
      String(a.story_id).localeCompare(String(b.story_id)));
  const ids=new Set();
  for(const row of records){
    if(ids.has(row.story_id))throw new Error('duplicate archive item identity '+row.story_id);
    ids.add(row.story_id);
  }
  source.stories=records;
  source.generated_from='canonical-current-index-and-all-preserved-permanent-pages';
  write(indexFile,JSON.stringify(source,null,2));
  archiveMarkup(site,dates,records);
  const feeds=feedRecords(site,dates,records);
  const archiveHtml=read(path.join(site,'briefs-archive','index.html'));
  const daily=read(path.join(site,'daily-feed.xml'));
  for(const date of dates){
    if(!archiveHtml.includes('data-archive-edition="'+date+'"'))throw new Error('missing archive card '+date);
    if(!daily.includes('<title>Daily AI Brief — '+date+'</title>'))throw new Error('missing daily feed '+date);
  }
  const receipt={schema_version:'daily-compiler-history-discovery-v1',result:'PASS',
    edition_count:dates.length,edition_dates:dates,original_index_edition_count:priorDateCount,
    discovered_item_count:records.length,recovered_items:recovered,permanent_pages_scanned:visited,
    pages_without_metadata:unreadable,...feeds,archive_and_feeds_rewritten:true,
    preserved_editorial_and_image_bytes:true};
  if(receiptFile){fs.mkdirSync(path.dirname(receiptFile),{recursive:true});write(receiptFile,JSON.stringify(receipt,null,2));}
  return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(!process.argv[2])throw new Error('usage: rebuild-history-discovery.mjs <merged-site-dir> [receipt-file]');
  console.log(JSON.stringify(rebuildHistoryDiscovery(process.argv[2],process.argv[3]||null)));
}
