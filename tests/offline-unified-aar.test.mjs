import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tool=path.join(root,'scripts/package-offline-unified-aar.mjs');
const edition='2026-10-13', cycle='2026-10-12';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sig=Buffer.from('89504e470d0a1a0a','hex');
function crc32(data){
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
 const name=Buffer.from(type);
 const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
 const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([name,data])),0);
 return Buffer.concat([len,name,data,crc]);
}
function fakeValidPng(i){
 const w=1200,h=630;const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
 const row=Buffer.alloc(w*3+1,0);
 for(let x=0;x<w;x++){row[1+3*x]=i*25;row[2+3*x]=255-i*20;row[3+3*x]=40+i*10;}
 const idat=zlib.deflateSync(Buffer.concat(Array.from({length:h},()=>row)),{level:1});
 return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}
function setup(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aar-offline-'));
 const input=path.join(tmp,'evidence'),out=path.join(tmp,'out');
 fs.mkdirSync(input,{recursive:true});
 const git=(...args)=>execFileSync('git',args,{cwd:tmp,stdio:'pipe'});
 git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.com');
 const images=[];const manifest=[];
 const stem='external-image-packages/'+edition+'/images/';
 let md='# Unified AAR\n\n**🟩 RELEASE COMPLETE**\n\n### Published illustrations\n';
 for(let i=0;i<6;i++){
   const id='story-'+i, fn='dab-edition-'+edition+'-m0'+i+'.png';
   const stored='illustration-'+i+'.png';
   const bytes=fakeValidPng(i);
   fs.mkdirSync(path.join(tmp,stem),{recursive:true});fs.writeFileSync(path.join(tmp,stem,stored),bytes);
   const route='briefs/images/'+edition+'/'+fn;
   images.push({story_id:id,sha256:sha(bytes),bytes:bytes.length,route});
   manifest.push({story_id:id,sha256:sha(bytes),accepted_locked:true,path:stem+stored});
   md+='<a href="https://gttome.github.io/Daily-AI-Brief-Compiler/'+route+'"><img src="https://gttome.github.io/Daily-AI-Brief-Compiler/'+route+'" alt="Diagram '+id+'"/></a>\n';
 }
 git('add','.');git('commit','-q','-m','Fixtures');git('update-ref','refs/remotes/origin/main',git('rev-parse','HEAD').toString().trim());
 fs.writeFileSync(path.join(input,'image-release.json'),JSON.stringify({edition_date:edition,result:'RELEASED_VERIFIED',images}));
 fs.writeFileSync(path.join(input,'image-manifest.json'),JSON.stringify({edition_date:edition,images:manifest}));
 const report=path.join(tmp,'combined.md');fs.writeFileSync(report,md);
 return {tmp,input,out,report,images,manifest};
}
function run(t){
 return spawnSync(process.execPath,[tool,cycle,t.report,t.input,t.out],{cwd:t.tmp,encoding:'utf8'});
}
test('packages original protected Git PNGs for fully offline local Typora references',()=>{
 const t=setup();
 try {
  const v=run(t);assert.equal(v.status,0,v.stderr);
  assert.match(v.stdout,/OFFLINE_PACKAGE_READY/);
  const md=fs.readFileSync(path.join(t.out,'combined.md'),'utf8');
  assert.doesNotMatch(md,/shields\.io/);
  assert.doesNotMatch(md,/<img src="https:\/\//);
  assert.equal((md.match(/<img src="images\//g)||[]).length,6);
  for(const item of t.images){
   const f=path.join(t.out,'images',path.basename(item.route));
   assert.equal(sha(fs.readFileSync(f)),item.sha256);
  }
  assert.ok(fs.existsSync(path.join(t.out,'README.txt')));
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
test('external decorative badge is rejected instead of shipping broken remote media',()=>{
 const t=setup();
 try {
  fs.appendFileSync(t.report,'\n![badge](https://img.shields.io/badge/bad)\n');
  const v=run(t);assert.notEqual(v.status,0);assert.match(v.stderr,/external decorative image badges/i);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
test('any changed pixel bytes or SHA mismatch fails closed',()=>{
 const t=setup();
 try {
  const wrong={edition_date:edition,images:t.manifest.map(x=>({...x}))};
  wrong.images[0].sha256='0'.repeat(64);
  fs.writeFileSync(path.join(t.input,'image-manifest.json'),JSON.stringify(wrong));
  const v=run(t);assert.notEqual(v.status,0);assert.match(v.stderr,/manifest\/release mismatch/i);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
test('unfinished image release produces no synthetic offline image package',()=>{
 const t=setup();
 try {
  fs.unlinkSync(path.join(t.input,'image-release.json'));
  const v=run(t);assert.equal(v.status,0,v.stderr);
  assert.match(v.stdout,/SKIPPED_RELEASE_NOT_VERIFIED/);
  assert.equal(fs.existsSync(path.join(t.out,'combined.md')),false);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});