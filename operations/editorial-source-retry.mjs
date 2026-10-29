// Prospective, zero-paid second-pass editorial index retries. This never
// qualifies an article, video, podcast, or disabled registry entry by itself.
export const EDITORIAL_INDEX_RETRY_POLICY=Object.freeze({
  effective_from:'2026-10-30',
  max_second_attempts:16,
  second_attempt_timeout_ms:8000,
  second_attempt_concurrency:3
});
const validDate=value=>/^20\d{2}-\d{2}-\d{2}$/.test(value||'')&&
  Number.isFinite(Date.parse(value+'T00:00:00Z'));
const fail=reason=>{throw Error('EDITORIAL_INDEX_RETRY_'+reason);};
export function isRetryableEditorialIndexFailure(row){
  if(row?.outcome!=='SOURCE_ERROR')return false;
  // Status 403/429, missing dates, unsupported content and hard publisher
  // exclusions are NOT transient and cannot become inferred successes.
  return /^Could not inspect original publisher index:\s*(?:This operation was aborted|The operation was aborted|AbortError|fetch failed|network error|connect ETIMEDOUT|read ETIMEDOUT)/i
    .test(String(row.reason||''));
}
export function selectEditorialIndexRetries({editionDate,observations,maxCount=EDITORIAL_INDEX_RETRY_POLICY.max_second_attempts}={}){
  if(!validDate(editionDate)||!Array.isArray(observations)||
     !Number.isInteger(maxCount)||maxCount<0||
     maxCount>EDITORIAL_INDEX_RETRY_POLICY.max_second_attempts)
    fail('INVALID_INPUT');
  const seen=new Set();
  for(const row of observations){
    if(typeof row?.resource_id!=='string'||!row.resource_id||seen.has(row.resource_id))
      fail('MISSING_OR_DUPLICATE_IDENTITY');
    seen.add(row.resource_id);
  }
  if(editionDate<EDITORIAL_INDEX_RETRY_POLICY.effective_from||maxCount===0)return [];
  const eligible=observations.filter(isRetryableEditorialIndexFailure)
    .map(row=>row.resource_id).sort();
  if(!eligible.length)return [];
  // A rotated, bounded cohort prevents the same earliest alphabetical sources
  // monopolizing all 16 retries across successive editions.
  const days=Math.floor((Date.parse(editionDate+'T00:00:00Z')-
    Date.parse(EDITORIAL_INDEX_RETRY_POLICY.effective_from+'T00:00:00Z'))/86400000);
  const offset=(days*EDITORIAL_INDEX_RETRY_POLICY.max_second_attempts)%eligible.length;
  return eligible.slice(offset).concat(eligible.slice(0,offset)).slice(0,maxCount);
}
export function summarizeEditorialIndexRetries(rows=[]){
  if(!Array.isArray(rows))fail('RETRY_ROWS_NOT_ARRAY');
  return {attempted:rows.length,
    recovered_to_candidate:rows.filter(r=>r.second_attempt?.outcome==='CANDIDATES_FOUND').length,
    recovered_to_index_read:rows.filter(r=>['CANDIDATES_FOUND','NO_ELIGIBLE_ITEMS']
      .includes(r.second_attempt?.outcome)).length,
    still_unavailable:rows.filter(r=>['SOURCE_ERROR','ACCESS_BLOCKED']
      .includes(r.second_attempt?.outcome)).length,
    editorial_content_admission:'NOT_PROVEN_FROM_INDEX_RETRIES'};
}
