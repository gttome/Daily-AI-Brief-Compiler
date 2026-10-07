import {gitBlobSha,sha256,hex,nonempty} from './util.mjs';
import {buildRawReceipt,isImmutableRawPath,validateRawReceipt} from './persistence.mjs';

export const CHUNK_SCHEMA='daily-compiler-image-chunk-bridge-v1';
export const CHUNK_MODE='protected_base64_chunk_bridge';
const MAX_BYTES=5*1024*1024;
const CHUNK_CHARS=65536;
const MAX_CHUNKS=128;
const canonicalBase64=s=>typeof s==='string'&&s.length>0&&/^[A-Za-z0-9+/]*={0,2}$/.test(s)&&s.length%4===0&&Buffer.from(s,'base64').toString('base64')===s;

export function buildChunkBridge(bytes,{path,editionDate=null,storyId,candidateId,attempt,invocationId,contextId}){
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_BYTES||!isImmutableRawPath(path)) throw new Error('chunk_bridge_input_invalid');
  const b64=bytes.toString('base64'),chunks=[];
  for(let i=0;i<b64.length;i+=CHUNK_CHARS){
    const content=b64.slice(i,i+CHUNK_CHARS);
    chunks.push({index:chunks.length,content,sha256:sha256(content)});
  }
  if(chunks.length>MAX_CHUNKS) throw new Error('chunk_count_exceeded');
  return {
    schema_version:CHUNK_SCHEMA,path,edition_date:editionDate,story_id:storyId,candidate_id:candidateId,attempt,
    capsule_invocation_id:invocationId,capsule_context_id:contextId,
    bytes:bytes.length,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes),
    chunk_count:chunks.length,chunks
  };
}

export function reconstructChunkBridge(manifest){
  const errors=[];
  if(manifest?.schema_version!==CHUNK_SCHEMA) errors.push('chunk_schema');
  if(!isImmutableRawPath(manifest?.path)||!nonempty(manifest?.story_id)||!nonempty(manifest?.candidate_id)) errors.push('chunk_identity');
  if(!Number.isInteger(manifest?.attempt)||manifest.attempt<1||manifest.attempt>4) errors.push('chunk_attempt');
  if(!Number.isInteger(manifest?.bytes)||manifest.bytes<1||manifest.bytes>MAX_BYTES||!hex(manifest?.sha256,64)||!hex(manifest?.git_blob_sha,40)) errors.push('chunk_payload_identity');
  if(!Number.isInteger(manifest?.chunk_count)||manifest.chunk_count<1||manifest.chunk_count>MAX_CHUNKS||!Array.isArray(manifest?.chunks)||manifest.chunks.length!==manifest.chunk_count) errors.push('chunk_count');
  let joined='';
  for(let i=0;i<(manifest?.chunks||[]).length;i++){
    const c=manifest.chunks[i];
    if(c?.index!==i||typeof c?.content!=='string'||sha256(c.content)!==c.sha256) errors.push('chunk_invalid_'+i);
    joined+=c?.content||'';
  }
  if(errors.length) throw new Error([...new Set(errors)].join(';'));
  if(!canonicalBase64(joined)) throw new Error('noncanonical_base64');
  const bytes=Buffer.from(joined,'base64');
  if(bytes.length!==manifest.bytes||sha256(bytes)!==manifest.sha256||gitBlobSha(bytes)!==manifest.git_blob_sha) throw new Error('chunk_full_payload_mismatch');
  return bytes;
}

export function chunkBridgeRawReceipt(manifest,{commitSha=null,persistedAt=new Date().toISOString(),readBackVerified=true}={}){
  const bytes=reconstructChunkBridge(manifest);
  const receipt=buildRawReceipt({
    editionDate:manifest.edition_date,storyId:manifest.story_id,candidateId:manifest.candidate_id,attempt:manifest.attempt,
    path:manifest.path,bytes,persistenceMode:CHUNK_MODE,commitSha,persistedAt,
    invocationId:manifest.capsule_invocation_id,contextId:manifest.capsule_context_id,readBackVerified
  });
  const errors=validateRawReceipt(receipt,{bytes});
  if(errors.length) throw new Error(errors.join(';'));
  return receipt;
}
