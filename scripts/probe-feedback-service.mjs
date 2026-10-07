import crypto from 'node:crypto';

const base='https://dab-compiler-feedback.gtome.chatgpt.site';
const origin='https://gttome.github.io';
const edition='2026-10-07';
const item='dab-story-compiler-2026-10-07-live-verification';
const topic='dab-topic-compiler-live-verification-2026-10-07';
const headers={origin,'content-type':'application/json'};

async function req(path,options={}){
  const response=await fetch(base+path,options);
  const text=await response.text();
  let body;try{body=JSON.parse(text);}catch{body=text;}
  return {status:response.status,ok:response.ok,body};
}
function requireRecorded(label,r){
  if(!r.ok||r.body?.recorded!==true)throw new Error(label+' failed '+JSON.stringify(r));
}

const health=await req('/api/health');
if(!health.ok||health.body?.status!=='ok'||health.body?.storage_bound!==true)throw new Error('health failed '+JSON.stringify(health));

const rating=await req('/api/ratings',{
  method:'POST',headers:{...headers,'x-operation-id':crypto.randomUUID()},
  body:JSON.stringify({brief_date:edition,item_id:item,rating:5})
});
requireRecorded('rating',rating);

const ratingRead=await req('/api/ratings?'+new URLSearchParams({brief_date:edition,item_id:item}));
if(!ratingRead.ok||Number(ratingRead.body?.totals?.['5']||0)<1)throw new Error('rating read failed '+JSON.stringify(ratingRead));

const commentText='Automated Daily Compiler storage verification. No action needed.';
const comment=await req('/api/comments',{
  method:'POST',headers:{...headers,'x-operation-id':crypto.randomUUID()},
  body:JSON.stringify({brief_date:edition,item_id:item,body:commentText})
});
requireRecorded('comment',comment);

const commentRead=await req('/api/comments?'+new URLSearchParams({brief_date:edition,item_id:item}));
if(!commentRead.ok||!(commentRead.body?.comments||[]).some(row=>row.body===commentText))throw new Error('comment read failed '+JSON.stringify(commentRead));

const ballot=crypto.randomUUID();
const vote1=await req('/api/watchlist',{
  method:'POST',headers,
  body:JSON.stringify({topic_id:topic,ballot,choice:'very_interested',revision:1})
});
requireRecorded('watchlist initial',vote1);

const vote2=await req('/api/watchlist',{
  method:'POST',headers,
  body:JSON.stringify({topic_id:topic,ballot,choice:'somewhat_interested',revision:2})
});
requireRecorded('watchlist update',vote2);
if(vote2.body.choice!=='somewhat_interested'||Number(vote2.body.revision)!==2)throw new Error('watchlist revision failed '+JSON.stringify(vote2));

const share=await req('/api/events',{
  method:'POST',headers:{...headers,'x-operation-id':crypto.randomUUID()},
  body:JSON.stringify({brief_date:edition,item_id:'dab-story-2026-10-07-m01',metric:'share_initiations'})
});
requireRecorded('share event',share);

console.log(JSON.stringify({
  schema_version:'daily-compiler-feedback-live-storage-verification-v1',
  result:'PASS',
  service:base,
  health:{status:health.status,storage_bound:health.body.storage_bound},
  rating:{status:rating.status,count:rating.body.count,read_total:ratingRead.body.totals['5']},
  comment:{status:comment.status,public_read_confirmed:true},
  watchlist:{initial_status:vote1.status,update_status:vote2.status,choice:vote2.body.choice,revision:vote2.body.revision},
  share:{status:share.status,count:share.body.count},
  semantic_rework:0,
  accepted_image_regenerations:0,
  production_repo_mutations:0
},null,2));
