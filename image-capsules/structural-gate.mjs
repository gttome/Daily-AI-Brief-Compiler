import {gitBlobSha,sha256,hex,nonempty} from './util.mjs';

export function pngDimensions(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(12,16).toString('ascii')!=='IHDR') throw new Error('valid_png_required');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

export function structuralGate({finalBytes,finalReceipt,expectedStoryId,expectedCandidateId,expectedAttempt}){
  const errors=[];
  if(!Buffer.isBuffer(finalBytes)) errors.push('final_bytes_required');
  let dims=null;
  try{dims=pngDimensions(finalBytes);}catch{errors.push('invalid_png');}
  if(dims&&(dims.width!==1200||dims.height!==630)) errors.push('final_dimensions');
  const f=finalReceipt?.final||{};
  if(finalReceipt?.schema_version!=='daily-compiler-image-final-receipt-v1') errors.push('final_receipt_schema');
  if(expectedStoryId&&finalReceipt?.story_id!==expectedStoryId) errors.push('story_identity');
  if(expectedCandidateId&&finalReceipt?.candidate_id!==expectedCandidateId) errors.push('candidate_identity');
  if(expectedAttempt&&finalReceipt?.attempt!==expectedAttempt) errors.push('attempt_identity');
  if(!nonempty(f.path)||!f.path.endsWith('/final.png')) errors.push('final_path');
  if(!hex(f.sha256,64)||!hex(f.git_blob_sha,40)||!Number.isInteger(f.bytes)||f.bytes<1) errors.push('final_identity');
  if(Buffer.isBuffer(finalBytes)){
    if(f.bytes!==finalBytes.length||f.sha256!==sha256(finalBytes)||f.git_blob_sha!==gitBlobSha(finalBytes)) errors.push('final_bytes_mismatch');
  }
  if(f.width!==1200||f.height!==630||f.format!=='png') errors.push('final_receipt_dimensions');
  if(finalReceipt?.normalization?.version!=='d0-sharp-contain-white-v1'||finalReceipt?.normalization?.fit!=='contain'||finalReceipt?.normalization?.crop!==false||finalReceipt?.normalization?.model_calls!==0) errors.push('normalization_provenance');
  if(finalReceipt?.owner_intervention!==false) errors.push('owner_intervention');
  return {
    schema_version:'daily-compiler-image-structural-gate-v3',result:errors.length?'FAIL':'PASS',
    story_id:finalReceipt?.story_id??null,candidate_id:finalReceipt?.candidate_id??null,attempt:finalReceipt?.attempt??null,
    path:f.path??null,sha256:f.sha256??null,git_blob_sha:f.git_blob_sha??null,width:dims?.width??null,height:dims?.height??null,
    errors:[...new Set(errors)]
  };
}
