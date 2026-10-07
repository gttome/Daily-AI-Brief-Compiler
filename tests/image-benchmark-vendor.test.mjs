import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {buildAtlases} from '../scripts/build-benchmark-atlas.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('locked benchmark source bytes match provenance',()=>{
 const p=JSON.parse(fs.readFileSync('vendor/image-benchmark/PROVENANCE.json','utf8'));
 assert.equal(p.assets.length,12);
 for(const a of p.assets){
   const b=fs.readFileSync(a.local_path);
   assert.equal(b.length,a.bytes,a.local_path);
   assert.equal(sha(b),a.sha256,a.local_path);
 }
});
test('benchmark atlases are generated deterministically from vendored bytes',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'d0-benchmark-'));
 fs.cpSync('vendor/image-benchmark',tmp,{recursive:true});
 const a=await buildAtlases(tmp),hashes=a.map(x=>sha(fs.readFileSync(x.outPath)));
 const b=await buildAtlases(tmp),hashes2=b.map(x=>sha(fs.readFileSync(x.outPath)));
 assert.deepEqual(hashes,hashes2);
 assert.equal(a.length,2);
});
