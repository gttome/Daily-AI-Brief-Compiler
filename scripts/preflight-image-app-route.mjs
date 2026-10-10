// Pre-generation route preflight is evidence, not a browser login request or an authorization bypass.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {imageReleaseCompatibility,readImageProcessVersions} from './image-process-versions.mjs';
import {selectExternalImageAppDocuments} from './select-image-app-contracts.mjs';
export const REQUIRED_OPERATIONS=[
 'native_image_generation','saved_pixel_inspection','exact_1200x630_png_export',
 'github_authenticated_binary_upload','exact_commit_binary_readback',
 'protected_pr_merge_and_ci','existing_workflow_dispatch',
 'desktop_image_region_capture','mobile_image_region_capture'
];
export function evaluateImageAppPreflight({capabilities,versions=readImageProcessVersions(),job}){
 const compat=imageReleaseCompatibility(versions);
 const blockers=[];
 if(compat.result!=='COMPATIBLE')blockers.push('RELEASE_ADMISSION_HOLD:starter_authority_version_incompatible');
 let selectedDocs=null;
 if(compat.result==='COMPATIBLE'){
   try{
     selectedDocs=selectExternalImageAppDocuments(versions);
     if(selectedDocs.result!=='SELECTED_EXTERNAL_IMAGE_CONTRACTS_COMPATIBLE')
       blockers.push('selected_starter_full_handoff_not_compatible');
   }catch(error){
     blockers.push('selected_starter_full_handoff_not_compatible:'+error.message);
   }
 }
 if(job?.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
   !Array.isArray(job.stories)||job.stories.length!==6)blockers.push('no_eligible_immutable_six_story_job');
 const proven=c=>c?.available===true&&c.authorized===true&&
   typeof c.evidence_ref==='string'&&c.evidence_ref.length>=8&&
   typeof c.method==='string'&&c.method.length>=3;
 let release_start_mode=null;
 for(const operation of REQUIRED_OPERATIONS){
   if(operation==='existing_workflow_dispatch'){
     // The protected main package-merge trigger eliminates a redundant manual
     // dispatch. Both are optional alternatives; neither may be invented.
     const auto=capabilities?.protected_main_package_merge_auto_release;
     const manual=capabilities?.existing_workflow_dispatch;
     if(proven(auto)&&auto.method==='protected_merged_package_manifest'&&
       auto.workflow_path==='.github/workflows/external-image-only-replacement.yml')
       release_start_mode='protected_package_merge';
     else if(proven(manual))release_start_mode='authenticated_manual_dispatch';
     else blockers.push('capability_unproven:existing_workflow_dispatch_or_protected_package_merge_auto_release');
     continue;
   }
   if(!proven(capabilities?.[operation]))blockers.push('capability_unproven:'+operation);
 }
 return {schema_version:'external-image-route-preflight-v7',result:blockers.length?'BLOCKED_INCOMPLETE':'CAPABILITY_ROUTE_PROVEN',
   blockers,edition_date:job?.edition_date??null,release_start_mode,
   selected_document_version:selectedDocs?.selected_version??null,creative_attempts_consumed:0,
   owner_browser_login_assumed:false,production_dispatch_not_inferred:release_start_mode!=='authenticated_manual_dispatch'};
}
function main(){
 const [jobFile,capabilityFile,receiptFile]=process.argv.slice(2);
 if(!receiptFile)throw Error('usage: node scripts/preflight-image-app-route.mjs <immutable-job> <actual-capabilities.json> <output>');
 const verdict=evaluateImageAppPreflight({job:JSON.parse(fs.readFileSync(jobFile,'utf8')),
   capabilities:JSON.parse(fs.readFileSync(capabilityFile,'utf8'))});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(verdict,null,2)+'\n');
 console.log(JSON.stringify(verdict));
 if(verdict.result!=='CAPABILITY_ROUTE_PROVEN')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
