import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileShadow} from '../compiler/compile.mjs';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {verifyBuiltReader,verifyReaderImageBindings,verifyReaderMediaBindings} from '../scripts/verify-built-reader.mjs';
import {verifyLiveArtifacts,verifyLiveReader} from '../scripts/verify-live.mjs';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';
import {makeBuiltReaderReplay,replayReaderFetch as replayFetch} from './fixtures/reader-release-replay.mjs';

const json=value=>JSON.stringify(value,null,2)+'\n';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:json(value));};
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let preparedRoot,preparedSource,compiled;
before(async()=>{
  preparedRoot=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-release-source-'));
  const fixture=makeProductReleaseFixture({root:preparedRoot});
  preparedSource=path.join(preparedRoot,'reader-source');
  compiled=await compileShadow({...fixture,outDir:preparedSource});
});
after(()=>{if(preparedRoot)fs.rmSync(preparedRoot,{recursive:true,force:true});});

function builtFixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-reader-replay-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return makeBuiltReaderReplay({sourceDir:preparedSource,root});
}

test('I06-T07 actual compiled source binds reader, image, media and public manifest identities',()=>{
  const manifest=read(path.join(preparedSource,'build-manifest.json'));
  assert.equal(manifest.bundle_sha256,compiled.bundle_sha256);
  assert.deepEqual(compiled.source_manifest,manifest);
  assert.equal(manifest.current_images.length,6);
  assert.equal(manifest.current_media.length,4);
  assert.ok(manifest.required_routes.includes('latest.md'));
  for(const image of manifest.current_images){
    assert.ok(image.public_url.endsWith('?v='+image.sha256.slice(0,12)));
    assert.ok(image.feedback_id.includes('-compiler-'));
    assert.match(fs.readFileSync(path.join(preparedSource,image.permanent_route.replace(/\/index.html$/,'.md')),'utf8'),new RegExp(image.reader_story_id));
  }
  const config=fs.readFileSync(path.join(preparedSource,'_config.yml'),'utf8');
  assert.doesNotMatch(config,/^\s*-\s*build-manifest\.json\s*$/m);
  assert.match(config,/^\s*-\s*compile-receipt\.json\s*$/m);
});

test('I06-T07 built replay binds all exact route bytes, image references, media display and feedback',t=>{
  const f=builtFixture(t);
  assert.equal(f.built.source_manifest_sha256,canonicalSha(f.manifest));
  assert.equal(f.built.bundle_sha256,f.manifest.bundle_sha256);
  assert.equal(f.built.route_evidence_sha256,canonicalSha(f.built.route_evidence));
  assert.equal(f.built.story_image_bindings,true);
  assert.equal(f.built.media_reader_bindings,true);
  for(const key of ['ratings','sharing','subscriptions','public_comments','accessibility'])assert.equal(f.built[key],true);
});

test('I06-T06 valid stored bytes cannot hide a wrong story image in rendered HTML',t=>{
  for(const routeKind of ['dated','home','permanent']){
    const f=builtFixture(t),[first,second]=f.manifest.current_images;
    const route=routeKind==='dated'?'briefs/'+f.manifest.edition_date+'/index.html':routeKind==='home'?'index.html':first.permanent_route;
    const file=path.join(f.currentDir,route),html=fs.readFileSync(file,'utf8');
    write(file,html.replace(esc(first.public_url),esc(second.public_url)));
    assert.equal(sha256(fs.readFileSync(path.join(f.currentDir,first.route))),first.sha256);
    assert.throws(()=>verifyBuiltReader({siteDir:f.currentDir,sourceDir:f.sourceDir}),/story image reference mismatch/);
  }
});

test('I06-T07 source, feedback, alt and alternate image references fail their reader gate',t=>{
  const changes=[
    ['source',(html,image)=>html.replace('href="'+esc(image.source_url)+'"','href="https://example.test/wrong"'),/source reference mismatch/],
    ['feedback',(html,image)=>html.replace('data-feedback-story-id="'+image.feedback_id+'"','data-feedback-story-id="wrong"'),/feedback identity mismatch/],
    ['alt',(html,image)=>html.replace('alt="'+esc(image.alt)+'"','alt=""'),/image alt mismatch/],
    ['srcset',html=>html.replace('<img ','<img srcset="https://example.test/unreviewed.png 2x" '),/alternate bytes unverified/]
  ];
  for(const [name,change,error] of changes){
    const f=builtFixture(t),image=f.manifest.current_images[0],file=path.join(f.currentDir,image.permanent_route);
    write(file,change(fs.readFileSync(file,'utf8'),image));
    assert.throws(()=>verifyReaderImageBindings({manifest:f.manifest,siteDir:f.currentDir}),error,name);
  }
});

test('I06-T07 wrong rendered media URL, unsafe new-tab link and altered copy fail',t=>{
  const cases=[
    [html=>html.replace(/target="_blank"/,'target="_self"'),/link mismatch or unsafe/],
    [(html,item)=>html.replace(esc(item.selected_url),'https://example.test/channel'),/link mismatch or unsafe/],
    [(html,item)=>html.replace(esc(item.summary),'Unsupported summary'),/media Summary mismatch/],
    [html=>html.replace('Duration:</strong>','Runtime:</strong>'),/media Duration mismatch/]
  ];
  for(const [change,error] of cases){
    const f=builtFixture(t),item=f.manifest.current_media[0],file=path.join(f.currentDir,item.permanent_route);
    write(file,change(fs.readFileSync(file,'utf8'),item));
    assert.throws(()=>verifyReaderMediaBindings({manifest:f.manifest,siteDir:f.currentDir}),error);
  }
});

test('I06-T02 corrupt canonical image or stale compile/manifest binding cannot pass built release',t=>{
  const f=builtFixture(t),image=f.manifest.current_images[0];
  fs.appendFileSync(path.join(f.currentDir,image.route),'corrupt');
  assert.throws(()=>verifyBuiltReader({siteDir:f.currentDir,sourceDir:f.sourceDir}),/current image hash mismatch/);
  const compile=read(path.join(f.sourceDir,'compile-receipt.json'));
  compile.bundle_sha256='0'.repeat(64);write(path.join(f.sourceDir,'compile-receipt.json'),compile);
  assert.throws(()=>verifyBuiltReader({siteDir:f.currentDir,sourceDir:f.sourceDir}),/compile\/manifest binding mismatch/);
});

test('I06-T06 read-only live verifier replays every exact route and cache-versioned image without feedback writes',async t=>{
  const f=builtFixture(t),mock=replayFetch(f);
  const result=await verifyLiveArtifacts({...f.options,fetchImpl:mock.fetchImpl});
  assert.equal(result.schema_version,'daily-compiler-live-artifact-check-v1');
  assert.equal(result.result,'PASS');
  assert.equal(result.bundle_sha256,f.manifest.bundle_sha256);
  assert.equal(result.source_manifest_sha256,canonicalSha(f.manifest));
  assert.equal(result.history_merge_sha256,canonicalSha(f.history));
  assert.equal(result.route_evidence.length,f.manifest.required_routes.length);
  assert.equal(result.image_evidence.length,6);
  assert.equal(result.feedback_writes,undefined);
  assert.ok(mock.calls.every(call=>call.method==='GET'));
  assert.ok(result.image_evidence.every(image=>new URL(image.url).searchParams.get('v')===image.sha256.slice(0,12)));
});

test('I06-T06 live exact-byte replay rejects stale route, image and pre-release built artifacts',async t=>{
  for(const kind of ['route','image','local']){
    const f=builtFixture(t);
    if(kind==='local')fs.appendFileSync(path.join(f.siteDir,f.manifest.current_images[0].permanent_route),'stale local build');
    const mock=replayFetch(f,{mutate:({route,bytes})=>(kind==='route'&&route==='index.html'||kind==='image'&&route===f.manifest.current_images[0].route)?Buffer.concat([bytes,Buffer.from('stale response')]):bytes});
    await assert.rejects(verifyLiveArtifacts({...f.options,fetchImpl:mock.fetchImpl}),kind==='image'?/deployed image hash mismatch/:kind==='local'?/built reader route changed before release/:/live reader route bytes mismatch/);
  }
});

test('I06-T07 complete live-verifier replay retains reader feedback persistence probes',async t=>{
  const f=builtFixture(t),mock=replayFetch(f,{feedback:true});
  const result=await verifyLiveReader({...f.options,fetchImpl:mock.fetchImpl});
  assert.equal(result.schema_version,'daily-compiler-live-verification-v2');
  assert.deepEqual(result.feedback_writes,{ratings:true,comments:true,watchlist:true,public_comments:true});
  assert.equal(mock.calls.filter(call=>call.method==='POST').length,4);
  const denied=async(url,options)=>url.startsWith(f.manifest.feedback.base_url+'/')?Response.json({recorded:false},{status:503}):mock.fetchImpl(url,options);
  await assert.rejects(verifyLiveReader({...f.options,fetchImpl:denied}),/feedback probe .* failed 503/);
});
