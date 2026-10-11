// Resolve exactly one protected image package PR merge into immutable
// workflow inputs. This does not publish pages, edit jobs or generate art.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const fail=x=>{throw Error('protected_image_auto_release:'+x);};
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
export function deriveProtectedPackageReleaseInputs({headSha,mainSha,changedPaths,manifestPath,manifest,associatedPulls}){
 if(!SHA.test(headSha||'')||headSha!==mainSha)fail('exact_protected_main_head_required');
 if(!Array.isArray(changedPaths)||!changedPaths.length)fail('changed_paths_missing');
 const manifests=changedPaths.filter(p=>/^external-image-packages\/20\d{2}-\d{2}-\d{2}\/manifest\.json$/.test(p));
 if(manifests.length!==1||manifests[0]!==manifestPath)fail('exactly_one_date_manifest_required');
 const date=manifestPath.split('/')[1];
 if(date<='2026-10-08')fail('historic_image_release_prohibited');
 const allowed=new RegExp('^external-image-packages/'+date+'/(?:manifest\\.json|starter-assignment\\.json|recurring-assignment\\.json|images/[a-z0-9-]+\\.png|reviews/[a-zA-Z0-9_./-]+|source/[a-zA-Z0-9_./-]+)$');
 if(new Set(changedPaths).size!==changedPaths.length||changedPaths.some(p=>!allowed.test(p)||p.includes('..')))
   fail('image_only_single_edition_files_required');
 if(manifest?.schema_version!=='external-compiler-image-package-v1'||manifest.edition_date!==date||
   !SHA.test(manifest.expected_pages_history_head||'')||
   !DIGEST.test(manifest.job_sha256||'')||
   !Array.isArray(manifest.images)||manifest.images.length!==6||
   new Set(manifest.images.map(x=>x.story_id)).size!==6)fail('exact_bound_six_image_manifest_required');
 const prs=(associatedPulls||[]).filter(p=>p?.merged_at&&p.base?.ref==='main'&&p.merge_commit_sha===headSha);
 if(prs.length!==1||!Number.isSafeInteger(prs[0].number)||prs[0].number<=0||
   !SHA.test(prs[0].head?.sha||''))fail('exact_merged_protected_pr_required');
 return {TARGET_DATE:date,PACKAGE_PR:String(prs[0].number),
   PACKAGE_PR_HEAD:prs[0].head.sha,PACKAGE_MERGE_HEAD:headSha,
   HISTORY_HEAD:manifest.expected_pages_history_head};
}
const cmd=(command,args)=>execFileSync(command,args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
function main(){
 const event=process.env.GITHUB_EVENT_NAME;
 if(event==='workflow_dispatch'){
   console.log('EXISTING_EXPLICIT_WORKFLOW_DISPATCH_INPUTS_RETAINED');return;
 }
 if(event!=='push'||process.env.GITHUB_REF!=='refs/heads/main')
   fail('no_unapproved_automatic_event');
 const sha=process.env.GITHUB_SHA;
 const checked=cmd('git',['rev-parse','HEAD']);
 const mainHead=cmd('git',['ls-remote','origin','refs/heads/main']).split(/\s+/)[0];
 if(checked!==sha||mainHead!==sha)fail('main_moved_or_checkout_not_exact');
 const changed=cmd('git',['diff','--name-only',sha+'^1',sha]).split('\n').filter(Boolean);
 const manifests=changed.filter(x=>/^external-image-packages\/20\d{2}-\d{2}-\d{2}\/manifest\.json$/.test(x));
 if(manifests.length!==1)fail('exactly_one_manifest_required');
 const manifestPath=manifests[0];
 const data=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const repo=process.env.GITHUB_REPOSITORY;
 if(repo!=='gttome/Daily-AI-Brief-Compiler')fail('wrong_repository');
 const prs=JSON.parse(cmd('gh',['api','repos/'+repo+'/commits/'+sha+'/pulls','-H','Accept: application/vnd.github+json']));
 const selected=deriveProtectedPackageReleaseInputs({headSha:sha,mainSha:mainHead,changedPaths:changed,
   manifestPath,manifest:data,associatedPulls:prs});
 const envFile=process.env.GITHUB_ENV;
 if(!envFile)fail('github_environment_receipt_required');
 fs.appendFileSync(envFile,Object.entries(selected).map(([k,v])=>k+'='+v).join('\n')+'\n');
 console.log(JSON.stringify({result:'PROTECTED_SINGLE_EDITION_PACKAGE_MERGE_AUTO_ROUTE_READY',
   edition_date:selected.TARGET_DATE,merged_pr:selected.PACKAGE_PR,
   package_pr_head:selected.PACKAGE_PR_HEAD,pages_history_head:selected.HISTORY_HEAD,
   source_code_only_preview:false,pages_deployed:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
