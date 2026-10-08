import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {finalizeShadowState} from '../scripts/finalize-shadow-state.mjs';
import {compileShadow} from '../compiler/compile.mjs';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';
import {makeBuiltReaderReplay,replayReaderFetch} from './fixtures/reader-release-replay.mjs';
import {verifyLiveReader} from '../scripts/verify-live.mjs';
import {readerEnvironment} from '../compiler/reader-environment.mjs';

const REPO=fileURLToPath(new URL('../',import.meta.url));
const DATE='2026-10-06';
const WHEN='2026-10-08T14:00:00.000Z';
const PAGE=readerEnvironment.publicBase+'/';
const json=value=>JSON.stringify(value,null,2)+'\n';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:json(value));};
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-observation-off-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function tree(root){
  if(!fs.existsSync(root))return {};
  const result={};
  const walk=(dir,prefix='')=>{
    for(const e of fs.readdirSync(dir,{withFileTypes:true})){
      const name=prefix+e.name,p=path.join(dir,e.name);
      if(e.isDirectory())walk(p,name+'/');else result[name]=sha256(fs.readFileSync(p));
    }
  };walk(root);return result;
}
const coreTree=root=>Object.fromEntries(Object.entries(tree(root)).filter(([name])=>!name.includes('/observability/')&&!name.startsWith('observability/')&&!name.startsWith('dashboard/')&&!name.startsWith('optional-')));
function sameTree(actual,expected,message){
  const changed=[...new Set([...Object.keys(actual),...Object.keys(expected)])].filter(name=>actual[name]!==expected[name]).sort();
  assert.deepEqual(changed,[],message);
}

// Compile one immutable historical fixture and execute the actual built/live
// verifiers with rendered-shape replay and injected HTTP responses. Every
// boundary case copies the same complete evidence; none invents PASS fields.
// This test evidence is not a Jekyll build, image review, or public live proof.
let finalizationSeed;
async function verifyReplay(buildDir){
  const replay=makeBuiltReaderReplay({sourceDir:path.join(buildDir,'reader-source'),root:buildDir});
  const {fetchImpl}=replayReaderFetch(replay,{feedback:true});
  const live=await verifyLiveReader({...replay.options,fetchImpl});
  write(path.join(buildDir,'live-verification.json'),live);
  return replay;
}
before(async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-frozen-finalization-proof-'));
  finalizationSeed=root;
  const run=path.join(root,'shadow-runs',DATE),buildDir=path.join(root,'build');
  const bundleBytes=fs.readFileSync(path.join(REPO,'fixtures/complete-edition/edition-bundle.json'));
  const state=read(path.join(REPO,'fixtures/complete-edition/compiler-state.json'));
  state.bundle.digest=sha256(bundleBytes);
  write(path.join(run,'edition-bundle.json'),bundleBytes);
  write(path.join(run,'compiler-state.json'),state);
  fs.cpSync(path.join(REPO,'fixtures/complete-edition/images'),path.join(root,'fixtures/complete-edition/images'),{recursive:true});
  write(path.join(run,'images','accepted-lock.json'),{locked:true,original_bundle_sha256:state.bundle.digest});
  await compileShadow({repoRoot:root,statePath:path.join(run,'compiler-state.json'),bundlePath:path.join(run,'edition-bundle.json'),outDir:path.join(buildDir,'reader-source')});
  await verifyReplay(buildDir);
});
after(()=>{if(finalizationSeed)fs.rmSync(finalizationSeed,{recursive:true,force:true});});

function finalizationFixture(t){
  const root=temp(t),run=path.join(root,'shadow-runs',DATE),buildDir=path.join(root,'build');
  for(const name of ['shadow-runs','fixtures'])fs.cpSync(path.join(finalizationSeed,name),path.join(root,name),{recursive:true});
  for(const name of ['reader-source/compile-receipt.json','reader-source/verification-receipt.json','reader-source/build-manifest.json','built-verification.json','live-verification.json','history-merge-receipt.json'])write(path.join(buildDir,name),fs.readFileSync(path.join(finalizationSeed,'build',name)));
  return {root,run,buildDir,date:DATE,pageUrl:PAGE,now:()=>WHEN};
}
function seedOptional(f,variant){
  if(variant==='absent')return;
  const optional=path.join(f.run,'observability');
  write(path.join(optional,'events.jsonl'),variant==='malformed'?'not valid json\n':json({event_id:'synthetic',observed_at:variant==='stale'?'2001-01-01T00:00:00Z':WHEN}));
  write(path.join(optional,'run-metrics.json'),{result:variant==='stale'?'FAIL':'PASS',wall_seconds:0});
  write(path.join(optional,'run-analysis.json'),{result:'FAIL',fixture_only:true});
  write(path.join(optional,'dashboard-snapshot.json'),variant==='malformed'?'{broken':{system:{status:'healthy'},result:'PASS'});
  write(path.join(optional,'problems','broken.json'),'{invalid');
  write(path.join(optional,'resources','stale.json'),{updated_at:'2001-01-01T00:00:00Z'});
  write(path.join(optional,'learning.md'),'TEST_ONLY unavailable learning projection.');
}

test('I06-T01 core terminal bytes and allowed writes are identical with observation absent, malformed or stale',t=>{
  const results=[];
  for(const variant of ['absent','healthy','malformed','stale']){
    const f=finalizationFixture(t);seedOptional(f,variant);
    const before=tree(f.run),beforeCore=coreTree(f.run);
    const optionalReads=[];
    const originalRead=fs.readFileSync.bind(fs),originalExists=fs.existsSync.bind(fs),originalDir=fs.readdirSync.bind(fs);
    const guard=(operation,original)=>(file,...args)=>{
      if(String(file).includes('observability')||String(file).includes('dashboard')){optionalReads.push([operation,String(file)]);throw new Error('optional read denied');}
      return original(file,...args);
    };
    t.mock.method(fs,'readFileSync',guard('read',originalRead));
    t.mock.method(fs,'existsSync',guard('exists',originalExists));
    t.mock.method(fs,'readdirSync',guard('directory',originalDir));
    let externalCalls=0;
    t.mock.method(globalThis,'fetch',()=>{externalCalls++;throw new Error('core finalization must not call a network, producer or scheduler');});
    let result;
    try{result=finalizeShadowState(f);}finally{t.mock.restoreAll();}
    assert.equal(result.result,'PASS');assert.equal(result.state,'SHADOW_VERIFIED');
    assert.equal(externalCalls,0);assert.deepEqual(optionalReads,[]);
    const after=tree(f.run),afterCore=coreTree(f.run);
    const changed=Object.keys(after).filter(key=>after[key]!==before[key]).sort();
    assert.deepEqual(changed,['compiler-state.json','compiler/built-reader-verification.json','compiler/compile-receipt.json','compiler/finalization-receipt.json','compiler/history-merge-receipt.json','compiler/live-verification.json','compiler/source-verification-receipt.json']);
    assert.equal(after['edition-bundle.json'],before['edition-bundle.json']);
    assert.equal(after['images/accepted-lock.json'],before['images/accepted-lock.json']);
    for(const key of Object.keys(before).filter(x=>x.startsWith('observability/')))assert.equal(after[key],before[key],key);
    assert.equal(afterCore['edition-bundle.json'],beforeCore['edition-bundle.json']);
    results.push({result,core:afterCore});
  }
  for(const result of results.slice(1))assert.deepEqual(result,results[0]);
});

test('I06-T01 finalizer runs in a fresh process with all optional modules missing or import-time throwing',t=>{
  for(const variant of ['missing','throwing']){
    const f=finalizationFixture(t),code=path.join(f.root,'code');
    for(const name of ['scripts','compiler','image-capsules','image-studio','work-porter','operations','contracts'])fs.cpSync(path.join(REPO,name),path.join(code,name),{recursive:true});
    fs.rmSync(path.join(code,'operations/learning.mjs'),{force:true});
    fs.symlinkSync(path.join(REPO,'node_modules'),path.join(code,'node_modules'),'dir');
    if(variant==='throwing')for(const name of ['observability/events.mjs','observability/run-analysis.mjs','dashboard/snapshot.mjs'])write(path.join(code,name),'throw new Error("TEST_ONLY optional module must never be imported");\n');
    // A preload rejects every extra process/network attempt. There is no image,
    // scheduler, producer, telemetry acknowledgement or publication call here.
    const guard=path.join(code,'guard.mjs');
    write(guard,"import cp from 'node:child_process';\nimport {syncBuiltinESMExports} from 'node:module';\nconst forbidden=()=>{throw new Error('TEST_ONLY forbidden external side effect');};\nfor(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[name]=forbidden;\nglobalThis.fetch=forbidden;\nsyncBuiltinESMExports();\n");
    const r=spawnSync(process.execPath,['--import',guard,path.join(code,'scripts/finalize-shadow-state.mjs'),f.root,DATE,PAGE],{cwd:f.root,encoding:'utf8',timeout:15_000});
    assert.equal(r.status,0,r.stderr);
    const result=JSON.parse(r.stdout.trim());
    assert.equal(result.state,'SHADOW_VERIFIED');assert.equal(result.already_terminal,false);
    assert.equal(fs.existsSync(path.join(f.run,'observability')),false);
  }
});

test('I06-T02 green dashboard cannot hide failed core receipts or stale exact-byte evidence',t=>{
  const mutations=[
    ['compile FAIL','reader-source/compile-receipt.json',r=>r.result='FAIL',/without source, built-reader and live parity PASS/],
    ['source FAIL','reader-source/verification-receipt.json',r=>r.result='FAIL',/without source, built-reader and live parity PASS/],
    ['built FAIL','built-verification.json',r=>r.result='FAIL',/without source, built-reader and live parity PASS/],
    ['live FAIL','live-verification.json',r=>r.result='FAIL',/without source, built-reader and live parity PASS/],
    ['parity FAIL','reader-source/compile-receipt.json',r=>r.reader_parity_gate.result='FAIL',/canonical reader parity/],
    ['source parity FAIL','reader-source/verification-receipt.json',r=>r.reader_parity_gate='FAIL',/canonical reader parity/],
    ['wrong edition','live-verification.json',r=>r.edition_date='2026-10-09',/receipt edition mismatch/],
    ['wrong schema','live-verification.json',r=>r.schema_version='unrelated-green-dashboard',/receipt schema mismatch/],
    ['wrong bundle','built-verification.json',r=>r.bundle_sha256='0'.repeat(64),/receipt bundle mismatch/],
    ['wrong live bundle','live-verification.json',r=>r.bundle_sha256='0'.repeat(64),/receipt bundle mismatch/],
    ['wrong manifest','built-verification.json',r=>r.source_manifest_sha256='0'.repeat(64),/source manifest mismatch/],
    ['wrong live manifest','live-verification.json',r=>r.source_manifest_sha256='0'.repeat(64),/source manifest mismatch/],
    ['wrong renderer','live-verification.json',r=>r.production_reader_source_sha='0'.repeat(40),/reader source mismatch/],
    ['wrong live url','live-verification.json',r=>r.base_url='https://example.test/another/',/live verification URL mismatch/],
    ['wrong source receipt','reader-source/verification-receipt.json',r=>r.accepted_image_regenerations=1,/source verification differs/],
    ['history FAIL','history-merge-receipt.json',r=>r.result='FAIL',/history merge is not PASS/],
    ['wrong history edition','history-merge-receipt.json',r=>r.current_date='2026-10-09',/history merge identity mismatch/],
    ['wrong history bundle','history-merge-receipt.json',r=>r.bundle_sha256='0'.repeat(64),/history merge source binding mismatch/],
    ['wrong history manifest','history-merge-receipt.json',r=>r.source_manifest_sha256='0'.repeat(64),/history merge source binding mismatch/],
    ['wrong latest date','history-merge-receipt.json',r=>r.latest_date='2026-10-05',/history latest date invalid/],
    ['stale live history','live-verification.json',r=>r.history_merge_sha256='0'.repeat(64),/live verification history binding mismatch/],
    ['stale live latest','live-verification.json',r=>r.latest_edition_date='2026-10-07',/live verification history binding mismatch/],
    ['failed image gate behind PASS','reader-source/compile-receipt.json',r=>r.image_contract_gate.result='FAIL',/release_compile_product_gates/],
    ['failed media gate behind PASS','reader-source/compile-receipt.json',r=>r.media_contract_gate.result='FAIL',/release_compile_product_gates/],
    ['missing compiled images','reader-source/compile-receipt.json',r=>delete r.image_evidence,/release_compile_image_evidence/],
    ['missing built routes','built-verification.json',r=>delete r.route_evidence,/release_built_routes/],
    ['missing live routes','live-verification.json',r=>delete r.route_evidence,/release_live_routes/],
    ['missing built reader behavior','built-verification.json',r=>r.ratings=false,/release_built_product_proof/],
    ['stale built route bytes','built-verification.json',r=>r.route_evidence[0].sha256='0'.repeat(64),/release_built_route_digest/],
    ['changed live route bytes','live-verification.json',r=>r.route_evidence[0].sha256='0'.repeat(64),/release_live_built_route_mismatch/],
    ['missing exact route proof','live-verification.json',r=>delete r.exact_reader_route_bytes,/release_live_reader_proof/],
    ['missing live image proof','live-verification.json',r=>delete r.image_evidence,/release_live_image_count/],
    ['wrong live image bytes','live-verification.json',r=>r.image_evidence[0].bytes+=1,/release_live_image_bytes/],
    ['wrong cache-versioned image url','live-verification.json',r=>r.image_evidence[0].url=r.image_evidence[0].url.split('?')[0],/release_live_image_url/],
    ['missing feedback persistence','live-verification.json',r=>r.feedback_writes.comments=false,/release_live_feedback_proof/]
  ];
  for(const [name,relative,mutate,error] of mutations){
    const f=finalizationFixture(t);seedOptional(f,'healthy');
    const file=path.join(f.buildDir,relative),record=read(file);mutate(record);write(file,record);
    const before=tree(f.run);assert.throws(()=>finalizeShadowState(f),error,name);assert.deepEqual(tree(f.run),before,name+' must perform no writes');
  }
  for(const target of ['edition-bundle.json','compiler-state.json']){
    const f=finalizationFixture(t);seedOptional(f,'healthy');
    fs.appendFileSync(path.join(f.run,target),' ');
    const before=tree(f.run);assert.throws(()=>finalizeShadowState(f),/bytes changed during compile/);assert.deepEqual(tree(f.run),before);
  }
  const f=finalizationFixture(t);seedOptional(f,'healthy');
  const image=path.join(f.root,read(path.join(f.run,'edition-bundle.json')).images[0].path);
  fs.appendFileSync(image,Buffer.from('changed after compilation'));
  const before=tree(f.run);assert.throws(()=>finalizeShadowState(f),/image SHA mismatch|canonical_png_end/);assert.deepEqual(tree(f.run),before);
});

test('terminal verification replay preserves original state and receipts byte-for-byte',t=>{
  const f=finalizationFixture(t);
  finalizeShadowState(f);
  const terminalStateBytes=fs.readFileSync(path.join(f.run,'compiler-state.json'));
  const compile=read(path.join(f.buildDir,'reader-source/compile-receipt.json'));
  compile.state_sha256=sha256(terminalStateBytes);
  write(path.join(f.buildDir,'reader-source/compile-receipt.json'),compile);
  const before=tree(f.run);
  const result=finalizeShadowState({...f,now:()=>{throw new Error('terminal replay must not obtain a new completion time');}});
  assert.equal(result.already_terminal,true);assert.deepEqual(tree(f.run),before);
});

test('an exact same-build retry preserves terminal bytes without rebuilding, and altered terminal evidence rejects',t=>{
  const f=finalizationFixture(t);
  finalizeShadowState(f);
  const before=tree(f.root);
  const result=finalizeShadowState({...f,now:()=>{throw new Error('same-build retry must not obtain a completion time');}});
  assert.equal(result.already_terminal,true);assert.deepEqual(tree(f.root),before);
  const proof=read(path.join(f.run,'compiler/finalization-receipt.json'));
  assert.equal(proof.terminal_state_sha256,sha256(fs.readFileSync(path.join(f.run,'compiler-state.json'))));
  assert.equal(proof.input_state_sha256,read(path.join(f.buildDir,'reader-source/compile-receipt.json')).state_sha256);

  const mutations=[
    ['compiler-state.json',record=>record.updated_at='2026-10-09T00:00:00.000Z',/terminal state bytes changed/],
    ['compiler/compile-receipt.json',record=>record.TEST_ONLY_changed=true,/original terminal receipt bytes changed/]
  ];
  for(const [name,mutate,error] of mutations){
    const file=path.join(f.run,name),saved=fs.readFileSync(file),record=read(file);mutate(record);write(file,record);
    const unchanged=tree(f.root);assert.throws(()=>finalizeShadowState(f),error);assert.deepEqual(tree(f.root),unchanged);
    fs.writeFileSync(file,saved);
  }
  const supplied=path.join(f.buildDir,'reader-source/compile-receipt.json'),record=read(supplied);record.TEST_ONLY_changed=true;write(supplied,record);
  const unchanged=tree(f.root);assert.throws(()=>finalizeShadowState(f),/exact original receipts/);assert.deepEqual(tree(f.root),unchanged);
});

test('a separately bound reader rebuild can retain new manifest evidence without rewriting the original completion',t=>{
  const f=finalizationFixture(t);
  finalizeShadowState(f);
  const compilePath=path.join(f.buildDir,'reader-source/compile-receipt.json'),manifestPath=path.join(f.buildDir,'reader-source/build-manifest.json');
  const compile=read(compilePath),manifest=read(manifestPath);
  // Model an additive source-manifest field from a later protected renderer.
  // Reader content and existing proof flags are unchanged; all new identities
  // are resealed and must still pass the complete product-evidence validator.
  manifest.TEST_ONLY_manifest_revision=2;
  const digest=canonicalSha(manifest);
  compile.state_sha256=sha256(fs.readFileSync(path.join(f.run,'compiler-state.json')));
  compile.source_manifest=manifest;compile.source_manifest_sha256=digest;
  write(manifestPath,manifest);write(compilePath,compile);
  const historyPath=path.join(f.buildDir,'history-merge-receipt.json'),history=read(historyPath);
  history.source_manifest_sha256=digest;write(historyPath,history);
  for(const name of ['built-verification.json','live-verification.json']){
    const file=path.join(f.buildDir,name),record=read(file);record.source_manifest_sha256=digest;
    if(name==='live-verification.json')record.history_merge_sha256=canonicalSha(history);
    write(file,record);
  }
  const before=tree(f.root),result=finalizeShadowState({...f,now:()=>{throw new Error('rebuild cannot obtain a new terminal time');}});
  assert.equal(result.already_terminal,true);assert.equal(result.source_manifest_sha256,digest);assert.deepEqual(tree(f.root),before);
});

test('a correction revision cannot be mistaken for a reopened base compiler run',t=>{
  const f=finalizationFixture(t);
  write(path.join(f.run,'compiler-state.json'),{schema_version:'daily-compiler-correction-revision-v1',status:'VALIDATED'});
  const before=tree(f.run);assert.throws(()=>finalizeShadowState(f),/corrections use a separate revision record/);assert.deepEqual(tree(f.run),before);
});

test('I06-T01 qualified current-media and D1 fixture compiles to identical reader bytes and terminal result without observation',async t=>{
  const frozen=makeProductReleaseFixture({root:temp(t)}),frozenBytes=tree(frozen.root),variants=[];
  for(const variant of ['absent','healthy','malformed','stale']){
    // Copy one frozen qualified input for every comparison. No fixture image,
    // lock or acceptance record is re-created between observation scenarios.
    const root=temp(t);fs.cpSync(frozen.root,root,{recursive:true});
    const run=path.join(root,'shadow-runs',frozen.date);
    const f={...frozen,root,repoRoot:root,run,statePath:path.join(run,'compiler-state.json'),bundlePath:path.join(run,'edition-bundle.json')};
    const buildDir=path.join(f.root,'build');
    seedOptional(f,variant);
    const originalState=fs.readFileSync(f.statePath),originalBundle=fs.readFileSync(f.bundlePath);
    const originalImageHashes=f.bundle.images.map(image=>sha256(fs.readFileSync(path.join(f.root,image.path))));
    const before=tree(f.root),reads=[];
    const originalRead=fs.readFileSync.bind(fs),originalExists=fs.existsSync.bind(fs),originalDir=fs.readdirSync.bind(fs);
    const guard=(operation,original)=>(file,...args)=>{
      const name=String(file);
      if(/(?:^|\/)(?:observability|dashboard)(?:\/|$)/.test(name)||name.endsWith('/usage-rate-card.json')){reads.push([operation,name]);throw new Error('TEST_ONLY optional dependency unavailable');}
      return original(file,...args);
    };
    t.mock.method(fs,'readFileSync',guard('read',originalRead));
    t.mock.method(fs,'existsSync',guard('exists',originalExists));
    t.mock.method(fs,'readdirSync',guard('directory',originalDir));
    let externalCalls=0;
    t.mock.method(globalThis,'fetch',()=>{externalCalls++;throw new Error('TEST_ONLY no external operation permitted');});
    let compile,terminal;
    try{
      compile=await compileShadow({...f,outDir:path.join(buildDir,'reader-source')});
      assert.equal(compile.result,'PASS');
      assert.equal(compile.media_contract_gate.result,'PASS');
      assert.equal(compile.image_contract_gate.result,'PASS');
      assert.equal(compile.image_evidence.length,6);
      assert.equal(compile.reader_parity_gate.result,'PASS');
      const replay=await verifyReplay(buildDir);
      terminal=finalizeShadowState({...f,buildDir,pageUrl:replay.options.baseUrl,now:()=>WHEN});
    }finally{t.mock.restoreAll();}
    assert.equal(externalCalls,0);assert.deepEqual(reads,[]);
    assert.deepEqual(fs.readFileSync(f.bundlePath),originalBundle);
    const after=tree(f.root),relativeState=path.relative(f.root,f.statePath).replaceAll(path.sep,'/');
    assert.notEqual(sha256(originalState),sha256(fs.readFileSync(f.statePath)),'only the first terminal state advances');
    for(const [name,digest] of Object.entries(before))if(name!==relativeState)assert.equal(after[name],digest,'immutable input changed: '+name);
    for(const name of Object.keys(after).filter(name=>!(name in before)))assert.ok(name.startsWith('build/')||name.startsWith('shadow-runs/'+f.date+'/compiler/'),'unexpected output: '+name);
    const imageHashes=f.bundle.images.map(image=>sha256(fs.readFileSync(path.join(f.root,image.path))));
    assert.deepEqual(imageHashes,originalImageHashes);
    assert.equal(compile.accepted_image_regenerations,0);
    variants.push({bundle_sha256:sha256(originalBundle),imageHashes,reader:tree(path.join(buildDir,'reader-source')),terminal,terminal_state:sha256(fs.readFileSync(f.statePath)),receipts:tree(path.join(f.run,'compiler'))});
  }
  for(const variant of variants.slice(1)){
    const {reader,receipts,...core}=variant,{reader:baselineReader,receipts:baselineReceipts,...baselineCore}=variants[0];
    sameTree(reader,baselineReader,'all canonical reader bytes must match');
    sameTree(receipts,baselineReceipts,'all mandatory terminal receipt bytes must match');
    assert.deepEqual(core,baselineCore);
  }
  sameTree(tree(frozen.root),frozenBytes,'the qualified frozen input is immutable throughout comparison');
});

test('I06-T01 qualified compile succeeds in fresh processes when optional modules are absent or throw on import',t=>{
  const frozen=makeProductReleaseFixture({root:temp(t)}),frozenBytes=tree(frozen.root),results=[];
  for(const variant of ['absent','throwing']){
    const root=temp(t),input=path.join(root,'input'),code=path.join(root,'code');
    fs.cpSync(frozen.root,input,{recursive:true});
    for(const name of ['compiler','scripts','image-capsules','image-studio','work-porter','operations','contracts','vendor'])fs.cpSync(path.join(REPO,name),path.join(code,name),{recursive:true});
    fs.rmSync(path.join(code,'operations/learning.mjs'),{force:true});
    fs.symlinkSync(path.join(REPO,'node_modules'),path.join(code,'node_modules'),'dir');
    if(variant==='throwing')for(const name of ['observability/events.mjs','observability/run-analysis.mjs','dashboard/snapshot.mjs','operations/learning.mjs'])write(path.join(code,name),'throw new Error("TEST_ONLY optional code must not execute");\n');
    const snapshot=path.join(code,'vendor/production-reader/snapshot');
    for(const name of ['_generator/lib/analytics.mjs','_generator/lib/quality.mjs']){
      if(variant==='absent')fs.rmSync(path.join(snapshot,name),{force:true});
      else write(path.join(snapshot,name),'throw new Error("TEST_ONLY optional vendored observer must not execute");\n');
    }
    for(const name of ['_records/analytics','_records/editorial-feedback','_records/qa','data/qa','qa']){
      if(variant==='absent')fs.rmSync(path.join(snapshot,name),{recursive:true,force:true});
      else write(path.join(snapshot,name,frozen.date+'.json'),'{TEST_ONLY malformed stale observation');
    }
    const guard=path.join(code,'guard.mjs');
    write(guard,"import cp from 'node:child_process';\nimport {syncBuiltinESMExports} from 'node:module';\nconst forbidden=()=>{throw new Error('TEST_ONLY forbidden network, generation, scheduler or producer call');};\nfor(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[name]=forbidden;\nglobalThis.fetch=forbidden;\nsyncBuiltinESMExports();\n");
    const run=path.join(input,'shadow-runs',frozen.date),out=path.join(root,'reader');
    const result=spawnSync(process.execPath,['--import',guard,path.join(code,'compiler/compile.mjs'),'--state',path.join(run,'compiler-state.json'),'--bundle',path.join(run,'edition-bundle.json'),'--out',out,'--repo-root',input],{cwd:root,encoding:'utf8',timeout:30_000,maxBuffer:2*1024*1024});
    assert.equal(result.status,0,result.stderr);
    const receipt=JSON.parse(result.stdout);
    assert.equal(receipt.result,'PASS');assert.equal(receipt.media_contract_gate.result,'PASS');assert.equal(receipt.image_contract_gate.result,'PASS');
    sameTree(tree(input),frozenBytes,'compile must not mutate its input tree');
    for(const name of ['_generator/lib/analytics.mjs','_generator/lib/quality.mjs','_records/analytics','_records/editorial-feedback','_records/qa','data/qa','qa'])assert.equal(fs.existsSync(path.join(out,name)),false,'optional reader observation excluded: '+name);
    results.push(tree(out));
  }
  sameTree(results[1],results[0],'every canonical reader byte matches with optional vendor modules absent or throwing');
  sameTree(tree(frozen.root),frozenBytes,'frozen accepted fixture remains unchanged');
});
