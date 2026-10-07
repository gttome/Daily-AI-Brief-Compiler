import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRawReceipt,validateRawReceipt,isImmutableRawPath} from '../image-capsules/persistence.mjs';
import {buildChunkBridge,reconstructChunkBridge,chunkBridgeRawReceipt} from '../image-capsules/chunk-bridge.mjs';

const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(64,7)]);
test('raw receipt binds exact bytes and immutable attempt path',()=>{
 const path='shadow-runs/2026-10-08/images/attempts/story-1/a01/raw.png';
 assert.equal(isImmutableRawPath(path),true);
 const r=buildRawReceipt({editionDate:'2026-10-08',storyId:'story-1',candidateId:'c1',attempt:1,path,bytes:png,invocationId:'i1',contextId:'ctx1'});
 assert.deepEqual(validateRawReceipt(r,{bytes:png}),[]);
 assert.ok(validateRawReceipt(r,{bytes:Buffer.from(png).fill(9,20,21)}).includes('raw_bytes_mismatch'));
});
test('chunk bridge reconstructs exact payload and rejects changed chunk',()=>{
 const path='shadow-runs/2026-10-08/images/attempts/story-1/a01/raw.png';
 const m=buildChunkBridge(png,{path,editionDate:'2026-10-08',storyId:'story-1',candidateId:'c1',attempt:1,invocationId:'i1',contextId:'ctx1'});
 assert.deepEqual(reconstructChunkBridge(m),png);
 const r=chunkBridgeRawReceipt(m);
 assert.deepEqual(validateRawReceipt(r,{bytes:png}),[]);
 const bad=structuredClone(m); bad.chunks[0].content=bad.chunks[0].content.replace(/A/,'B');
 assert.throws(()=>reconstructChunkBridge(bad),/chunk_invalid/);
});
test('attempt raw paths are immutable and bounded to four attempts',()=>{
 assert.equal(isImmutableRawPath('shadow-runs/2026-10-08/images/attempts/s/a04/raw.png'),true);
 assert.equal(isImmutableRawPath('shadow-runs/2026-10-08/images/attempts/s/a05/raw.png'),false);
 assert.equal(isImmutableRawPath('shadow-runs/2026-10-08/images/attempts/s/a01/final.png'),false);
});
