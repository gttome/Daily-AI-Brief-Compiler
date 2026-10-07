import crypto from 'node:crypto';

const site='https://gttome.github.io/Daily-AI-Brief-Compiler';
const api='https://daily-ai-brief-ratings.gtome.chatgpt.site/api';
const origin='https://gttome.github.io';
const edition='2026-10-07';
const item='dab-story-2026-10-07-m01';
const preferredTopic='dab-topic-trusted-enterprise-context';

const fail=(message,detail)=>{throw new Error(message+(detail?' :: '+detail:''));};
async function request(url,options={}){
  const response=await fetch(url,options);
  const text=await response.text();
  let body;
  try{body=JSON.parse(text);}catch{body=text;}
  return {status:response.status,ok:response.ok,body,headers:Object.fromEntries(response.headers)};
}
const browserHeaders={'origin':origin,'referer':site+'/'};

const watchlistLive=await request(site+'/data/watchlist.json',{headers:{'cache-control':'no-cache'}});
if(!watchlistLive.ok)fail('live Watchlist data unavailable',JSON.stringify(watchlistLive));
const topics=watchlistLive.body?.topics||[];
const topic=(topics.find(t=>t.topic_id===preferredTopic)||topics.find(t=>t.status!=='archived'))?.topic_id;
if(!topic)fail('no active live Watchlist topic found');

const before=await request(api+'/watchlist',{headers:{...browserHeaders,'cache-control':'no-store'}});
if(!before.ok)fail('Watchlist GET failed',JSON.stringify(before));

const ballot=crypto.randomUUID();
const firstChoice='very_interested';
const first=await request(api+'/watchlist',{
  method:'POST',
  headers:{...browserHeaders,'content-type':'application/json'},
  body:JSON.stringify({topic_id:topic,ballot,choice:firstChoice,revision:1})
});
if(!first.ok||first.body?.recorded!==true)fail('valid Watchlist POST failed',JSON.stringify(first));
if(first.body.choice!==firstChoice)fail('Watchlist response choice mismatch',JSON.stringify(first));

const secondChoice='somewhat_interested';
const second=await request(api+'/watchlist',{
  method:'POST',
  headers:{...browserHeaders,'content-type':'application/json'},
  body:JSON.stringify({topic_id:topic,ballot,choice:secondChoice,revision:2})
});
if(!second.ok||second.body?.recorded!==true)fail('Watchlist revision POST failed',JSON.stringify(second));
if(second.body.choice!==secondChoice)fail('Watchlist revision choice mismatch',JSON.stringify(second));
if(Number(second.body.revision)!==2)fail('Watchlist revision mismatch',JSON.stringify(second));

const commentOperation=crypto.randomUUID();
const commentText='Automated October 7 Compiler reader interaction verification. No action needed.';
const comment=await request(api+'/comments',{
  method:'POST',
  headers:{...browserHeaders,'content-type':'application/json','x-operation-id':commentOperation},
  body:JSON.stringify({brief_date:edition,item_id:item,body:commentText})
});
if(!comment.ok||comment.body?.recorded!==true)fail('valid private comment POST failed',JSON.stringify(comment));

const ratingOperation=crypto.randomUUID();
const rating=await request(api+'/ratings',{
  method:'POST',
  headers:{...browserHeaders,'content-type':'application/json','x-operation-id':ratingOperation},
  body:JSON.stringify({brief_date:edition,item_id:item,rating:5})
});
if(!rating.ok||rating.body?.recorded!==true)fail('valid story rating POST failed',JSON.stringify(rating));

const ratingGet=await request(api+'/ratings?brief_date='+encodeURIComponent(edition)+'&item_id='+encodeURIComponent(item),{
  headers:{...browserHeaders,'cache-control':'no-store'}
});
if(!ratingGet.ok)fail('rating GET after POST failed',JSON.stringify(ratingGet));

const receipt={
  schema_version:'daily-compiler-feedback-service-probe-v1',
  result:'PASS',
  edition_date:edition,
  live_site:site,
  topic_id:topic,
  watchlist:{
    initial_post:{status:first.status,recorded:first.body.recorded,choice:first.body.choice,revision:first.body.revision},
    change_post:{status:second.status,recorded:second.body.recorded,choice:second.body.choice,revision:second.body.revision}
  },
  comment:{status:comment.status,recorded:comment.body.recorded,item_id:item},
  rating:{status:rating.status,recorded:rating.body.recorded,item_id:item},
  rating_get:{status:ratingGet.status},
  semantic_rework:0,
  accepted_image_regenerations:0,
  production_repo_mutations:0
};
console.log(JSON.stringify(receipt,null,2));
