import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,gitBlobSha,sha256,hex,nonempty} from './util.mjs';
import {pngDimensions} from './structural-gate.mjs';
import {validateVisualReview} from './review-contract.mjs';
import {validateSetReview} from './set-review.mjs';
import {D0_STRATEGY,d0StateComplete} from './state.mjs';

function readJson(root,rel){
  const base=path.resolve(root),full=path.resolve(root,rel||'');
  if(!rel||!full.startsWith(base+path.sep)) throw new Error('unsafe_image_evidence_path');
  const raw=fs.readFileSync(full);
  return {raw,json:JSON.parse(raw.toString('utf8')),full};
}
function readAsset(root,rel){
  const base=path.resolve(root),full=path.resolve(root,rel||'');
  if(!rel||!full.startsWith(base+path.sep)) throw new Error('unsafe_image_asset_path');
  const bytes=fs.readFileSync(full),dims=pngDimensions(bytes);
  return {bytes,width:dims.width,height:dims.height,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes)};
}

export function validateD0BundleImages({state,bundle,repoRoot='.'}){
  const errors=[],imageEvidence=[];
  if(bundle?.image_strategy!==D0_STRATEGY) return {errors:['d0_image_strategy_required'],imageEvidence};
  if(!d0StateComplete(state)) errors.push('d0_state_not_atomically_accepted');
  if(!Array.isArray(bundle?.images)||bundle.images.length!==6) errors.push('d0_bundle_exactly_six_images');
  if(bundle?.image_acceptance?.accepted_locked!==true) errors.push('d0_bundle_acceptance_missing');

  let acceptance=null,setReview=null;
  try{
    const a=readJson(repoRoot,bundle.image_acceptance.path);
    acceptance=a.json;
    if(sha256(a.raw)!==bundle.image_acceptance.sha256) errors.push('acceptance_file_sha_mismatch');
    if(acceptance.schema_version!=='daily-compiler-image-acceptance-v3'||acceptance.accepted_locked!==true||acceptance.edition_date!==bundle.edition_date) errors.push('acceptance_record_invalid');
    if(!Array.isArray(acceptance.images)||acceptance.images.length!==6||new Set(acceptance.images.map(x=>x.story_id)).size!==6) errors.push('acceptance_record_images_invalid');
  }catch{
    errors.push('acceptance_record_missing_or_unreadable');
  }

  try{
    const s=readJson(repoRoot,bundle.image_acceptance.set_review_path);
    setReview=s.json;
    if(canonicalSha(setReview)!==bundle.image_acceptance.set_review_sha256) errors.push('set_review_digest_mismatch');
    const se=validateSetReview(setReview);
    if(se.length) errors.push(...se.map(x=>'set_review:'+x));
    if(setReview.result!=='PASS') errors.push('set_review_not_pass');
    if(acceptance&&acceptance.set_review_sha256!==bundle.image_acceptance.set_review_sha256) errors.push('acceptance_set_review_mismatch');
  }catch{
    errors.push('set_review_missing_or_unreadable');
  }

  const seenStories=new Set(),seenHashes=new Set();
  for(const image of bundle?.images||[]){
    if(!nonempty(image?.story_id)||!nonempty(image?.path)||image?.accepted!==true||image?.accepted_locked!==true) errors.push('d0_image_acceptance_fields');
    if(!hex(image?.sha256,64)||!hex(image?.git_blob_sha,40)||!nonempty(image?.asset_version)||!nonempty(image?.cache_key)||!nonempty(image?.review_path)||!hex(image?.review_sha256,64)||!hex(image?.set_review_sha256,64)) errors.push('d0_image_identity_fields');
    if(seenStories.has(image?.story_id)) errors.push('d0_duplicate_story_id');
    seenStories.add(image?.story_id);
    if(seenHashes.has(image?.sha256)) errors.push('d0_duplicate_image_bytes');
    seenHashes.add(image?.sha256);

    let actual=null;
    try{
      actual=readAsset(repoRoot,image.path);
      if(actual.width!==1200||actual.height!==630) errors.push('d0_image_dimensions:'+image.story_id);
      if(actual.sha256!==image.sha256||actual.git_blob_sha!==image.git_blob_sha) errors.push('d0_image_asset_identity:'+image.story_id);
    }catch{
      errors.push('d0_image_missing:'+String(image?.story_id));
    }

    try{
      const r=readJson(repoRoot,image.review_path);
      if(canonicalSha(r.json)!==image.review_sha256) errors.push('d0_review_digest:'+image.story_id);
      const re=validateVisualReview(r.json);
      if(re.length) errors.push(...re.map(x=>'review:'+image.story_id+':'+x));
      if(r.json.result!=='PASS'||r.json.final_sha256!==image.sha256||r.json.final_git_blob_sha!==image.git_blob_sha||r.json.final_path!==image.path) errors.push('d0_review_asset_binding:'+image.story_id);
    }catch{
      errors.push('d0_review_missing:'+String(image?.story_id));
    }

    if(image.set_review_sha256!==bundle.image_acceptance.set_review_sha256) errors.push('d0_image_set_review_binding:'+image.story_id);
    const locked=acceptance?.images?.find(x=>x.story_id===image.story_id);
    if(!locked||
       locked.final_path!==image.path||
       locked.sha256!==image.sha256||
       locked.git_blob_sha!==image.git_blob_sha||
       locked.asset_version!==image.asset_version||
       locked.cache_key!==image.cache_key||
       locked.review_sha256!==image.review_sha256||
       JSON.stringify(locked.supersedes??null)!==JSON.stringify(image.supersedes??null)) {
      errors.push('d0_acceptance_image_binding:'+image.story_id);
    }

    if(actual) imageEvidence.push({
      story_id:image.story_id,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,
      width:actual.width,height:actual.height,asset_version:image.asset_version,cache_key:image.cache_key,
      review_sha256:image.review_sha256,set_review_sha256:image.set_review_sha256
    });
  }

  if(setReview){
    const byStory=new Map((setReview.candidates||[]).map(x=>[x.story_id,x]));
    for(const image of bundle.images||[]){
      const c=byStory.get(image.story_id);
      if(!c||c.final_sha256!==image.sha256) errors.push('d0_set_candidate_binding:'+image.story_id);
    }
  }
  return {errors:[...new Set(errors)],imageEvidence,acceptance,setReview};
}
