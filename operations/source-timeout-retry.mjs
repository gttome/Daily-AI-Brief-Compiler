// Bounded retry selector for actually observed public-route timeouts only.
export const RETRY_POLICY=Object.freeze({effective_from:'2026-10-28',
 max_retries_per_cycle:16,second_attempt_timeout_ms:8000,second_attempt_concurrency:3});
const fail=x=>{throw Error('SOURCE_TIMEOUT_RETRY_'+x);};
export function selectTimeoutRetries({editionDate,firstAttempts,maxCount=RETRY_POLICY.max_retries_per_cycle}={}){
 if(!/^20\d\d-\d\d-\d\d$/.test(editionDate||'')||!Array.isArray(firstAttempts)||
   !Number.isInteger(maxCount)||maxCount<0||maxCount>RETRY_POLICY.max_retries_per_cycle)
   fail('INVALID_INPUT');
 const seen=new Set(),eligible=[];
 for(const attempt of firstAttempts){
   if(typeof attempt?.resource_id!=='string'||!attempt.resource_id||seen.has(attempt.resource_id))
     fail('DUPLICATE_OR_UNKNOWN_IDENTITY');
   seen.add(attempt.resource_id);
   if(attempt.status!=='TIMED_OUT')continue;
   if(attempt.http_status!==null||attempt.error_code!=='TIMEOUT'||
      !['HEAD','GET'].includes(attempt.method)||!Number.isFinite(Date.parse(attempt.attempted_at)))
     fail('UNVERIFIED_FIRST_TIMEOUT');
   eligible.push(attempt.resource_id);
 }
 return editionDate<RETRY_POLICY.effective_from?[]:eligible.slice(0,maxCount);
}
