// TEST_ONLY child-process integration. These fixtures do not establish actual
// Work execution, native image quality, GitHub delivery or release authority.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {syntheticRecipeReview,syntheticResponse} from './fixtures/d1-recipe-v2.mjs';
import {compileRecipeProjections} from '../image-studio/specification-projection.mjs';
import {recordD1ImageEvent} from '../image-studio/runtime-records.mjs';
import {initialD1ProofState} from '../image-studio/proof-state.mjs';
import {canonicalSha,sha256,gitBlobSha} from '../image-capsules/util.mjs';

const protocol='daily-compiler-d1-existing-writer-stdio-v1';
const H='a'.repeat(40),E='b'.repeat(40),C='e'.repeat(40),TARGET='f'.repeat(40);
const ctx='ctx-'+'c'.repeat(64),inv='ctx-'+'d'.repeat(64),base='qualifications/TEST_ONLY-stdio';
const Q=makeD1QualificationFixture({recipeV2:true});after(()=>Q.cleanup());
const raw=fs.readFileSync(path.join(Q.root,Q.data.handoff.items[0].target_path));
const j=x=>JSON.stringify(x,null,2)+'\n';
function prepared(kind='intent'){
 const request=structuredClone(Q.data.request),sourceEvidence=structuredClone(Q.data.source_evidence);
 const state=initialD1ProofState({proofId:request.execution_id,branch:'qualification/TEST_ONLY-stdio',requestPath:base+'/request.json',ingestMappingPath:base+'/mapping.json',updatedAt:'2026-10-08T22:00:00Z'});
 const attemptLog={schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:state.proof_id,native_generations:0,stories:[]};
 state.specification_binding={request_sha256:canonicalSha(request),source_evidence_sha256:canonicalSha(sourceEvidence),source_commit:request.source_commit,request_commit:H,source_evidence_path:base+'/source-evidence.json',attempt_log_sha256:canonicalSha(attemptLog)};
 const f={state,attemptLog,request,sourceEvidence,engineSha:E,expectedHead:H};
 const s=request.stories[0],p=compileRecipeProjections(s),at=n=>'2026-10-08T22:00:0'+n+'Z';
 const event=(type,n,data)=>({event_id:'TEST_ONLY_stdio_'+type,type,story_id:s.story_id,context_id:ctx,invocation_id:inv,observed_at:at(n),data});
 const apply=(e,assets={})=>{const batch=recordD1ImageEvent({...f,expectedStateSha256:canonicalSha(f.state),expectedLogSha256:canonicalSha(f.attemptLog),event:e,...assets});return batch;};
 const intent=event('GENERATION_INTENT',1,{prompt_text:p.prompt,prompt_sha256:p.prompt_sha256});
 let batch=apply(intent);
 if(kind==='intent')return {f,batch};
 const advance=b=>{f.state=b.state;f.attemptLog=b.attempt_log;};
 advance(batch);
 advance(apply(event('GENERATION_COMPLETED',2,{intent_event_id:intent.event_id,raw_path:base+'/evidence/attempts/'+s.story_id+'/a01/raw.png'}),{rawBytes:raw}));
 const canonicalPath=base+'/evidence/attempts/'+s.story_id+'/a01/canonical.png';
 const vr={...structuredClone(Q.data.canonical_reviews.images[0]),final_path:canonicalPath,reviewer_identity:ctx,reviewed_at:at(3)};
 const recipe=syntheticRecipeReview(s,{sha:sha256(raw),context:ctx,at:at(3)});
 advance(apply(event('REVIEW_COMPLETED',3,{canonical_path:canonicalPath,review_request_text:p.review_prompt,review_response_text:syntheticResponse(recipe),recipe_review:recipe,visual_review:vr}),{canonicalBytes:raw}));
 batch=apply(event('ACCEPT_LOCK',4,{asset_id:'TEST_ONLY-stdio-asset',commit:C,path:canonicalPath,sha256:sha256(raw),git_blob_sha:gitBlobSha(raw),bytes:raw.length,readback_sha256:sha256(raw),readback_git_blob_sha:gitBlobSha(raw)}));
 return {f,batch,canonicalPath};
}
function fixtureHost(f){
 const files=new Map([[base+'/execution-state.json',Buffer.from(j(f.state))],[base+'/attempt-log.json',Buffer.from(j(f.attemptLog))],[f.state.request_path,Buffer.from(j(f.request))],[f.state.specification_binding.source_evidence_path,Buffer.from(j(f.sourceEvidence))]]);
 const trees=new Map([[H,files]]);let head=H,commits=0,updates=0;
 return {trees,get head(){return head;},set head(x){head=x;},get commits(){return commits;},get updates(){return updates;},
  async handle(frame){
   const {op,args:a}=frame;assert.equal(a.repository,'gttome/Daily-AI-Brief-Compiler');
   if(op==='getHead')return {sha:head};
   if(op==='readFile'){
    const bytes=trees.get(a.commit)?.get(a.path);
    return bytes?{found:true,content_base64:bytes.toString('base64'),bytes:bytes.length}:{found:false,verified_absent:true};
   }
   if(op==='createCommit'){
    assert.equal(a.parent,head);assert.equal(a.branch,f.state.branch);
    const batchBytes=fs.readFileSync(a.batch_file.path);assert.equal(batchBytes.length,a.batch_file.bytes);assert.equal(sha256(batchBytes),a.batch_file.sha256);
    const batch=JSON.parse(batchBytes);assert.equal(batch.batch_sha256,a.batch_file.batch_sha256);
    assert.equal(a.writes.length,batch.writes.length);assert.ok(!JSON.stringify(a).includes('content_base64'));
    const next=new Map(trees.get(a.parent));
    for(const ref of a.writes){
     const w=batch.writes[ref.batch_write_index];assert.deepEqual(ref,{batch_write_index:ref.batch_write_index,path:w.path,bytes:w.bytes,bytes_sha256:w.bytes_sha256,git_blob_sha:w.git_blob_sha});
     const bytes=Buffer.from(w.content_base64,'base64');assert.equal(bytes.length,w.bytes);assert.equal(sha256(bytes),w.bytes_sha256);assert.equal(gitBlobSha(bytes),w.git_blob_sha);next.set(w.path,bytes);
    }
    commits++;trees.set(TARGET,next);return {sha:TARGET};
   }
   if(op==='updateRef'){
    assert.equal(a.force,false);assert.equal(a.expectedHead,head);assert.equal(a.commit,TARGET);updates++;head=a.commit;
    return {updated:true,sha:a.commit,expected_sha:a.expectedHead};
   }
   throw new Error('TEST_ONLY unexpected writer operation');
  }
 };
}
async function execute(batch,host,{changeResponse,sidecars=false,binaryFiles=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-d1-writer-bridge-')),batchPath=path.join(dir,'batch.json');
 fs.writeFileSync(batchPath,j(batch));
 const child=spawn(process.execPath,['scripts/publish-d1-image-event.mjs',batchPath],{cwd:new URL('../',import.meta.url),stdio:['pipe','pipe','pipe']});
 const frames=[],requests=[];let stderr='',hostError;
 child.stderr.setEncoding('utf8');child.stderr.on('data',x=>{stderr+=x;});
 child.stdin.on('error',()=>{});
 const lines=readline.createInterface({input:child.stdout});
 lines.on('line',line=>{
  Promise.resolve().then(async()=>{
   const frame=JSON.parse(line);frames.push(frame);assert.equal(frame.protocol,protocol);
   if(frame.kind!=='request')return;
   assert.equal(frame.id,requests.length+1);requests.push(frame);
   let response;
   try{response={protocol,kind:'response',id:frame.id,op:frame.op,ok:true,result:await host.handle(frame)};}
   catch(error){response={protocol,kind:'response',id:frame.id,op:frame.op,ok:false,error:{code:'TEST_ONLY_HOST_ERROR',message:error.message.slice(0,600)}};}
   if(binaryFiles&&frame.op==='readFile'&&response.ok&&response.result.found){
    const bytes=Buffer.from(response.result.content_base64,'base64'),name='content-'+frame.id+'.bin';fs.writeFileSync(path.join(dir,name),bytes);
    response.result={found:true,content_file:{path:name,bytes:bytes.length,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes),repository:frame.args.repository,commit:frame.args.commit,repository_path:frame.args.path}};
   }
   if(changeResponse)response=await changeResponse(response,frame,dir);
   if(sidecars&&frame.op==='readFile'){
    const name='response-'+frame.id+'.json',bytes=Buffer.from(j(response));fs.writeFileSync(path.join(dir,name),bytes);
    response={protocol,kind:'response_file',id:frame.id,op:frame.op,file:{path:name,bytes:bytes.length,sha256:sha256(bytes)}};
   }
   child.stdin.write(JSON.stringify(response)+'\n');
  }).catch(error=>{hostError=error;child.kill();});
 });
 const timer=setTimeout(()=>child.kill(),20_000);
 try{
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
  if(hostError)throw hostError;
  assert.equal(stderr,'');return {code,frames,requests,final:frames.at(-1)};
 }finally{clearTimeout(timer);lines.close();fs.rmSync(dir,{recursive:true,force:true});}
}

test('existing-writer stdio calls the actual publisher and commits its complete replayed batch',async()=>{
 const {f,batch}=prepared(),host=fixtureHost(f),run=await execute(batch,host);
 assert.equal(run.code,0,JSON.stringify(run.final));assert.equal(run.final.kind,'result');
 assert.equal(run.final.receipt.result,'EXACT_COMMIT_READBACK_PASS');assert.equal(run.final.receipt.commit,TARGET);
 assert.equal(host.commits,1);assert.equal(host.updates,1);assert.equal(host.head,TARGET);
 for(const w of batch.writes)assert.equal(sha256(host.trees.get(TARGET).get(w.path)),w.bytes_sha256);
 assert.equal(run.requests.filter(x=>x.op==='createCommit').length,1);assert.equal(run.requests.filter(x=>x.op==='updateRef').length,1);
});

test('existing-writer bridge retains the publisher replay and stale-head rejection',async t=>{
 for(const mode of ['resealed-forgery','stale-head'])await t.test(mode,async()=>{
  const {f,batch}=prepared(),host=fixtureHost(f);
  if(mode==='stale-head')host.head='9'.repeat(40);
  else{
   const w=batch.writes.find(x=>x.path===base+'/execution-state.json'),changed=JSON.parse(Buffer.from(w.content_base64,'base64'));changed.native_generations=24;
   const bytes=Buffer.from(j(changed));Object.assign(w,{content_base64:bytes.toString('base64'),bytes:bytes.length,bytes_sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes)});
   const {repository,branch,expected_head,engine_sha,event_sha256,preconditions,writes}=batch;batch.batch_sha256=canonicalSha({repository,branch,expected_head,engine_sha,event_sha256,preconditions,writes});
  }
  const run=await execute(batch,host);assert.equal(run.code,1);assert.equal(run.final.kind,'error');
  assert.match(run.final.error.message,mode==='stale-head'?/stale_expected_head/:/batch_does_not_replay/);
  assert.equal(host.commits,0);assert.equal(host.updates,0);assert.equal(run.final.publication_outcome,'NO_GIT_MUTATION_ATTEMPTED');
 });
});

test('existing-writer bridge verifies the actual accepted asset and supports hashed response sidecars',async t=>{
 for(const mode of ['missing','exact'])await t.test(mode,async()=>{
  const {f,batch,canonicalPath}=prepared('lock'),host=fixtureHost(f);
  if(mode==='exact')host.trees.set(C,new Map([[canonicalPath,raw]]));
  const run=await execute(batch,host,{sidecars:true});
  assert.ok(run.requests.some(x=>x.op==='readFile'&&x.args.commit===C&&x.args.path===canonicalPath));
  if(mode==='missing'){assert.equal(run.code,1);assert.match(run.final.error.message,/accepted_asset_immutable_readback/);assert.equal(host.commits,0);assert.equal(host.updates,0);}
  else{assert.equal(run.code,0,JSON.stringify(run.final));assert.equal(run.final.receipt.result,'EXACT_COMMIT_READBACK_PASS');assert.equal(host.commits,1);assert.equal(host.updates,1);}
 });
});

test('existing-writer bridge rejects mismatched IDs, operations, response shapes and unverified absence',async t=>{
 for(const mode of ['wrong-id','wrong-op','extra-field','unverified-absence','invalid-base64'])await t.test(mode,async()=>{
  const {f,batch}=prepared(),host=fixtureHost(f);
  const run=await execute(batch,host,{changeResponse(response,frame){
   if(mode==='wrong-id')response.id++;
   if(mode==='wrong-op')response.op='other';
   if(mode==='extra-field')response.extra=true;
   if(mode==='unverified-absence'&&frame.op==='readFile')response.result={found:false};
   if(mode==='invalid-base64'&&frame.op==='readFile')response.result={found:true,content_base64:'!!!!',bytes:3};
   return response;
  }});
  assert.equal(run.code,1);assert.equal(run.final.kind,'error');assert.equal(host.commits,0);assert.equal(host.updates,0);
 });
});

test('unknown commit or ref outcomes stop once and require reconciliation before retry',async t=>{
 for(const op of ['createCommit','updateRef'])await t.test(op,async()=>{
  const {f,batch}=prepared(),host=fixtureHost(f);
  const run=await execute(batch,host,{changeResponse(response,frame){return frame.op===op?{protocol,kind:'response',id:frame.id,op,ok:false,error:{code:'TEST_ONLY_OUTCOME_UNKNOWN',message:'TEST_ONLY lost response after operation'}}:response;}});
  assert.equal(run.code,1);assert.equal(run.final.publication_outcome,'UNKNOWN_RECONCILE_BEFORE_ANY_RETRY');
  assert.equal(run.requests.filter(x=>x.op===op).length,1);assert.equal(host.commits,1);assert.equal(host.updates,op==='updateRef'?1:0);
 });
});

test('binary local-file responses preserve complete replay, CAS, immutable readback and accepted locks',async()=>{
 const {f,batch,canonicalPath}=prepared('lock'),host=fixtureHost(f);host.trees.set(C,new Map([[canonicalPath,raw]]));
 const run=await execute(batch,host,{binaryFiles:true});
 assert.equal(run.code,0,JSON.stringify(run.final));assert.equal(run.final.receipt.result,'EXACT_COMMIT_READBACK_PASS');
 assert.equal(host.commits,1);assert.equal(host.updates,1);
});

test('local binary response preconditions reject wrong identity, hash, bounds and escaped files before any mutation',async t=>{
 for(const mode of ['commit','path','repository','blob','sha256','size','traversal','symlink','inline-empty-wrong-blob'])await t.test(mode,async()=>{
  const {f,batch}=prepared(),host=fixtureHost(f);
  const run=await execute(batch,host,{binaryFiles:true,changeResponse(response,frame,dir){
   if(frame.op!=='readFile'||!response.result?.content_file)return response;
   const ref=response.result.content_file;
   if(mode==='commit')ref.commit=C;
   if(mode==='path')ref.repository_path+='wrong';
   if(mode==='repository')ref.repository='TEST_ONLY/other';
   if(mode==='blob')ref.git_blob_sha='0'.repeat(40);
   if(mode==='sha256')ref.sha256='0'.repeat(64);
   if(mode==='size')ref.bytes=64*1024*1024+1;
   if(mode==='traversal')ref.path='../outside.bin';
   if(mode==='symlink'){const link='link-'+frame.id;fs.symlinkSync(path.join(dir,ref.path),path.join(dir,link));ref.path=link;}
   if(mode==='inline-empty-wrong-blob')response.result={found:true,content_base64:'',bytes:0,git_blob_sha:'0'.repeat(40)};
   return response;
  }});
  assert.equal(run.code,1);assert.equal(run.final.publication_outcome,'NO_GIT_MUTATION_ATTEMPTED');assert.equal(host.commits,0);assert.equal(host.updates,0);
 });
});
