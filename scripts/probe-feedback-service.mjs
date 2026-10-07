import crypto from 'node:crypto';

const api='https://daily-ai-brief-ratings.gtome.chatgpt.site/api';
const headers={
  'origin':'https://gttome.github.io',
  'referer':'https://gttome.github.io/Daily-AI-Brief-Compiler/',
  'content-type':'application/json'
};
const brief_date='2026-10-07';
const item_id='dab-story-2026-10-06-m01';

async function request(url,options={}){
  const response=await fetch(url,options);
  const text=await response.text();
  let body; try{body=JSON.parse(text);}catch{body=text;}
  return {status:response.status,ok:response.ok,body};
}
const comment=await request(api+'/comments',{
  method:'POST',
  headers:{...headers,'x-operation-id':crypto.randomUUID()},
  body:JSON.stringify({brief_date,item_id,body:'Automated Compiler cross-date registry probe. No action needed.'})
});
const rating=await request(api+'/ratings',{
  method:'POST',
  headers:{...headers,'x-operation-id':crypto.randomUUID()},
  body:JSON.stringify({brief_date,item_id,rating:4})
});
console.log(JSON.stringify({
  schema_version:'daily-compiler-feedback-cross-date-probe-v1',
  result:'OBSERVED',
  brief_date,
  backend_item_id:item_id,
  comment:{status:comment.status,body:comment.body},
  rating:{status:rating.status,body:rating.body},
  semantic_rework:0,
  accepted_image_regenerations:0,
  production_repo_mutations:0
},null,2));
