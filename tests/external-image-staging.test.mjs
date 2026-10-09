import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {checkRealPng,validateExternalImagePackage,verifyRemoteStagedPackage} from '../scripts/stage-external-image-package.mjs';
import {OCT8_LIVE_BASELINE,auditOct8Response} from '../scripts/audit-oct8-live.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(buf){let c=0xffffffff;for(const b of buf)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){
  const t=Buffer.from(type),len=Buffer.alloc(4),check=Buffer.alloc(4);
  len.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([t,data])));
  return Buffer.concat([len,t,data,check]);
}
function png(seed){
  const width=1200,height=630,ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  const row=width*4+1,raw=Buffer.alloc(row*height);
  for(let y=0;y<height;y++){
    raw[y*row]=0;
    for(let x=0;x<width;x++){const k=y*row+1+x*4;raw[k]=(x+seed*11)&255;raw[k+1]=(y+seed*19)&255;raw[k+2]=seed;raw[k+3]=255;}
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
function stagedFixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'external-stage-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);git(root,['config','user.email','test@example.test']);git(root,['config','user.name','Image unit fixture']);
  const date='2026-10-11',ids=Array.from({length:6},(_,i)=>'story-'+(i+1));
  const job={schema_version:'external-compiler-image-job-v1',edition_date:date,execution_id:'compiler-'+date+'-r1',
    lifecycle:'PUBLISHED_PENDING',accepted_images:0,placeholder:{count:6},
    source:{branch:'shadow/'+date,commit_sha:'a'.repeat(40),bundle_sha256:'b'.repeat(64)},
    stories:ids.map(id=>({story_id:id,expected_stage_path:'external-image-packages/'+date+'/images/'+id+'.png',primary_source:{url:'https://source.test/'+id}}))};
  const jobBytes=Buffer.from(JSON.stringify(job,null,2)+'\n');
  const images=ids.map((id,i)=>{
    const asset=png(i+1),relative=job.stories[i].expected_stage_path;
    fs.mkdirSync(path.dirname(path.join(root,relative)),{recursive:true});fs.writeFileSync(path.join(root,relative),asset);
    return {story_id:id,path:relative,accepted_locked:true,sha256:hash(asset),git_blob_sha:blob(asset),bytes:asset.length,
      visual_review:{result:'PASS',inspected_png_sha256:hash(asset),pixel_inspection_method:'persisted_git_binary',
        story_id:id,verified_original_source_url:job.stories[i].primary_source.url,
        factual_fidelity_verified:true,quality_and_visual_text_verified:true,distinct_from_other_five_verified:true,
        mechanism_and_quality_notes:'TEST FIXTURE ONLY. Evidence is a simulated positive structure, not a real Work review.'}
    };
  });
  git(root,['add','.']);git(root,['commit','-qm','TEST FIXTURE ONLY: synthetic PNGs']);
  const manifest={schema_version:'external-compiler-image-package-v1',edition_date:date,execution_id:job.execution_id,
    original_bundle_sha256:job.source.bundle_sha256,original_source_commit_sha:job.source.commit_sha,
    job_sha256:hash(jobBytes),expected_pages_history_head:'c'.repeat(40),
    external_operator_cold_start_evidence:{actual_work_session:true,fresh_no_prior_chat:true,
      handoff_url_used:'https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/EXTERNAL_WORK_HANDOFF.md'},
    set_review:{result:'PASS',independent_saved_pixel_review:true,
      differentiation_evidence:'TEST FIXTURE ONLY. Six unique deliberately different synthetic samples are structurally bound to distinct story IDs, but NOT visually approved.',
      reviewed_sha256s:images.map(r=>r.sha256)},images};
  return {job,jobBytes,manifest,repoRoot:root};
}
test('six actual committed synthetic PNGs are byte-, git-, and size-bound (structural only)',async t=>{
  const f=stagedFixture(t),receipt=validateExternalImagePackage(f);
  assert.equal(receipt.result,'STAGED_ONLY');
  assert.equal(receipt.exact_git_readback,true);
  assert.equal(receipt.release_ready,false);
  const m=new Map(f.manifest.images.map(r=>[r.path,fs.readFileSync(path.join(f.repoRoot,r.path))]));
  const remote=await verifyRemoteStagedPackage(receipt,{fetchImpl:async url=>{
    const entry=[...m].find(([relative])=>url.endsWith('/'+relative));
    return entry?{status:200,arrayBuffer:async()=>entry[1]}:{status:404,arrayBuffer:async()=>Buffer.alloc(0)};
  }});
  assert.equal(remote.remote_assets.length,6);
  assert.equal(remote.remote_git_readback,true);
  assert.equal(remote.release_ready,false);
});
test('pixel bytes, source binding, stale index and prior lock tampering fail closed',t=>{
  const f=stagedFixture(t);
  assert.throws(()=>validateExternalImagePackage({...f,manifest:{...f.manifest,job_sha256:'d'.repeat(64)}}),/stale_or_unbound/);
  const bad=structuredClone(f.manifest);bad.images[0].visual_review.inspected_png_sha256='f'.repeat(64);
  assert.throws(()=>validateExternalImagePackage({...f,manifest:bad}),/saved_pixel/);
  const dup=structuredClone(f.manifest);dup.images[1].sha256=dup.images[0].sha256;
  assert.throws(()=>validateExternalImagePackage({...f,manifest:dup}),/set_review_hash_or_duplication|committed_png/);
  const broken=Buffer.from(fs.readFileSync(path.join(f.repoRoot,f.manifest.images[0].path)));broken[45]^=0xff;
  assert.throws(()=>checkRealPng(broken),/png_crc|png_inflate/);
  fs.writeFileSync(path.join(f.repoRoot,f.manifest.images[0].path),broken);
  assert.throws(()=>validateExternalImagePackage(f),/worktree_differs/);
});
test('all 17 October 8 pins are present; bad HTTP and bad byte hashes fail closed',()=>{
  assert.equal(Object.keys(OCT8_LIVE_BASELINE).length,17);
  assert.equal(Object.keys(OCT8_LIVE_BASELINE).filter(s=>s.endsWith('.png')).length,6);
  const route='briefs/2026-10-08/index.html';
  assert.throws(()=>auditOct8Response(route,404,Buffer.alloc(0)),/live_http/);
  assert.throws(()=>auditOct8Response(route,200,Buffer.from('wrong')),/live_oct8_hash/);
});
