const base='https://daily-ai-brief-ratings.gtome.chatgpt.site';
const html=await (await fetch(base+'/')).text();
const refs=[...new Set([...html.matchAll(/(?:src|href)="([^"]+\.js[^"]*)"/g)].map(m=>m[1]))];
const needles=['unknown_item','invalid_comment','invalid_value','recorded','item_id','brief_date','allowed','registry','snapshot','private/comments','private/snapshots','route-handler:/api/comments','route-handler:/api/ratings'];
const findings=[];
for(const ref of refs){
  const text=await (await fetch(new URL(ref,base))).text();
  const hits={};
  for(const needle of needles){
    const positions=[];let from=0;
    while(true){const i=text.indexOf(needle,from);if(i<0)break;positions.push(i);from=i+needle.length;if(positions.length>=5)break;}
    if(positions.length)hits[needle]=positions.map(i=>text.slice(Math.max(0,i-500),Math.min(text.length,i+1200)));
  }
  if(Object.keys(hits).length)findings.push({ref,bytes:text.length,hits});
}
const routeText=await (await fetch(new URL(refs[0],base))).text();
const routes=[...new Set([...routeText.matchAll(/pattern:`(\/api\/[^\`]+)`/g)].map(m=>m[1]))].sort();
console.log(JSON.stringify({schema_version:'feedback-service-contract-bundle-probe-v2',routes,findings},null,2));
