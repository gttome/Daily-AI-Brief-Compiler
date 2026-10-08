#!/usr/bin/env node
// Explicit development proof only. CI builds an artifact; it never deploys,
// probes feedback, finalizes a run, or grants image/release activation.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalSha,sha256,gitBlobSha} from '../image-capsules/util.mjs';
import {compileShadow,validateEdition} from '../compiler/compile.mjs';
import {resolveReaderEnvironment} from '../compiler/reader-environment.mjs';
import {verifyFinalizationEvidence} from '../compiler/finalization-evidence.mjs';
import {assertCompleteReleaseEvidence} from '../compiler/release-evidence.mjs';
import {valueReleaseInventory,compareValueReleaseBindings,checkValueBuildProvenance} from '../operations/value-release.mjs';
import {verifyBuiltReader,readReleaseManifest} from './verify-built-reader.mjs';
import {mergeShadowHistory} from './merge-shadow-history.mjs';
import {verifyLiveReader} from './verify-live.mjs';

const REPOSITORY='gttome/Daily-AI-Brief-Compiler';
const SHA=/^[a-f0-9]{40}$/;
const CHECK=/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+(?:\/job\/\d+)?$/;
const STATE='fixtures/complete-edition/compiler-state.json';
const BUNDLE='fixtures/complete-edition/edition-bundle.json';
const BUNDLE_SHA='c5dfc5213236f8b1a66c6f34cc1a80a3e91e2d5d24505b710232fe267c00fb38';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const fail=message=>{throw new Error('isolated_value_proof:'+message);};
const safeRelative=value=>typeof value==='string'&&value.length>0&&!path.isAbsolute(value)&&!/[\\\0]/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');

export function isolatedValueEnvironment(engineSha){
  if(!SHA.test(engineSha||''))fail('exact_engine_sha_required');
  const baseurl='/qualification/value-'+engineSha;
  return resolveReaderEnvironment({publicBase:'https://dab-compiler-feedback.gtome.chatgpt.site'+baseurl,baseurl});
}

export function readIsolatedCheckoutBinding({repoRoot='.',engineSha}={}){
  const root=fs.realpathSync(repoRoot);
  const git=(...args)=>execFileSync('git',['--no-optional-locks',...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  if(fs.realpathSync(git('rev-parse','--show-toplevel'))!==root)fail('checkout_root_mismatch');
  const head=git('rev-parse','HEAD');
  if(!SHA.test(head)||engineSha!==head)fail('checkout_engine_mismatch');
  if(git('status','--porcelain','--untracked-files=no')!=='')fail('tracked_checkout_changed');
  return {source:'GIT_CHECKOUT',head_sha:head,tracked_files_clean:true};
}

function containedFile(root,relative){
  if(!safeRelative(relative))fail('unsafe_file_path');
  const base=fs.realpathSync(root),full=path.join(base,relative);
  let current=base;
  for(const part of relative.split('/')){
    current=path.join(current,part);
    if(fs.lstatSync(current).isSymbolicLink())fail('symlink_in_proof_input:'+relative);
  }
  if(!fs.statSync(full).isFile())fail('non_file_proof_input:'+relative);
  return full;
}

function fileIdentity(root,relative){
  const full=containedFile(root,relative),hash=createHash('sha256'),buffer=Buffer.alloc(1024*1024),fd=fs.openSync(full,'r');
  let bytes=0,count;
  try{while((count=fs.readSync(fd,buffer,0,buffer.length,null))>0){bytes+=count;hash.update(buffer.subarray(0,count));}}finally{fs.closeSync(fd);}
  return {path:relative,sha256:hash.digest('hex'),bytes};
}

export function isolatedFileManifest(root,relativePaths=null){
  const files=[];
  function visit(relative){
    const full=path.join(root,relative),stat=fs.lstatSync(full);
    if(stat.isSymbolicLink())fail('symlink_in_proof_input:'+relative);
    if(stat.isDirectory())for(const name of fs.readdirSync(full).sort())visit(relative?relative+'/'+name:name);
    else files.push(fileIdentity(root,relative));
  }
  if(relativePaths){
    if(!Array.isArray(relativePaths)||new Set(relativePaths).size!==relativePaths.length||relativePaths.some(file=>!safeRelative(file)))fail('invalid_manifest_paths');
    for(const relative of relativePaths)visit(relative);
  }else visit('');
  return files.sort((a,b)=>a.path.localeCompare(b.path));
}

export function assertIsolatedFileManifest(root,expected,{complete=false}={}){
  if(!Array.isArray(expected)||!expected.length||new Set(expected.map(row=>row.path)).size!==expected.length)fail('file_manifest_missing_or_duplicate');
  const actual=complete?isolatedFileManifest(root):isolatedFileManifest(root,expected.map(row=>row.path));
  if(canonicalSha(actual)!==canonicalSha(expected))fail('file_manifest_changed');
  return true;
}

export function frozenFixtureIdentity({stateText,bundleText,compatibility}){
  const state=JSON.parse(stateText),bundle=JSON.parse(bundleText),bundleDigest=sha256(Buffer.from(bundleText));
  if(bundleDigest!==BUNDLE_SHA||state.bundle?.digest!==bundleDigest||state.edition_date!=='2026-10-06'||bundle.edition_date!=='2026-10-06'||
    state.execution_id!=='fixture-2026-10-06'||state.branch!=='shadow/2026-10-06'||state.state!=='BUNDLE_READY'||state.stage!=='BUNDLE')fail('immutable_fixture_identity');
  const registered=(compatibility?.entries||[]).filter(row=>row.purpose==='immutable_test_fixture'&&row.bundle_sha256===bundleDigest&&row.source_path===BUNDLE&&
    row.edition_date===state.edition_date&&row.execution_id===state.execution_id&&row.branch===state.branch);
  if(registered.length!==1||!SHA.test(registered[0].source_commit||''))fail('registered_fixture_compatibility_missing');
  if(!Array.isArray(bundle.images)||bundle.images.length!==6||bundle.images.some(image=>image.accepted!==true)||new Set(bundle.images.map(image=>image.story_id)).size!==6)fail('fixture_image_acceptance_missing');
  return {scope:'REGISTERED_HISTORICAL_FIXTURE_DELIVERY_ONLY',edition_date:state.edition_date,state_path:STATE,bundle_path:BUNDLE,
    state_sha256:sha256(Buffer.from(stateText)),bundle_sha256:bundleDigest,compatibility_entry:registered[0],
    image_slots:bundle.images.length,unique_image_sha256_count:new Set(bundle.images.map(image=>image.sha256)).size,
    current_premium_image_proof:false};
}

function buildRoot(repoRoot,outDir){
  const root=fs.realpathSync(repoRoot);
  if(!safeRelative(outDir)||!outDir.startsWith('build/'))fail('output_must_be_under_build');
  let current=root;
  for(const part of outDir.split('/')){
    current=path.join(current,part);
    if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())fail('output_symlink');
  }
  return current;
}

function currentInventory(root,engineSha){
  const inventory=valueReleaseInventory({repoRoot:root,engineSha});
  if(inventory.missing_required_files.length||compareValueReleaseBindings(inventory,inventory).result!=='PASS')fail('incomplete_current_engine_inventory');
  return inventory;
}

function verifyBinding({repoRoot,engineSha,dir,binding,requireCheckout=false}){
  if(binding?.schema_version!=='daily-compiler-isolated-value-build-binding-v1'||binding.engine_sha!==engineSha||!CHECK.test(binding.check_url||'')||
    binding.checkout?.source!=='GIT_CHECKOUT'||binding.checkout.head_sha!==engineSha||binding.checkout.tracked_files_clean!==true||
    canonicalSha(binding.environment)!==canonicalSha(isolatedValueEnvironment(engineSha)))fail('build_binding_invalid');
  if(requireCheckout)readIsolatedCheckoutBinding({repoRoot,engineSha});
  const inventory=currentInventory(repoRoot,engineSha);
  if(compareValueReleaseBindings(binding.inventory,inventory).result!=='PASS')fail('current_engine_inventory_changed');
  assertIsolatedFileManifest(path.join(dir,'inputs'),binding.input_files,{complete:true});
  const fixture=frozenFixtureIdentity({stateText:fs.readFileSync(path.join(dir,'inputs',STATE),'utf8'),bundleText:fs.readFileSync(path.join(dir,'inputs',BUNDLE),'utf8'),compatibility:read(path.join(repoRoot,'contracts/media-compatibility.json'))});
  if(canonicalSha(fixture)!==canonicalSha(binding.fixture))fail('fixture_binding_changed');
  return inventory;
}

export async function prepareIsolatedValueProof({repoRoot='.',outDir='build/isolated-value',engineSha,checkUrl}={}){
  const root=fs.realpathSync(repoRoot),environment=isolatedValueEnvironment(engineSha),dir=buildRoot(root,outDir);
  const checkout=readIsolatedCheckoutBinding({repoRoot:root,engineSha});
  if(!CHECK.test(checkUrl||''))fail('actual_workflow_check_url_required');
  if(fs.existsSync(dir)&&fs.readdirSync(dir).length)fail('output_already_contains_work');
  const inventory=currentInventory(root,engineSha);
  const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).sort();
  const trackedSet=new Set(tracked);
  if(inventory.files.some(row=>!trackedSet.has(row.path)))fail('untracked_release_inventory_input');
  const stateText=fs.readFileSync(containedFile(root,STATE),'utf8'),bundleText=fs.readFileSync(containedFile(root,BUNDLE),'utf8'),bundle=JSON.parse(bundleText);
  const fixture=frozenFixtureIdentity({stateText,bundleText,compatibility:read(path.join(root,'contracts/media-compatibility.json'))});
  const inputs=[STATE,BUNDLE,...bundle.images.map(image=>image.path)];
  for(const image of bundle.images){
    if(!/^fixtures\/complete-edition\/images\/story-0[1-6]\.png$/.test(image.path))fail('fixture_image_path');
    const bytes=fs.readFileSync(containedFile(root,image.path));
    if(sha256(bytes)!==image.sha256||gitBlobSha(bytes)!==image.git_blob_sha)fail('fixture_image_bytes');
  }
  fs.mkdirSync(dir,{recursive:true});
  for(const relative of inputs){
    const target=path.join(dir,'inputs',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(containedFile(root,relative),target);
  }
  write(path.join(dir,'reader-environment.json'),{publicBase:environment.publicBase,baseurl:environment.baseurl});
  await compileShadow({statePath:path.join(root,STATE),bundlePath:path.join(root,BUNDLE),outDir:path.join(dir,'reader-source'),repoRoot:root,environment});
  readIsolatedCheckoutBinding({repoRoot:root,engineSha});
  const binding={schema_version:'daily-compiler-isolated-value-build-binding-v1',engine_sha:engineSha,repository:REPOSITORY,checkout,check_url:checkUrl,
    environment,fixture,inventory,input_files:isolatedFileManifest(path.join(dir,'inputs'))};
  write(path.join(dir,'build-binding.json'),binding);
  write(path.join(dir,'engine-file-manifest.json'),isolatedFileManifest(root,tracked));
  execFileSync('git',['archive','--format=tar','--output='+path.join(dir,'engine-source.tar'),'HEAD'],{cwd:root,stdio:['ignore','pipe','pipe']});
  return {result:'SOURCE_COMPILED_BUILD_PENDING',engine_sha:engineSha,public_base:environment.publicBase,fixture_scope:fixture.scope,output:outDir};
}

const PACKET_PATHS=['reader-source','shadow','inputs','reader-environment.json','build-binding.json','engine-file-manifest.json','engine-source.tar','built-verification.json','history-merge-receipt.json'];

export function packageIsolatedValueProof({repoRoot='.',outDir='build/isolated-value',engineSha}={}){
  const root=fs.realpathSync(repoRoot),dir=buildRoot(root,outDir),binding=read(path.join(dir,'build-binding.json'));
  verifyBinding({repoRoot:root,engineSha,dir,binding,requireCheckout:true});
  const sourceDir=path.join(dir,'reader-source'),currentDir=path.join(dir,'current'),siteDir=path.join(dir,'shadow');
  const {compile,manifest}=readReleaseManifest({sourceDir}),sourceVerify=read(path.join(sourceDir,'verification-receipt.json'));
  if(manifest.environment.public_base!==binding.environment.publicBase||manifest.environment.baseurl!==binding.environment.baseurl||
    compile.bundle_sha256!==binding.fixture.bundle_sha256||compile.state_sha256!==binding.fixture.state_sha256||canonicalSha(compile.verification)!==canonicalSha(sourceVerify))fail('compiled_fixture_binding');
  const built=verifyBuiltReader({siteDir:currentDir,sourceDir});
  const history=mergeShadowHistory({historyDir:'-',currentDir,outDir:siteDir,currentDate:binding.fixture.edition_date,receiptPath:path.join(dir,'history-merge-receipt.json')});
  if(canonicalSha(verifyBuiltReader({siteDir,sourceDir}))!==canonicalSha(built))fail('isolated_history_changed_current_artifact');
  write(path.join(dir,'built-verification.json'),built);
  for(const name of ['compile-receipt.json','verification-receipt.json','engine-source.tar','build-provenance.json','inputs'])if(fs.existsSync(path.join(siteDir,name)))fail('non_public_payload_in_site:'+name);
  const publicFiles=isolatedFileManifest(siteDir);
  const record={schema_version:'daily-compiler-isolated-value-build-v1',result:'BUILT_LIVE_PENDING',engine_sha:engineSha,checkout:binding.checkout,check_url:binding.check_url,
    inventory:binding.inventory,environment:binding.environment,fixture:binding.fixture,
    product_receipt_sha256:Object.fromEntries(Object.entries({compile,sourceVerify,built,history,manifest,live:null}).map(([name,value])=>[name,value===null?null:canonicalSha(value)])),
    public_artifact:{directory:'shadow',files:publicFiles,file_count:publicFiles.length,total_bytes:publicFiles.reduce((sum,row)=>sum+row.bytes,0),files_sha256:canonicalSha(publicFiles)},
    engine_source_archive:fileIdentity(dir,'engine-source.tar'),packet_files:isolatedFileManifest(dir,PACKET_PATHS),
    ci_conclusion:null,live_verification:'NOT_RUN',deployment:'NOT_RUN',release_authority:false};
  write(path.join(dir,'build-provenance.json'),record);
  return {result:record.result,engine_sha:engineSha,public_base:binding.environment.publicBase,public_files:record.public_artifact.file_count,public_bytes:record.public_artifact.total_bytes,
    source_archive_bytes:record.engine_source_archive.bytes,fixture_scope:binding.fixture.scope,output:outDir};
}

export async function verifyIsolatedValueProof({repoRoot='.',outDir='build/isolated-value',engineSha}={}){
  // The explicit caller must have verified the protected check/artifact origin
  // and deployed only shadow/. A source archive is not a local Git checkout.
  const root=fs.realpathSync(repoRoot),dir=buildRoot(root,outDir),seed=read(path.join(dir,'build-provenance.json')),binding=read(path.join(dir,'build-binding.json'));
  if(seed.schema_version!=='daily-compiler-isolated-value-build-v1'||seed.result!=='BUILT_LIVE_PENDING'||seed.engine_sha!==engineSha||seed.live_verification!=='NOT_RUN'||seed.product_receipt_sha256?.live!==null)fail('build_seed_not_pending');
  if(fs.existsSync(path.join(dir,'live-verification.json'))||fs.existsSync(path.join(dir,'complete-build-provenance.json')))fail('live_evidence_already_exists_preserve_it');
  const inventory=verifyBinding({repoRoot:root,engineSha,dir,binding});
  if(canonicalSha(seed.checkout)!==canonicalSha(binding.checkout)||seed.check_url!==binding.check_url||
    canonicalSha(seed.environment)!==canonicalSha(binding.environment)||canonicalSha(seed.fixture)!==canonicalSha(binding.fixture)||
    compareValueReleaseBindings(seed.inventory,inventory).result!=='PASS')fail('build_seed_binding_changed');
  assertIsolatedFileManifest(root,read(path.join(dir,'engine-file-manifest.json')));
  if(canonicalSha(isolatedFileManifest(dir,PACKET_PATHS))!==canonicalSha(seed.packet_files))fail('artifact_packet_changed');
  if(canonicalSha(fileIdentity(dir,'engine-source.tar'))!==canonicalSha(seed.engine_source_archive))fail('engine_archive_changed');
  const statePath=path.join(dir,'inputs',STATE),bundlePath=path.join(dir,'inputs',BUNDLE),sourceDir=path.join(dir,'reader-source');
  const validation=validateEdition({statePath,bundlePath,repoRoot:root});
  if(validation.bundleDigest!==binding.fixture.bundle_sha256||validation.stateSha256!==binding.fixture.state_sha256)fail('current_fixture_validation');
  const startedAt=new Date().toISOString(),attemptPath=path.join(dir,'delivery-verification-'+startedAt.replace(/[:.]/g,'-')+'.json');
  const attempt={schema_version:'daily-compiler-isolated-value-http-attempt-v1',engine_sha:engineSha,method:'ACTUAL_HTTP_READBACK',started_at:startedAt,base_url:binding.environment.publicBase};
  fs.writeFileSync(attemptPath,JSON.stringify({...attempt,result:'RUNNING'},null,2)+'\n',{flag:'wx'});
  try{
    // Exactly one real invocation; no replay fetch, automatic retries, or CI POSTs.
    const live=await verifyLiveReader({baseUrl:binding.environment.publicBase,editionDate:binding.fixture.edition_date,sourceDir,siteDir:path.join(dir,'shadow'),
      builtReceiptPath:path.join(dir,'built-verification.json'),historyReceiptPath:path.join(dir,'history-merge-receipt.json')});
    write(path.join(dir,'live-verification.json'),live);
    const evidence=verifyFinalizationEvidence({date:binding.fixture.edition_date,pageUrl:binding.environment.publicBase,stateSha256:validation.stateSha256,bundleSha256:validation.bundleDigest,buildDir:dir});
    if(canonicalSha(validation.mediaGate)!==canonicalSha(evidence.compile.media_contract_gate)||
      canonicalSha(validation.d1ImageGate||validation.d0ImageGate||validation.legacyImageGate)!==canonicalSha(evidence.compile.image_contract_gate))fail('current_product_gate_changed');
    assertCompleteReleaseEvidence({evidence,bundle:validation.bundle,repoRoot:root,sourceDir});
    for(const name of ['compile','sourceVerify','built','history','manifest'])if(seed.product_receipt_sha256[name]!==canonicalSha(evidence[name]))fail('built_receipt_changed:'+name);
    const provenance={schema_version:'daily-compiler-value-build-provenance-v1',engine_sha:engineSha,checkout:binding.checkout,check_url:binding.check_url,inventory,
      product_receipt_sha256:Object.fromEntries(['compile','sourceVerify','built','live','history','manifest'].map(name=>[name,canonicalSha(evidence[name])])),
      artifact_build_seed_sha256:canonicalSha(seed),local_verification_binding:{source:'EXTRACTED_ENGINE_FILES_MATCH_CI_MANIFEST',engine_files_sha256:canonicalSha(read(path.join(dir,'engine-file-manifest.json')))},
      method:'ACTUAL_HTTP_READBACK',verified_at:new Date().toISOString(),fixture_scope:binding.fixture.scope,release_authority:false};
    if(checkValueBuildProvenance(provenance,inventory,evidence).result!=='PASS')fail('complete_provenance_binding');
    write(path.join(dir,'complete-build-provenance.json'),provenance);
    write(attemptPath,{...attempt,result:'PASS',finished_at:provenance.verified_at,live_receipt_sha256:canonicalSha(live)});
    return {result:'ISOLATED_DELIVERY_PROOF_PASS',engine_sha:engineSha,base_url:binding.environment.publicBase,fixture_scope:binding.fixture.scope,
      live_receipt_sha256:canonicalSha(live),build_provenance_sha256:canonicalSha(provenance),activation:false,release:false};
  }catch(error){
    write(attemptPath,{...attempt,result:'FAIL',finished_at:new Date().toISOString(),error:error.message,partial_live_receipt_retained:fs.existsSync(path.join(dir,'live-verification.json'))});
    throw error;
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [command,...args]=process.argv.slice(2),options={};
  for(let index=0;index<args.length;index+=2){
    const name=args[index],value=args[index+1];
    if(!['--root','--out','--engine-sha','--check-url'].includes(name)||value===undefined||Object.hasOwn(options,name))fail('invalid_cli_arguments');
    options[name]=value;
  }
  const run={prepare:prepareIsolatedValueProof,package:packageIsolatedValueProof,verify:verifyIsolatedValueProof}[command];
  if(!run)fail('command_must_be_prepare_package_or_verify');
  const result=await run({repoRoot:options['--root']||'.',outDir:options['--out']||'build/isolated-value',engineSha:options['--engine-sha'],checkUrl:options['--check-url']});
  console.log(JSON.stringify(result,null,2));
}
