const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const rootRes=await fetch(base+'/',{headers:{'origin':'https://gttome.github.io','referer':'https://gttome.github.io/Daily-AI-Brief-Compiler/'}});
const html=await rootRes.text();
const urls=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)[^"]*)"/g)].map(m=>m[1]);
const jsUrls=[...new Set(urls.filter(x=>x.includes('.js')))];
const findings=[];
for(const u of jsUrls){
  const r=await fetch(new URL(u,base));
  const text=await r.text();
  const matches=[];
  for(const term of ['unknown_item','api/ratings','api/comments','api/watchlist','register','registry','item_id','brief_date','comments','ratings']){
    let i=text.indexOf(term);
    if(i>=0)matches.push({term,snippet:text.slice(Math.max(0,i-350),Math.min(text.length,i+1200))});
  }
  findings.push({url:u,status:r.status,length:text.length,matches});
}
console.log(JSON.stringify({schema_version:'feedback-service-client-surface-v1',root_status:rootRes.status,js_urls:jsUrls,findings},null,2));
