import crypto from 'node:crypto';
import {assertD1AcceptanceManifest} from '../image-studio/acceptance.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';

export function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
export function gitBlobSha(bytes){
  const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
}
export function pngDimensions(bytes){
  const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(b.length<24||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw new Error('invalid_png_signature');
  if(b.subarray(12,16).toString('ascii')!=='IHDR') throw new Error('png_ihdr_missing');
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
}

export function validateD1CloudAssets(manifest,assetsById){
  const errors=[],evidence=[];
  const m=assertD1AcceptanceManifest(manifest);
  const getter=id=>assetsById instanceof Map?assetsById.get(id):assetsById?.[id];
  for(const image of manifest.images){
    const bytes=getter(image.cloud_asset_id);
    if(!bytes){errors.push('asset_missing:'+image.story_id);continue;}
    const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
    let dims;
    try{dims=pngDimensions(b);}catch(err){errors.push('asset_png:'+image.story_id+':'+err.message);continue;}
    const actual=sha256(b);
    if(b.length!==image.bytes) errors.push('asset_bytes:'+image.story_id);
    if(actual!==image.sha256) errors.push('asset_sha256:'+image.story_id);
    if(dims.width!==1200||dims.height!==630) errors.push('asset_dimensions:'+image.story_id);
    evidence.push({story_id:image.story_id,cloud_asset_id:image.cloud_asset_id,target_path:image.target_path,sha256:actual,git_blob_sha:gitBlobSha(b),bytes:b.length,width:dims.width,height:dims.height});
  }
  if(evidence.length!==6) errors.push('asset_evidence_count');
  return {result:errors.length?'FAIL':'PASS',errors:[...new Set(errors)],manifest_sha256:m.manifest_sha256,evidence};
}

export function buildD1WorkPorterReceipt({manifest,assetsById,gitReadbackByStory,recordedAt=new Date().toISOString()}={}){
  const validation=validateD1CloudAssets(manifest,assetsById);
  if(validation.result!=='PASS') throw new Error('D1 asset integrity failed: '+validation.errors.join(';'));
  const rows=[];
  for(const evidence of validation.evidence){
    const rb=gitReadbackByStory?.[evidence.story_id];
    if(!rb||rb.sha256!==evidence.sha256||rb.git_blob_sha!==evidence.git_blob_sha||rb.target_path!==evidence.target_path) throw new Error('D1 Git readback mismatch: '+evidence.story_id);
    rows.push({
      story_id:evidence.story_id,source_sha256:evidence.sha256,target_path:evidence.target_path,
      git_blob_sha:evidence.git_blob_sha,readback_sha256:rb.sha256,dimensions:'1200x630',integrity_result:'PASS'
    });
  }
  return {
    schema_version:'daily-compiler-d1-work-porter-receipt-v1',result:'PASS',scope:'IMAGE_PACKAGE_INGEST',
    recorded_at:recordedAt,manifest_sha256:canonicalSha(manifest),images:rows,
    visual_quality_review_performed:false,image_generation_performed:false,owner_intervention:false
  };
}
