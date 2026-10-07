import {gitBlobSha,sha256} from './util.mjs';
import {validateRawReceipt} from './persistence.mjs';

export const NORMALIZATION_VERSION='d0-sharp-contain-white-v1';
export const normalizationOptions=Object.freeze({
  width:1200,height:630,fit:'contain',background:{r:255,g:255,b:255,alpha:1},
  png:{compressionLevel:9,adaptiveFiltering:false,palette:false}
});

export async function normalizeBuffer(rawBytes){
  if(!Buffer.isBuffer(rawBytes)||rawBytes.length<24) throw new Error('raw_png_required');
  const sharp=(await import('sharp')).default;
  const input=Buffer.from(rawBytes);
  const before=sha256(input);
  const output=await sharp(input,{failOn:'error'})
    .resize(normalizationOptions.width,normalizationOptions.height,{
      fit:normalizationOptions.fit,background:normalizationOptions.background,withoutEnlargement:false
    })
    .png(normalizationOptions.png)
    .toBuffer();
  if(sha256(input)!==before) throw new Error('raw_bytes_mutated');
  const meta=await sharp(output).metadata();
  if(meta.format!=='png'||meta.width!==1200||meta.height!==630) throw new Error('normalization_dimensions_invalid');
  return output;
}

export function finalPathFromRaw(rawPath){
  if(typeof rawPath!=='string'||!rawPath.endsWith('/raw.png')) throw new Error('raw_path_required');
  return rawPath.slice(0,-7)+'final.png';
}

export function buildFinalReceipt({rawReceipt,finalBytes,finalPath=finalPathFromRaw(rawReceipt?.path),normalizedAt=new Date().toISOString()}){
  const rawErrors=validateRawReceipt(rawReceipt);
  if(rawErrors.length) throw new Error(rawErrors.join(';'));
  if(!Buffer.isBuffer(finalBytes)||finalBytes.length<24) throw new Error('final_bytes_required');
  return {
    schema_version:'daily-compiler-image-final-receipt-v1',
    story_id:rawReceipt.story_id,candidate_id:rawReceipt.candidate_id,attempt:rawReceipt.attempt,
    raw:{path:rawReceipt.path,sha256:rawReceipt.sha256,git_blob_sha:rawReceipt.git_blob_sha,bytes:rawReceipt.bytes},
    normalization:{version:NORMALIZATION_VERSION,fit:'contain',background:'#ffffff',crop:false,model_calls:0},
    final:{path:finalPath,bytes:finalBytes.length,sha256:sha256(finalBytes),git_blob_sha:gitBlobSha(finalBytes),width:1200,height:630,format:'png'},
    normalized_at:normalizedAt,owner_intervention:false
  };
}
