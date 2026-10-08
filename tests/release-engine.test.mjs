// TEST_ONLY. Git operations use temporary local repositories. No scheduler,
// image model, network service, deployment, GitHub write or release authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sha256,canonicalSha} from '../image-capsules/util.mjs';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {assertProgressPreserved} from '../producer/recovery.mjs';
import {assertStateEnginePin,assertProtectedFirstParent,selectReleaseEngine,verifyReleaseEngineHandoff,compileEngineBinding,
  assertFrozenActivationRoots,assertRemoteSemanticHead,assertFinalizationEngine,assertCompiledEngineReceipt} from '../operations/release-engine.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';
import {makeBuiltReaderReplay,replayReaderFetch} from './fixtures/reader-release-replay.mjs';
import {verifyLiveReader} from '../scripts/verify-live.mjs';
import {makeReleaseEngineRepo,testGit,testCommit,writeTestFile} from './fixtures/release-engine-repo.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const clone=value=>structuredClone(value);

test('new sealed editions reject missing/malformed engine pins and mismatched dispatch identities',t=>{
  const f=makeReleaseEngineRepo(t);
  for(const engine of [undefined,null,'main','A'.repeat(40),'a'.repeat(39)]){
    const state={...f.state};if(engine===undefined)delete state.engine_sha;else state.engine_sha=engine;
    assert.throws(()=>assertStateEnginePin({state,bundle:f.bundle,bundleSha:f.state.bundle.digest}),/missing_pin_for_new_edition|state_pin_invalid/);
  }
  assert.throws(()=>selectReleaseEngine({...f.selection,expectedEngineSha:f.mainSha}),/payload_pin_mismatch/);
  assert.throws(()=>selectReleaseEngine({...f.selection,expectedSemanticCommit:f.engineSha}),/payload_semantic_commit_mismatch/);
  assert.throws(()=>selectReleaseEngine({...f.selection,expectedDigest:'b'.repeat(64)}),/payload_bundle_mismatch/);
});

test('protected main bootstrap selects the recorded engine even after main advances',t=>{
  const f=makeReleaseEngineRepo(t);
  const binding=selectReleaseEngine({...f.selection,requireRemoteHead:true});
  assert.equal(binding.engine_sha,f.engineSha);assert.equal(binding.semantic_commit,f.semanticCommit);assert.equal(binding.protected_main_head_sha,f.mainSha);
  assert.throws(()=>verifyReleaseEngineHandoff({binding,...f.selection}),/compiler_checkout_pin_mismatch/);
  f.verifyEngine();
  const verified=verifyReleaseEngineHandoff({binding,...f.selection,requireRemoteHead:true});
  assert.equal(verified.engine_sha,f.engineSha);assert.deepEqual(verified.frozen_activation_inputs,[]);
  assert.throws(()=>selectReleaseEngine(f.selection),/bootstrap_not_protected_main/);
});

test('a protected pre-interface ancestor cannot silently ignore the new handoff checks',t=>{
  const f=makeReleaseEngineRepo(t);
  const state={...f.state,engine_sha:f.legacySha};writeTestFile(f.semanticRoot,`shadow-runs/${f.date}/compiler-state.json`,state);testCommit(f.semanticRoot);
  assert.equal(assertProtectedFirstParent({root:f.engineRoot,engineSha:f.legacySha,protectedHeadSha:f.mainSha}),true);
  assert.throws(()=>selectReleaseEngine(f.selection),/selected_engine_missing_handoff_interface/);
});

test('protected first-parent membership rejects a merged feature branch commit',t=>{
  const f=makeReleaseEngineRepo(t),featureRoot=path.join(f.root,'feature');
  testGit(f.engineRoot,'worktree','add','-b','TEST_ONLY-feature',featureRoot,f.engineSha);
  writeTestFile(featureRoot,'feature.txt','TEST_ONLY second parent\n');const featureSha=testCommit(featureRoot);
  testGit(f.engineRoot,'merge','--no-ff','TEST_ONLY-feature','-m','TEST_ONLY protected merge');const mergeSha=testGit(f.engineRoot,'rev-parse','HEAD');
  assert.equal(assertProtectedFirstParent({root:f.engineRoot,engineSha:f.engineSha,protectedHeadSha:mergeSha}),true);
  assert.equal(assertProtectedFirstParent({root:f.engineRoot,engineSha:mergeSha,protectedHeadSha:mergeSha}),true);
  assert.throws(()=>assertProtectedFirstParent({root:f.engineRoot,engineSha:featureSha,protectedHeadSha:mergeSha}),/not_protected_main_first_parent/);
});

test('actual engine tracked bytes stay clean; semantic advisory files and untracked builds do not become gates',t=>{
  const f=makeReleaseEngineRepo(t),binding=selectReleaseEngine(f.selection);f.verifyEngine();
  writeTestFile(f.engineRoot,'build/untracked.json',{TEST_ONLY:'build output'});
  writeTestFile(f.semanticRoot,'docs/advisory.md','TEST_ONLY harmless semantic documentation\n');
  writeTestFile(f.semanticRoot,'observability/observer.mjs','throw new Error("TEST_ONLY observer off");\n');
  writeTestFile(f.semanticRoot,'operations/learning.mjs','throw new Error("TEST_ONLY learning off");\n');
  writeTestFile(f.semanticRoot,'vendor/production-reader/irrelevant.txt','TEST_ONLY semantic copy is not executed\n');
  assert.equal(verifyReleaseEngineHandoff({binding,...f.selection}).engine_sha,f.engineSha);
  fs.appendFileSync(path.join(f.engineRoot,'engine.txt'),'modified tracked engine bytes\n');
  assert.throws(()=>verifyReleaseEngineHandoff({binding,...f.selection}),/engine_checkout_modified/);
});

test('changed semantic commit or dirty state fails despite the same sealed bundle digest',t=>{
  const f=makeReleaseEngineRepo(t),binding=selectReleaseEngine(f.selection);f.verifyEngine();
  const state={...f.state,updated_at:'2026-10-09T00:16:00Z'};writeTestFile(f.semanticRoot,`shadow-runs/${f.date}/compiler-state.json`,state);
  assert.throws(()=>verifyReleaseEngineHandoff({binding,...f.selection}),/handoff_input_mismatch/);
  writeTestFile(f.semanticRoot,`shadow-runs/${f.date}/compiler-state.json`,f.state);
  writeTestFile(f.semanticRoot,'docs/later-semantic-observation.md','TEST_ONLY later branch commit\n');testCommit(f.semanticRoot);
  assert.throws(()=>verifyReleaseEngineHandoff({binding,...f.selection}),/semantic_checkout_mismatch/);
});

test('last remote head check rejects concurrent branch advance while local semantic checkout remains exact',t=>{
  const f=makeReleaseEngineRepo(t),binding=selectReleaseEngine(f.selection);f.verifyEngine();
  testGit(f.semanticRoot,'checkout','--detach',f.semanticCommit);
  testGit(f.engineRoot,'update-ref',`refs/heads/${f.branch}`,f.mainSha);
  assert.equal(verifyReleaseEngineHandoff({binding,...f.selection}).semantic_commit,f.semanticCommit);
  assert.throws(()=>assertRemoteSemanticHead({root:f.semanticRoot,branch:f.branch,semanticCommit:f.semanticCommit}),/semantic_branch_head_changed/);
  assert.throws(()=>verifyReleaseEngineHandoff({binding,...f.selection,requireRemoteHead:true}),/semantic_branch_head_changed/);
});

test('release engine is immutable on resume and cannot be first attached after editorial completes',t=>{
  const f=makeReleaseEngineRepo(t);
  assert.equal(assertProgressPreserved(f.state,clone(f.state)),true);
  for(const value of [undefined,f.mainSha]){
    const next=clone(f.state);if(value===undefined)delete next.engine_sha;else next.engine_sha=value;
    assert.throws(()=>assertProgressPreserved(f.state,next),/release engine changed or removed/);
  }
  const previous=clone(f.state);delete previous.engine_sha;
  assert.throws(()=>assertProgressPreserved(previous,f.state),/unfinished EDITORIAL/);
  previous.stage='EDITORIAL';previous.state='ALLOCATED';previous.editorial_bundle.status='pending';
  assert.equal(assertProgressPreserved(previous,{...previous,engine_sha:f.engineSha}),true);
  assert.throws(()=>assertProgressPreserved(previous,{...previous,engine_sha:'main'}),/exact release engine SHA/);
});

test('historical compatibility requires exact registered bytes and identities, even when a pin is added',()=>{
  const state=JSON.parse(fs.readFileSync(path.join(ROOT,'fixtures/complete-edition/compiler-state.json'),'utf8'));
  const bytes=fs.readFileSync(path.join(ROOT,'fixtures/complete-edition/edition-bundle.json')),bundle=JSON.parse(bytes),bundleSha=sha256(bytes);
  assert.equal(assertStateEnginePin({state,bundle,bundleSha,allowFixture:true}).scope,'REGISTERED_TEST_FIXTURE');
  for(const record of [state,{...state,engine_sha:'a'.repeat(40)}])assert.throws(()=>assertStateEnginePin({state:record,bundle,bundleSha}),/fixture_not_production_history/);
  for(const changed of [{...state,execution_id:'new-run'},{...state,branch:'shadow/2026-10-09'},{...state,edition_date:'2026-10-09'}])assert.throws(()=>assertStateEnginePin({state:changed,bundle,bundleSha,allowFixture:true}),/missing_pin_for_new_edition|historical_edition_mismatch/);
  assert.throws(()=>assertStateEnginePin({state,bundle,bundleSha:sha256(Buffer.concat([bytes,Buffer.from('\n')])),allowFixture:true}),/missing_pin_for_new_edition/);
});

test('compiler, pre-deploy receipt and finalization bind actual engine/semantic identities',t=>{
  const f=makeReleaseEngineRepo(t),binding=selectReleaseEngine(f.selection);f.verifyEngine();
  const options={statePath:f.statePath,bundlePath:f.bundlePath,semanticRoot:f.semanticRoot,engineRoot:f.engineRoot,requireBinding:true};
  assert.throws(()=>compileEngineBinding(options),/pinned_state_requires_handoff/);
  const compiled=compileEngineBinding({...options,binding});assert.equal(compiled.engine_sha,f.engineSha);assert.equal(compiled.semantic_commit,f.semanticCommit);
  const compile={schema_version:'daily-compiler-compile-receipt-v2',result:'PASS',engine_binding:compiled,state_sha256:compiled.state_sha256,bundle_sha256:compiled.bundle_sha256};
  assert.equal(assertCompiledEngineReceipt({binding:compiled,compile}),true);
  for(const bad of [{...compile,engine_binding:undefined},{...compile,state_sha256:'0'.repeat(64)},{...compile,engine_binding:{...compiled,semantic_commit:f.mainSha}}])assert.throws(()=>assertCompiledEngineReceipt({binding:compiled,compile:bad}),/compile_receipt/);
  const finalOptions={state:f.state,bundle:f.bundle,semanticRoot:f.semanticRoot,engineRoot:f.engineRoot,requireBinding:true};
  assert.throws(()=>assertFinalizationEngine({...finalOptions,compile:{}}),/compile_receipt_pin_missing/);
  assert.throws(()=>assertFinalizationEngine({...finalOptions,compile:{engine_binding:{...compiled,engine_sha:f.mainSha}}}),/compile_receipt_pin_mismatch/);
  assert.deepEqual(assertFinalizationEngine({...finalOptions,compile}),compiled);
  const terminal={...f.state,state:'SHADOW_VERIFIED',stage:'VERIFY'};
  assert.equal(assertFinalizationEngine({...finalOptions,state:terminal,alreadyTerminal:true,compile}).semantic_commit,f.semanticCommit);
});

test('activation authority must match F and F must retain its complete proof graph',t=>{
  let fixture;
  const f=makeReleaseEngineRepo(t,{seed:root=>{fixture=makeD1QualificationFixture({root});applyD1Activation({repoRoot:root,proofPath:fixture.proofPath,activatedAt:'2026-10-08T03:00:00Z'});}});
  const state={images:{strategy:'d1_work_browser_fresh_chat'}},bundle={image_system:{strategy:'d1_work_browser_fresh_chat'}};
  const options={engineRoot:f.engineRoot,semanticRoot:f.semanticRoot,state,bundle};
  assert.equal(assertFrozenActivationRoots(options).length,2,'TEST_ONLY synthetic proof, not live activation');
  const contract='contracts/d1-image-contract.json';fs.appendFileSync(path.join(f.semanticRoot,contract),'\n');
  assert.throws(()=>assertFrozenActivationRoots(options),/activation_input_changed/);
  fs.copyFileSync(path.join(f.engineRoot,contract),path.join(f.semanticRoot,contract));
  fs.rmSync(path.join(f.engineRoot,fixture.proofPath));
  assert.throws(()=>assertFrozenActivationRoots(options),/pinned_d1_activation_invalid/);
});

test('production dispatch requires all exact fields and deploy uses the pinned interface directly',t=>{
  const f=makeReleaseEngineRepo(t),workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/shadow-compile.yml'),'utf8');
  const block=workflow.match(/- name: Validate target identity\n        run: \|\n([\s\S]*?)      - name:/)[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const good={...process.env,TRIGGER_EVENT:'repository_dispatch',TARGET_BRANCH:f.branch,EXPECTED_ENGINE_SHA:f.engineSha,EXPECTED_SEMANTIC_COMMIT:f.semanticCommit,EXPECTED_DIGEST:f.state.bundle.digest,GITHUB_ENV:path.join(f.root,'github-env')};
  for(const key of ['EXPECTED_ENGINE_SHA','EXPECTED_SEMANTIC_COMMIT','EXPECTED_DIGEST'])assert.throws(()=>execFileSync('bash',['-c',block],{env:{...good,[key]:''},stdio:'pipe'}));
  execFileSync('bash',['-c',block],{env:good,stdio:'pipe'});
  assert.match(workflow,/ref: main[\s\S]*Select immutable engine using protected-main bootstrap[\s\S]*git checkout --detach "\$ENGINE_SHA"/);
  assert.match(workflow,/Recheck exact semantic head immediately before deployment[\s\S]*import \{verifyReleaseEngineHandoff,assertCompiledEngineReceipt\}[\s\S]*requireRemoteHead:true[\s\S]*?- id: deployment/);
  const signal=fs.readFileSync(path.join(ROOT,'.github/workflows/bundle-ready-signal.yml'),'utf8');
  assert.match(signal,/ref: main/);assert.match(signal,/engine_sha:e.ENGINE_SHA,semantic_commit:e.SEMANTIC_COMMIT/);
});

test('operational compiler and finalizer CLIs reject missing/mismatched bindings and retain a valid exact-engine fixture',async t=>{
  let product;
  const f=makeReleaseEngineRepo(t,{copyRuntime:true,seed:root=>{
    fs.cpSync(path.join(ROOT,'vendor'),path.join(root,'vendor'),{recursive:true});
    product=makeProductReleaseFixture({root});
  }});
  // The actual daily specification is admitted against the already active F,
  // not the host test process's cached preactivation contract metadata.
  const {assertD1Specifications}=await import(pathToFileURL(path.join(f.engineRoot,'image-studio/spec-admission.mjs')).href);
  const admission=assertD1Specifications(product.dailyRequest,product.sourceEvidence),reviews=clone(product.reviews),bundle=clone(product.bundle);
  reviews.admission.sha256=canonicalSha(admission);
  bundle.image_system.canonical_reviews_sha256=canonicalSha(reviews);
  writeTestFile(f.semanticRoot,product.paths.admission,admission);writeTestFile(f.semanticRoot,product.paths.reviews,reviews);
  writeTestFile(f.semanticRoot,`shadow-runs/${f.date}/edition-bundle.json`,bundle);
  const state={...product.state,engine_sha:f.engineSha,bundle:{...product.state.bundle,digest:sha256(fs.readFileSync(f.bundlePath))}};
  writeTestFile(f.semanticRoot,`shadow-runs/${f.date}/compiler-state.json`,state);
  const semanticCommit=testCommit(f.semanticRoot),binding=selectReleaseEngine(f.selection);f.verifyEngine();
  const buildDir=path.join(f.root,'build'),sourceDir=path.join(buildDir,'reader-source');
  const bindingPath=path.join(f.root,'handoff.json'),compilePath=path.join(sourceDir,'compile-receipt.json');
  const compilerArgs=[path.join(f.engineRoot,'compiler/compile.mjs'),'--state',f.statePath,'--bundle',f.bundlePath,'--out',sourceDir,'--repo-root',f.semanticRoot];
  const run=args=>execFileSync(process.execPath,args,{cwd:f.root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30_000,maxBuffer:2*1024*1024});
  const rejects=(args,pattern)=>assert.throws(()=>run(args),error=>pattern.test(error.stderr?.toString()||''));
  rejects(compilerArgs,/pinned_state_requires_handoff/);
  writeTestFile(f.root,'handoff.json',{...binding,engine_sha:f.mainSha});
  rejects([...compilerArgs,'--release-binding',bindingPath],/payload_pin_mismatch/);
  writeTestFile(f.root,'handoff.json',binding);
  const compiled=JSON.parse(run([...compilerArgs,'--release-binding',bindingPath]));
  assert.equal(compiled.result,'PASS');assert.equal(compiled.image_contract_gate.result,'PASS');assert.equal(compiled.media_contract_gate.result,'PASS');
  assert.equal(compiled.engine_binding.engine_sha,f.engineSha);assert.equal(compiled.engine_binding.semantic_commit,semanticCommit);
  // Existing rendered-reader/HTTP replay is TEST_ONLY; no actual deployment or
  // network call is performed, and no live release claim is made by this test.
  const replay=makeBuiltReaderReplay({sourceDir,root:buildDir}),{fetchImpl}=replayReaderFetch(replay,{feedback:true});
  writeTestFile(buildDir,'live-verification.json',await verifyLiveReader({...replay.options,fetchImpl}));
  const finalizeArgs=[path.join(f.engineRoot,'scripts/finalize-shadow-state.mjs'),f.semanticRoot,f.date,replay.options.baseUrl];
  const missing=clone(compiled);delete missing.engine_binding;fs.writeFileSync(compilePath,JSON.stringify(missing,null,2)+'\n');
  rejects(finalizeArgs,/compile_receipt_pin_missing/);
  fs.writeFileSync(compilePath,JSON.stringify({...compiled,engine_binding:{...compiled.engine_binding,engine_sha:f.mainSha}},null,2)+'\n');
  rejects(finalizeArgs,/compile_receipt_pin_mismatch/);
  fs.writeFileSync(compilePath,JSON.stringify(compiled,null,2)+'\n');
  const finalized=JSON.parse(run(finalizeArgs));assert.equal(finalized.result,'PASS');assert.equal(finalized.state,'SHADOW_VERIFIED');
  const terminal=JSON.parse(fs.readFileSync(f.statePath,'utf8'));
  const proof=JSON.parse(fs.readFileSync(path.join(f.semanticRoot,`shadow-runs/${f.date}/compiler/finalization-receipt.json`),'utf8'));
  assert.equal(terminal.engine_sha,f.engineSha);assert.equal(proof.engine_binding.semantic_commit,semanticCommit);
});
