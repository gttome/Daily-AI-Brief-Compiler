import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {readReleaseManifest,readerRoutePath,verifyReaderImageBindings,verifyReaderMediaBindings} from './verify-built-reader.mjs';

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fail=message=>{throw new Error(message);};

async function probeFeedbackStore({manifest,editionDate,fetchImpl}){
  const api=manifest.feedback?.base_url;
  if(!api)throw new Error('Compiler feedback store missing from manifest');
  const origin='https://gttome.github.io';
  const probeItem='dab-story-compiler-'+editionDate+'-verification-probe';
  const probeTopic='dab-topic-compiler-verification-'+editionDate;
  const post=async(route,body,operation)=>{
    const headers={'content-type':'application/json','origin':origin};
    if(operation)headers['x-operation-id']=operation;
    const response=await fetchImpl(api+route,{method:'POST',headers,body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload.recorded!==true)throw new Error('feedback probe '+route+' failed '+response.status+' '+JSON.stringify(payload));
    return payload;
  };
  await post('/api/ratings',{brief_date:editionDate,item_id:probeItem,rating:5},crypto.randomUUID());
  const ratingRead=await fetchImpl(api+'/api/ratings?'+new URLSearchParams({brief_date:editionDate,item_id:probeItem}),{headers:{origin}});
  const ratingPayload=await ratingRead.json();
  if(!ratingRead.ok||Number(ratingPayload.totals?.['5']||0)<1)throw new Error('feedback rating persistence not observable');

  const commentText='Automated Daily Compiler live verification.';
  await post('/api/comments',{brief_date:editionDate,item_id:probeItem,body:commentText},crypto.randomUUID());
  const commentRead=await fetchImpl(api+'/api/comments?'+new URLSearchParams({brief_date:editionDate,item_id:probeItem}),{headers:{origin}});
  const commentPayload=await commentRead.json();
  if(!commentRead.ok||!(commentPayload.comments||[]).some(row=>row.body===commentText))throw new Error('feedback comment persistence not observable');

  const ballot=crypto.randomUUID();
  await post('/api/watchlist',{topic_id:probeTopic,ballot,choice:'very_interested',revision:1});
  const changed=await post('/api/watchlist',{topic_id:probeTopic,ballot,choice:'somewhat_interested',revision:2});
  if(changed.choice!=='somewhat_interested'||Number(changed.revision)!==2)throw new Error('feedback Watchlist revision not confirmed');
  return {ratings:true,comments:true,watchlist:true,public_comments:true};
}

// Read-only artifact verification is independently replayable with an injected
// fetch. It is deliberately a different receipt type from a complete live PASS:
// the CLI also retains the reader feedback persistence probes below.
export async function verifyLiveArtifacts({baseUrl,editionDate,sourceDir='build/reader-source',siteDir='build/shadow',builtReceiptPath,historyReceiptPath,fetchImpl=globalThis.fetch}={}){
  if(!baseUrl||!editionDate||typeof fetchImpl!=='function')fail('live verification target required');
  const {manifest}=readReleaseManifest({sourceDir});
  if(manifest.edition_date!==editionDate)fail('edition mismatch');
  if(new URL(baseUrl).href.replace(/\/$/,'')!==new URL(manifest.environment.public_base).href.replace(/\/$/,''))fail('live base URL differs from canonical reader destination');
  const buildDir=path.dirname(sourceDir);
  const built=readJson(builtReceiptPath||path.join(buildDir,'built-verification.json'));
  if(built.schema_version!=='daily-compiler-built-reader-verification-v2'||built.result!=='PASS'||built.edition_date!==editionDate)fail('built reader PASS identity missing');
  if(built.bundle_sha256!==manifest.bundle_sha256||built.source_manifest_sha256!==canonicalSha(manifest)||built.production_reader_source_sha!==manifest.production_reader_source_sha)fail('built reader receipt does not bind this release');
  if(!Array.isArray(built.route_evidence)||built.route_evidence_sha256!==canonicalSha(built.route_evidence)||new Set(built.route_evidence.map(row=>row.route)).size!==manifest.required_routes.length||built.route_evidence.length!==manifest.required_routes.length)fail('built route evidence missing or invalid');
  const builtRoutes=new Map(built.route_evidence.map(row=>[row.route,row]));
  const history=readJson(historyReceiptPath||path.join(buildDir,'history-merge-receipt.json'));
  if(history.schema_version!=='daily-compiler-history-merge-v2'||history.result!=='PASS'||history.current_date!==editionDate||history.latest_date<editionDate||history.bundle_sha256!==manifest.bundle_sha256||history.source_manifest_sha256!==canonicalSha(manifest))fail('history merge receipt does not bind this release');
  if(typeof history.historical_correction!=='boolean'||history.historical_correction!==(history.latest_date>editionDate))fail('history latest identity mismatch');
  if(!Array.isArray(history.published_shared_routes)||!history.published_shared_routes.some(entry=>entry.route==='index.html')||new Set(history.published_shared_routes.map(entry=>entry.route)).size!==history.published_shared_routes.length)fail('merged shared reader evidence missing');
  for(const entry of history.published_shared_routes){
    if(sha256(fs.readFileSync(readerRoutePath(siteDir,entry.route)))!==entry.sha256)fail('merged shared reader route changed: '+entry.route);
  }
  verifyReaderImageBindings({manifest,siteDir,includeShared:!history.historical_correction});
  verifyReaderMediaBindings({manifest,siteDir,includeShared:!history.historical_correction});
  const checked=[];
  const fetchBytes=async(route,query='')=>{
    const url=new URL(route,new URL(baseUrl).href.replace(/\/?$/,'/'));
    url.search=query;
    const response=await fetchImpl(url.href,{headers:{'cache-control':'no-cache'}});
    if(!response.ok)fail(url.href+' returned '+response.status);
    return {url:url.href,status:response.status,bytes:Buffer.from(await response.arrayBuffer())};
  };
  for(const route of manifest.required_routes){
    const expected=fs.readFileSync(readerRoutePath(siteDir,route)),record=builtRoutes.get(route);
    if(!record)fail('required route missing from built evidence: '+route);
    const targetRoute=['briefs','stories','videos','podcasts'].some(category=>route.startsWith(category+'/'+editionDate+'/'));
    if((!history.historical_correction||targetRoute)&&(record.sha256!==sha256(expected)||record.bytes!==expected.length))fail('built reader route changed before release: '+route);
    const actual=await fetchBytes(route);
    if(sha256(actual.bytes)!==sha256(expected)||actual.bytes.length!==expected.length)fail('live reader route bytes mismatch: '+actual.url);
    if(route.endsWith('.html')&&!/<html/i.test(actual.bytes.toString('utf8')))fail('HTML marker missing for '+actual.url);
    checked.push({route,url:actual.url,status:actual.status,sha256:sha256(actual.bytes),bytes:actual.bytes.length});
  }
  const images=[];
  for(const image of manifest.current_images){
    const expected=fs.readFileSync(readerRoutePath(siteDir,image.route));
    if(sha256(expected)!==image.sha256)fail('merged canonical image hash mismatch: '+image.route);
    const actual=await fetchBytes(image.route,new URL(image.public_url).search);
    if(sha256(actual.bytes)!==image.sha256||actual.bytes.length!==expected.length)fail('deployed image hash mismatch '+actual.url);
    images.push({story_id:image.story_id,route:image.route,url:actual.url,status:actual.status,sha256:image.sha256,bytes:actual.bytes.length});
  }
  return {
    schema_version:'daily-compiler-live-artifact-check-v1',result:'PASS',base_url:baseUrl,edition_date:editionDate,
    latest_edition_date:history.latest_date,bundle_sha256:manifest.bundle_sha256,
    source_manifest_sha256:canonicalSha(manifest),production_reader_source_sha:manifest.production_reader_source_sha,
    reader_contract:'reader-surface-parity-v2',checked_routes:checked.length+images.length,
    route_evidence:checked,image_evidence:images,history_merge_sha256:canonicalSha(history),
    canonical_layout:built.canonical_layout,ratings:built.ratings,sharing:built.sharing,subscriptions:built.subscriptions,
    feedback_store:manifest.feedback.store,responsive:built.responsive,accessibility:built.accessibility,
    story_image_bindings:true,media_reader_bindings:true,exact_reader_route_bytes:true,
    semantic_rework:0,accepted_image_regenerations:built.accepted_image_regenerations??manifest.accepted_image_regenerations??0,
    owner_intervention:false
  };
}

export async function verifyLiveReader(options){
  const artifact=await verifyLiveArtifacts(options);
  const {manifest}=readReleaseManifest({sourceDir:options.sourceDir||'build/reader-source'});
  const feedback=await probeFeedbackStore({manifest,editionDate:options.editionDate,fetchImpl:options.fetchImpl||globalThis.fetch});
  return {...artifact,schema_version:'daily-compiler-live-verification-v2',feedback_writes:feedback};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [baseUrl,editionDate,sourceDir='build/reader-source',siteDir='build/shadow',receiptPath='build/live-verification.json']=process.argv.slice(2);
  if(!baseUrl||!editionDate)throw new Error('usage: node scripts/verify-live.mjs <base-url> <edition-date> [source-dir] [site-dir] [receipt]');
  let lastError;
  for(let attempt=1;attempt<=18;attempt++){
    try{
      const receipt=await verifyLiveReader({baseUrl,editionDate,sourceDir,siteDir});
      fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
      fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
      console.log(JSON.stringify(receipt));
      process.exit(0);
    }catch(error){
      lastError=error;
      console.log('live verification attempt '+attempt+' failed: '+error.message);
      if(attempt<18)await sleep(10000);
    }
  }
  throw lastError;
}
