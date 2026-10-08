import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256} from '../image-capsules/util.mjs';
import {imageCorrectionFixture} from './helpers/correction-fixture.mjs';
import {readCorrectionAsset,writeCorrectionDirectory} from '../operations/correction-files.mjs';

const root=path.resolve('.');
const json=value=>JSON.stringify(value,null,2)+'\n';
function setup(ids){
  const f=imageCorrectionFixture(ids),dir=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-correction-'));
  const put=(name,data)=>{const p=path.join(dir,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.isBuffer(data)?data:json(data));return p;};
  const bundlePath=put('bundle.json',f.bundle),requestPath=put('request.json',f.request),correctionsPath=put('corrections.json',f.corrections);
  const state={schema_version:'daily-compiler-state-v1',edition_date:f.bundle.edition_date,execution_id:'fixture-e1',state:'SHADOW_VERIFIED',stage:'VERIFY',bundle:{status:'BUNDLE_READY',digest:sha256(fs.readFileSync(bundlePath))},images:{accepted:['s1','s2','s3','s4','s5','s6']},preview:{receipt:'immutable'}};
  const statePath=put('state.json',state);
  for(const c of f.corrections) put(c.replacement.image.path,f.assets[c.target.story_id]);
  const args=[bundlePath,requestPath,correctionsPath,dir,path.join(dir,'revision-output'),statePath];
  const run=()=>spawnSync(process.execPath,['scripts/apply-image-correction-batch.mjs',...args],{cwd:root,encoding:'utf8'});
  return {...f,dir,put,bundlePath,statePath,correctionsPath,args,run};
}
function snapshot(dir){
  const out={};
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()) for(const [name,digest] of Object.entries(snapshot(path.join(dir,entry.name)))) out[entry.name+'/'+name]=digest;
    else if(entry.isFile()) out[entry.name]=sha256(fs.readFileSync(path.join(dir,entry.name)));
    else out[entry.name]='symlink';
  }
  return out;
}

test('I06-T04 late stale/hash/metadata failures leave every filesystem byte unchanged',()=>{
  for(const invalid of ['stale','bytes','dimensions']){
    const f=setup(['s1','s2','s3']);
    try{
      if(invalid==='stale') f.corrections[2].target.expected_sha256='0'.repeat(64);
      if(invalid==='bytes') f.assets.s3[24]++;
      if(invalid==='dimensions') f.corrections[2].replacement.image.width=1201;
      f.put('corrections.json',f.corrections);f.put(f.corrections[2].replacement.image.path,f.assets.s3);
      const before=snapshot(f.dir),result=f.run();
      assert.notEqual(result.status,0);assert.deepEqual(snapshot(f.dir),before);
      assert.equal(fs.existsSync(f.args[4]),false);
    }finally{fs.rmSync(f.dir,{recursive:true});}
  }
});

test('I06-T03 batch CLI adds one complete revision directory, preserves terminal files, and retries identically',()=>{
  const f=setup(['s1','s2','s3','s4','s5','s6']);
  try{
    const baseState=fs.readFileSync(f.statePath),baseBundle=fs.readFileSync(f.bundlePath);
    const result=f.run();assert.equal(result.status,0,result.stderr);
    assert.deepEqual(fs.readdirSync(f.args[4]).sort(),['bundle.json','receipt.json','revision.json']);
    const revision=JSON.parse(fs.readFileSync(path.join(f.args[4],'revision.json'),'utf8'));
    assert.equal(revision.status,'VALIDATED');assert.equal(revision.base_run.state,'SHADOW_VERIFIED');
    assert.equal(revision.original_bundle_sha256,sha256(baseBundle));assert.equal(revision.execution_id,undefined);
    assert.deepEqual(fs.readFileSync(f.statePath),baseState);assert.deepEqual(fs.readFileSync(f.bundlePath),baseBundle);
    const before=snapshot(f.dir),retry=f.run();assert.equal(retry.status,0,retry.stderr);
    assert.equal(JSON.parse(retry.stdout).persistence,'UNCHANGED');assert.deepEqual(snapshot(f.dir),before);
  }finally{fs.rmSync(f.dir,{recursive:true});}
});

test('single-image CLI also validates actual replacement bytes and refuses original output paths',()=>{
  const f=setup(['s1']);
  try{
    const cPath=f.put('single.json',f.corrections[0]),out=path.join(f.dir,'single-output');
    const args=[f.statePath,f.bundlePath,cPath,path.join(out,'bundle.json'),path.join(out,'revision.json'),f.dir];
    const exec=a=>spawnSync(process.execPath,['scripts/apply-post-publication-correction.mjs',...a],{cwd:root,encoding:'utf8'});
    f.assets.s1[24]++;f.put(f.corrections[0].replacement.image.path,f.assets.s1);
    const badBefore=snapshot(f.dir),bad=exec(args);assert.notEqual(bad.status,0);assert.deepEqual(snapshot(f.dir),badBefore);
    f.assets.s1[24]--;f.put(f.corrections[0].replacement.image.path,f.assets.s1);
    const good=exec(args);assert.equal(good.status,0,good.stderr);
    assert.equal(JSON.parse(good.stdout).base_state,'SHADOW_VERIFIED');
    const originalBefore=snapshot(f.dir),overwrite=exec([f.statePath,f.bundlePath,cPath,f.bundlePath,f.statePath,f.dir]);
    assert.notEqual(overwrite.status,0);assert.deepEqual(snapshot(f.dir),originalBefore);
  }finally{fs.rmSync(f.dir,{recursive:true});}
});

test('realpath confinement refuses symlink asset escape without outputs',()=>{
  const f=setup(['s1']),outside=fs.mkdtempSync(path.join(os.tmpdir(),'correction-outside-'));
  try{
    fs.writeFileSync(path.join(outside,'secret.png'),f.assets.s1);
    const relative=f.corrections[0].replacement.image.path,p=path.join(f.dir,relative);
    fs.unlinkSync(p);fs.symlinkSync(path.join(outside,'secret.png'),p);
    assert.throws(()=>readCorrectionAsset(f.dir,relative),/asset_outside_root/);
    const before=snapshot(f.dir),result=f.run();assert.notEqual(result.status,0);assert.deepEqual(snapshot(f.dir),before);
  }finally{fs.rmSync(f.dir,{recursive:true});fs.rmSync(outside,{recursive:true});}
});

test('existing conflicting output files remain intact; no partial second write occurs',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'correction-conflict-'));
  try{
    const outDir=path.join(dir,'out');fs.mkdirSync(outDir);fs.writeFileSync(path.join(outDir,'bundle.json'),'keep');
    const before=snapshot(dir);
    assert.throws(()=>writeCorrectionDirectory({outDir,files:{'bundle.json':'replacement','revision.json':'new'}}),/output_conflict/);
    assert.deepEqual(snapshot(dir),before);
  }finally{fs.rmSync(dir,{recursive:true});}
});
