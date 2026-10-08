import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FEEDBACK_SITE_BASELINE,FEEDBACK_SITE_BINDINGS,ISOLATED_SITE_ORIGIN,ISOLATED_SITE_BUILD_COMMAND,isolatedSiteDigest,isolatedSiteFiles,stageIsolatedValueSite,publishIsolatedValueSite} from '../scripts/stage-isolated-value-site.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ADAPTER='scripts/stage-isolated-value-site.mjs',A='a'.repeat(40),B='b'.repeat(40);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
// Exact restored feedback build/provenance/migration fixtures. Their hashes are
// checked against the adapter's explicit existing-site baseline, not fabricated
// live evidence. Public reader/CI packet samples below are TEST_ONLY.
const BUILD_SCRIPT="import {mkdir, cp, writeFile, readFile, rm} from 'node:fs/promises';\nimport assert from 'node:assert/strict';\nimport {createHash} from 'node:crypto';\nconst provenance=JSON.parse(await readFile('source-provenance.json','utf8'));\nfor(const [file,sha] of Object.entries(provenance.blobs)){\n  const data=await readFile(file);\n  const actual=createHash('sha1').update('blob '+data.length+'\\0').update(data).digest('hex');\n  assert.equal(actual,sha,'Protected-main source changed: '+file);\n}\nawait rm('dist',{recursive:true,force:true});\nawait mkdir('dist/server/feedback-runtime',{recursive:true});\nawait mkdir('dist/server/compiler',{recursive:true});\nawait cp('feedback-runtime/worker.mjs','dist/server/feedback-runtime/worker.mjs');\nawait cp('compiler/feedback-identity.mjs','dist/server/compiler/feedback-identity.mjs');\nawait writeFile('dist/server/index.js',\"export {default} from './feedback-runtime/worker.mjs';\\n\");\nawait mkdir('drizzle',{recursive:true});\nawait cp('feedback-runtime/drizzle/0000_compiler_feedback.sql','drizzle/0000_compiler_feedback.sql');\nconst {default:worker}=await import('../dist/server/index.js');\nassert.equal(typeof worker.fetch,'function');\nconst unbound=await worker.fetch(new Request('https://example.test/api/health'),{});\nassert.equal(unbound.status,503);\nconsole.log('Protected-main hashes verified; Worker and exact migration packaged.');\n";
const SOURCE_PROVENANCE="{\n  \"repository\": \"gttome/Daily-AI-Brief-Compiler\",\n  \"ref\": \"main\",\n  \"commit_sha\": \"a732f2c5e6dafe7707ea2988fa6b64a78a79cde4\",\n  \"blobs\": {\n    \"feedback-runtime/README.md\": \"3aca2daf9755ba7c80d5c7038ba7db9c651dfa50\",\n    \"feedback-runtime/package.json\": \"fa9debbec49a5bf6665ee2af893b5736e241808e\",\n    \"feedback-runtime/worker.mjs\": \"92294b8e4f62d4052d388f9785a9710161562458\",\n    \"feedback-runtime/schema.sql\": \"a29a9de3786a70d86836f8902dc39ffb065eae31\",\n    \"feedback-runtime/drizzle/0000_compiler_feedback.sql\": \"a29a9de3786a70d86836f8902dc39ffb065eae31\",\n    \"compiler/feedback-identity.mjs\": \"0f07a3672c8a12a1f9c58a3a568dd83ad84acbe0\"\n  }\n}\n";
const SCHEMA="CREATE TABLE IF NOT EXISTS compiler_feedback (\n  operation TEXT PRIMARY KEY NOT NULL,\n  kind TEXT NOT NULL,\n  edition TEXT NOT NULL,\n  item TEXT NOT NULL,\n  value TEXT NOT NULL,\n  created_at INTEGER NOT NULL\n);\nCREATE INDEX IF NOT EXISTS compiler_feedback_item_kind ON compiler_feedback(edition,item,kind);\n\nCREATE TABLE IF NOT EXISTS compiler_comments (\n  operation TEXT PRIMARY KEY NOT NULL,\n  edition TEXT NOT NULL,\n  item TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at INTEGER NOT NULL\n);\nCREATE INDEX IF NOT EXISTS compiler_comments_item ON compiler_comments(edition,item,created_at);\n\nCREATE TABLE IF NOT EXISTS compiler_watchlist_ballots (\n  topic TEXT NOT NULL,\n  ballot TEXT NOT NULL,\n  choice TEXT NOT NULL,\n  revision INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL,\n  PRIMARY KEY(topic,ballot)\n);\n";
const PACKAGE="{\n  \"name\": \"dab-compiler-feedback-site\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"scripts\": { \"build\": \"node scripts/build.mjs\" }\n}\n";

function temp(t,name='case'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-isolated-site-'+name+'-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;
}
function write(root,relative,value){
  const full=path.join(root,relative);fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,typeof value==='string'||Buffer.isBuffer(value)?value:json(value));return full;
}
function read(root,relative){return JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));}
function makeSite(t){
  const site=temp(t,'site');
  for(const relative of ['feedback-runtime/worker.mjs','feedback-runtime/README.md','feedback-runtime/package.json','compiler/feedback-identity.mjs']){
    const dest=path.join(site,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(ROOT,relative),dest);
  }
  write(site,'scripts/build.mjs',BUILD_SCRIPT);write(site,'source-provenance.json',SOURCE_PROVENANCE);write(site,'package.json',PACKAGE);
  write(site,'.openai/hosting.json',FEEDBACK_SITE_BINDINGS);
  for(const file of ['feedback-runtime/schema.sql','feedback-runtime/drizzle/0000_compiler_feedback.sql','drizzle/0000_compiler_feedback.sql'])write(site,file,SCHEMA);
  write(site,'existing-root-sentinel.txt','TEST_ONLY existing unrelated Site source\n');
  return site;
}
function makePacket(t,engineSha=A){
  const packet=temp(t,'packet'),namespace='value-'+engineSha;
  const environment={publicBase:ISOLATED_SITE_ORIGIN+'/qualification/'+namespace,baseurl:'/qualification/'+namespace,repository:'gttome/Daily-AI-Brief-Compiler',feedbackBase:ISOLATED_SITE_ORIGIN};
  const fixture={scope:'REGISTERED_HISTORICAL_FIXTURE_DELIVERY_ONLY',current_premium_image_proof:false,edition_date:'2026-10-06',bundle_sha256:'c5dfc5213236f8b1a66c6f34cc1a80a3e91e2d5d24505b710232fe267c00fb38'};
  const manifest={schema_version:'daily-compiler-canonical-reader-source-v1',edition_date:fixture.edition_date,bundle_sha256:fixture.bundle_sha256,
    environment:{public_base:environment.publicBase,baseurl:environment.baseurl}};
  write(packet,'shadow/index.html','<!doctype html><p>TEST_ONLY controlled public staging fixture</p>\n');
  write(packet,'shadow/latest.md','<p>TEST_ONLY controlled latest route</p>\n');
  write(packet,'shadow/assets/test.css','/* TEST_ONLY */ body { color: black; }\n');
  write(packet,'shadow/build-manifest.json',manifest);
  // These files are legitimate packet members, but must never reach the Site.
  write(packet,'inputs/private-source.json',{TEST_ONLY:'retained proof input, never public'});
  write(packet,'reader-source/compile-receipt.json',{TEST_ONLY:'retained operational evidence'});
  write(packet,'engine-source.tar','TEST_ONLY not an actual engine archive\n');
  const adapterBytes=fs.readFileSync(path.join(ROOT,ADAPTER));
  const seed={schema_version:'daily-compiler-isolated-value-build-v1',result:'BUILT_LIVE_PENDING',engine_sha:engineSha,
    checkout:{source:'GIT_CHECKOUT',head_sha:engineSha,tracked_files_clean:true},check_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/123/job/456',
    ci_conclusion:null,live_verification:'NOT_RUN',deployment:'NOT_RUN',release_authority:false,environment,fixture,
    inventory:{schema_version:'daily-compiler-value-version-inventory-v1',engine_sha:engineSha,files:[{path:ADAPTER,scope:'implementation',sha256:sha(adapterBytes),bytes:adapterBytes.length}]},
    product_receipt_sha256:{manifest:isolatedSiteDigest(manifest),live:null}};
  return reseal(packet,seed);
}
function reseal(packet,seed=read(packet,'build-provenance.json')){
  const files=isolatedSiteFiles(path.join(packet,'shadow'));
  seed.public_artifact={directory:'shadow',files,file_count:files.length,total_bytes:files.reduce((n,row)=>n+row.bytes,0),files_sha256:isolatedSiteDigest(files)};
  seed.packet_files=isolatedSiteFiles(packet).filter(row=>row.path!=='build-provenance.json');
  write(packet,'build-provenance.json',seed);
  return {packetRoot:packet,engineSha:seed.engine_sha,provenanceSha256:isolatedSiteDigest(seed),seed};
}
function mutateSeed(f,change){
  const seed=read(f.packetRoot,'build-provenance.json');change(seed);write(f.packetRoot,'build-provenance.json',seed);
  return {...f,seed,provenanceSha256:isolatedSiteDigest(seed)};
}
function originalFiles(site){return new Map(isolatedSiteFiles(site).filter(row=>row.path!=='package.json').map(row=>[row.path,row.sha256]));}
function assertPreserved(site,expected){for(const [file,digest] of expected)assert.equal(sha(fs.readFileSync(path.join(site,file))),digest,file);}
function buildOriginal(site){execFileSync(process.execPath,['scripts/build.mjs'],{cwd:site,encoding:'utf8'});}

test('I07 isolated staging copies only exact public bytes and preserves original Site source, API and migration',t=>{
  const site=makeSite(t),before=originalFiles(site),packet=makePacket(t);
  const receipt=stageIsolatedValueSite({...packet,siteRoot:site});
  assert.equal(receipt.result,'PUBLIC_NAMESPACE_STAGED_LIVE_PENDING');
  assert.equal(receipt.native_static_serving,'UNPROVED');assert.equal(receipt.deployment,'NOT_RUN');assert.equal(receipt.live_verification,'NOT_RUN');
  assert.equal(receipt.feedback_probe_requests,0);assert.equal(receipt.image_activation,false);assert.equal(receipt.release_authority,false);
  assert.equal(receipt.original_package_sha256,sha(Buffer.from(PACKAGE)));
  assert.equal(receipt.package_before_sha256,FEEDBACK_SITE_BASELINE.original_package_sha256);
  assert.equal(read(site,'package.json').scripts.build,ISOLATED_SITE_BUILD_COMMAND);
  assertPreserved(site,before);
  assert.deepEqual(isolatedSiteFiles(path.join(site,'qualification-public/value-'+A)),packet.seed.public_artifact.files);
  assert.equal(fs.existsSync(path.join(site,'engine-source.tar')),false);
  assert.equal(fs.existsSync(path.join(site,'inputs')),false);
  assert.equal(fs.existsSync(path.join(site,'reader-source')),false);
  assert.equal(fs.existsSync(path.join(site,'build-provenance.json')),false);
  assert.equal(sha(fs.readFileSync(path.join(site,ADAPTER))),sha(fs.readFileSync(path.join(ROOT,ADAPTER))));
  const saved=read(site,'qualification-manifests/value-'+A+'.json');
  assert.equal(saved.build_provenance_sha256,packet.provenanceSha256);
});

test('I07 staging is idempotent, preserves prior immutable prefixes and rejects different bytes for the same engine',t=>{
  const site=makeSite(t),first=makePacket(t),second=makePacket(t,B);
  stageIsolatedValueSite({...first,siteRoot:site});
  const firstRows=isolatedSiteFiles(path.join(site,'qualification-public/value-'+A)),firstManifest=fs.readFileSync(path.join(site,'qualification-manifests/value-'+A+'.json'));
  const duplicate=stageIsolatedValueSite({...first,siteRoot:site});
  assert.equal(duplicate.result,'IDENTICAL_PUBLIC_NAMESPACE_REUSED_LIVE_PENDING');
  assert.equal(duplicate.package_before_sha256,duplicate.package_after_sha256);
  stageIsolatedValueSite({...second,siteRoot:site});
  assert.deepEqual(isolatedSiteFiles(path.join(site,'qualification-public/value-'+A)),firstRows);
  assert.deepEqual(fs.readFileSync(path.join(site,'qualification-manifests/value-'+A+'.json')),firstManifest);
  write(first.packetRoot,'shadow/index.html','TEST_ONLY replacement bytes for the same immutable namespace\n');
  const changed=reseal(first.packetRoot);
  assert.throws(()=>stageIsolatedValueSite({...changed,siteRoot:site}),/immutable_namespace_replacement_forbidden/);
  assert.deepEqual(isolatedSiteFiles(path.join(site,'qualification-public/value-'+A)),firstRows);
});

test('I07 original build plus standalone publish hook packages static namespaces without changing the Worker',t=>{
  const site=makeSite(t),before=originalFiles(site),first=makePacket(t),second=makePacket(t,B);
  stageIsolatedValueSite({...first,siteRoot:site});stageIsolatedValueSite({...second,siteRoot:site});
  const output=execFileSync('npm',['run','build','--silent'],{cwd:site,encoding:'utf8'});
  assert.match(output,/Protected-main hashes verified/);assert.match(output,/STATIC_FILES_PACKAGED_LIVE_PENDING/);
  for(const f of [first,second])assert.deepEqual(isolatedSiteFiles(path.join(site,'dist/client/qualification/value-'+f.engineSha)),f.seed.public_artifact.files);
  assert.deepEqual(fs.readFileSync(path.join(site,'dist/server/feedback-runtime/worker.mjs')),fs.readFileSync(path.join(site,'feedback-runtime/worker.mjs')));
  assert.deepEqual(fs.readFileSync(path.join(site,'dist/server/compiler/feedback-identity.mjs')),fs.readFileSync(path.join(site,'compiler/feedback-identity.mjs')));
  assert.equal(fs.readFileSync(path.join(site,'dist/server/index.js'),'utf8'),"export {default} from './feedback-runtime/worker.mjs';\n");
  for(const privateFile of ['engine-source.tar','build-provenance.json','qualification-manifests','inputs','reader-source'])assert.equal(fs.existsSync(path.join(site,'dist/client',privateFile)),false);
  write(site,'dist/client/index.html','TEST_ONLY existing root output\n');
  const receipt=publishIsolatedValueSite({siteRoot:site});
  assert.equal(receipt.server_unchanged,true);assert.equal(receipt.unrelated_client_output_unchanged,true);
  assert.equal(receipt.native_static_serving,'UNPROVED');assert.equal(receipt.live_verification,'NOT_RUN');
  assert.equal(fs.readFileSync(path.join(site,'dist/client/index.html'),'utf8'),'TEST_ONLY existing root output\n');
  assertPreserved(site,before);
});

test('I07 staging rejects stale engine, provenance, host, fixture or protected-adapter bindings before Site writes',t=>{
  const site=makeSite(t),before=isolatedSiteFiles(site);
  for(const [label,change,error] of [
    ['engine',seed=>seed.checkout.head_sha=B,/pending_exact_engine_build_binding/],
    ['dirty checkout',seed=>seed.checkout.tracked_files_clean=false,/pending_exact_engine_build_binding/],
    ['claimed live success',seed=>seed.live_verification='PASS',/pending_exact_engine_build_binding/],
    ['host',seed=>seed.environment.publicBase='https://gttome.github.io/Daily-AI-Brief-Compiler',/isolated_host_or_prefix_binding/],
    ['prefix',seed=>seed.environment.baseurl='/qualification/value-'+B,/isolated_host_or_prefix_binding/],
    ['future fixture',seed=>seed.fixture.edition_date='2026-10-09',/registered_public_fixture_scope/],
    ['adapter',seed=>seed.inventory.files[0].sha256='c'.repeat(64),/protected_adapter_engine_binding/],
    ['directory',seed=>seed.public_artifact.directory='inputs',/public_directory_must_be_shadow/]
  ]){
    const f=mutateSeed(makePacket(t),change);
    assert.throws(()=>stageIsolatedValueSite({...f,siteRoot:site}),error,label);
    assert.deepEqual(isolatedSiteFiles(site),before,label);
  }
  const f=makePacket(t);
  assert.throws(()=>stageIsolatedValueSite({...f,siteRoot:site,provenanceSha256:'d'.repeat(64)}),/build_provenance_digest_changed/);
  assert.deepEqual(isolatedSiteFiles(site),before);
});

test('I07 public manifest binds the real root build-manifest while rejecting private payloads, extra files and unsafe identities',t=>{
  const site=makeSite(t),before=isolatedSiteFiles(site);
  for(const name of ['engine-source.tar','build-provenance.json','inputs/source.json','reader-source/compile-receipt.json','assets/source-provenance.json','nested/build-manifest.json']){
    const f=makePacket(t);write(f.packetRoot,'shadow/'+name,'TEST_ONLY forbidden payload\n');
    assert.throws(()=>stageIsolatedValueSite({...reseal(f.packetRoot),siteRoot:site}),/non_public_file/,name);
  }
  const extra=makePacket(t);write(extra.packetRoot,'shadow/extra.txt','TEST_ONLY unlisted bytes\n');
  assert.throws(()=>stageIsolatedValueSite({...extra,siteRoot:site}),/public_artifact_bytes_changed/);
  for(const change of [
    seed=>seed.public_artifact.files.push(structuredClone(seed.public_artifact.files[0])),
    seed=>seed.public_artifact.files[0].path='../outside',
    seed=>seed.public_artifact.files[0].path='encoded%2fescape',
    seed=>seed.public_artifact.files[0].sha256='invalid'
  ]){
    assert.throws(()=>stageIsolatedValueSite({...mutateSeed(makePacket(t),change),siteRoot:site}),/public_manifest_missing_or_duplicate|invalid_file_identity/);
  }
  const wrongManifest=makePacket(t),manifest=read(wrongManifest.packetRoot,'shadow/build-manifest.json');
  manifest.environment.public_base='https://gttome.github.io/Daily-AI-Brief-Compiler';
  write(wrongManifest.packetRoot,'shadow/build-manifest.json',manifest);
  const wrong=reseal(wrongManifest.packetRoot);
  assert.throws(()=>stageIsolatedValueSite({...wrong,siteRoot:site}),/public_reader_manifest_binding/);
  assert.deepEqual(isolatedSiteFiles(site),before);
});

test('I07 packet and destination symlinks, including dangling links, cannot escape the qualification namespace',t=>{
  const site=makeSite(t),f=makePacket(t),outside=temp(t,'outside'),sentinel=write(outside,'keep.txt','TEST_ONLY unchanged outside data\n');
  fs.symlinkSync(sentinel,path.join(f.packetRoot,'shadow','escape.txt'));
  assert.throws(()=>stageIsolatedValueSite({...f,siteRoot:site}),/symlink_path/);
  const clean=makePacket(t);
  fs.symlinkSync(path.join(outside,'not-created'),path.join(site,'qualification-public'));
  assert.throws(()=>stageIsolatedValueSite({...clean,siteRoot:site}),/symlink_path/);
  assert.equal(fs.existsSync(path.join(outside,'not-created')),false);
  assert.equal(fs.readFileSync(sentinel,'utf8'),'TEST_ONLY unchanged outside data\n');
  fs.rmSync(path.join(site,'qualification-public'));
  stageIsolatedValueSite({...clean,siteRoot:site});buildOriginal(site);
  fs.symlinkSync(outside,path.join(site,'dist/client'));
  assert.throws(()=>publishIsolatedValueSite({siteRoot:site}),/symlink_path/);
  assert.equal(fs.existsSync(path.join(outside,'qualification')),false);
});

test('I07 staging and publication fail on changed feedback sources, original build, migration or server output',t=>{
  for(const file of ['feedback-runtime/worker.mjs','compiler/feedback-identity.mjs','scripts/build.mjs','source-provenance.json','drizzle/0000_compiler_feedback.sql']){
    const site=makeSite(t),f=makePacket(t);fs.appendFileSync(path.join(site,file),'\nTEST_ONLY changed protected input\n');
    assert.throws(()=>stageIsolatedValueSite({...f,siteRoot:site}),/existing_site_build_or_provenance_changed|existing_site_source_changed|existing_site_migration_changed/,file);
    assert.equal(fs.existsSync(path.join(site,'qualification-public')),false);
  }
  const site=makeSite(t),f=makePacket(t);stageIsolatedValueSite({...f,siteRoot:site});buildOriginal(site);
  fs.appendFileSync(path.join(site,'dist/server/index.js'),'\n// TEST_ONLY unapproved Worker route\n');
  assert.throws(()=>publishIsolatedValueSite({siteRoot:site}),/original_server_build_changed/);
  assert.equal(fs.existsSync(path.join(site,'dist/client')),false);
});

test('I07 matching feedback files do not authorize another Site project, database binding or storage bucket',t=>{
  for(const change of [value=>value.project_id='appgprj_TEST_ONLY_other_project',value=>value.d1='OTHER_DB',value=>value.r2='TEST_ONLY_NEW_BUCKET']){
    const site=makeSite(t),f=makePacket(t),hosting=read(site,'.openai/hosting.json');change(hosting);write(site,'.openai/hosting.json',hosting);
    const before=isolatedSiteFiles(site);
    assert.throws(()=>stageIsolatedValueSite({...f,siteRoot:site}),/selected_site_or_storage_binding_changed/);
    assert.deepEqual(isolatedSiteFiles(site),before);
  }
});

test('I07 publish preserves an already-created immutable destination instead of repairing different bytes',t=>{
  const site=makeSite(t),f=makePacket(t);stageIsolatedValueSite({...f,siteRoot:site});buildOriginal(site);publishIsolatedValueSite({siteRoot:site});
  const file=path.join(site,'dist/client/qualification/value-'+A+'/index.html');
  fs.appendFileSync(file,'TEST_ONLY changed deployed-candidate bytes\n');const changed=fs.readFileSync(file);
  assert.throws(()=>publishIsolatedValueSite({siteRoot:site}),/immutable_dist_namespace_replacement_forbidden/);
  assert.deepEqual(fs.readFileSync(file),changed);
});

