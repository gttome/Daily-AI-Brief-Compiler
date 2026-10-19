import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {verifyReaderLive} from '../scripts/verify-reader-live-readback.mjs';

const url='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const response=(status,bytes)=>({status,arrayBuffer:async()=>Uint8Array.from(Buffer.from(bytes)).buffer});
function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reader-live-proof-'));
  const route='briefs/2026-10-19/index.html';
  const expected=Buffer.from('<html>Corrected article without unverified Earlier Brief</html>');
  fs.mkdirSync(path.dirname(path.join(dir,route)),{recursive:true});
  fs.writeFileSync(path.join(dir,route),expected);
  return {dir,route,expected,receipt:{
    result:'PASS',files_changed:1,changed:[{route,current_sha256:sha(expected)}]
  }};
}
test('eventually correct live bytes pass after stale CDN responses with unique revision queries',async()=>{
  const f=fixture();
  let reads=0,sleeps=0;
  try{
    const result=await verifyReaderLive({
      siteDir:f.dir,receipt:f.receipt,siteUrl:url,revision:'abcdef123456',
      fetchImpl:async href=>{
        reads++;
        assert.ok(href.includes('readback-attempt='+reads));
        return response(200,reads<=2?'<html>Stale content</html>':f.expected);
      },
      delayImpl:async()=>{sleeps++;},
      intervalMs:0,maxAttempts:4,concurrency:1,log:()=>{}
    });
    assert.equal(result.result,'PASS');
    assert.equal(result.verified_routes,1);
    assert.equal(result.attempts,3);
    assert.equal(reads,3);assert.equal(sleeps,2);
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('persistently stale live bytes never return a PASS',async()=>{
  const f=fixture();
  try{
    await assert.rejects(()=>verifyReaderLive({
      siteDir:f.dir,receipt:f.receipt,siteUrl:url,revision:'abcdef123456',
      fetchImpl:async()=>response(200,'<html>Stale content</html>'),
      delayImpl:async()=>{},maxAttempts:2,intervalMs:0,log:()=>{}
    }),/readback incomplete/);
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('staged hash mismatch fails before any HTTP call',async()=>{
  const f=fixture();
  f.receipt.changed[0].current_sha256=sha('wrong');
  try{
    await assert.rejects(()=>verifyReaderLive({
      siteDir:f.dir,receipt:f.receipt,siteUrl:url,revision:'abcdef123456',
      fetchImpl:async()=>{throw Error('must never fetch');},
      delayImpl:async()=>{},maxAttempts:1,log:()=>{}
    }),/staged hash mismatch/);
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
