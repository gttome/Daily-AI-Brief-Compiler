import crypto from 'node:crypto';
import {validateResourceRegistry} from './resources.mjs';

// Forward-only: all catalogue entries are audited for the Oct 28 edition,
// without converting disabled resources into editorially approved sources.
export const OCT28_FULL_UNIVERSE='oct28-full-universe-v1';
const statuses=new Set(['REACHABLE','BLOCKED','RATE_LIMITED','HTTP_ERROR','TIMEOUT','NETWORK_ERROR']);
const goodTime=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))&&t.includes('T');
const goodUrl=u=>{try{return new URL(u).protocol==='https:';}catch{return false;}};
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=s=>{throw Error('OCT28_FULL_UNIVERSE_'+s)};

export function oct28Counts(plan){
 const rows=plan.rows||[];
 const tried=rows.filter(r=>statuses.has(r.result));
 return {registered:rows.length,enabled:rows.filter(r=>r.enabled).length,
  qualification_only:rows.filter(r=>!r.enabled).length,
  attempted:tried.length,not_attempted:rows.length-tried.length,
  reachable:tried.filter(r=>r.result==='REACHABLE').length,
  failed_or_blocked:tried.filter(r=>r.result!=='REACHABLE').length,
  complete:rows.length>0&&tried.length===rows.length};
}
export function createOct28Plan(registry,{edition_date,execution_id,created_at}={}){
 if(validateResourceRegistry(registry).length)fail('INVALID_REGISTRY');
 if(!/^20\d{2}-\d\d-\d\d$/.test(edition_date||'')||
    edition_date<'2026-10-28'||!execution_id||!goodTime(created_at))
    fail('NOT_EFFECTIVE');
 const plan={schema_version:OCT28_FULL_UNIVERSE,edition_date,execution_id,created_at,
  registry_digest:hash(registry),kind:'ALL_208_PUBLIC_ROUTE_ATTEMPTS',
  item_admission:'PRESERVE_ENABLED_FLAG_AND_EXISTING_MEDIA_EDITORIAL_GATES',
  rows:registry.resources.map(r=>({resource_id:r.resource_id,url:r.url,
   enabled:r.enabled,roles:[...r.content_types],
   scope:r.enabled?'DISCOVERY_CANDIDATE':'QUALIFICATION_ONLY',
   result:'NOT_ATTEMPTED',checked_at:null,method:null,http_status:null,
   final_url:null,elapsed_ms:null,error_code:null}))};
 plan.counts=oct28Counts(plan);
 return plan;
}
export function saveOct28Observation(plan,p){
 const r=plan.rows?.find(x=>x.resource_id===p?.resource_id);
 if(!r||r.result!=='NOT_ATTEMPTED'||!statuses.has(p.result)||
    !goodTime(p.checked_at)||!['HEAD','GET'].includes(p.method)||
    !goodUrl(p.final_url)||!Number.isInteger(p.elapsed_ms)||p.elapsed_ms<0)
    fail('UNVERIFIED_ROUTE_OBSERVATION');
 const n=p.http_status;
 if(n!==null&&(!Number.isInteger(n)||n<100||n>599))fail('INVALID_HTTP_CODE');
 if(p.result==='REACHABLE'&&!(n>=200&&n<400))fail('FAKE_REACHABLE');
 if(p.result==='BLOCKED'&&![401,403,407,451].includes(n))fail('FAKE_BLOCKED');
 if(p.result==='RATE_LIMITED'&&n!==429)fail('FAKE_RATE_LIMIT');
 if(p.result==='HTTP_ERROR'&&(!(n>=400)||[401,403,407,429,451].includes(n)))
  fail('FAKE_HTTP_ERROR');
 if(['TIMEOUT','NETWORK_ERROR'].includes(p.result)){
  if(n!==null||typeof p.error_code!=='string'||p.error_code.length<2)
   fail('BAD_NETWORK_ERROR');
 }else if(p.error_code)fail('BAD_ERROR_FIELD');
 Object.assign(r,{result:p.result,checked_at:p.checked_at,method:p.method,
  http_status:n,final_url:p.final_url,elapsed_ms:p.elapsed_ms,
  error_code:p.error_code||null});
 plan.counts=oct28Counts(plan);
 return plan;
}
export function validateOct28Plan(registry,plan,{requireAll=false}={}){
 if(plan?.schema_version!==OCT28_FULL_UNIVERSE||
    plan?.kind!=='ALL_208_PUBLIC_ROUTE_ATTEMPTS'||
    plan?.item_admission!=='PRESERVE_ENABLED_FLAG_AND_EXISTING_MEDIA_EDITORIAL_GATES')
    fail('INVALID_SCHEMA');
 const expected=createOct28Plan(registry,{edition_date:plan.edition_date,
  execution_id:plan.execution_id,created_at:plan.created_at});
 if(expected.registry_digest!==plan.registry_digest)fail('STALE_REGISTRY');
 if(!Array.isArray(plan.rows)||plan.rows.length!==expected.rows.length)fail('MISSING_RESOURCES');
 for(let i=0;i<plan.rows.length;i++){
  const a=plan.rows[i],b=expected.rows[i];
  for(const k of ['resource_id','url','enabled','scope'])if(a[k]!==b[k])
   fail('SOURCE_IDENTITY_CHANGED');
  if(JSON.stringify(a.roles)!==JSON.stringify(b.roles))fail('SOURCE_ROLES_CHANGED');
  if(a.result!=='NOT_ATTEMPTED')saveOct28Observation(expected,{resource_id:a.resource_id,
    result:a.result,checked_at:a.checked_at,method:a.method,
    http_status:a.http_status,final_url:a.final_url,elapsed_ms:a.elapsed_ms,
    error_code:a.error_code});
  if(JSON.stringify(expected.rows[i])!==JSON.stringify(a))fail('FAKE_OR_EXTRA_EVIDENCE');
 }
 const actual=oct28Counts(plan);
 if(JSON.stringify(actual)!==JSON.stringify(plan.counts))fail('FAKE_COUNTS');
 if(requireAll&&!actual.complete)fail('208_SOURCE_SWEEP_INCOMPLETE');
 return {result:actual.complete?'ALL_ROUTE_ATTEMPTS_ACCOUNTED':'INCOMPLETE',...actual,
  source_content_verified:false,disabled_autoenabled:false};
}
