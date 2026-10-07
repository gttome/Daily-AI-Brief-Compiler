import crypto from 'node:crypto';

const site='https://gttome.github.io/Daily-AI-Brief-Compiler';
const api='https://daily-ai-brief-ratings.gtome.chatgpt.site/api';
const origin='https://gttome.github.io';
const headers={'origin':origin,'referer':site+'/'};
const candidates=[
  {label:'oct7-canonical',brief_date:'2026-10-07',item_id:'dab-story-2026-10-07-m01'},
  {label:'oct7-semantic-slug',brief_date:'2026-10-07',item_id:'dab-story-2026-10-07-dots-always-on-agents'},
  {label:'oct6-control',brief_date:'2026-10-06',item_id:'dab-story-2026-10-06-m01'}
];

async function request(url,options={}){
  const response=await fetch(url,options);
  const text=await response.text();
  let body; try{body=JSON.parse(text);}catch{body=text;}
  return {status:response.status,ok:response.ok,body};
}

const commentAttempts=[];
let commentSuccess=null;
for(const c of candidates){
  const operation=crypto.randomUUID();
  const r=await request(api+'/comments',{
    method:'POST',
    headers:{...headers,'content-type':'application/json','x-operation-id':operation},
    body:JSON.stringify({brief_date:c.brief_date,item_id:c.item_id,body:'Automated Compiler reader verification. No action needed.'})
  });
  commentAttempts.push({...c,status:r.status,body:r.body});
  if(r.ok&&r.body?.recorded===true){commentSuccess={...c,status:r.status};break;}
}

const ratingAttempts=[];
let ratingSuccess=null;
for(const c of candidates){
  const operation=crypto.randomUUID();
  const r=await request(api+'/ratings',{
    method:'POST',
    headers:{...headers,'content-type':'application/json','x-operation-id':operation},
    body:JSON.stringify({brief_date:c.brief_date,item_id:c.item_id,rating:5})
  });
  ratingAttempts.push({...c,status:r.status,body:r.body});
  if(r.ok&&r.body?.recorded===true){ratingSuccess={...c,status:r.status};break;}
}

console.log(JSON.stringify({
  schema_version:'daily-compiler-feedback-valid-post-probe-v1',
  result:'OBSERVED',
  commentAttempts,
  commentSuccess,
  ratingAttempts,
  ratingSuccess,
  semantic_rework:0,
  accepted_image_regenerations:0,
  production_repo_mutations:0
},null,2));
