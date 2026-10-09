import {OCT9_RECOVERY_BRANCH} from '../compiler/oct9-owner-exception.mjs';
// Verifies a separately produced package already committed to Git. No image creation.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const PACKAGE_SCHEMA='external-compiler-image-package-v1';
const fail=s=>{throw new Error('external_image_ingest:'+s);};
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const SHA1=/^[a-f0-9]{40}$/,SHA256=/^[a-f0-9]{64}$/;
const SIG=Buffer.from([137,80,78,71,13,10,26,10]);
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function checkRealPng(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<70||!bytes.subarray(0,8).equals(SIG))fail('png_signature');
  let pos=8,ihdr=null,ended=false,idat=[],seenIhdr=false;
  while(pos<bytes.length){
    if(pos+12>bytes.length)fail('truncated_chunk');
    const length=bytes.readUInt32BE(pos),name=bytes.toString('ascii',pos+4,pos+8),end=pos+12+length;
    if(length>30000000||end>bytes.length)fail('truncated_or_oversized_chunk');
    const data=bytes.subarray(pos+8,pos+8+length);
    if(crc32(bytes.subarray(pos+4,pos+8+length))!==bytes.readUInt32BE(pos+8+length))fail('png_crc');
    if(!seenIhdr){if(name!=='IHDR'||length!==13)fail('ihdr_first');ihdr=data;seenIhdr=true;}
    else if(name==='IHDR')fail('duplicate_ihdr');
    if(name==='IDAT'){if(!ihdr||ended)fail('idat_order');idat.push(data);}
    if(name==='acTL')fail('animated_png_not_allowed');
    if(name==='IEND'){if(length!==0||end!==bytes.length)fail('iend_or_trailing_data');ended=true;break;}
    pos=end;
  }
  if(!ihdr||!ended||!idat.length)fail('incomplete_png');
  const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),depth=ihdr[8],color=ihdr[9],compression=ihdr[10],filter=ihdr[11],interlace=ihdr[12];
  if(width!==1200||height!==630||depth!==8||![2,6].includes(color)||
    compression!==0||filter!==0||interlace!==0)fail('png_1200x630_rgb_rgba_noninterlaced_required');
  let inflated;try{inflated=zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:5000000});}catch{fail('png_inflate_failed');}
  const stride=width*(color===6?4:3);
  if(inflated.length!==height*(stride+1))fail('png_scanline_size');
  for(let row=0;row<height;row++)if(inflated[row*(stride+1)]>4)fail('invalid_png_row_filter');
  return {width,height,format:'PNG',bytes:bytes.length,sha256:sha256(bytes),git_blob_sha:gitBlob(bytes)};
}
function git(cwd,args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function exactGitBytes(root,relative,expectedBlob){
  const blob=git(root,['rev-parse','HEAD:'+relative]);
  if(blob!==expectedBlob)fail('file_not_at_exact_commit:'+relative);
  return execFileSync('git',['cat-file','blob',expectedBlob],{cwd:root,encoding:'buffer'});
}
export function inspectCommittedImage({repoRoot,relative,expectedSha256,expectedBlob,expectedBytes}){
  if(!SHA256.test(expectedSha256)||!SHA1.test(expectedBlob)||!Number.isSafeInteger(expectedBytes))fail('invalid_image_digest_claim');
  const localFile=path.resolve(repoRoot,relative),root=path.resolve(repoRoot);
  if(!localFile.startsWith(root+path.sep))fail('path_escape');
  const local=fs.readFileSync(localFile);
  const committed=exactGitBytes(root,relative,expectedBlob);
  if(!local.equals(committed))fail('worktree_differs_from_committed_blob');
  const check=checkRealPng(committed);
  if(check.sha256!==expectedSha256||check.git_blob_sha!==expectedBlob||check.bytes!==expectedBytes)fail('committed_png_digest_mismatch');
  return check;
}
function validateContext({job,jobBytes,manifest}){
  if(job?.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
    job.accepted_images!==0||job.placeholder?.count!==6||
    !(job.source?.branch==='shadow/'+job.edition_date || (job.edition_date==='2026-10-09' && job.source?.branch===OCT9_RECOVERY_BRANCH && job.source?.one_time_owner_recovery===true && job.source?.unattended_schedule_proven===false))||
    !SHA1.test(job.source?.commit_sha||'')||!SHA256.test(job.source?.bundle_sha256||''))fail('job_not_qualified');
  if(manifest?.schema_version!==PACKAGE_SCHEMA||manifest.edition_date!==job.edition_date||
    manifest.execution_id!==job.execution_id||
    manifest.original_bundle_sha256!==job.source.bundle_sha256||
    manifest.original_source_commit_sha!==job.source.commit_sha||
    manifest.job_sha256!==sha256(jobBytes)||
    !SHA1.test(manifest.expected_pages_history_head||'')||
    !Array.isArray(manifest.images)||manifest.images.length!==6)fail('stale_or_unbound_package');
  // The external app's platform/session is outside the Compiler contract.
  // Exact job/source hashes, six committed PNGs and saved-pixel review evidence
  // below establish the exchange. Legacy session metadata is not an admission gate.
  const expected=new Set(job.stories?.map(s=>s.story_id));
  if(expected.size!==6)fail('job_six_unique_stories');
  if(new Set(manifest.images.map(r=>r.story_id)).size!==6||
    manifest.images.some(r=>!expected.has(r.story_id)))fail('package_six_unique_stories');
  if(manifest.set_review?.result!=='PASS'||manifest.set_review.independent_saved_pixel_review!==true||
    typeof manifest.set_review.differentiation_evidence!=='string'||
    manifest.set_review.differentiation_evidence.length<60||
    manifest.set_review.reviewed_sha256s?.length!==6||
    new Set(manifest.set_review.reviewed_sha256s).size!==6)fail('independent_six_image_review_evidence');
  return job.stories;
}
export function validateExternalImagePackage({job,jobBytes,manifest,repoRoot}){
  const stories=validateContext({job,jobBytes,manifest});
  const verified=[],shaSet=new Set();
  for(const story of stories){
    const image=manifest.images.find(r=>r.story_id===story.story_id);
    const expected='external-image-packages/'+job.edition_date+'/images/'+story.story_id+'.png';
    if(image.path!==expected||image.path!==story.expected_stage_path)fail('image_story_path_mismatch');
    const review=image.visual_review;
    if(image.accepted_locked!==true||review?.result!=='PASS'||
      review.inspected_png_sha256!==image.sha256||
      review.pixel_inspection_method!=='persisted_git_binary'||
      review.story_id!==story.story_id||
      review.verified_original_source_url!==story.primary_source.url||
      review.factual_fidelity_verified!==true||
      review.quality_and_visual_text_verified!==true||
      review.distinct_from_other_five_verified!==true||
      typeof review.mechanism_and_quality_notes!=='string'||review.mechanism_and_quality_notes.length<40)fail('genuine_story_bound_saved_pixel_review_evidence_required');
    if(!manifest.set_review.reviewed_sha256s.includes(image.sha256)||shaSet.has(image.sha256))fail('set_review_hash_or_duplication');
    shaSet.add(image.sha256);
    const data=inspectCommittedImage({repoRoot,relative:image.path,expectedSha256:image.sha256,expectedBlob:image.git_blob_sha,expectedBytes:image.bytes});
    verified.push({story_id:story.story_id,path:image.path,...data,review_receipt_status:'EVIDENCE_PRESENT_REQUIRES_INDEPENDENT_OWNER_REVIEW'});
  }
  if(shaSet.size!==6)fail('six_different_binary_assets_required');
  return {schema_version:'external-compiler-image-staging-check-v1',result:'STAGED_ONLY',edition_date:job.edition_date,execution_id:job.execution_id,job_sha256:manifest.job_sha256,source_commit_sha:job.source.commit_sha,original_bundle_sha256:job.source.bundle_sha256,
    package_head_sha:git(repoRoot,['rev-parse','HEAD']),expected_pages_history_head:manifest.expected_pages_history_head,
    images:verified,exact_git_readback:true,remote_git_readback:false,visual_approval_not_inferred:true,
    publication_verified:false,release_ready:false};
}
export async function verifyRemoteStagedPackage(receipt,{fetchImpl=fetch}={}){
  if(receipt?.result!=='STAGED_ONLY'||receipt.images?.length!==6||!SHA1.test(receipt.package_head_sha||''))fail('staging_receipt_required');
  const seen=[];
  for(const image of receipt.images){
    const url='https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/'+receipt.package_head_sha+'/'+image.path;
    const response=await fetchImpl(url,{headers:{'Cache-Control':'no-cache'}});
    if(response.status!==200)fail('remote_git_readback_http_'+response.status+':'+image.story_id);
    const bytes=Buffer.from(await response.arrayBuffer());
    const actual=checkRealPng(bytes);
    if(actual.sha256!==image.sha256||actual.git_blob_sha!==image.git_blob_sha||actual.bytes!==image.bytes)
      fail('remote_git_blob_bytes_mismatch:'+image.story_id);
    seen.push({story_id:image.story_id,source_url:url,sha256:actual.sha256,bytes:actual.bytes,git_blob_sha:actual.git_blob_sha});
  }
  return {...receipt,remote_git_readback:true,remote_assets:seen,checked_at:new Date().toISOString(),release_ready:false};
}
async function main(){
  const [jobPath,manifestPath,repoRoot='.',receiptPath]=process.argv.slice(2);
  if(!receiptPath)fail('usage: node scripts/stage-external-image-package.mjs <exact-job.json> <manifest.json> <git-repo-root> <receipt-path>');
  const jobBytes=fs.readFileSync(jobPath),job=JSON.parse(jobBytes.toString('utf8')),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const local=validateExternalImagePackage({job,jobBytes,manifest,repoRoot:path.resolve(repoRoot)});
  const remote=await verifyRemoteStagedPackage(local);
  fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
  fs.writeFileSync(receiptPath,JSON.stringify(remote,null,2)+'\n',{flag:'wx'});
  process.stdout.write(JSON.stringify({result:remote.result,exact_remote_six_image_readback:true,release_ready:false})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

