import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isolatedValueEnvironment,readIsolatedCheckoutBinding,isolatedFileManifest,assertIsolatedFileManifest,frozenFixtureIdentity,prepareIsolatedValueProof,verifyIsolatedValueProof} from '../scripts/prepare-isolated-value-proof.mjs';
import {readerEnvironment} from '../compiler/reader-environment.mjs';

const temporary=t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-isolated-value-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return root;
};
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function checkout(t){
  const root=temporary(t);
  git(root,'init','-q');fs.writeFileSync(path.join(root,'tracked.txt'),'frozen fixture test input\n');
  git(root,'add','tracked.txt');git(root,'-c','user.name=Compiler fixture test','-c','user.email=fixture@example.invalid','commit','-q','-m','Immutable test input');
  return {root,head:git(root,'rev-parse','HEAD')};
}

test('I07-T06 isolated artifact destination binds the full engine SHA on the existing Compiler host',()=>{
  const engine='a'.repeat(40),environment=isolatedValueEnvironment(engine);
  assert.equal(environment.publicBase,'https://dab-compiler-feedback.gtome.chatgpt.site/qualification/value-'+engine);
  assert.equal(environment.baseurl,'/qualification/value-'+engine);
  for(const key of Object.keys(readerEnvironment).filter(key=>!['publicBase','baseurl'].includes(key)))assert.equal(environment[key],readerEnvironment[key]);
  for(const value of [null,'main','a'.repeat(39),'a'.repeat(41),'A'.repeat(40),'../'+engine])assert.throws(()=>isolatedValueEnvironment(value),/exact_engine_sha_required/);
});

test('I07-T01/I07-T07 build provenance reads real clean Git HEAD and rejects relabeling or changed tracked bytes',t=>{
  const {root,head}=checkout(t);
  assert.deepEqual(readIsolatedCheckoutBinding({repoRoot:root,engineSha:head}),{source:'GIT_CHECKOUT',head_sha:head,tracked_files_clean:true});
  assert.throws(()=>readIsolatedCheckoutBinding({repoRoot:root,engineSha:'f'.repeat(40)}),/checkout_engine_mismatch/);
  fs.mkdirSync(path.join(root,'child'));
  assert.throws(()=>readIsolatedCheckoutBinding({repoRoot:path.join(root,'child'),engineSha:head}),/checkout_root_mismatch/);
  fs.writeFileSync(path.join(root,'tracked.txt'),'changed\n');
  assert.throws(()=>readIsolatedCheckoutBinding({repoRoot:root,engineSha:head}),/tracked_checkout_changed/);
});

test('I07-T06 preserved historical fixture has six accepted slots with one byte identity and no current premium claim',()=>{
  const args={stateText:fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'),bundleText:fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'),compatibility:JSON.parse(fs.readFileSync('contracts/media-compatibility.json','utf8'))};
  const fixture=frozenFixtureIdentity(args);
  assert.equal(fixture.scope,'REGISTERED_HISTORICAL_FIXTURE_DELIVERY_ONLY');
  assert.equal(fixture.image_slots,6);assert.equal(fixture.unique_image_sha256_count,1);assert.equal(fixture.current_premium_image_proof,false);
  assert.equal(fixture.bundle_sha256,'c5dfc5213236f8b1a66c6f34cc1a80a3e91e2d5d24505b710232fe267c00fb38');
  assert.equal(fixture.compatibility_entry.source_commit,'7f0a480ac673b0c36ed3279af0fd3a52af9425bf');
  assert.throws(()=>frozenFixtureIdentity({...args,bundleText:args.bundleText+'\n'}),/immutable_fixture_identity/);
  assert.throws(()=>frozenFixtureIdentity({...args,compatibility:{entries:[]}}),/registered_fixture_compatibility_missing/);
  const state=JSON.parse(args.stateText);state.state='SHADOW_VERIFIED';
  assert.throws(()=>frozenFixtureIdentity({...args,stateText:JSON.stringify(state)}),/immutable_fixture_identity/);
});

test('I07-T06 artifact inventory rejects byte substitution, added public files, duplicate paths and symlink escape',t=>{
  const root=temporary(t);fs.mkdirSync(path.join(root,'assets'));fs.writeFileSync(path.join(root,'assets','image.png'),Buffer.from([0,1,2,255]));
  fs.writeFileSync(path.join(root,'index.html'),'<main>Fixture</main>');
  const manifest=isolatedFileManifest(root);
  assert.equal(assertIsolatedFileManifest(root,manifest,{complete:true}),true);
  assert.throws(()=>assertIsolatedFileManifest(root,[...manifest,manifest[0]]),/file_manifest_missing_or_duplicate/);
  fs.writeFileSync(path.join(root,'extra.js'),'unreviewed');
  assert.throws(()=>assertIsolatedFileManifest(root,manifest,{complete:true}),/file_manifest_changed/);fs.unlinkSync(path.join(root,'extra.js'));
  fs.writeFileSync(path.join(root,'index.html'),'<main>Changed</main>');
  assert.throws(()=>assertIsolatedFileManifest(root,manifest),/file_manifest_changed/);
  assert.throws(()=>isolatedFileManifest(root,['../outside']),/invalid_manifest_paths/);
  const outside=temporary(t);fs.writeFileSync(path.join(outside,'outside.txt'),'outside');fs.symlinkSync(outside,path.join(root,'escape'));
  assert.throws(()=>isolatedFileManifest(root),/symlink_in_proof_input/);
});

test('I07-T01 exact tracked source manifest excludes untracked working files while retaining immutable bytes',t=>{
  const {root,head}=checkout(t);fs.writeFileSync(path.join(root,'untracked.txt'),'not part of this engine');
  const tracked=git(root,'ls-files').split('\n');
  assert.equal(readIsolatedCheckoutBinding({repoRoot:root,engineSha:head}).tracked_files_clean,true);
  assert.deepEqual(isolatedFileManifest(root,tracked).map(row=>row.path),['tracked.txt']);
  assert.throws(()=>isolatedFileManifest(root,['tracked.txt','tracked.txt']),/invalid_manifest_paths/);
});

test('I07-T06 prepare fails before output writes for a dirty or misidentified checkout and unsafe output',async t=>{
  const {root,head}=checkout(t),options={repoRoot:root,engineSha:head,checkUrl:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/123'};
  fs.writeFileSync(path.join(root,'tracked.txt'),'changed');
  await assert.rejects(prepareIsolatedValueProof(options),/tracked_checkout_changed/);
  assert.equal(fs.existsSync(path.join(root,'build')),false);
  await assert.rejects(prepareIsolatedValueProof({...options,outDir:'../outside'}),/output_must_be_under_build/);
  await assert.rejects(prepareIsolatedValueProof({...options,engineSha:'main'}),/exact_engine_sha_required/);
});

test('I07-T03/I07-T06 verification cannot turn an incomplete build seed into live or activation evidence',async t=>{
  const root=temporary(t),dir=path.join(root,'build','isolated-value');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'build-provenance.json'),JSON.stringify({schema_version:'daily-compiler-isolated-value-build-v1',result:'BUILT_LIVE_PENDING',engine_sha:'a'.repeat(40),live_verification:'NOT_RUN',product_receipt_sha256:{live:null}}));
  fs.writeFileSync(path.join(dir,'build-binding.json'),'{}');
  await assert.rejects(verifyIsolatedValueProof({repoRoot:root,engineSha:'a'.repeat(40)}),/build_binding_invalid/);
  assert.equal(fs.existsSync(path.join(dir,'live-verification.json')),false);
  assert.equal(fs.existsSync(path.join(dir,'complete-build-provenance.json')),false);
});
