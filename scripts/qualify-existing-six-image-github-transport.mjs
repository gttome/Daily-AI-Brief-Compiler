// Nonpublishing GitHub binary API qualification with six ALREADY ACCEPTED Oct10 PNGs.
// The Git objects are content-addressed, deduplicate to their existing blob SHAs,
// and are NOT attached to any commit, branch, Pages artifact or image-job manifest.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkRealPng} from './stage-external-image-package.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='gttome/Daily-AI-Brief-Compiler';
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('existing_six_github_binary_transport:'+s);};
const git=(args,opts={})=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024,...opts}).trim();
const gh=(args,input=null)=>{
 const opts={cwd:ROOT,encoding:'utf8',maxBuffer:48*1024*1024};
 if(input!==null)opts.input=input;
 return JSON.parse(execFileSync('gh',['api',...args],opts));
};
export function validateAcceptedSixTransportFixture({manifest,jobBytes,repoRoot=ROOT}){
 if(manifest?.schema_version!=='external-compiler-image-package-v1'||
   manifest.edition_date!=='2026-10-10'||
   !Buffer.isBuffer(jobBytes)||manifest.job_sha256!==sha256(jobBytes)||
   !Array.isArray(manifest.images)||manifest.images.length!==6||
   new Set(manifest.images.map(x=>x.story_id)).size!==6)
   fail('only_exact_six_immutable_oct10_images_allowed');
 const rows=[];
 const seen=new Set();
 for(const img of manifest.images){
   if(img.accepted_locked!==true||img.visual_review?.result!=='PASS'||
     img.visual_review.inspected_png_sha256!==img.sha256||
     img.path!=='external-image-packages/2026-10-10/images/'+img.story_id+'.png'||
     !/^[a-f0-9]{64}$/.test(img.sha256||'')||
     !/^[a-f0-9]{40}$/.test(img.git_blob_sha||'')||
     !Number.isSafeInteger(img.bytes)||img.bytes<=10000)
     fail('accepted_visual_or_path_identity_missing');
   const local=path.resolve(repoRoot,img.path);
   if(!local.startsWith(path.resolve(repoRoot)+path.sep))fail('path_escape');
   const bytes=fs.readFileSync(local);
   const check=checkRealPng(bytes);
   if(check.sha256!==img.sha256||check.git_blob_sha!==img.git_blob_sha||check.bytes!==img.bytes)
     fail('accepted_bytes_do_not_match_original_manifest:'+img.story_id);
   if(seen.has(check.sha256))fail('duplicate_original_image');
   seen.add(check.sha256);
   rows.push({story_id:img.story_id,path:img.path,sha256:check.sha256,
     git_blob_sha:check.git_blob_sha,bytes:check.bytes});
 }
 return rows;
}
async function main(){
 if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_EVENT_NAME!=='pull_request'||
   !process.env.GITHUB_SHA||!process.env.GITHUB_HEAD_REF||
   !process.env.GH_TOKEN)
   fail('protected_pr_with_authentication_required');
 const commit=process.env.GITHUB_SHA;
 if(!/^[a-f0-9]{40}$/.test(commit)||git(['rev-parse','HEAD'])!==commit)
   fail('checkout_pr_head_mismatch');
 const refBefore={
   main:git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0],
   history:git(['ls-remote','origin','refs/heads/shadow-pages-history']).split(/\s+/)[0]
 };
 if(refBefore.history!=='436c299569d6e457831e7f5383adbf2f9d0ac432')
   fail('protected_older_history_not_same');
 const jobBytes=fs.readFileSync('external-image-packages/2026-10-10/source/job.json');
 const manifest=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/manifest.json'));
 const rows=validateAcceptedSixTransportFixture({manifest,jobBytes});
 const original=[];
 for(const row of rows){
   const existing=git(['rev-parse','HEAD:'+row.path]);
   if(existing!==row.git_blob_sha)fail('not_exact_committed_original_png:'+row.story_id);
   const local=fs.readFileSync(row.path);
   const uploaded=gh(['-X','POST','repos/'+REPO+'/git/blobs','--input','-'],
     JSON.stringify({content:local.toString('base64'),encoding:'base64'}));
   if(uploaded.sha!==row.git_blob_sha)fail('remote_authenticated_blob_roundtrip_upload_mismatch:'+row.story_id);
   const read=gh(['repos/'+REPO+'/git/blobs/'+uploaded.sha]);
   if(read.encoding!=='base64'||read.size!==row.bytes||read.sha!==row.git_blob_sha)
     fail('remote_api_binary_readback_metadata_mismatch:'+row.story_id);
   const downloaded=Buffer.from(read.content.replace(/\s+/g,''),'base64');
   if(!downloaded.equals(local)||sha256(downloaded)!==row.sha256)
     fail('remote_api_binary_readback_bytes_mismatch:'+row.story_id);
   const remote='https://raw.githubusercontent.com/'+REPO+'/'+commit+'/'+row.path;
   const resp=await fetch(remote,{headers:{'Cache-Control':'no-cache'}});
   if(resp.status!==200)fail('remote_exact_commit_raw_http_'+resp.status+':'+row.story_id);
   const remoteBytes=Buffer.from(await resp.arrayBuffer());
   if(!remoteBytes.equals(local)||sha256(remoteBytes)!==row.sha256)
     fail('remote_exact_commit_binary_readback_mismatch:'+row.story_id);
   original.push({...row,api_uploaded_existing_git_blob_sha:uploaded.sha,
     api_roundtrip_match:true,raw_commit_url:remote,raw_commit_match:true});
 }
 const refAfter={
   main:git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0],
   history:git(['ls-remote','origin','refs/heads/shadow-pages-history']).split(/\s+/)[0]
 };
 if(refBefore.main!==refAfter.main||refBefore.history!==refAfter.history)
   fail('branch_ref_changed_during_nonpublishing_binary_test');
 const receipt={
   schema_version:'six-existing-accepted-png-remote-binary-transport-proof-v1',
   result:'SIX_ACCEPTED_EXISTING_PNG_BINARY_UPLOAD_AND_EXACT_GITHUB_API_REMOTE_READBACK_PASS',
   repository:REPO,edition_date:'2026-10-10',
   source_original_job_sha256:manifest.job_sha256,immutable_accepted_images:original,
   validated_images:original.length,exact_commit:commit,git_refs_before:refBefore,git_refs_after:refAfter,
   new_images_generated:0,existing_png_bytes_modified:0,new_commits_created:0,
   new_blob_content:'NONE_DEDUPLICATED_EXISTING_IDENTICAL_GIT_BLOBS',
   pages_deployments_started:0,protected_history_modified:false,
   original_source_manifest_modified:false,feature_flags_modified:false,
   external_app_image_create_export_path_not_tested:true,
   authenticated_chat_plugin_file_transfer_not_inferred:true
 };
 fs.mkdirSync('build/evidence/nonpublishing-binary-roundtrip',{recursive:true});
 fs.writeFileSync('build/evidence/nonpublishing-binary-roundtrip/receipt.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({result:receipt.result,accepted_pngs:6,git_refs_unchanged:true,
   created_new_images:0,connector_image_transfer_not_inferred:true}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
