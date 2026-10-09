import fs from 'node:fs';
import crypto from 'node:crypto';

const baseUrl=process.argv[2];
const editionDate=process.argv[3];
const sourceDir=process.argv[4] || 'build/reader-source';
const siteDir=process.argv[5] || 'build/shadow';
const receiptPath=process.argv[6] || 'build/live-verification.json';
if(!baseUrl || !editionDate) throw new Error('usage: node scripts/verify-live.mjs <base-url> <edition-date> [source-dir] [site-dir] [receipt]');

const manifest=JSON.parse(fs.readFileSync(sourceDir+'/build-manifest.json','utf8'));
if(manifest.edition_date!==editionDate) throw new Error('edition mismatch');

const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fetchOk=async url=>{
  const res=await fetch(url,{headers:{'cache-control':'no-cache'}});
  if(!res.ok) throw new Error(url+' returned '+res.status);
  return res;
};

async function probeFeedbackStore(){
  const api=manifest.feedback?.base_url;
  if(!api)throw new Error('Compiler feedback store missing from manifest');
  const origin='https://gttome.github.io';
  const probeItem='dab-story-compiler-'+editionDate+'-verification-probe';
  const probeTopic='dab-topic-compiler-verification-'+editionDate;
  const post=async(path,body,operation)=>{
    const headers={'content-type':'application/json','origin':origin};
    if(operation)headers['x-operation-id']=operation;
    const response=await fetch(api+path,{method:'POST',headers,body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload.recorded!==true)throw new Error('feedback probe '+path+' failed '+response.status+' '+JSON.stringify(payload));
    return payload;
  };
  const ratingOperation=crypto.randomUUID();
  await post('/api/ratings',{brief_date:editionDate,item_id:probeItem,rating:5},ratingOperation);
  const ratingRead=await fetch(api+'/api/ratings?'+new URLSearchParams({brief_date:editionDate,item_id:probeItem}),{headers:{origin}});
  const ratingPayload=await ratingRead.json();
  if(!ratingRead.ok||Number(ratingPayload.totals?.['5']||0)<1)throw new Error('feedback rating persistence not observable');

  const commentText='Automated Daily Compiler live verification.';
  await post('/api/comments',{brief_date:editionDate,item_id:probeItem,body:commentText},crypto.randomUUID());
  const commentRead=await fetch(api+'/api/comments?'+new URLSearchParams({brief_date:editionDate,item_id:probeItem}),{headers:{origin}});
  const commentPayload=await commentRead.json();
  if(!commentRead.ok||!(commentPayload.comments||[]).some(row=>row.body===commentText))throw new Error('feedback comment persistence not observable');

  const ballot=crypto.randomUUID();
  await post('/api/watchlist',{topic_id:probeTopic,ballot,choice:'very_interested',revision:1});
  const changed=await post('/api/watchlist',{topic_id:probeTopic,ballot,choice:'somewhat_interested',revision:2});
  if(changed.choice!=='somewhat_interested'||Number(changed.revision)!==2)throw new Error('feedback Watchlist revision not confirmed');
  return {ratings:true,comments:true,watchlist:true,public_comments:true};
}

async function verifyOnce(){
  const checked=[];
  for(const route of manifest.required_routes){
    const url=new URL(route,baseUrl).href;
    const res=await fetchOk(url);
    const text=await res.text();
    if(route.endsWith('.html') && !/<html/i.test(text)) throw new Error('HTML marker missing for '+url);
    checked.push({url,status:res.status});
  }
  for(const image of manifest.current_images){
    const url=new URL(image.route,baseUrl).href;
    const res=await fetchOk(url);
    const bytes=Buffer.from(await res.arrayBuffer());
    const actual=sha256(bytes);
    if(actual!==image.sha256) throw new Error('deployed image hash mismatch '+url);
    checked.push({url,status:res.status,sha256:actual});
  }
  const editionUrl=new URL('briefs/'+editionDate+'/',baseUrl).href;
  const edition=await (await fetchOk(editionUrl)).text();
  if(!edition.includes('research-ledger-header'))throw new Error('canonical production reader header missing');
  if((edition.match(/class="story-feedback story-feedback-compact star-feedback"/g)||[]).length!==10)throw new Error('live rating surfaces mismatch');
  if((edition.match(/data-feedback-rating="[1-5]"/g)||[]).length!==50)throw new Error('live five-star controls mismatch');
  const feedbackRegistry=JSON.parse(fs.readFileSync(sourceDir+'/'+manifest.feedback.registry_route,'utf8'));
  for(const item of feedbackRegistry.items){
    if(!edition.includes('data-feedback-story-id="'+item.feedback_id+'"'))throw new Error('live Compiler feedback identity missing '+item.feedback_id);
    if(edition.includes('data-feedback-story-id="'+item.canonical_reader_id+'"'))throw new Error('live production-style feedback identity leaked '+item.canonical_reader_id);
  }
  if(!edition.includes('Emerging AI Watchlist'))throw new Error('live Watchlist missing');
  if(!edition.includes('assets/js/share.js'))throw new Error('live share runtime missing');
  if(!edition.includes('id="skip-to-content"'))throw new Error('live accessibility skip link missing');
  const home=await (await fetchOk(baseUrl)).text();
  if(!home.includes('daily-feed.xml')||!home.includes('subscription'))throw new Error('live subscription surface missing');
  return checked;
}

let lastError;
for(let attempt=1;attempt<=18;attempt++){
  try{
    const checked=await verifyOnce();
    const feedback=await probeFeedbackStore();
    const built=JSON.parse(fs.readFileSync('build/built-verification.json','utf8'));
    const receipt={
      schema_version:'daily-compiler-live-verification-v2',
      result:'PASS',
      base_url:baseUrl,
      edition_date:editionDate,
      production_reader_source_sha:manifest.production_reader_source_sha,
      reader_contract:'reader-surface-parity-v2',
      checked_routes:checked.length,
      canonical_layout:built.canonical_layout,
      ratings:built.ratings,
      sharing:built.sharing,
      subscriptions:built.subscriptions,
      feedback_store:manifest.feedback.store,
      feedback_writes:feedback,
      responsive:built.responsive,
      accessibility:built.accessibility,
      semantic_rework:0,
      accepted_image_regenerations:built.accepted_image_regenerations ?? manifest.accepted_image_regenerations ?? 0,
      owner_intervention:false
    };
    fs.mkdirSync(receiptPath.split('/').slice(0,-1).join('/')||'.',{recursive:true});
    fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
    console.log(JSON.stringify(receipt));
    process.exit(0);
  }catch(error){
    lastError=error;
    console.log('live verification attempt '+attempt+' failed: '+error.message);
    if(attempt<18) await sleep(10000);
  }
}
throw lastError;
