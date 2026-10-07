import crypto from 'node:crypto';

const api='https://daily-ai-brief-ratings.gtome.chatgpt.site/api';
const site='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const brief_date='2026-10-07';
const item_id='dab-story-2026-10-07-m01';
const baseHeaders={'origin':'https://gttome.github.io','referer':site,'content-type':'application/json'};

async function request(path,body){
  const response=await fetch(api+path,{
    method:'POST',
    mode:'cors',
    cache:'no-store',
    credentials:'omit',
    headers:{...baseHeaders,'x-operation-id':crypto.randomUUID()},
    body:JSON.stringify(body)
  });
  const text=await response.text();
  let data; try{data=JSON.parse(text);}catch{data=text;}
  return {status:response.status,ok:response.ok,body:data};
}

const event=await request('/events',{brief_date,item_id,metric:'views'});
const comment=await request('/comments',{
  brief_date,item_id,
  body:'Automated October 7 Compiler feedback registration probe. No action needed.'
});
const rating=await request('/ratings',{brief_date,item_id,rating:4});

console.log(JSON.stringify({
  schema_version:'daily-compiler-feedback-event-registration-probe-v1',
  result:'OBSERVED',
  brief_date,item_id,
  event,comment,rating,
  semantic_rework:0,
  accepted_image_regenerations:0,
  production_repo_mutations:0
},null,2));
