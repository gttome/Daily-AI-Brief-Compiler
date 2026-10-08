#!/usr/bin/env node
// Development-only staging. This standalone adapter is mirrored from the
// protected Compiler engine; it adds no Worker route, asset binding or runtime.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const ISOLATED_SITE_ORIGIN='https://dab-compiler-feedback.gtome.chatgpt.site';
export const ISOLATED_SITE_BUILD_COMMAND='node scripts/build.mjs && node scripts/stage-isolated-value-site.mjs publish --site-root .';
export const FEEDBACK_SITE_BINDINGS=Object.freeze({d1:'DB',r2:null,project_id:'appgprj_6ac5c8d99c8c8191bb41cf41e4aa6dbb'});
export const FEEDBACK_SITE_BASELINE=Object.freeze({
  source_commit:'7bfd6590cc232199c3aae6ed923f64b0d65db7a4',
  source_provenance_sha256:'2e10650b5c9208be2265b1016536d081a3be4746fbc02016c37744ca55be9948',
  build_script_sha256:'565c8ec922cd9bebbbcde4e3d10324004dc1301afdaca4c91b5dac9b8f1764f2',
  original_package_sha256:'3e6995f9c247d525db68b6af0e8661259960f25c33122f468bb890378ad3f86d',
  original_build_command:'node scripts/build.mjs'
});
const REPOSITORY='gttome/Daily-AI-Brief-Compiler';
const ADAPTER='scripts/stage-isolated-value-site.mjs';
const SOURCE='qualification-public',MANIFESTS='qualification-manifests';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const CHECK=/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+(?:\/job\/\d+)?$/;
const FIXTURE_SHA='c5dfc5213236f8b1a66c6f34cc1a80a3e91e2d5d24505b710232fe267c00fb38';
const SERVER_ENTRY="export {default} from './feedback-runtime/worker.mjs';\n";
const ORIGINAL_PACKAGE={name:'dab-compiler-feedback-site',private:true,type:'module',scripts:{build:FEEDBACK_SITE_BASELINE.original_build_command}};
const fail=message=>{throw new Error('isolated_value_site:'+message);};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const stable=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(stable).join(',')+']':'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
export const isolatedSiteDigest=value=>sha256(Buffer.from(stable(value)));
const json=value=>JSON.stringify(value,null,2)+'\n';
const safeRelative=value=>typeof value==='string'&&value.length>0&&!path.isAbsolute(value)&&!/[\\\s\0:%?#]/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');

function rootDirectory(value){
  const full=path.resolve(value);
  if(fs.lstatSync(full).isSymbolicLink()||!fs.statSync(full).isDirectory())fail('root_must_be_real_directory');
  return fs.realpathSync(full);
}
function within(root,relative,{missing=false}={}){
  if(!safeRelative(relative))fail('unsafe_path:'+relative);
  let current=root;
  for(const part of relative.split('/')){
    current=path.join(current,part);
    let stat;
    try{stat=fs.lstatSync(current);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(stat?.isSymbolicLink())fail('symlink_path:'+relative);
    if(!stat&&!missing)fail('missing_path:'+relative);
  }
  return current;
}
function bytes(root,relative){
  const file=within(root,relative);
  if(!fs.statSync(file).isFile())fail('regular_file_required:'+relative);
  return fs.readFileSync(file);
}
function readJson(root,relative){
  const data=bytes(root,relative);
  if(data.length>5_000_000)fail('metadata_too_large:'+relative);
  return JSON.parse(data.toString('utf8'));
}
function identity(root,relative){
  const file=within(root,relative);
  if(!fs.statSync(file).isFile())fail('regular_file_required:'+relative);
  const digest=createHash('sha256'),buffer=Buffer.alloc(1024*1024),fd=fs.openSync(file,'r');
  let count,total=0;
  try{while((count=fs.readSync(fd,buffer,0,buffer.length,null))>0){digest.update(buffer.subarray(0,count));total+=count;}}finally{fs.closeSync(fd);}
  return {path:relative,sha256:digest.digest('hex'),bytes:total};
}
export function isolatedSiteFiles(directory){
  const root=rootDirectory(directory),files=[];
  function visit(relative){
    const full=relative?within(root,relative):root,stat=fs.lstatSync(full);
    if(stat.isSymbolicLink())fail('symlink_path:'+relative);
    if(stat.isDirectory())for(const name of fs.readdirSync(full).sort())visit(relative?relative+'/'+name:name);
    else files.push(identity(root,relative));
  }
  visit('');
  return files.sort((a,b)=>a.path.localeCompare(b.path));
}
function assertManifest(files){
  if(!Array.isArray(files)||files.length===0||new Set(files.map(row=>row?.path)).size!==files.length)fail('public_manifest_missing_or_duplicate');
  for(const row of files){
    if(!row||Object.keys(row).sort().join(',')!=='bytes,path,sha256'||!safeRelative(row.path)||!DIGEST.test(row.sha256||'')||!Number.isSafeInteger(row.bytes)||row.bytes<0)fail('invalid_file_identity');
  }
  if(isolatedSiteDigest(files)!==isolatedSiteDigest([...files].sort((a,b)=>a.path.localeCompare(b.path))))fail('file_manifest_order');
}
function assertPublicPaths(files){
  const privateRoots=new Set(['inputs','reader-source','current','shadow','server','dist','node_modules','compiler','contracts','producer','operations','image-studio','qualification-manifests']);
  const privateNames=new Set(['engine-source.tar','source-provenance.json','build-provenance.json','complete-build-provenance.json','build-binding.json','engine-file-manifest.json','reader-environment.json','compile-receipt.json','verification-receipt.json','built-verification.json','history-merge-receipt.json','package.json','package-lock.json']);
  for(const row of files){
    const parts=row.path.split('/');
    if(parts.some(part=>part.startsWith('.'))||privateRoots.has(parts[0])||privateNames.has(parts.at(-1))||(parts.at(-1)==='build-manifest.json'&&row.path!=='build-manifest.json')||/\.(?:tar|tgz|zip|7z|sqlite|db|sql|pem|key)$/i.test(parts.at(-1)))fail('non_public_file:'+row.path);
  }
  if(!files.some(row=>row.path==='index.html'&&row.bytes>0))fail('public_reader_index_missing');
}
function assertExactFiles(directory,expected,label){
  if(isolatedSiteDigest(isolatedSiteFiles(directory))!==isolatedSiteDigest(expected))fail(label);
}
function siteBaseline(siteRoot){
  const root=rootDirectory(siteRoot),provenanceBytes=bytes(root,'source-provenance.json'),hostingBytes=bytes(root,'.openai/hosting.json');
  if(isolatedSiteDigest(JSON.parse(hostingBytes))!==isolatedSiteDigest(FEEDBACK_SITE_BINDINGS))fail('selected_site_or_storage_binding_changed');
  if(sha256(provenanceBytes)!==FEEDBACK_SITE_BASELINE.source_provenance_sha256||sha256(bytes(root,'scripts/build.mjs'))!==FEEDBACK_SITE_BASELINE.build_script_sha256)fail('existing_site_build_or_provenance_changed');
  const provenance=JSON.parse(provenanceBytes);
  if(provenance.repository!==REPOSITORY||!SHA.test(provenance.commit_sha||''))fail('existing_site_repository');
  for(const [file,digest] of Object.entries(provenance.blobs))if(gitBlob(bytes(root,file))!==digest)fail('existing_site_source_changed:'+file);
  if(gitBlob(bytes(root,'drizzle/0000_compiler_feedback.sql'))!==provenance.blobs['feedback-runtime/drizzle/0000_compiler_feedback.sql'])fail('existing_site_migration_changed');
  const packageBytes=bytes(root,'package.json'),pkg=JSON.parse(packageBytes);
  if(![FEEDBACK_SITE_BASELINE.original_build_command,ISOLATED_SITE_BUILD_COMMAND].includes(pkg.scripts?.build))fail('unexpected_site_build_command');
  const original={...pkg,scripts:{...pkg.scripts,build:FEEDBACK_SITE_BASELINE.original_build_command}};
  if(isolatedSiteDigest(original)!==isolatedSiteDigest(ORIGINAL_PACKAGE))fail('unexpected_site_package');
  return {root,provenance,pkg,package_sha256:sha256(packageBytes),hosting_sha256:sha256(hostingBytes)};
}
function readStaged(siteRoot){
  const source=within(siteRoot,SOURCE,{missing:true}),metadata=within(siteRoot,MANIFESTS,{missing:true});
  const sourceNames=fs.existsSync(source)?fs.readdirSync(source).sort():[];
  const manifestNames=fs.existsSync(metadata)?fs.readdirSync(metadata).sort():[];
  if(sourceNames.some(name=>!/^value-[a-f0-9]{40}$/.test(name))||manifestNames.some(name=>!/^value-[a-f0-9]{40}\.json$/.test(name))||
    isolatedSiteDigest(sourceNames)!==isolatedSiteDigest(manifestNames.map(name=>name.slice(0,-5))))fail('staged_namespace_manifest_scope');
  return sourceNames.map(name=>{
    const record=readJson(siteRoot,MANIFESTS+'/'+name+'.json');
    if(record.schema_version!=='daily-compiler-isolated-site-public-v1'||record.namespace!==name||name!=='value-'+record.engine_sha||
      record.public_base!==ISOLATED_SITE_ORIGIN+'/qualification/'+name||!DIGEST.test(record.build_provenance_sha256||'')||!DIGEST.test(record.adapter_sha256||''))fail('staged_namespace_identity');
    assertManifest(record.files);assertPublicPaths(record.files);
    if(record.files_sha256!==isolatedSiteDigest(record.files))fail('staged_manifest_digest');
    assertExactFiles(within(siteRoot,SOURCE+'/'+name),record.files,'staged_namespace_bytes_changed');
    return record;
  });
}
function publicPacket({packetRoot,engineSha,provenanceSha256}){
  if(!SHA.test(engineSha||'')||!DIGEST.test(provenanceSha256||''))fail('exact_engine_and_provenance_digests_required');
  const root=rootDirectory(packetRoot),seed=readJson(root,'build-provenance.json'),namespace='value-'+engineSha;
  if(isolatedSiteDigest(seed)!==provenanceSha256)fail('build_provenance_digest_changed');
  if(seed.schema_version!=='daily-compiler-isolated-value-build-v1'||seed.result!=='BUILT_LIVE_PENDING'||seed.engine_sha!==engineSha||
    seed.checkout?.source!=='GIT_CHECKOUT'||seed.checkout.head_sha!==engineSha||seed.checkout.tracked_files_clean!==true||!CHECK.test(seed.check_url||'')||
    seed.ci_conclusion!==null||seed.live_verification!=='NOT_RUN'||seed.deployment!=='NOT_RUN'||seed.release_authority!==false)fail('pending_exact_engine_build_binding');
  if(seed.environment?.publicBase!==ISOLATED_SITE_ORIGIN+'/qualification/'+namespace||seed.environment.baseurl!=='/qualification/'+namespace||
    seed.environment.repository!==REPOSITORY||seed.environment.feedbackBase!==ISOLATED_SITE_ORIGIN)fail('isolated_host_or_prefix_binding');
  if(seed.fixture?.scope!=='REGISTERED_HISTORICAL_FIXTURE_DELIVERY_ONLY'||seed.fixture.current_premium_image_proof!==false||seed.fixture.edition_date!=='2026-10-06'||seed.fixture.bundle_sha256!==FIXTURE_SHA)fail('registered_public_fixture_scope');
  const adapter=fs.readFileSync(fileURLToPath(import.meta.url));
  const adapterRows=seed.inventory?.files?.filter(row=>row.path===ADAPTER)||[];
  if(seed.inventory?.schema_version!=='daily-compiler-value-version-inventory-v1'||seed.inventory.engine_sha!==engineSha||
    adapterRows.length!==1||adapterRows[0].sha256!==sha256(adapter)||adapterRows[0].bytes!==adapter.length)fail('protected_adapter_engine_binding');
  const publicArtifact=seed.public_artifact;
  if(publicArtifact?.directory!=='shadow')fail('public_directory_must_be_shadow');
  assertManifest(publicArtifact.files);assertPublicPaths(publicArtifact.files);
  if(publicArtifact.files_sha256!==isolatedSiteDigest(publicArtifact.files)||publicArtifact.file_count!==publicArtifact.files.length||
    publicArtifact.total_bytes!==publicArtifact.files.reduce((sum,row)=>sum+row.bytes,0))fail('public_manifest_summary');
  const packet=seed.packet_files;
  assertManifest(packet);
  const nested=packet.filter(row=>row.path.startsWith('shadow/')).map(row=>({...row,path:row.path.slice(7)}));
  if(isolatedSiteDigest(nested)!==isolatedSiteDigest(publicArtifact.files))fail('public_packet_inventory_binding');
  const publicRoot=within(root,'shadow');
  assertExactFiles(publicRoot,publicArtifact.files,'public_artifact_bytes_changed');
  // The renderer intentionally publishes this one public-safe manifest. Keep
  // it, and bind it to the CI source manifest and the exact rehearsal target.
  const reader=readJson(publicRoot,'build-manifest.json');
  if(reader.schema_version!=='daily-compiler-canonical-reader-source-v1'||reader.edition_date!==seed.fixture.edition_date||reader.bundle_sha256!==FIXTURE_SHA||
    reader.environment?.public_base!==seed.environment.publicBase||reader.environment.baseurl!==seed.environment.baseurl||
    isolatedSiteDigest(reader)!==seed.product_receipt_sha256?.manifest)fail('public_reader_manifest_binding');
  return {root:publicRoot,files:publicArtifact.files,adapter,record:{schema_version:'daily-compiler-isolated-site-public-v1',engine_sha:engineSha,namespace,
    public_base:seed.environment.publicBase,build_provenance_sha256:provenanceSha256,adapter_sha256:sha256(adapter),files:publicArtifact.files,files_sha256:publicArtifact.files_sha256}};
}
function copyImmutable(source,destination,files){
  for(const row of files){
    const from=within(source,row.path),to=within(destination,row.path,{missing:true});
    fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
  }
  assertExactFiles(destination,files,'copied_public_bytes_changed');
}

export function stageIsolatedValueSite({packetRoot,siteRoot='.',engineSha,provenanceSha256}={}){
  const packet=publicPacket({packetRoot,engineSha,provenanceSha256}),site=siteBaseline(siteRoot),existing=readStaged(site.root);
  const prior=existing.find(record=>record.namespace===packet.record.namespace);
  if(prior&&prior.files_sha256!==packet.record.files_sha256)fail('immutable_namespace_replacement_forbidden');
  const adapterPath=within(site.root,ADAPTER,{missing:true});
  if(fs.existsSync(adapterPath)&&!fs.statSync(adapterPath).isFile())fail('adapter_destination_not_file');
  if(!prior){
    const destination=within(site.root,SOURCE+'/'+packet.record.namespace,{missing:true});
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.mkdirSync(within(site.root,MANIFESTS,{missing:true}),{recursive:true});
    const temporary=fs.mkdtempSync(path.join(site.root,'.qualification-stage-'));
    try{
      copyImmutable(packet.root,temporary,packet.files);
      fs.renameSync(temporary,destination);
      fs.writeFileSync(within(site.root,MANIFESTS+'/'+packet.record.namespace+'.json',{missing:true}),json(packet.record),{flag:'wx'});
    }finally{fs.rmSync(temporary,{recursive:true,force:true});}
  }
  fs.writeFileSync(adapterPath,packet.adapter);
  if(site.pkg.scripts.build!==ISOLATED_SITE_BUILD_COMMAND){
    site.pkg.scripts.build=ISOLATED_SITE_BUILD_COMMAND;
    fs.writeFileSync(path.join(site.root,'package.json'),json(site.pkg));
  }
  const after=siteBaseline(site.root),retained=readStaged(site.root);
  if(after.hosting_sha256!==site.hosting_sha256)fail('selected_site_manifest_bytes_changed');
  return {schema_version:'daily-compiler-isolated-site-stage-v1',result:prior?'IDENTICAL_PUBLIC_NAMESPACE_REUSED_LIVE_PENDING':'PUBLIC_NAMESPACE_STAGED_LIVE_PENDING',
    engine_sha:engineSha,namespace:packet.record.namespace,public_base:packet.record.public_base,public_files:packet.files.length,public_files_sha256:packet.record.files_sha256,
    supplied_build_provenance_sha256:provenanceSha256,retained_build_provenance_sha256:(prior||packet.record).build_provenance_sha256,
    adapter_sha256:packet.record.adapter_sha256,retained_namespaces:retained.map(record=>record.namespace),
    baseline_source_commit:FEEDBACK_SITE_BASELINE.source_commit,original_package_sha256:FEEDBACK_SITE_BASELINE.original_package_sha256,
    package_before_sha256:site.package_sha256,package_after_sha256:after.package_sha256,original_build_command:FEEDBACK_SITE_BASELINE.original_build_command,build_command:ISOLATED_SITE_BUILD_COMMAND,
    hosting_manifest_sha256:site.hosting_sha256,hosting_bindings_preserved:true,original_build_script_preserved:true,source_provenance_preserved:true,feedback_source_and_migration_preserved:true,
    verification_scope:'PUBLIC_ARTIFACT_AND_ADAPTER_BINDINGS_ONLY; caller separately authenticates the protected GitHub check and artifact origin',
    native_static_serving:'UNPROVED',deployment:'NOT_RUN',live_verification:'NOT_RUN',feedback_probe_requests:0,image_activation:false,release_authority:false};
}

export function publishIsolatedValueSite({siteRoot='.'}={}){
  const site=siteBaseline(siteRoot),records=readStaged(site.root);
  if(site.pkg.scripts.build!==ISOLATED_SITE_BUILD_COMMAND)fail('qualification_build_hook_not_installed');
  const server=within(site.root,'dist/server');
  const expected=[{path:'compiler/feedback-identity.mjs',sha256:sha256(bytes(site.root,'compiler/feedback-identity.mjs')),bytes:bytes(site.root,'compiler/feedback-identity.mjs').length},
    {path:'feedback-runtime/worker.mjs',sha256:sha256(bytes(site.root,'feedback-runtime/worker.mjs')),bytes:bytes(site.root,'feedback-runtime/worker.mjs').length},
    {path:'index.js',sha256:sha256(Buffer.from(SERVER_ENTRY)),bytes:Buffer.byteLength(SERVER_ENTRY)}];
  assertExactFiles(server,expected,'original_server_build_changed');
  const client=within(site.root,'dist/client',{missing:true});
  fs.mkdirSync(client,{recursive:true});
  const before=isolatedSiteFiles(client).filter(row=>!row.path.startsWith('qualification/'));
  for(const record of records){
    const destination=within(site.root,'dist/client/qualification/'+record.namespace,{missing:true});
    if(fs.existsSync(destination))assertExactFiles(destination,record.files,'immutable_dist_namespace_replacement_forbidden');
    else{
      fs.mkdirSync(destination,{recursive:true});
      copyImmutable(within(site.root,SOURCE+'/'+record.namespace),destination,record.files);
    }
  }
  assertExactFiles(server,expected,'original_server_build_changed');
  if(isolatedSiteDigest(isolatedSiteFiles(client).filter(row=>!row.path.startsWith('qualification/')))!==isolatedSiteDigest(before))fail('unrelated_client_output_changed');
  if(siteBaseline(site.root).hosting_sha256!==site.hosting_sha256)fail('selected_site_manifest_bytes_changed');
  return {schema_version:'daily-compiler-isolated-site-package-v1',result:'STATIC_FILES_PACKAGED_LIVE_PENDING',namespaces:records.map(record=>record.namespace),
    server_files_sha256:isolatedSiteDigest(expected),server_unchanged:true,unrelated_client_output_unchanged:true,source_provenance_preserved:true,hosting_bindings_preserved:true,
    native_static_serving:'UNPROVED',deployment:'NOT_RUN',live_verification:'NOT_RUN',feedback_probe_requests:0,image_activation:false,release_authority:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [command,...args]=process.argv.slice(2),options={};
    const allowed=command==='stage'?['--packet-root','--site-root','--engine-sha','--provenance-sha256']:command==='publish'?['--site-root']:[];
    if(!allowed.length)fail('command_must_be_stage_or_publish');
    for(let index=0;index<args.length;index+=2){
      if(!allowed.includes(args[index])||args[index+1]===undefined||Object.hasOwn(options,args[index]))fail('invalid_cli_arguments');
      options[args[index]]=args[index+1];
    }
    const result=command==='stage'?stageIsolatedValueSite({packetRoot:options['--packet-root'],siteRoot:options['--site-root']||'.',engineSha:options['--engine-sha'],provenanceSha256:options['--provenance-sha256']}):publishIsolatedValueSite({siteRoot:options['--site-root']||'.'});
    process.stdout.write(json(result));
  }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
