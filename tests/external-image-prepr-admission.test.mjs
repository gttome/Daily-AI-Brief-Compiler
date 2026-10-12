// Structural fixtures are intentionally synthetic. A PASS proves receipt and
// byte identity enforcement, not that an AI illustration was truly inspected.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {preflightRecurringImagePackage} from '../scripts/preflight-recurring-image-package.mjs';
import {checkRealPng} from '../scripts/stage-external-image-package.mjs';
import {SEGMENT_BYTES,reassembleFixedOffsetPng} from '../scripts/reassemble-fixed-offset-image.mjs';

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const write=(root,p,b)=>{
  const loc=path.join(root,p);fs.mkdirSync(path.dirname(loc),{recursive:true});fs.writeFileSync(loc,b);
};
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(name,data){
  const header=Buffer.alloc(8),tail=Buffer.alloc(4),n=Buffer.from(name);
  header.writeUInt32BE(data.length);n.copy(header,4);
  tail.writeUInt32BE(crc(Buffer.concat([n,data])));
  return Buffer.concat([header,data,tail]);
}
function png(seed,palette=false){
  const width=1200,height=630,ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;ihdr[9]=palette?3:6;
  const row=width*(palette?1:4)+1,raw=Buffer.alloc(row*height);
  let state=(0x9e3779b9^seed)>>>0;
  const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state&255;};
  for(let y=0;y<height;y++){
    raw[y*row]=0;
    for(let x=0;x<width;x++){
      const k=y*row+1+x*(palette?1:4);
      if(palette)raw[k]=next();
      else if(seed===1){raw[k]=next();raw[k+1]=next();raw[k+2]=next();raw[k+3]=255;}
      else{raw[k]=(x+seed*11)&255;raw[k+1]=(y+seed*19)&255;raw[k+2]=seed;raw[k+3]=255;}
    }
  }
  const plte=palette?[chunk('PLTE',Buffer.from([0,0,0,255,255,255]))]:[];
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),...plte,chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const DATE='2026-10-13',CYCLE='2026-10-12',PREFIX='external-image-packages/'+DATE+'/';
const NOW=new Date('2026-10-12T22:01:00-05:00');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'image-prepr-v8-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q','-b','main']);
  git(root,['config','user.email','test@example.test']);
  git(root,['config','user.name','Synthetic QA fixture']);
  write(root,'README.md','P0 fixture only\n');
  git(root,['add','.']);git(root,['commit','-qm','fixture protected main']);
  const main=git(root,['rev-parse','HEAD']);
  git(root,['update-ref','refs/remotes/origin/main',main]);
  git(root,['checkout','-qb','shadow/'+DATE]);
  const bundlePath='shadow-runs/'+DATE+'/edition-bundle.json';
  const bundle=Buffer.from('{"fixture":"source-only","edition_date":"'+DATE+'"}\n');
  write(root,bundlePath,bundle);
  git(root,['add','.']);git(root,['commit','-qm','fixture source bundle']);
  const sourceCommit=git(root,['rev-parse','HEAD']);
  git(root,['checkout','-q','main']);
  git(root,['checkout','-qb','shadow-pages-history']);
  const ids=Array.from({length:6},(_,i)=>'oct13-story-'+(i+1));
  const stories=ids.map(id=>({story_id:id,
    expected_stage_path:PREFIX+'images/'+id+'.png',
    primary_source:{url:'https://source.example/'+id}}));
  const job={schema_version:'external-compiler-image-job-v1',edition_date:DATE,
    execution_id:'daily-compiler-shadow-'+DATE,lifecycle:'PUBLISHED_PENDING',
    accepted_images:0,placeholder:{count:6},source:{branch:'shadow/'+DATE,
      commit_sha:sourceCommit,bundle_path:bundlePath,bundle_sha256:hash(bundle)},
    stories};
  const jobBytes=Buffer.from(JSON.stringify(job,null,2)+'\n');
  const index={schema_version:'external-compiler-image-index-v1',
    editions:[{edition_date:DATE,status:'PUBLISHED_PENDING',story_count:6,
      job_sha256:hash(jobBytes),source_commit_sha:sourceCommit,
      bundle_sha256:hash(bundle),
      job_url:'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/'+DATE+'/job.json'}]};
  write(root,'site/image-jobs/'+DATE+'/job.json',jobBytes);
  write(root,'site/image-jobs/index.json',JSON.stringify(index,null,2)+'\n');
  git(root,['add','.']);git(root,['commit','-qm','fixture published image job']);
  const historyHead=git(root,['rev-parse','HEAD']);
  git(root,['update-ref','refs/remotes/origin/shadow-pages-history',historyHead]);
  git(root,['checkout','-q','main']);
  git(root,['checkout','-qb','image-package/'+DATE+'-test']);
  const images=ids.map((id,i)=>{
    const b=png(i+1),p=PREFIX+'images/'+id+'.png';
    write(root,p,b);
    const reviewPath=PREFIX+'reviews/'+id+'.json';
    const review={schema_version:'external-image-acceptance-review-v8',edition_date:DATE,
      story_id:id,result:'PASS',inspected_saved_png_sha256:hash(b),
      bytes:b.length,width:1200,height:630,bit_depth:8,color_type:'RGBA',
      interlace:'none',verified_original_source_url:stories[i].primary_source.url,
      required_labels:['MECHANISM','EVIDENCE'],factual_fidelity_verified:true,
      quality_and_visual_text_verified:true,distinct_from_other_five_verified:true,
      no_people_humanoids_faces:true,no_logos_brands:true,no_photorealism:true,
      no_pseudo_writing:true,no_clipped_labels:true,safe_margins_verified:true,
      mechanism_notes:'TEST FIXTURE: synthetic source-bound receipt schema; no genuine semantic pixel QA performed.'};
    write(root,reviewPath,JSON.stringify(review,null,2)+'\n');
    return {story_id:id,path:p,accepted_locked:true,sha256:hash(b),
      git_blob_sha:blob(b),bytes:b.length,width:1200,height:630,
      visual_review:{result:'PASS',inspected_png_sha256:hash(b),
        pixel_inspection_method:'persisted_git_binary',story_id:id,
        verified_original_source_url:stories[i].primary_source.url,
        factual_fidelity_verified:true,quality_and_visual_text_verified:true,
        distinct_from_other_five_verified:true,
        mechanism_and_quality_notes:'TEST FIXTURE: structural receipt binding, not a substitute for real illustration review.',
        review_evidence_path:reviewPath}};
  });
  const manifest={schema_version:'external-compiler-image-package-v1',
    edition_date:DATE,execution_id:job.execution_id,
    original_source_commit_sha:sourceCommit,original_bundle_sha256:hash(bundle),
    job_sha256:hash(jobBytes),expected_pages_history_head:historyHead,
    after_action_path:PREFIX+'reviews/after-action.md',
    set_review:{result:'PASS',independent_saved_pixel_review:true,
      differentiation_evidence:'TEST FIXTURE: six structurally distinct PNG byte streams, representing metadata only. No artistic quality inference is made.',
      reviewed_sha256s:images.map(i=>i.sha256)},images};
  write(root,manifest.after_action_path,'# Synthetic QA receipt (not a production art review)\n');
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
  write(root,PREFIX+'manifest.json',manifestBytes);
  const assignment={schema_version:'external-compiler-recurring-assignment-v8',
    prompt_version:'rev8',owner_identity:'gttome',scope:'image_only_postpublication',
    task_id:'6acac88cff048191ba02e5b2bcb3becb',
    cycle_date:CYCLE,edition_date:DATE,execution_id:job.execution_id,
    job_sha256:hash(jobBytes),manifest_sha256:hash(manifestBytes),
    original_source_commit_sha:sourceCommit,original_bundle_sha256:hash(bundle),
    image_execution_evidence:{actual_generation_count:6,
      exact_png_1200x630_export_observed:true,
      github_binary_sha256_readback_observed:true,
      original_manifest_sha256:hash(manifestBytes),
      six_actual_saved_pixel_reviews_passed:true},
    accepted_images:images.map(i=>({story_id:i.story_id,sha256:i.sha256})),
    owner_personal_artwork_review_claimed:false};
  write(root,PREFIX+'recurring-assignment.json',JSON.stringify(assignment,null,2)+'\n');
  git(root,['add','.']);git(root,['commit','-qm','synthetic candidate package']);
  const base=git(root,['rev-parse','HEAD']);
  return {root,base,job,manifest,assignment,images,
    opts:{repoRoot:root,cycleDate:CYCLE,now:NOW,
      fetchImpl:async url=>{
        const p=url.split('/'+git(root,['rev-parse','HEAD'])+'/')[1];
        return p && fs.existsSync(path.join(root,p))
          ?{status:200,arrayBuffer:async()=>fs.readFileSync(path.join(root,p))}
          :{status:404,arrayBuffer:async()=>Buffer.alloc(0)};
      }}};
}
function modifyJson(f,relative,change){
  const p=path.join(f.root,relative),o=JSON.parse(fs.readFileSync(p,'utf8'));
  change(o);write(f.root,relative,JSON.stringify(o,null,2)+'\n');
}
function rebindManifest(f){
  const bytes=fs.readFileSync(path.join(f.root,PREFIX+'manifest.json'));
  modifyJson(f,PREFIX+'recurring-assignment.json',a=>{
    a.manifest_sha256=hash(bytes);
    a.image_execution_evidence.original_manifest_sha256=hash(bytes);
  });
}
function changed(f,fn){
  git(f.root,['reset','--hard',f.base]);fn();git(f.root,['add','.']);
  git(f.root,['commit','-qm','negative matrix mutation']);
}
test('full pre-first-image-PR package gate: positive and adversarial regression matrix',async t=>{
  const f=fixture(t);
  await t.test('T01 valid six committed PNGs incl >1 MiB, job, assignment, 6 reviews and remote exact SHA pass',async()=>{
    assert.ok(f.images[0].bytes>1024*1024);
    const r=await preflightRecurringImagePackage(f.opts);
    assert.equal(r.result,'PRE_PR_PACKAGE_PASS');
    assert.equal(r.image_sha256s.length,6);
    assert.equal(r.changed_paths.filter(p=>p.endsWith('.png')).length,6);
    assert.equal(r.genuine_semantic_pixel_review_not_inferred,true);
    assert.equal(r.base_main_sha,git(f.root,['rev-parse','main']));
  });
  const cases=[
    ['T02 root-level package AAR rejected',()=>write(f.root,PREFIX+'after-action.md','forbidden\n'),/FORBIDDEN_PACKAGE_PATH/],
    ['T03 unexpected diff outside current date',()=>write(f.root,'unexpected.txt','outside\n'),/FORBIDDEN_OR_MODIFIED_PATH/],
    ['T04 noncanonical saved-pixel method',()=>{modifyJson(f,PREFIX+'manifest.json',m=>m.images[0].visual_review.pixel_inspection_method='preview_only');rebindManifest(f);},/saved_pixel_review/],
    ['T05 wrong manifest source binding',()=>{modifyJson(f,PREFIX+'manifest.json',m=>m.original_bundle_sha256='f'.repeat(64));rebindManifest(f);},/PACKAGE_MANIFEST|stale_or_unbound|MANIFEST/],
    ['T06 wrong manifest image story path',()=>{modifyJson(f,PREFIX+'manifest.json',m=>m.images[0].path=PREFIX+'images/other.png');rebindManifest(f);},/SIX_IMAGE_PATHS_NOT_EXACTLY_DIFF/],
    ['T07 missing independent set review',()=>{modifyJson(f,PREFIX+'manifest.json',m=>m.set_review.result='FAIL');rebindManifest(f);},/PACKAGE_MANIFEST|independent_six/],
    ['T08 individual saved-pixel receipt hash mismatch',()=>modifyJson(f,PREFIX+'reviews/'+f.images[0].story_id+'.json',r=>r.inspected_saved_png_sha256='f'.repeat(64)),/REVIEW_RECEIPT_NOT_BOUND/],
    ['T09 actual committed PNG changes but manifest not re-bound',()=>{const p=f.images[0].path;let b=fs.readFileSync(path.join(f.root,p));b[100]^=1;write(f.root,p,b);},/committed_png|png_crc|png_inflate|digest_mismatch/],
    ['T10 unsupported package root file despite valid six bytes',()=>{write(f.root,PREFIX+'notes.txt','unauthorized\n');},/FORBIDDEN_PACKAGE_PATH/]
  ];
  for(const [title,mutation,why] of cases)await t.test(title,async()=>{
    changed(f,mutation);
    await assert.rejects(preflightRecurringImagePackage(f.opts),why);
  });
  git(f.root,['reset','--hard',f.base]);
  await t.test('T11 repeat on same exact committed package is idempotent',async()=>{
    const a=await preflightRecurringImagePackage(f.opts),b=await preflightRecurringImagePackage(f.opts);
    assert.equal(a.head_sha,b.head_sha);
    assert.deepEqual(a.image_sha256s,b.image_sha256s);
  });
  await t.test('T12 old-date fallback is forbidden',async()=>{
    await assert.rejects(preflightRecurringImagePackage({...f.opts,cycleDate:'2026-10-11'}),/NOT_CURRENT_CHICAGO_CYCLE/);
  });
  await t.test('T13 future evening cannot release yesterday',async()=>{
    await assert.rejects(preflightRecurringImagePackage({...f.opts,now:new Date('2026-10-13T21:15:00-05:00')}),/NOT_CURRENT_CHICAGO_CYCLE/);
  });
  await t.test('T14 missing/truncated remote segmented asset never passes',async()=>{
    await assert.rejects(preflightRecurringImagePackage({...f.opts,fetchImpl:async()=>({
      status:200,arrayBuffer:async()=>Buffer.alloc(200)
    })}),/png_signature|png_crc|incomplete_png|truncated_chunk/);
  });
  await t.test('T15 stale history HEAD never passes',async()=>{
    git(f.root,['update-ref','refs/remotes/origin/shadow-pages-history',f.base]);
    await assert.rejects(preflightRecurringImagePackage(f.opts),/STALE_PAGES_HISTORY_HEAD/);
  });
});
test('PNG decoder rejects indexed/palette-mode despite valid CRC/inflate',()=>{
  assert.throws(()=>checkRealPng(png(3,true)),/rgb_rgba_noninterlaced_required/);
});

test('T16 fixed-offset >1 MiB exact PNG transport is lossless, missing/altered segments fail',()=>{
  const full=png(1);
  assert.ok(full.length>1024*1024,'exercise above original one-MiB subprocess limit');
  const segments=[];
  for(let off=0;off<full.length;off+=SEGMENT_BYTES)
    segments.push({offset:off,base64:full.subarray(off,off+SEGMENT_BYTES).toString('base64')});
  const request={segments,bytes:full.length,sha256:hash(full),git_blob_sha:blob(full)};
  const done=reassembleFixedOffsetPng(request);
  assert.equal(done.receipt.result,'EXACT_PNG_REASSEMBLED_NOT_RELEASED');
  assert.equal(done.receipt.large_png_segmented,true);
  assert.ok(done.png.equals(full));
  assert.throws(()=>reassembleFixedOffsetPng({...request,segments:segments.slice(1)}),/MISSING_OR_DUPLICATED_SEGMENTS/);
  assert.throws(()=>reassembleFixedOffsetPng({...request,segments:segments.map((s,i)=>i===1?{...s,offset:s.offset+1}:s)}),/SEGMENT_OFFSET/);
  assert.throws(()=>reassembleFixedOffsetPng({...request,segments:segments.map((s,i)=>i===2?{...s,base64:s.base64.slice(0,-4)}:s)}),/SEGMENT_LENGTH/);
  assert.throws(()=>reassembleFixedOffsetPng({...request,sha256:'f'.repeat(64)}),/SHA256_OR_GIT_BLOB/);
});
