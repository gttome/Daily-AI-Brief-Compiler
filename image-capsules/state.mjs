import {canonicalSha,hex,nonempty} from './util.mjs';
import {validateVisualReview} from './review-contract.mjs';
import {validateSetReview} from './set-review.mjs';

export const IMAGE_STATES=['PACKET_READY','CAPSULE_ADMITTED','RAW_PERSISTED','FINAL_NORMALIZED','REVIEW_PASS_PENDING_SET','REJECTED_QUALITY','ACCEPTED_LOCKED','BLOCKED_INFRASTRUCTURE'];
export const INFRASTRUCTURE_FAILURES=new Set([
  'IMAGE_CAPSULE_ISOLATION_UNAVAILABLE','NATIVE_IMAGE_GENERATION_TEMPORARILY_UNAVAILABLE',
  'INCLUDED_IMAGE_CAPACITY_TEMPORARILY_UNAVAILABLE','RAW_BYTES_NOT_EXPOSED_BEFORE_CAPSULE_END',
  'GIT_DIRECT_BLOB_PAYLOAD_BLOCKED','CHUNK_BRIDGE_RECONSTRUCTION_FAILED','RAW_READBACK_MISMATCH',
  'NORMALIZATION_FAILED','FINAL_READBACK_MISMATCH','VISUAL_REVIEW_RUNTIME_UNAVAILABLE'
]);

export function countsAsQualityAttempt(code){return !INFRASTRUCTURE_FAILURES.has(code);}
export function nextAttemptNumber(attempts=[]){
  const generated=attempts.filter(x=>x?.quality_attempt_consumed===true).length;
  if(generated>=4) return null;
  const unresolved=attempts.find(x=>['CAPSULE_ADMITTED','RAW_PERSISTED','FINAL_NORMALIZED','REVIEW_PASS_PENDING_SET'].includes(x?.state));
  if(unresolved) return null;
  return generated+1;
}
export function assertNoAcceptedRegeneration(attempts=[]){
  if(attempts.some(x=>x?.state==='ACCEPTED_LOCKED')) throw new Error('accepted_image_regeneration_forbidden');
  return true;
}

export function buildAtomicAcceptance({editionDate,candidates,individualReviews,setReview,acceptedAt=new Date().toISOString(),supersedesByStory={}}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(editionDate||'')||!Array.isArray(candidates)||candidates.length!==6||individualReviews.length!==6) throw new Error('acceptance_input_invalid');
  const reviewByStory=new Map(individualReviews.map(x=>[x.story_id,x]));
  for(const r of individualReviews){
    const e=validateVisualReview(r); if(e.length) throw new Error('individual_review_invalid:'+r.story_id+':'+e.join(','));
  }
  const setErrors=validateSetReview(setReview,{individualReviews}); if(setErrors.length) throw new Error(setErrors.join(';'));
  const images=[];
  for(const c of candidates){
    const r=reviewByStory.get(c.story_id);
    if(!r||c.sha256!==r.final_sha256||c.git_blob_sha!==r.final_git_blob_sha||c.path!==r.final_path) throw new Error('candidate_review_mismatch:'+c.story_id);
    if(!hex(c.sha256,64)||!hex(c.git_blob_sha,40)||!nonempty(c.path)||!nonempty(c.asset_version)||!nonempty(c.cache_key)) throw new Error('candidate_identity_invalid:'+c.story_id);
    images.push({
      story_id:c.story_id,path:c.path,sha256:c.sha256,git_blob_sha:c.git_blob_sha,
      asset_version:c.asset_version,cache_key:c.cache_key,review_sha256:canonicalSha(r),
      supersedes:supersedesByStory[c.story_id]??null,accepted_locked:true
    });
  }
  return {
    schema_version:'daily-compiler-image-acceptance-v3',edition_date:editionDate,accepted_at:acceptedAt,
    set_review_sha256:canonicalSha(setReview),accepted_locked:true,images
  };
}
