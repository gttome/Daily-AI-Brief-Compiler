import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeBuffer,normalizationOptions,buildFinalReceipt} from '../image-capsules/normalize.mjs';
import {buildRawReceipt} from '../image-capsules/persistence.mjs';
import {structuralGate,pngDimensions} from '../image-capsules/structural-gate.mjs';
import {sha256} from '../image-capsules/util.mjs';

test('normalization is deterministic exact 1200x630 contain with white background and raw unchanged',async()=>{
 const raw=await sharp({create:{width:100,height:100,channels:3,background:{r:30,g:80,b:120}}}).png().toBuffer();
 const before=Buffer.from(raw),a=await normalizeBuffer(raw),b=await normalizeBuffer(raw);
 assert.equal(sha256(a),sha256(b));
 assert.deepEqual(raw,before);
 assert.deepEqual(pngDimensions(a),{width:1200,height:630});
 assert.equal(normalizationOptions.fit,'contain');
 const pixel=await sharp(a).raw().toBuffer({resolveWithObject:true});
 const left=[pixel.data[0],pixel.data[1],pixel.data[2]];
 assert.deepEqual(left,[255,255,255]);
});
test('final receipt and structural gate bind normalized bytes',async()=>{
 const raw=await sharp({create:{width:200,height:100,channels:3,background:{r:1,g:2,b:3}}}).png().toBuffer();
 const rawPath='shadow-runs/2026-10-08/images/attempts/s/a01/raw.png';
 const rr=buildRawReceipt({editionDate:'2026-10-08',storyId:'s',candidateId:'c',attempt:1,path:rawPath,bytes:raw,invocationId:'i',contextId:'ctx'});
 const finalBytes=await normalizeBuffer(raw),fr=buildFinalReceipt({rawReceipt:rr,finalBytes});
 const gate=structuralGate({finalBytes,finalReceipt:fr,expectedStoryId:'s',expectedCandidateId:'c',expectedAttempt:1});
 assert.equal(gate.result,'PASS');
 assert.equal(fr.normalization.crop,false);
});
test('invalid PNG fails normalization or structural validation',async()=>{
 await assert.rejects(()=>normalizeBuffer(Buffer.from('not a png')));
 assert.throws(()=>pngDimensions(Buffer.from('not a png')),/valid_png_required/);
});
