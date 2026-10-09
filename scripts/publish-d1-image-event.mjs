#!/usr/bin/env node
// One deterministic batch through the current runtime's EXISTING Git writer.
// This helper has no network, model, scheduler, polling or retry capability.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {publishD1EventBatch} from '../image-studio/runtime-records.mjs';

const protocol='daily-compiler-d1-existing-writer-stdio-v1';
const MAX_BATCH_BYTES=128*1024*1024,MAX_ASSET_BYTES=64*1024*1024;
const MAX_RESPONSE_BYTES=90*1024*1024,MAX_REQUEST_BYTES=128*1024,MAX_REQUESTS=128;
const digest=b=>createHash('sha256').update(b).digest('hex');
const hex=(x,n)=>typeof x==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(x);
const need=(ok,code)=>{if(!ok)throw new Error('d1_writer_stdio:'+code);};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
let mutationAttempted=false,sequence=0,pending=Buffer.alloc(0);
const input=process.stdin[Symbol.asyncIterator]();
const send=frame=>new Promise((resolve,reject)=>{
 const text=JSON.stringify(frame)+'\n';
 need(Buffer.byteLength(text)<=MAX_REQUEST_BYTES,'outgoing_frame_bound');
 process.stdout.write(text,error=>error?reject(error):resolve());
});
async function readFrame(){
 for(;;){
  const newline=pending.indexOf(10);
  if(newline!==-1){
   need(newline>0&&newline<=MAX_RESPONSE_BYTES,'response_frame_bound');
   const line=pending.subarray(0,newline);pending=pending.subarray(newline+1);
   const text=line.toString('utf8');need(Buffer.from(text).equals(line),'response_utf8');
   return JSON.parse(text);
  }
  need(pending.length<=MAX_RESPONSE_BYTES,'response_frame_bound');
  const next=await input.next();need(!next.done,'response_eof');
  need(pending.length+next.value.length<=MAX_RESPONSE_BYTES+1,'response_frame_bound');
  pending=Buffer.concat([pending,next.value]);
 }
}
try{
 const [suppliedPath,...extra]=process.argv.slice(2);
 need(suppliedPath&&extra.length===0,'usage_publish_d1_image_event_BATCH_json');
 const batchPath=fs.realpathSync(suppliedPath),batchRoot=path.dirname(batchPath),stat=fs.statSync(batchPath);
 need(stat.isFile()&&stat.size>0&&stat.size<=MAX_BATCH_BYTES,'batch_file_bound');
 const batchBytes=fs.readFileSync(batchPath),batch=JSON.parse(batchBytes.toString('utf8'));
 const batchFile={path:batchPath,bytes:batchBytes.length,sha256:digest(batchBytes),batch_sha256:batch.batch_sha256??null};
 function readResponseFile(frame,id,op){
  need(exact(frame,['protocol','kind','id','op','file'])&&frame.protocol===protocol&&frame.kind==='response_file'&&frame.id===id&&frame.op===op,'response_file_binding');
  const ref=frame.file;
  need(exact(ref,['path','bytes','sha256'])&&typeof ref.path==='string'&&!path.isAbsolute(ref.path)&&!ref.path.includes('\\')&&!ref.path.split('/').some(p=>!p||p==='.'||p==='..')&&Number.isInteger(ref.bytes)&&ref.bytes>0&&ref.bytes<=MAX_RESPONSE_BYTES&&hex(ref.sha256,64),'response_file_reference');
  const file=fs.realpathSync(path.resolve(batchRoot,ref.path));
  need(file.startsWith(batchRoot+path.sep)&&fs.statSync(file).isFile()&&fs.statSync(file).size===ref.bytes,'response_file_scope_or_size');
  const bytes=fs.readFileSync(file);need(digest(bytes)===ref.sha256,'response_file_digest');
  return JSON.parse(bytes.toString('utf8'));
 }
 async function call(op,args){
  const id=++sequence;need(id<=MAX_REQUESTS,'request_count_bound');
  if(op==='createCommit'||op==='updateRef')mutationAttempted=true;
  await send({protocol,kind:'request',id,op,args});
  let frame=await readFrame();
  if(frame?.kind==='response_file')frame=readResponseFile(frame,id,op);
  need(frame?.protocol===protocol&&frame.kind==='response'&&frame.id===id&&frame.op===op&&typeof frame.ok==='boolean','response_binding');
  if(!frame.ok){
   need(exact(frame,['protocol','kind','id','op','ok','error'])&&exact(frame.error,['code','message'])&&typeof frame.error.code==='string'&&frame.error.code.length>0&&frame.error.code.length<=80&&typeof frame.error.message==='string'&&frame.error.message.length<=600,'error_response_shape');
   throw new Error('d1_writer_stdio:existing_writer_'+op+':'+frame.error.code+':'+frame.error.message);
  }
  need(exact(frame,['protocol','kind','id','op','ok','result']),'response_fields');
  return frame.result;
 }
 const writer={
  async getHead(args){
   const result=await call('getHead',args);need(exact(result,['sha'])&&hex(result.sha,40),'head_response');return result.sha;
  },
  async readFile(args){
   const result=await call('readFile',args);
   if(result?.found===false){need(exact(result,['found','verified_absent'])&&result.verified_absent===true,'absence_not_verified');return null;}
   if(result?.content_file){
    need(exact(result,['found','content_file'])&&result.found===true,'content_file_response');
    const ref=result.content_file;
    need(exact(ref,['path','bytes','sha256','git_blob_sha','repository','commit','repository_path'])&&ref.repository===args.repository&&ref.commit===args.commit&&ref.repository_path===args.path&&hex(ref.git_blob_sha,40)&&hex(ref.sha256,64)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>=0&&ref.bytes<=MAX_ASSET_BYTES,'content_file_binding');
    need(typeof ref.path==='string'&&ref.path.length>0&&!path.isAbsolute(ref.path)&&!ref.path.includes('\\')&&!ref.path.split('/').some(p=>!p||p==='.'||p==='..'),'content_file_scope');
    let file=batchRoot;for(const part of ref.path.split('/')){file=path.join(file,part);need(!fs.lstatSync(file).isSymbolicLink(),'content_file_symlink');}
    need(fs.realpathSync(file).startsWith(batchRoot+path.sep)&&fs.statSync(file).isFile()&&fs.statSync(file).size===ref.bytes,'content_file_scope_or_size');
    const bytes=fs.readFileSync(file);
    need(bytes.length===ref.bytes&&digest(bytes)===ref.sha256&&createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===ref.git_blob_sha,'content_file_digest');
    return bytes;
   }
   need((exact(result,['found','content_base64','bytes'])||exact(result,['found','content_base64','bytes','git_blob_sha']))&&result.found===true&&typeof result.content_base64==='string'&&Number.isInteger(result.bytes)&&result.bytes>=0&&result.bytes<=MAX_ASSET_BYTES,'file_response');
   need(result.content_base64.length===4*Math.ceil(result.bytes/3),'file_base64_size');
   const bytes=Buffer.from(result.content_base64,'base64');need(bytes.length===result.bytes&&bytes.toString('base64')===result.content_base64,'file_base64');
   if(Object.hasOwn(result,'git_blob_sha'))need(hex(result.git_blob_sha,40)&&createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===result.git_blob_sha,'connector_blob_digest');
   return bytes;
  },
  async createCommit({repository,branch,parent,writes}){
   // Avoid multi-megabyte stdout frames. The host reads these exact original
   // batch bytes in bounded chunks and verifies this file digest first.
   need(Array.isArray(batch.writes)&&writes.length===batch.writes.length&&writes.every((w,i)=>w===batch.writes[i]),'batch_write_reference');
   const refs=writes.map(({path,bytes,bytes_sha256,git_blob_sha},index)=>({batch_write_index:index,path,bytes,bytes_sha256,git_blob_sha}));
   const result=await call('createCommit',{repository,branch,parent,batch_file:batchFile,writes:refs});
   need(exact(result,['sha'])&&hex(result.sha,40),'commit_response');return result.sha;
  },
  async updateRef(args){
   const result=await call('updateRef',args);
   need(exact(result,['updated','sha','expected_sha'])&&result.updated===true&&result.sha===args.commit&&result.expected_sha===args.expectedHead,'ref_response');
  }
 };
 const receipt=await publishD1EventBatch(batch,writer);
 await send({protocol,kind:'result',requests:sequence,receipt});
}catch(error){
 await send({protocol,kind:'error',requests:sequence,publication_outcome:mutationAttempted?'UNKNOWN_RECONCILE_BEFORE_ANY_RETRY':'NO_GIT_MUTATION_ATTEMPTED',error:{code:'D1_EXISTING_WRITER_BRIDGE_FAILED',message:String(error?.message??error).slice(0,900)}});
 process.exitCode=1;
}finally{
 process.stdin.destroy();
}
