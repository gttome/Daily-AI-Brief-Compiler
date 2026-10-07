const site='https://gttome.github.io/Daily-AI-Brief-Compiler';
const api='https://daily-ai-brief-ratings.gtome.chatgpt.site/api';
const origin='https://gttome.github.io';
const browserHeaders={'origin':origin,'referer':site+'/'};
const cases=[
  {label:'oct7-canonical',brief_date:'2026-10-07',item_id:'dab-story-2026-10-07-m01'},
  {label:'oct7-semantic-slug',brief_date:'2026-10-07',item_id:'dab-story-2026-10-07-dots-always-on-agents'},
  {label:'oct7-with-oct6-item',brief_date:'2026-10-07',item_id:'dab-story-2026-10-06-m01'},
  {label:'oct6-known',brief_date:'2026-10-06',item_id:'dab-story-2026-10-06-m01'}
];

async function request(url,options={}){
  const response=await fetch(url,options);
  const text=await response.text();
  let body;
  try{body=JSON.parse(text);}catch{body=text;}
  return {status:response.status,ok:response.ok,body};
}

const live=await request(site+'/data/watchlist.json',{headers:{'cache-control':'no-cache'}});
const watchGet=await request(api+'/watchlist',{headers:{...browserHeaders,'cache-control':'no-store'}});
const probes=[];
for(const c of cases){
  const comment=await request(api+'/comments',{
    method:'POST',
    headers:{...browserHeaders,'content-type':'application/json','x-operation-id':crypto.randomUUID()},
    body:JSON.stringify({brief_date:c.brief_date,item_id:c.item_id,body:''})
  });
  const rating=await request(api+'/ratings',{
    method:'POST',
    headers:{...browserHeaders,'content-type':'application/json','x-operation-id':crypto.randomUUID()},
    body:JSON.stringify({brief_date:c.brief_date,item_id:c.item_id,rating:0})
  });
  probes.push({...c,comment:{status:comment.status,body:comment.body},rating:{status:rating.status,body:rating.body}});
}
console.log(JSON.stringify({
  schema_version:'daily-compiler-feedback-contract-probe-v1',
  result:'OBSERVED',
  live_watchlist_data_status:live.status,
  watchlist_get_status:watchGet.status,
  probes,
  semantic_rework:0,
  accepted_image_regenerations:0,
  production_repo_mutations:0
},null,2));
