import crypto from 'node:crypto';
import {validateResourceRegistry} from './resources.mjs';

// A source-level coverage receipt is not an item-level editorial verification.
// The probe can establish route reachability, never freshness, video playback,
// listening, AI-content fraction, or entitlement to select a story.
export const COVERAGE_VERSION='daily-compiler-source-coverage-v1';
const TYPES=['article','video','podcast','research','watchlist'];
const TERMINAL=new Set(['ROUTE_REACHABLE','HTTP_BLOCKED','RATE_LIMITED','HTTP_ERROR','TIMED_OUT','FETCH_FAILED']);
const URL_OK=u=>{try{return new URL(u).protocol==='https:';}catch{return false;}};
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const hasTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/\d{4}-\d{2}-\d{2}T/.test(x);
const fail=s=>{throw new Error('SOURCE_COVERAGE_'+s);};
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function sourceCoverageCounts(receipt){
  const resources=receipt.resources||[];
  const enabled=resources.filter(x=>x.enabled),attempted=enabled.filter(x=>TERMINAL.has(x.status));
  const enabledByRole={},attemptedByRole={};
  for(const role of TYPES){
    enabledByRole[role]=enabled.filter(x=>x.content_types.includes(role)).length;
    attemptedByRole[role]=attempted.filter(x=>x.content_types.includes(role)).length;
  }
  return {registered:resources.length,enabled:enabled.length,disabled:resources.length-enabled.length,
    attempted:attempted.length,remaining:enabled.length-attempted.length,
    reachable:attempted.filter(x=>x.status==='ROUTE_REACHABLE').length,
    blocked:attempted.filter(x=>['HTTP_BLOCKED','RATE_LIMITED'].includes(x.status)).length,
    failures:attempted.filter(x=>['HTTP_ERROR','TIMED_OUT','FETCH_FAILED'].includes(x.status)).length,
    enabled_by_role:enabledByRole,attempted_by_role:attemptedByRole,
    all_enabled_attempted:attempted.length===enabled.length};
}

export function buildSourceCoveragePlan(registry,{edition_date,execution_id,created_at}={}){
  const errors=validateResourceRegistry(registry);
  if(errors.length)fail('INVALID_REGISTRY_'+errors.join('_'));
  if(!DATE.test(edition_date||'')||!execution_id||!hasTime(created_at))fail('PLAN_IDENTITY');
  const receipt={schema_version:COVERAGE_VERSION,edition_date,execution_id,
    created_at,registry_digest:sha(registry),
    scope:'ALL_REGISTERED_ALL_ENABLED_ROUTE_ATTEMPTS',
    coverage_kind:'ROUTE_CHECK_NOT_EDITORIAL_ITEM_REVIEW',
    resources:registry.resources.map(r=>({
      resource_id:r.resource_id,url:r.url,enabled:r.enabled,
      content_types:[...r.content_types],
      status:r.enabled?'NOT_CHECKED':'SKIPPED_DISABLED',
      attempted_at:null,method:null,http_status:null,final_url:null,
      elapsed_ms:null,error_code:null
    }))};
  receipt.counts=sourceCoverageCounts(receipt);
  return receipt;
}

export function recordSourceProbe(receipt,probe){
  const row=receipt.resources?.find(r=>r.resource_id===probe?.resource_id);
  if(!row||!row.enabled||row.status!=='NOT_CHECKED')fail('INVALID_PROBE_TARGET');
  if(!TERMINAL.has(probe.status)||!['HEAD','GET'].includes(probe.method)||
     !hasTime(probe.attempted_at)||!Number.isInteger(probe.elapsed_ms)||probe.elapsed_ms<0||
     !URL_OK(probe.final_url))fail('INVALID_PROBE_EVIDENCE');
  const n=probe.http_status;
  if(n!==null&&(!Number.isInteger(n)||n<100||n>599))fail('INVALID_HTTP_STATUS');
  if(probe.status==='ROUTE_REACHABLE'&&!(n>=200&&n<400))fail('UNSUPPORTED_SUCCESS');
  if(probe.status==='HTTP_BLOCKED'&&![401,403,407,451].includes(n))fail('BAD_BLOCKED_STATUS');
  if(probe.status==='RATE_LIMITED'&&n!==429)fail('BAD_RATE_LIMIT_STATUS');
  if(probe.status==='HTTP_ERROR'&&(!(n>=400)||[401,403,407,429,451].includes(n)))
    fail('BAD_HTTP_ERROR');
  if(['FETCH_FAILED','TIMED_OUT'].includes(probe.status)&&n!==null)fail('NETWORK_ERROR_HAS_HTTP_STATUS');
  if(!['FETCH_FAILED','TIMED_OUT'].includes(probe.status) && probe.error_code)
    fail('HTTP_RESULT_HAS_ERROR_CODE');
  if(['FETCH_FAILED','TIMED_OUT'].includes(probe.status)&&
     (typeof probe.error_code!=='string'||probe.error_code.length<2))fail('MISSING_ERROR_CODE');
  Object.assign(row,{
    status:probe.status,attempted_at:probe.attempted_at,method:probe.method,
    http_status:n,final_url:probe.final_url,elapsed_ms:probe.elapsed_ms,
    error_code:probe.error_code??null
  });
  receipt.counts=sourceCoverageCounts(receipt);
  return receipt;
}

export function validateSourceCoverageReceipt(registry,receipt,{requireAllAttempts=false}={}){
  if(receipt?.schema_version!==COVERAGE_VERSION||receipt?.scope!=='ALL_REGISTERED_ALL_ENABLED_ROUTE_ATTEMPTS'||
     receipt?.coverage_kind!=='ROUTE_CHECK_NOT_EDITORIAL_ITEM_REVIEW')fail('RECEIPT_VERSION');
  const expected=buildSourceCoveragePlan(registry,{
    edition_date:receipt.edition_date,execution_id:receipt.execution_id,created_at:receipt.created_at});
  if(receipt.registry_digest!==expected.registry_digest)fail('STALE_REGISTRY');
  if(!Array.isArray(receipt.resources)||receipt.resources.length!==expected.resources.length)
    fail('MISSING_RESOURCE_ROWS');
  for(let i=0;i<receipt.resources.length;i++){
    const row=receipt.resources[i],base=expected.resources[i];
    if(row.resource_id!==base.resource_id||row.url!==base.url||row.enabled!==base.enabled||
       JSON.stringify(row.content_types)!==JSON.stringify(base.content_types))
       fail('SOURCE_IDENTITY_MISMATCH_'+i);
    if(!base.enabled){
      if(JSON.stringify(row)!==JSON.stringify(base))fail('DISABLED_RESOURCE_FALSIFIED');
    }else if(row.status!=='NOT_CHECKED'){
      recordSourceProbe(expected,{resource_id:row.resource_id,status:row.status,
        attempted_at:row.attempted_at,method:row.method,http_status:row.http_status,
        final_url:row.final_url,elapsed_ms:row.elapsed_ms,error_code:row.error_code});
      if(JSON.stringify(expected.resources[i])!==JSON.stringify(row))fail('PROBE_ROW_EXTRA_FIELDS_'+i);
    }else if(JSON.stringify(row)!==JSON.stringify(base))fail('UNCHECKED_HAS_EVIDENCE');
  }
  const actualCounts=sourceCoverageCounts(receipt);
  if(JSON.stringify(actualCounts)!==JSON.stringify(receipt.counts))fail('INCONSISTENT_COUNTS');
  if(requireAllAttempts&&!actualCounts.all_enabled_attempted)fail('INCOMPLETE_ENABLED_SOURCE_SWEEP');
  return {result:actualCounts.all_enabled_attempted?'ALL_ATTEMPTS_ACCOUNTED':'INCOMPLETE',
    ...actualCounts,route_reachability_only:true,item_discovery_not_certified:true};
}
