import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';
import {assertD1AcceptanceManifest} from './acceptance.mjs';
import {validateD1Activation} from './activation.mjs';
import {sha256,gitBlobSha,pngDimensions} from '../work-porter/integrity.mjs';

const safeRel=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x==='');
const readJson=(root,p)=>JSON.parse(fs.readFileSync(path.resolve(root,p),'utf8'));

export function validateD1BundleImages({bundle,repoRoot='.'}={}){
  const errors=[],evidence=[];
  const sys=bundle?.image_system||{};
  if(sys.strategy!=='d1_cloud_image_studio') return {result:'NOT_D1',errors:[],evidence:[]};

  const activation=validateD1Activation({repoRoot});
  if(activation.result!=='PASS') errors.push(...activation.errors.map(x=>'activation:'+x));

  if(sys.contract_version!=='daily-compiler-image-contract-v4') errors.push('d1_contract_version');
  for(const f of ['acceptance_manifest_path','acceptance_manifest_sha256','work_porter_receipt_path','work_porter_receipt_sha256']){
    if(!safeRel(sys[f])) errors.push('d1_image_system_'+f);
  }
  if(!Array.isArray(bundle?.images)||bundle.images.length!==6) errors.push('d1_exactly_six_images');
  if(errors.length) return {result:'FAIL',errors:[...new Set(errors)],evidence};

  let manifest,porter;
  try{
    manifest=readJson(repoRoot,sys.acceptance_manifest_path);
    assertD1AcceptanceManifest(manifest);
    if(canonicalSha(manifest)!==sys.acceptance_manifest_sha256) errors.push('d1_manifest_digest_mismatch');
  }catch(err){errors.push('d1_manifest_invalid:'+err.message);}
  try{
    porter=readJson(repoRoot,sys.work_porter_receipt_path);
    if(porter?.schema_version!=='daily-compiler-d1-work-porter-receipt-v1'||porter?.result!=='PASS'||porter?.scope!=='IMAGE_PACKAGE_INGEST') errors.push('d1_porter_receipt_identity');
    if(porter?.visual_quality_review_performed!==false||porter?.image_generation_performed!==false||porter?.owner_intervention!==false) errors.push('d1_porter_scope_violation');
    if(canonicalSha(porter)!==sys.work_porter_receipt_sha256) errors.push('d1_porter_receipt_digest_mismatch');
    if(porter?.manifest_sha256!==sys.acceptance_manifest_sha256) errors.push('d1_porter_manifest_binding');
  }catch(err){errors.push('d1_porter_receipt_invalid:'+err.message);}

  const storyIds=new Set(),hashes=new Set();
  for(const image of bundle.images||[]){
    const story=image?.story_id;
    if(!story||storyIds.has(story)){errors.push('d1_story_identity');continue;}
    storyIds.add(story);
    if(image.image_system!=='d1_cloud_image_studio'||image.accepted!==true||image.accepted_locked!==true) errors.push('d1_image_not_locked:'+story);
    if(!safeRel(image.path)||!image.sha256||!image.git_blob_sha||!image.asset_version||!image.cache_key) errors.push('d1_image_fields:'+story);
    hashes.add(image.sha256);

    const accepted=manifest?.images?.find(x=>x.story_id===story);
    if(!accepted||accepted.target_path!==image.path||accepted.sha256!==image.sha256||accepted.accepted_locked!==true||accepted.visual_acceptance!=='PASS') errors.push('d1_manifest_binding:'+story);

    const ported=porter?.images?.find(x=>x.story_id===story);
    if(!ported||ported.target_path!==image.path||ported.source_sha256!==image.sha256||ported.readback_sha256!==image.sha256||ported.git_blob_sha!==image.git_blob_sha||ported.integrity_result!=='PASS') errors.push('d1_porter_binding:'+story);

    try{
      const bytes=fs.readFileSync(path.resolve(repoRoot,image.path));
      const dims=pngDimensions(bytes);
      if(dims.width!==1200||dims.height!==630) errors.push('d1_dimensions:'+story);
      if(sha256(bytes)!==image.sha256) errors.push('d1_sha256:'+story);
      if(gitBlobSha(bytes)!==image.git_blob_sha) errors.push('d1_git_blob:'+story);
      evidence.push({story_id:story,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,width:dims.width,height:dims.height});
    }catch(err){errors.push('d1_asset_unreadable:'+story+':'+err.message);}
  }
  if(storyIds.size!==6) errors.push('d1_unique_story_count');
  if(hashes.size!==6) errors.push('d1_unique_byte_streams');
  return {result:errors.length?'FAIL':'PASS',errors:[...new Set(errors)],evidence};
}
