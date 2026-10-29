#!/usr/bin/env node
// Best-effort zero-paid public HTTPS route sweep; NOT an article/video/episode parser.
// Runs only when an existing producer environment has Node 20+ and network access.
// No new scheduler, GitHub Actions workflow, API credential or external provider.
import fs from 'node:fs';
import path from 'node:path';
import {buildSourceCoveragePlan,recordSourceProbe,validateSourceCoverageReceipt} from '../operations/source-coverage.mjs';
import {selectTimeoutRetries,RETRY_POLICY} from '../operations/source-timeout-retry.mjs';

const [edition_date,execution_id,outputPath,registryPath='config/resource-registry.json']=process.argv.slice(2);
if(!edition_date||!execution_id||!outputPath)throw new Error(
 'usage: node scripts/source-coverage-sweep.mjs <edition_date> <execution_id> <output.json> [registry.json]');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const receipt=buildSourceCoveragePlan(registry,{edition_date,execution_id,created_at:new Date().toISOString()});
const TIMEOUT_MS=4000;
const CONCURRENCY=6;
const started=new Date();
function classifyResponse(status){
 if(status>=200&&status<400)return 'ROUTE_REACHABLE';
 if(status===429)return 'RATE_LIMITED';
 if([401,403,407,451].includes(status))return 'HTTP_BLOCKED';
 return 'HTTP_ERROR';
}
async function fetchPublicRoute(url,method,timeoutMs=TIMEOUT_MS){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  return await fetch(url,{method,redirect:'follow',signal:controller.signal,
    headers:{'user-agent':'Daily-AI-Brief-Compiler-source-coverage/1.0 (read-only public route check)',
      'accept':'text/html,application/xml,application/rss+xml,*/*;q=0.5'}});
 }finally{clearTimeout(timer);}
}
async function check(row,timeoutMs=TIMEOUT_MS){
 let method='HEAD',http_status=null,final_url=row.url,error_code=null;
 const t0=Date.now();
 let status='FETCH_FAILED';
 try{
  let response=await fetchPublicRoute(row.url,method,timeoutMs);
  // Some publisher routes reject HEAD with 403 while public GET succeeds.
  // Only 403/405/501 get one bounded GET; 429 is never retried.
  // This remains route reachability, not article-content verification.
  // A successful GET never auto-enables a disabled source.
  // A publisher returning 403 again remains HTTP_BLOCKED.
  // Some publisher routes refuse HEAD; a single GET fallback remains a route
  // check and is never interpreted as full-content editorial verification.
  if([403,405,501].includes(response.status)){
    await response.body?.cancel().catch(()=>{});
    method='GET';
    response=await fetchPublicRoute(row.url,method,timeoutMs);
  }
  http_status=response.status;
  final_url=response.url&&response.url.startsWith('https://')?response.url:row.url;
  status=classifyResponse(http_status);
  await response.body?.cancel().catch(()=>{});
 }catch(e){
  const type=e?.name||'FetchError';
  status=type==='AbortError'?'TIMED_OUT':'FETCH_FAILED';
  error_code=(status==='TIMED_OUT'?'TIMEOUT':'NETWORK_'+String(type).replace(/[^A-Za-z0-9_-]/g,'').slice(0,38));
 }
 return {resource_id:row.resource_id,status,attempted_at:new Date().toISOString(),
   method,http_status,final_url,elapsed_ms:Math.max(0,Date.now()-t0),error_code};
}
let idx=0;
const eligible=receipt.resources.filter(r=>r.enabled),probes=new Map(),retryLog=[];
async function worker(){
 while(idx<eligible.length){
  const row=eligible[idx++];
  probes.set(row.resource_id,await check(row));
 }
}
await Promise.all(Array.from({length:Math.min(CONCURRENCY,eligible.length)},()=>worker()));
// Oct28+: bounded second attempt for genuine four-second public route aborts.
const chosen=selectTimeoutRetries({editionDate:edition_date,
 firstAttempts:eligible.map(row=>probes.get(row.resource_id))});
let ri=0;
async function retryWorker(){
 while(ri<chosen.length){
  const id=chosen[ri++],row=eligible.find(x=>x.resource_id===id);
  const first=probes.get(id),second=await check(row,RETRY_POLICY.second_attempt_timeout_ms);
  probes.set(id,second);
  retryLog.push({resource_id:id,first_attempt:first,second_attempt:second});
 }
}
await Promise.all(Array.from({length:Math.min(RETRY_POLICY.second_attempt_concurrency,chosen.length)},
 ()=>retryWorker()));
for(const row of eligible)recordSourceProbe(receipt,probes.get(row.resource_id));
const audit=validateSourceCoverageReceipt(registry,receipt,{requireAllAttempts:true});
const save=path.resolve(outputPath);
fs.mkdirSync(path.dirname(save),{recursive:true});
fs.writeFileSync(save,JSON.stringify(receipt,null,2)+'\n');
if(retryLog.length){
 const auditPath=path.join(path.dirname(save),path.basename(save,'.json')+'-timeout-retries.json');
 fs.writeFileSync(auditPath,JSON.stringify({
  schema_version:'daily-compiler-source-timeout-retry-v1',
  edition_date,execution_id,created_at:new Date().toISOString(),
  original_first_pass_attempts:eligible.length,observed_retry_attempts:retryLog.length,
  second_attempt_timeout_ms:RETRY_POLICY.second_attempt_timeout_ms,
  coverage_kind:'PUBLIC_HTTPS_ROUTE_ONLY_NOT_EDITORIAL_EVIDENCE',
  retries:retryLog
 },null,2)+'\n');
}
console.log(JSON.stringify({result:audit.result,edition_date,coverage:audit.attempted+'/'+audit.enabled,
  reachable:audit.reachable,blocked:audit.blocked,failures:audit.failures,
  duration_ms:Date.now()-Date.parse(started.toISOString()),receipt:save,
  editorial_item_qualification:'NOT_PROVEN',video_full_playback:'NOT_PROVEN',
  podcast_full_listening:'NOT_PROVEN'}));
