import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {completeImageExport,completeSavedImageExport,MAX_EXPORT_BYTES} from '../scripts/complete-image-export.mjs';
import {checkRealPng} from '../scripts/stage-external-image-package.mjs';

// Synthetic test pixels only; no generated or published artwork is changed.
function png(){
  const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const chunk=(name,data)=>{
    const body=Buffer.concat([Buffer.from(name),data]),out=Buffer.alloc(data.length+12);
    out.writeUInt32BE(data.length);body.copy(out,4);
    let c=0xffffffff;for(const b of body)c=table[(c^b)&255]^(c>>>8);
    out.writeUInt32BE((c^0xffffffff)>>>0,out.length-4);return out;
  };
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1200);ihdr.writeUInt32BE(630,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
    chunk('IDAT',zlib.deflateSync(Buffer.alloc((1200*3+1)*630))),chunk('IEND',Buffer.alloc(0))]);
}
const bytes=png(),identity=checkRealPng(bytes);
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'complete-image-export-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  return {dir,outputPath:path.join(dir,'ready.png')};
}
const expected={expectedSha256:identity.sha256,expectedBytes:identity.bytes};

test('awaits real export completion; inspection path is absent while exporter is in progress',async t=>{
  const {dir,outputPath}=fixture(t);let finish;
  const pending=completeImageExport({outputPath,exportPng:()=>new Promise(resolve=>{finish=resolve;})});
  assert.equal(fs.existsSync(outputPath),false);
  assert.deepEqual(fs.readdirSync(dir),[]);
  finish(bytes);const receipt=await pending;
  assert.deepEqual(fs.readFileSync(outputPath),bytes);
  assert.equal(receipt.sha256,identity.sha256);
  assert.equal(receipt.result,'LOCAL_EXPORT_COMPLETE_NOT_VISUALLY_REVIEWED');
  assert.equal(receipt.saved_pixel_review_required,true);
  assert.equal(receipt.accepted_locked,false);
  assert.equal(receipt.publication_verified,false);
  assert.deepEqual(fs.readdirSync(dir),['ready.png']);
});

test('truncated, corrupt, oversized and non-buffer exports never expose output',async t=>{
  const {dir,outputPath}=fixture(t);
  for(const bad of [bytes.subarray(0,-6),Buffer.from('not a png'),Buffer.alloc(MAX_EXPORT_BYTES+1),{path:'unfinished.png'}]){
    await assert.rejects(completeImageExport({outputPath,exportPng:async()=>bad}));
    assert.equal(fs.existsSync(outputPath),false);
    assert.deepEqual(fs.readdirSync(dir),[]);
  }
});

test('failed exporter does not create output or partial files',async t=>{
  const {dir,outputPath}=fixture(t);
  await assert.rejects(completeImageExport({outputPath,exportPng:async()=>{throw Error('export failed');}}),/export failed/);
  assert.deepEqual(fs.readdirSync(dir),[]);
});

test('completed identity mismatches fail before any target is exposed',async t=>{
  const {outputPath}=fixture(t);
  for(const override of [{expectedSha256:'0'.repeat(64)},{expectedBytes:identity.bytes+1}]){
    await assert.rejects(completeImageExport({outputPath,exportPng:async()=>bytes,...expected,...override}),/identity_mismatch/);
    assert.equal(fs.existsSync(outputPath),false);
  }
});

test('existing accepted bytes and dangling symlinks are never overwritten',async t=>{
  const {dir,outputPath}=fixture(t);fs.writeFileSync(outputPath,bytes);
  let called=false;
  await assert.rejects(completeImageExport({outputPath,exportPng:async()=>{called=true;return bytes;}}),/already_exists/);
  assert.equal(called,false);assert.deepEqual(fs.readFileSync(outputPath),bytes);
  const link=path.join(dir,'dangling.png');fs.symlinkSync(path.join(dir,'missing.png'),link);
  await assert.rejects(completeImageExport({outputPath:link,exportPng:async()=>bytes}),/already_exists/);
  assert.equal(fs.lstatSync(link).isSymbolicLink(),true);
});

test('two competing exports expose one complete file and never replace it',async t=>{
  const {dir,outputPath}=fixture(t);let finishA,finishB;
  const a=completeImageExport({outputPath,exportPng:()=>new Promise(resolve=>{finishA=resolve;})});
  const b=completeImageExport({outputPath,exportPng:()=>new Promise(resolve=>{finishB=resolve;})});
  finishA(bytes);await a;finishB(bytes);
  await assert.rejects(b,{code:'EEXIST'});
  assert.deepEqual(fs.readFileSync(outputPath),bytes);
  assert.deepEqual(fs.readdirSync(dir),['ready.png']);
});

test('saved export adapter rejects in-progress sources and requires completed identity',async t=>{
  const {dir,outputPath}=fixture(t),sourcePath=path.join(dir,'exporting.png');
  fs.writeFileSync(sourcePath,bytes.subarray(0,80));
  await assert.rejects(completeSavedImageExport({sourcePath,outputPath,...expected}),/incomplete_or_changed/);
  await assert.rejects(completeSavedImageExport({sourcePath,outputPath}),/identity_required/);
  assert.equal(fs.existsSync(outputPath),false);
  fs.writeFileSync(sourcePath,bytes);
  await completeSavedImageExport({sourcePath,outputPath,...expected});
  assert.deepEqual(fs.readFileSync(sourcePath),bytes);
  assert.deepEqual(fs.readFileSync(outputPath),bytes);
});

test('saved export adapter checks same-length corruption and disallows source replacement',async t=>{
  const {dir,outputPath}=fixture(t),sourcePath=path.join(dir,'source.png');
  const bad=Buffer.from(bytes);bad[50]^=1;fs.writeFileSync(sourcePath,bad);
  await assert.rejects(completeSavedImageExport({sourcePath,outputPath,...expected}));
  assert.equal(fs.existsSync(outputPath),false);
  await assert.rejects(completeSavedImageExport({sourcePath,outputPath:sourcePath,...expected}),/new_output_required/);
  assert.deepEqual(fs.readFileSync(sourcePath),bad);
});

test('CLI completes a validated snapshot and returns a non-acceptance receipt',t=>{
  const {dir,outputPath}=fixture(t),sourcePath=path.join(dir,'completed.png');fs.writeFileSync(sourcePath,bytes);
  const result=JSON.parse(execFileSync(process.execPath,['scripts/complete-image-export.mjs',sourcePath,outputPath,identity.sha256,String(identity.bytes)],{encoding:'utf8'}));
  assert.equal(result.exact_local_readback,true);assert.equal(result.github_readback_verified,false);
  assert.deepEqual(fs.readFileSync(outputPath),bytes);
});
