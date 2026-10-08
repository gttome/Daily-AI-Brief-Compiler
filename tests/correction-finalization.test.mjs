// TEST_ONLY: the actual compiler and reader verifiers run against saved
// synthetic pixels, rendered-shape replay and injected HTTP responses. No native
// generation, public deployment, real feedback writes or activation occurs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';
import {stageProductImageCorrection} from './fixtures/product-correction.mjs';
import {makeBuiltReaderReplay,replayReaderFetch} from './fixtures/reader-release-replay.mjs';
import {compileShadow,validateEdition} from '../compiler/compile.mjs';
import {verifyLiveReader} from '../scripts/verify-live.mjs';
import {finalizeCorrection} from '../operations/correction-finalize.mjs';
import {sha256} from '../image-capsules/util.mjs';

const json=value=>JSON.stringify(value,null,2)+'\n';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:json(value));};
function tree(root){
  const records={};
  const walk=(directory,prefix='')=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const name=prefix+entry.name,file=path.join(directory,entry.name);if(entry.isDirectory())walk(file,name+'/');else records[name]=sha256(fs.readFileSync(file));}};
  walk(root);return records;
}
async function publishReplay(f,c,number,historyDir='-'){
  const buildDir=path.join(f.root,'TEST_ONLY-release-'+number);
  await compileShadow({repoRoot:f.root,statePath:c.revisionPath,bundlePath:c.bundlePath,outDir:path.join(buildDir,'reader-source')});
  const replay=makeBuiltReaderReplay({sourceDir:path.join(buildDir,'reader-source'),root:buildDir,historyDir});
  const fetch=replayReaderFetch(replay,{feedback:true});
  const live=await verifyLiveReader({...replay.options,fetchImpl:fetch.fetchImpl});
  write(path.join(buildDir,'live-verification.json'),live);
  const outDir=path.join(path.dirname(c.revisionPath),'verified');
  return {replay,live,args:{repoRoot:f.root,revisionPath:c.revisionPath,bundlePath:c.bundlePath,buildDir,pageUrl:replay.options.baseUrl,outDir,now:()=>`2026-10-08T0${5+number}:00:00.000Z`}};
}

test('I06-T03 exact release proofs finalize additive revisions and support a verified second correction',async()=>{
  const f=makeProductReleaseFixture();
  try{
    f.state.state='SHADOW_VERIFIED';f.state.stage='VERIFY';f.persist();
    const baseState=fs.readFileSync(f.statePath),baseBundle=fs.readFileSync(f.bundlePath);
    const c1=stageProductImageCorrection(f,[f.bundle.images[0].story_id]);
    const firstInput=fs.readFileSync(c1.revisionPath),r1=await publishReplay(f,c1,1),before=tree(f.root);
    const outcome=finalizeCorrection(r1.args);assert.equal(outcome.status,'LIVE_VERIFIED');
    assert.deepEqual(fs.readFileSync(c1.revisionPath),firstInput);assert.deepEqual(fs.readFileSync(f.statePath),baseState);assert.deepEqual(fs.readFileSync(f.bundlePath),baseBundle);
    const after=tree(f.root),relative=path.relative(f.root,r1.args.outDir).split(path.sep).join('/')+'/';
    for(const [name,digest] of Object.entries(before))assert.equal(after[name],digest,'existing file changed: '+name);
    for(const name of Object.keys(after).filter(name=>!(name in before)))assert.ok(name.startsWith(relative),'unexpected output: '+name);
    const liveRevision=read(path.join(r1.args.outDir,'revision.json'));
    const receipt=read(path.join(r1.args.outDir,'verification-receipt.json'));
    assert.equal(receipt.schema_version,'daily-compiler-correction-verification-v1');assert.equal(receipt.proofs.compiled_revision.sha256,sha256(firstInput));
    assert.equal(receipt.original_bundle_sha256,sha256(baseBundle));assert.equal(Object.keys(receipt.proofs).length,10);
    const verified=validateEdition({repoRoot:f.root,statePath:path.join(r1.args.outDir,'revision.json'),bundlePath:c1.bundlePath});
    assert.equal(verified.d1ImageGate.result,'PASS');
    const priorOutput=tree(r1.args.outDir);
    assert.equal(finalizeCorrection({...r1.args,now:()=>{throw new Error('identical replay must preserve timestamp');}}).result,'UNCHANGED');
    assert.deepEqual(tree(r1.args.outDir),priorOutput);

    const current={...f,bundle:c1.result.bundle,bundlePath:c1.bundlePath,manifest:c1.manifest,handoff:c1.handoff,porter:c1.porter,reviews:c1.reviews};
    const c2=stageProductImageCorrection(current,[f.bundle.images[1].story_id],2,{previousRevision:liveRevision});
    assert.equal(validateEdition({repoRoot:f.root,statePath:c2.revisionPath,bundlePath:c2.bundlePath}).d1ImageGate.result,'PASS');
    // Create a newer saved reader fixture, then prove an old-edition correction
    // preserves its shared root bytes through actual history/live verification.
    const newer=path.join(f.root,'TEST_ONLY-newer-reader');fs.cpSync(r1.replay.siteDir,newer,{recursive:true});
    const nextDate=new Date(f.date+'T00:00:00Z');nextDate.setUTCDate(nextDate.getUTCDate()+1);
    const latest=nextDate.toISOString().slice(0,10),newerManifest=read(path.join(newer,'build-manifest.json'));newerManifest.edition_date=latest;
    write(path.join(newer,'build-manifest.json'),newerManifest);write(path.join(newer,'briefs',latest,'index.html'),'<html>TEST_ONLY newer edition</html>');
    write(path.join(newer,'index.html'),'<html>TEST_ONLY preserved newer homepage</html>');write(path.join(newer,'latest.md'),'TEST_ONLY '+latest+' latest');
    const sharedBefore=sha256(fs.readFileSync(path.join(newer,'index.html'))),r2=await publishReplay(f,c2,2,newer);
    const finalized=finalizeCorrection(r2.args);assert.equal(finalized.latest_edition_date,latest);assert.equal(finalized.historical_correction,true);
    assert.equal(sha256(fs.readFileSync(path.join(r2.replay.siteDir,'index.html'))),sharedBefore);
    assert.equal(validateEdition({repoRoot:f.root,statePath:path.join(r2.args.outDir,'revision.json'),bundlePath:c2.bundlePath}).d1ImageGate.result,'PASS');
    assert.deepEqual(fs.readFileSync(f.statePath),baseState);assert.deepEqual(fs.readFileSync(f.bundlePath),baseBundle);

    // A wrapper flag cannot replace its immutable underlying proof bytes.
    const proof=path.join(f.root,receipt.proofs.live_verification.path),saved=fs.readFileSync(proof);
    const forged=read(proof);forged.image_evidence[0].sha256='0'.repeat(64);write(proof,forged);
    assert.throws(()=>validateEdition({repoRoot:f.root,statePath:c2.revisionPath,bundlePath:c2.bundlePath}),/correction_proof_hash/);
    fs.writeFileSync(proof,saved);
    assert.equal(validateEdition({repoRoot:f.root,statePath:c2.revisionPath,bundlePath:c2.bundlePath}).d1ImageGate.result,'PASS');
  }finally{f.cleanup();}
});

test('I06-T04 stale, incomplete or forged correction release evidence rejects without filesystem changes',async()=>{
  const f=makeProductReleaseFixture();
  try{
    f.state.state='SHADOW_VERIFIED';f.state.stage='VERIFY';f.persist();
    const correction=stageProductImageCorrection(f,[f.bundle.images[0].story_id]),release=await publishReplay(f,correction,1);
    const cases=[
      ['reader-source/compile-receipt.json',value=>value.image_contract_gate.result='FAIL',/release_compile_product_gates/],
      ['reader-source/compile-receipt.json',value=>value.media_contract_gate.result='FAIL',/release_compile_product_gates/],
      ['built-verification.json',value=>value.bundle_sha256='0'.repeat(64),/receipt bundle mismatch/],
      ['live-verification.json',value=>delete value.image_evidence,/release_live_image_count/],
      ['live-verification.json',value=>value.feedback_writes.comments=false,/release_live_feedback_proof/],
      ['live-verification.json',value=>value.route_evidence[0].sha256='0'.repeat(64),/release_live_built_route_mismatch/],
      ['history-merge-receipt.json',value=>value.canonical_current_reader_preserved=false,/history binding|release_history_preservation/]
    ];
    for(const [relative,change,pattern] of cases){
      const file=path.join(release.args.buildDir,relative),saved=fs.readFileSync(file),record=read(file);change(record);write(file,record);
      const before=tree(f.root);assert.throws(()=>finalizeCorrection(release.args),pattern);assert.deepEqual(tree(f.root),before);assert.equal(fs.existsSync(release.args.outDir),false);
      fs.writeFileSync(file,saved);
    }
    const saved=fs.readFileSync(correction.bundlePath);fs.appendFileSync(correction.bundlePath,' ');
    const before=tree(f.root);assert.throws(()=>finalizeCorrection(release.args),/changed during compile|digest/);assert.deepEqual(tree(f.root),before);fs.writeFileSync(correction.bundlePath,saved);
    assert.equal(finalizeCorrection(release.args).result,'PASS');
  }finally{f.cleanup();}
});
