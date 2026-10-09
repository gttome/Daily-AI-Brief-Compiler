// Bounded read-only transport for connector-omitted binary contents. The URL is
// derived solely from this repository, an immutable commit and its exact path.
// No credentials, redirects, Git writes, image editing or external controller.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const D1_READBACK_REPOSITORY='gttome/Daily-AI-Brief-Compiler';
export const MAX_D1_READBACK_BYTES=64*1024*1024;
const hex=(value,n)=>typeof value==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(value);
const need=(okay,code)=>{if(!okay)throw new Error('d1_immutable_read:'+code);};
const safe=value=>typeof value==='string'&&value.length>0&&value.length<=1024&&!path.isAbsolute(value)&&!/[\\\s:#?]/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');

export async function readD1ImmutableFile({batchPath,repository,commit,repositoryPath,expectedGitBlobSha,expectedBytes,fetchImpl=globalThis.fetch}){
 need(repository===D1_READBACK_REPOSITORY&&hex(commit,40)&&safe(repositoryPath)&&hex(expectedGitBlobSha,40),'immutable_repository_identity');
 need(expectedBytes===undefined||(Number.isSafeInteger(expectedBytes)&&expectedBytes>=0&&expectedBytes<=MAX_D1_READBACK_BYTES),'expected_size_bound');
 need(typeof fetchImpl==='function','fetch_capability');
 const batch=fs.realpathSync(batchPath);need(fs.statSync(batch).isFile(),'batch_file');
 const batchRoot=path.dirname(batch),url='https://raw.githubusercontent.com/'+repository+'/'+commit+'/'+repositoryPath.split('/').map(encodeURIComponent).join('/');
 const response=await fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(60_000)});
 need(response.status===200,'http_'+response.status);
 need(response.url===url&&response.redirected===false,'response_url_changed');
 const encoding=response.headers.get('content-encoding');need(!encoding||encoding==='identity','unexpected_content_encoding');
 const length=response.headers.get('content-length');
 need(length===null||(/^\d+$/.test(length)&&Number.isSafeInteger(Number(length))&&Number(length)<=MAX_D1_READBACK_BYTES),'response_size_bound');
 if(expectedBytes!==undefined&&length!==null)need(Number(length)===expectedBytes,'response_expected_size');
 need(response.body&&typeof response.body[Symbol.asyncIterator]==='function','response_body');
 const directory=fs.mkdtempSync(path.join(batchRoot,'d1-readback-')),file=path.join(directory,'content.bin');
 let descriptor=null,bytes=0;
 const hash=createHash('sha256');
 try{
  descriptor=fs.openSync(file,'wx',0o600);
  for await(const value of response.body){
   const chunk=Buffer.from(value);bytes+=chunk.length;
   need(bytes<=MAX_D1_READBACK_BYTES&&(expectedBytes===undefined||bytes<=expectedBytes),'response_body_bound');
   hash.update(chunk);let offset=0;while(offset<chunk.length)offset+=fs.writeSync(descriptor,chunk,offset,chunk.length-offset);
  }
  fs.closeSync(descriptor);descriptor=null;
  need(length===null||bytes===Number(length),'response_size_mismatch');
  need(expectedBytes===undefined||bytes===expectedBytes,'expected_size_mismatch');
  const sha256=hash.digest('hex'),content=fs.readFileSync(file);
  need(content.length===bytes&&createHash('sha256').update(content).digest('hex')===sha256,'local_bytes_changed');
  const gitBlobSha=createHash('sha1').update('blob '+bytes+'\0').update(content).digest('hex');
  need(gitBlobSha===expectedGitBlobSha,'git_blob_mismatch');
  return {found:true,content_file:{path:path.relative(batchRoot,file),bytes,sha256,git_blob_sha:gitBlobSha,repository,commit,repository_path:repositoryPath}};
 }catch(error){
  if(descriptor!==null)fs.closeSync(descriptor);
  fs.rmSync(directory,{recursive:true,force:true});throw error;
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [batchPath,commit,repositoryPath,expectedGitBlobSha,size,...extra]=process.argv.slice(2);
  need(batchPath&&commit&&repositoryPath&&expectedGitBlobSha&&extra.length===0,'usage_BATCH_COMMIT_PATH_BLOB_optional_SIZE');
  const expectedBytes=size===undefined?undefined:/^\d+$/.test(size)?Number(size):NaN;
  const result=await readD1ImmutableFile({batchPath,repository:D1_READBACK_REPOSITORY,commit,repositoryPath,expectedGitBlobSha,expectedBytes});
  console.log(JSON.stringify(result));
 }catch(error){console.log(JSON.stringify({error:String(error.message).slice(0,600)}));process.exitCode=1;}
}
