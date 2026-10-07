import crypto from 'node:crypto';

const api='https://daily-ai-brief-ratings.gtome.chatgpt.site/api';
const namespace='daily-compiler-shadow';
const brief_date='2026-10-07';
const item_id='dab-story-2026-10-07-m01';
const baseHeaders={'origin':'https://gttome.github.io','referer':'https://gttome.github.io/Daily-AI-Brief-Compiler/','content-type':'application/json'};

async function post(path,body){
  const response=await fetch(api+path+'?namespace='+encodeURIComponent(namespace),{
    method:'POST',credentials:'omit',cache:'no-store',
    headers:{...baseHeaders,'x-operation-id':crypto.randomUUID()},
    body:JSON.stringify({...body,namespace})
  });
  const text=await response.text();
  let data;try{data=JSON.parse(text);}catch{data=text;}
  return {status:response.status,ok:response.ok,body:data};
}

const comment=await post('/comments',{brief_date,item_id,body:'Automated Compiler namespace verification. No action needed.'});
const rating=await post('/ratings',{brief_date,item_id,rating:4});
console.log(JSON.stringify({
  schema_version:'daily-compiler-feedback-namespace-probe-v1',
  result:'OBSERVED',namespace,brief_date,item_id,comment,rating,
  semantic_rework:0,accepted_image_regenerations:0,production_repo_mutations:0
},null,2));
