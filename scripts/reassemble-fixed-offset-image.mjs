// Fixed 256-KiB-offset binary transport for accepted PNGs >750 KiB.
// This reconstructs previously accepted bytes; it must never generate images.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkRealPng} from './stage-external-image-package.mjs';

export const SEGMENT_BYTES=256*1024;
export const SEGMENT_THRESHOLD=750*1024;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const fail=x=>{throw Error('fixed_offset_png_transport:'+x);};
export function reassembleFixedOffsetPng({segments,bytes,sha256,git_blob_sha}){
  if(!Number.isSafeInteger(bytes)||bytes<70||bytes>8*1024*1024||
    !/^[a-f0-9]{64}$/.test(sha256||'')||!/^[a-f0-9]{40}$/.test(git_blob_sha||'')||
    !Array.isArray(segments))fail('BAD_SEGMENT_MANIFEST');
  const count=Math.ceil(bytes/SEGMENT_BYTES);
  if(segments.length!==count)fail('MISSING_OR_DUPLICATED_SEGMENTS');
  const parts=[];
  for(let i=0;i<count;i++){
    const s=segments[i],offset=i*SEGMENT_BYTES;
    if(s?.offset!==offset||typeof s.base64!=='string'||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s.base64))
      fail('SEGMENT_OFFSET_OR_ENCODING:'+i);
    const part=Buffer.from(s.base64,'base64');
    if(part.toString('base64')!==s.base64||
      part.length!==Math.min(SEGMENT_BYTES,bytes-offset))
      fail('SEGMENT_LENGTH_OR_TRUNCATION:'+i);
    parts.push(part);
  }
  const saved=Buffer.concat(parts);
  if(saved.length!==bytes||hash(saved)!==sha256||blob(saved)!==git_blob_sha)
    fail('EXACT_BYTES_SHA256_OR_GIT_BLOB_MISMATCH');
  const inspected=checkRealPng(saved);
  return {png:saved,receipt:{result:'EXACT_PNG_REASSEMBLED_NOT_RELEASED',
    ...inspected,segment_count:count,segment_bytes:SEGMENT_BYTES,
    large_png_segmented:bytes>SEGMENT_THRESHOLD}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)fail('USAGE_JSON_MANIFEST_AND_NEW_OUTPUT_PNG_REQUIRED');
  const m=JSON.parse(fs.readFileSync(input,'utf8'));
  const r=reassembleFixedOffsetPng(m);
  fs.writeFileSync(output,r.png,{flag:'wx'}); // never overwrite accepted bytes
  process.stdout.write(JSON.stringify(r.receipt)+'\n');
}
