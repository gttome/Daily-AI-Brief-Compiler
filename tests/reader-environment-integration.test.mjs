// TEST_ONLY: existing accepted fixture bytes and deterministic HTTP replay.
// A replay PASS supplies no host approval, deployment or actual live evidence.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {compileShadow} from '../compiler/compile.mjs';
import {readerEnvironment} from '../compiler/reader-environment.mjs';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {readReleaseManifest,verifyBuiltReader} from '../scripts/verify-built-reader.mjs';
import {verifyLiveArtifacts,verifyLiveReader} from '../scripts/verify-live.mjs';
import {makeBuiltReaderReplay,replayReaderFetch} from './fixtures/reader-release-replay.mjs';

const isolated={publicBase:'https://compiler-preview.example.test/qualification/value-candidate',baseurl:'/qualification/value-candidate'};
const rootDestination={publicBase:'https://compiler-preview.example.test',baseurl:''};
const fixture={statePath:'fixtures/complete-edition/compiler-state.json',bundlePath:'fixtures/complete-edition/edition-bundle.json',repoRoot:'.'};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const prepared=new Map();let preparedRoot;
after(()=>{if(preparedRoot)fs.rmSync(preparedRoot,{recursive:true,force:true});});
function compileFor(environment){
  const key=JSON.stringify(environment??null);
  if(!prepared.has(key))prepared.set(key,(async()=>{
    preparedRoot??=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-reader-environment-source-'));
    const sourceDir=path.join(preparedRoot,String(prepared.size));
    const receipt=await compileShadow({...fixture,outDir:sourceDir,environment});
    return {sourceDir,receipt,manifest:read(path.join(sourceDir,'build-manifest.json'))};
  })());
  return prepared.get(key);
}
async function replayFor(t,environment=isolated){
  const compiled=await compileFor(environment),root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-reader-environment-replay-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return makeBuiltReaderReplay({sourceDir:compiled.sourceDir,root});
}
function fileDigests(root){
  const result={};
  const walk=(directory,prefix='')=>{
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const relative=prefix+entry.name,file=path.join(directory,entry.name);
      if(entry.isDirectory())walk(file,relative+'/');else result[relative]=sha256(fs.readFileSync(file));
    }
  };
  walk(root);return result;
}

test('I07-T06 implicit and explicit default environments produce identical reader files',async()=>{
  const implicit=await compileFor(),explicit=await compileFor(readerEnvironment);
  assert.deepEqual(fileDigests(implicit.sourceDir),fileDigests(explicit.sourceDir));
  assert.deepEqual(implicit.manifest.environment,{public_base:readerEnvironment.publicBase,baseurl:readerEnvironment.baseurl});
  assert.equal(implicit.receipt.reader_parity_gate.result,'PASS');
  assert.match(fs.readFileSync(path.join(implicit.sourceDir,'_config.yml'),'utf8'),/^url: "https:\/\/gttome.github.io"$/m);
});

test('I07-T06 isolated origin and basepath propagate through real compile without changing accepted inputs',async()=>{
  const inputs=new Map([fixture.statePath,fixture.bundlePath,...read(fixture.bundlePath).images.map(image=>image.path)].map(file=>[file,sha256(fs.readFileSync(file))]));
  for(const environment of [isolated,rootDestination]){
    const {sourceDir,manifest,receipt}=await compileFor(environment);
    assert.deepEqual(manifest.environment,{public_base:environment.publicBase,baseurl:environment.baseurl});
    assert.equal(receipt.reader_parity_gate.result,'PASS');
    assert.equal(receipt.verification.semantic_rework,0);
    assert.equal(receipt.accepted_image_regenerations,0);
    const config=fs.readFileSync(path.join(sourceDir,'_config.yml'),'utf8');
    assert.match(config,/^url: "https:\/\/compiler-preview.example.test"$/m);
    assert.ok(config.includes('\nbaseurl: "'+environment.baseurl+'"\n'));
    assert.ok(config.includes('\nrepository: "'+readerEnvironment.repository+'"\n'));
    const constants=await import(pathToFileURL(path.join(sourceDir,'_generator','lib','constants.mjs')).href);
    assert.equal(constants.REPOSITORY,readerEnvironment.repository);
    assert.equal(constants.PUBLIC_BASE,environment.publicBase);
    assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(sourceDir,'assets','js','audience.js'),'utf8')));
    assert.equal(manifest.feedback.base_url,readerEnvironment.feedbackBase);
    for(const image of manifest.current_images){
      assert.equal(image.public_url,new URL(image.route+'?v='+image.sha256.slice(0,12),environment.publicBase+'/').href);
      assert.equal(sha256(fs.readFileSync(path.join(sourceDir,image.route))),image.sha256);
    }
    const edition=fs.readFileSync(path.join(sourceDir,'briefs',manifest.edition_date+'.md'),'utf8');
    assert.ok(edition.includes(environment.publicBase+'/briefs/images/'));
    assert.ok(!edition.includes(readerEnvironment.publicBase));
    const feed=read(path.join(sourceDir,'feed.json'));
    assert.ok(JSON.stringify(feed).includes(environment.publicBase));
    assert.ok(!JSON.stringify(feed).includes(readerEnvironment.publicBase));
  }
  for(const [file,digest] of inputs)assert.equal(sha256(fs.readFileSync(file)),digest,file);
});

test('I07-T06 built verification checks internal links under each bound isolated basepath',async t=>{
  for(const environment of [isolated,rootDestination]){
    const f=await replayFor(t,environment);
    assert.equal(f.built.result,'PASS');
    assert.equal(f.built.source_manifest_sha256,canonicalSha(f.manifest));
    fs.appendFileSync(path.join(f.currentDir,'index.html'),'<a href="'+environment.baseurl+'/definitely-missing-reader-page.html">Missing</a>');
    assert.throws(()=>verifyBuiltReader({siteDir:f.currentDir,sourceDir:f.sourceDir}),/broken internal reader link/);
  }
});

test('I07-T06 manifest destination mismatch fails even when compile digest is rebound',async t=>{
  const f=await replayFor(t),manifest=read(path.join(f.sourceDir,'build-manifest.json')),compile=read(path.join(f.sourceDir,'compile-receipt.json'));
  manifest.environment.baseurl='/different-reader';
  compile.source_manifest=structuredClone(manifest);compile.source_manifest_sha256=canonicalSha(manifest);
  write(path.join(f.sourceDir,'build-manifest.json'),manifest);write(path.join(f.sourceDir,'compile-receipt.json'),compile);
  assert.throws(()=>readReleaseManifest({sourceDir:f.sourceDir}),/invalid reader destination/);
});

test('I07-T06 live verification rejects another origin, basepath or unbound URL before HTTP',async t=>{
  const f=await replayFor(t);let calls=0;
  const fetchImpl=async()=>{calls++;throw new Error('unexpected network call');};
  for(const baseUrl of [readerEnvironment.publicBase,isolated.publicBase+'/other',isolated.publicBase+'?query=1',isolated.publicBase+'#fragment','https://owner@compiler-preview.example.test/qualification/value-candidate'])
    await assert.rejects(verifyLiveArtifacts({...f.options,baseUrl,fetchImpl}),/live base URL differs from canonical reader destination/);
  assert.equal(calls,0);
});

test('I07-T06 isolated live replay binds exact route bytes and actual preview feedback origin',async t=>{
  const f=await replayFor(t),replay=replayReaderFetch(f,{feedback:true}),feedbackRequests=[];
  const fetchImpl=async(url,options={})=>{
    if(url.startsWith(f.manifest.feedback.base_url+'/')){
      feedbackRequests.push({method:options.method||'GET',origin:options.headers?.origin});
      assert.equal(options.headers?.origin,new URL(isolated.publicBase).origin);
    }
    return replay.fetchImpl(url,options);
  };
  const receipt=await verifyLiveReader({...f.options,fetchImpl});
  assert.equal(receipt.result,'PASS');
  assert.equal(receipt.source_manifest_sha256,canonicalSha(f.manifest));
  assert.equal(receipt.base_url,f.options.baseUrl);
  assert.equal(receipt.route_evidence.length,f.manifest.required_routes.length);
  assert.equal(receipt.image_evidence.length,6);
  assert.ok([...receipt.route_evidence,...receipt.image_evidence].every(row=>row.url.startsWith(isolated.publicBase+'/')));
  assert.deepEqual(receipt.feedback_writes,{ratings:true,comments:true,watchlist:true,public_comments:true});
  assert.equal(feedbackRequests.length,6);
  assert.equal(feedbackRequests.filter(row=>row.method==='POST').length,4);
});
