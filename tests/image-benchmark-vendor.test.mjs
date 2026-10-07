import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('locked benchmark is vendored with exact provenance and deterministic atlases',()=>{
 const p=JSON.parse(fs.readFileSync('vendor/image-benchmark/PROVENANCE.json','utf8'));
 assert.equal(p.profile_id,'sep09-sep10-premium3-v1');
 assert.equal(p.source_repository,'gttome/Daily-AI-Brief');
 assert.equal(p.source_sha,'081d9f635b361ac164aa46feb31dda58794a6480');
 assert.equal(p.assets.length,12);
 for(const a of p.assets){const b=fs.readFileSync(a.target_path); assert.equal(sha(b),a.sha256); assert.equal(a.copied_byte_identity,true);}
 for(const key of ['sep09_atlas','sep10_atlas']){const a=p[key]; assert.equal(sha(fs.readFileSync(a.path)),a.sha256); assert.equal(a.width,1200); assert.equal(a.height,630);}
});
