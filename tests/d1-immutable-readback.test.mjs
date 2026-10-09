// TEST_ONLY binary transport and connector simulations; no external network,
// actual image generation, GitHub mutation, visual quality or release claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readD1ImmutableFile,MAX_D1_READBACK_BYTES,D1_READBACK_REPOSITORY} from '../scripts/read-d1-immutable-file.mjs';
import {sha256,gitBlobSha} from '../image-capsules/util.mjs';

const commit='a'.repeat(40),repositoryPath='qualifications/TEST_ONLY-binary/evidence/raw.png';
const large=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(2*1024*1024,0x7f)]);
const hostSource=fs.readFileSync(new URL('../scripts/d1-github-writer-host.mjs',import.meta.url),'utf8');
const runHost=new Function(hostSource+'\nreturn runD1GitHubWriterHost;')();
const protocol='daily-compiler-d1-existing-writer-stdio-v1';

function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-d1-raw-')),batchPath=path.join(root,'batch.json');
 fs.writeFileSync(batchPath,JSON.stringify({repository:D1_READBACK_REPOSITORY,branch:'qualification/TEST_ONLY-binary',expected_head:commit,writes:[]}));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 return {root,batchPath};
}
function fakeFetch(bytes,options={}){
 return async(url,request)=>{
  assert.equal(url,'https://raw.githubusercontent.com/'+D1_READBACK_REPOSITORY+'/'+commit+'/'+repositoryPath);
  assert.equal(request.method,'GET');assert.equal(request.redirect,'error');assert.equal(request.credentials,'omit');assert.equal(request.headers,undefined);
  return {status:options.status??200,url:options.url??url,redirected:options.redirected??false,
   headers:new Headers(options.headers??{'content-length':String(bytes.length)}),
   body:options.body??(async function*(){for(let offset=0;offset<bytes.length;offset+=32768)yield bytes.subarray(offset,offset+32768);})()};
 };
}
const input=(f,bytes=large)=>({batchPath:f.batchPath,repository:D1_READBACK_REPOSITORY,commit,repositoryPath,expectedGitBlobSha:gitBlobSha(bytes),expectedBytes:bytes.length});

test('omitted multi-megabyte binary downloads to a bounded, exact-blob local file without stdout payload',async t=>{
 const f=setup(t),r=await readD1ImmutableFile({...input(f),fetchImpl:fakeFetch(large)}),ref=r.content_file;
 assert.equal(r.found,true);assert.equal(ref.bytes,large.length);assert.equal(ref.sha256,sha256(large));assert.equal(ref.git_blob_sha,gitBlobSha(large));
 assert.deepEqual(fs.readFileSync(path.join(f.root,ref.path)),large);assert.ok(JSON.stringify(r).length<700);
});

test('immutable raw read rejects blob corruption and removes the unverified local file',async t=>{
 const f=setup(t);await assert.rejects(readD1ImmutableFile({...input(f),expectedGitBlobSha:'0'.repeat(40),fetchImpl:fakeFetch(large)}),/git_blob_mismatch/);
 assert.deepEqual(fs.readdirSync(f.root),['batch.json']);
});

test('HTTP failures and redirect/url changes remain errors, never verified absence',async t=>{
 for(const options of [{status:404},{status:403},{status:500},{redirected:true},{url:'https://example.invalid/other'}])await t.test(JSON.stringify(options),async st=>{
  const f=setup(st);await assert.rejects(readD1ImmutableFile({...input(f),fetchImpl:fakeFetch(large,options)}),/http_|response_url_changed/);
  assert.deepEqual(fs.readdirSync(f.root),['batch.json']);
 });
});

test('metadata, advertised length and streamed body all enforce the 64MB ceiling',async t=>{
 const scenarios=[
  {label:'expected size',args:{expectedBytes:MAX_D1_READBACK_BYTES+1}},
  {label:'content length',options:{headers:{'content-length':String(MAX_D1_READBACK_BYTES+1)}}},
  {label:'streamed bound',args:{expectedBytes:undefined},options:{headers:{},body:(async function*(){const chunk=Buffer.alloc(1024*1024);for(let i=0;i<65;i++)yield chunk;})()}},
  {label:'body shorter than declared',options:{headers:{'content-length':String(large.length+1)}},args:{expectedBytes:undefined}},
  {label:'compressed response',options:{headers:{'content-encoding':'gzip'}}}
 ];
 for(const scenario of scenarios)await t.test(scenario.label,async st=>{
  const f=setup(st);await assert.rejects(readD1ImmutableFile({...input(f),...scenario.args,fetchImpl:fakeFetch(large,scenario.options)}),/bound|size_mismatch|content_encoding/);
  assert.deepEqual(fs.readdirSync(f.root),['batch.json']);
 });
});

test('raw read permits only exact repository, immutable commit and safe repository path',async t=>{
 for(const changed of [{repository:'TEST_ONLY/other'},{commit:'main'},{repositoryPath:'../x'},{repositoryPath:'/x'},{repositoryPath:'x?url=https://other'},{repositoryPath:'x\\y'}])await t.test(JSON.stringify(changed),async st=>{
  const f=setup(st);let calls=0;await assert.rejects(readD1ImmutableFile({...input(f),...changed,fetchImpl:async()=>{calls++;throw new Error('must not call');}}),/immutable_repository_identity/);assert.equal(calls,0);
 });
});

async function hostRead(t,connector,fetchImpl=fakeFetch(large)){
 const f=setup(t),serialized=fs.readFileSync(f.batchPath,'utf8');let pyCount=0,readbackCalls=0,mutations=0,response;
 const tools={
  exec_command:async({cmd})=>{
   if(cmd.startsWith('python -c ')){pyCount++;return {exit_code:0,output:JSON.stringify(pyCount===1?{path:f.batchPath,bytes:Buffer.byteLength(serialized),sha256:sha256(serialized),characters:serialized.length}:serialized)};}
   if(cmd.startsWith('stty raw'))return {session_id:1,output:JSON.stringify({protocol,kind:'request',id:1,op:'readFile',args:{repository:D1_READBACK_REPOSITORY,commit,path:repositoryPath}})+'\n'};
   assert.ok(cmd.includes('/scripts/read-d1-immutable-file.mjs'));readbackCalls++;
   const args=[...cmd.matchAll(/'([^']*)'/g)].map(match=>match[1]);assert.equal(args[1],f.batchPath);assert.equal(args[2],commit);assert.equal(args[3],repositoryPath);assert.equal(args[4],connector.structuredContent.sha);
   try{return {exit_code:0,output:JSON.stringify(await readD1ImmutableFile({batchPath:args[1],repository:D1_READBACK_REPOSITORY,commit:args[2],repositoryPath:args[3],expectedGitBlobSha:args[4],expectedBytes:args[5]===undefined?undefined:Number(args[5]),fetchImpl}))};}
   catch(error){return {exit_code:1,output:JSON.stringify({error:error.message})};}
  },
  write_stdin:async({chars})=>{response=JSON.parse(chars);return {exit_code:0,output:JSON.stringify(response.ok?{protocol,kind:'result',receipt:{result:'TEST_ONLY_READ_DONE'}}:{protocol,kind:'error',error:response.error})+'\n'};},
  mcp__codex_apps__github_fetch:async()=>{throw new Error('unexpected generic fetch');},
  mcp__codex_apps__github_fetch_file:async(args)=>{assert.equal(args.ref,commit);assert.equal(args.path,repositoryPath);assert.equal(args.encoding,'base64');return connector;}
 };
 for(const name of ['create_blob','create_tree','create_commit','update_ref'])tools['mcp__codex_apps__github_'+name]=async()=>{mutations++;throw new Error('unexpected mutation');};
 const result=await runHost({tools,root:f.root,batchPath:f.batchPath});
 assert.equal(mutations,0);assert.equal(result.mutation_attempted,false);
 return {result,response,readbackCalls};
}

test('actual host distinguishes omitted large binary contents from a genuine zero-byte file',async t=>{
 const omitted={structuredContent:{encoding:'base64',content:'',sha:gitBlobSha(large),size:large.length}};
 const r=await hostRead(t,omitted);assert.equal(r.readbackCalls,1);assert.equal(r.response.result.content_file.bytes,large.length);assert.ok(JSON.stringify(r.response).length<1000);
 const empty=await hostRead(t,{structuredContent:{encoding:'base64',content:'',sha:gitBlobSha(Buffer.alloc(0)),size:0}});
 assert.equal(empty.readbackCalls,0);assert.deepEqual(empty.response.result,{found:true,content_base64:'',bytes:0,git_blob_sha:gitBlobSha(Buffer.alloc(0))});
});

test('host preserves connector404 versus omitted-file HTTP failure and blob mismatch without mutation',async t=>{
 const missing=await hostRead(t,{isError:true,structuredContent:{error_code:'NOT_FOUND',error:'GitHub API error 404: absent'}});
 assert.deepEqual(missing.response.result,{found:false,verified_absent:true});assert.equal(missing.readbackCalls,0);
 for(const mode of ['http404','blob'])await t.test(mode,async st=>{
  const connector={structuredContent:{encoding:'base64',content:'',sha:mode==='blob'?'0'.repeat(40):gitBlobSha(large),size:large.length}};
  const r=await hostRead(st,connector,fakeFetch(large,mode==='http404'?{status:404}:{}));
  assert.equal(r.response.ok,false);assert.match(r.response.error.message,mode==='http404'?/http_404/:/git_blob_mismatch/);assert.equal(r.result.mutation_attempted,false);
 });
});
