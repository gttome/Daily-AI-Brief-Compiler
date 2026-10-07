const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const html=await (await fetch(base+'/')).text();
const refs=[...html.matchAll(/(?:src|href)="([^"]+\.js[^"]*)"/g)].map(m=>m[1]);
const unique=[...new Set(refs)];
const findings=[];
for(const ref of unique){
  const url=new URL(ref,base).href;
  const r=await fetch(url);
  const text=await r.text();
  const needles=['/api/','unknown_item','comments','ratings','watchlist','item_id','brief_date','register'];
  const hits={};
  for(const needle of needles){
    const i=text.indexOf(needle);
    if(i>=0)hits[needle]=text.slice(Math.max(0,i-240),Math.min(text.length,i+520));
  }
  if(Object.keys(hits).length)findings.push({ref,status:r.status,bytes:text.length,hits});
}
console.log(JSON.stringify({
  schema_version:'feedback-service-client-bundle-probe-v1',
  script_refs:unique,
  findings
},null,2));
