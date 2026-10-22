#!/usr/bin/env node
// Local image-package bytes + AAR readiness BEFORE final branch ref promotion.
// This never substitutes for connected GitHub readback, protected PR CI or real pixel QA.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {checkRealPng} from './stage-external-image-package.mjs';
const fail=s=>{throw Error('image_local_promotion_preflight:'+s);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function preflightLocalImagePromotion({manifest,aar,root='.'}){
  const date=manifest?.edition_date,absolute=path.resolve(root),images=manifest?.images;
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date||'')||!Array.isArray(images)||images.length!==6||
     manifest.schema_version!=='external-compiler-image-package-v1'||
     aar?.edition_date!==date||aar?.job_sha256!==manifest.job_sha256||
     aar.original_bundle_sha256!==manifest.original_bundle_sha256||
     aar.original_source_commit_sha!==manifest.original_source_commit_sha||
     !aar.production||aar.production.accepted_count!==6||
     !Number.isSafeInteger(aar.production.rejected_count)||aar.production.rejected_count<0||
     aar.production.actual_generation_count!==6+aar.production.rejected_count||
     aar.production.accepted_art_regenerated_after_lock!==0||
     !Array.isArray(aar.images)||aar.images.length!==6)
    fail('six_complete_images_and_source_bound_aar_required');
  const seen=new Set(),reviewed=new Map(aar.images.map(x=>[x.story_id,x]));
  if(reviewed.size!==6||aar.images.reduce((n,x)=>n+x.generation_attempts,0)!==
     aar.production.actual_generation_count)fail('generation_attempt_accounting');
  const checked=[];
  for(const item of images){
    if(!/^[a-z0-9-]+$/.test(item.story_id||'')||seen.has(item.story_id)||
       !/^[a-f0-9]{64}$/.test(item.sha256||'')||
       item.accepted_locked!==true||item.visual_review?.result!=='PASS'||
       item.visual_review?.inspected_png_sha256!==item.sha256||
       reviewed.get(item.story_id)?.sha256!==item.sha256)
      fail('image_story_review_or_unique_sha_mismatch');
    seen.add(item.story_id);
    const expected='external-image-packages/'+date+'/images/'+item.story_id+'.png';
    if(item.path!==expected)fail('noncanonical_image_path:'+item.story_id);
    const file=path.resolve(absolute,item.path);
    if(!file.startsWith(absolute+path.sep)||!fs.existsSync(file))fail('missing_or_unsafe_file:'+item.story_id);
    const bytes=fs.readFileSync(file),png=checkRealPng(bytes);
    if(png.sha256!==item.sha256||png.bytes!==item.bytes||
       png.git_blob_sha!==item.git_blob_sha||png.width!==1200||png.height!==630)
      fail('image_not_exact_original_1200x630_saved_bytes:'+item.story_id);
    const reviewPath=item.visual_review.review_evidence_path;
    if(!reviewPath?.startsWith('external-image-packages/'+date+'/reviews/')||
       !reviewPath.endsWith('.json')||!fs.existsSync(path.resolve(absolute,reviewPath)))
      fail('individual_visual_review_file_missing:'+item.story_id);
    checked.push({story_id:item.story_id,sha256:sha(bytes)});
  }
  return {result:'SIX_LOCAL_IMAGE_BYTES_AND_AAR_READY',edition_date:date,
    verified_images:checked,actual_generation_count:aar.production.actual_generation_count,
    first_pass_count:Number.isInteger(aar.production.first_pass_accepted_count)?
      aar.production.first_pass_accepted_count:null,
    remote_git_and_ci_and_publication_still_required:true,true_pixel_qa_not_inferred:true};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const [manifestFile,aarFile,root='.']=process.argv.slice(2);
  if(!manifestFile||!aarFile)fail('usage: node preflight-image-branch-promotion.mjs <manifest.json> <after-action.json> [repo-root]');
  const result=preflightLocalImagePromotion({
    manifest:JSON.parse(fs.readFileSync(manifestFile,'utf8')),
    aar:JSON.parse(fs.readFileSync(aarFile,'utf8')),root});
  console.log(JSON.stringify(result,null,2));
}
