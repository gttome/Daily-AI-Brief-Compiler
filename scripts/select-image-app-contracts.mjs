// A single version-resolved source of truth for optional external image instructions.
// Keeps immutable Rev6 guidance available for individual I2-only rollback.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readImageProcessVersions,imageReleaseCompatibility} from './image-process-versions.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const DOCUMENT_PAIRS=Object.freeze({
 rev6:Object.freeze({
  starter:'docs/external-app/EXTERNAL_WORK_IMAGE_APP_START_PROMPT_2026-10-09.md',
  full_prompt:'docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt.md',
  handoff:'EXTERNAL_APP_HANDOFF.md',
  authority_file:'owner-release-approval.json'
 }),
 rev7:Object.freeze({
  starter:'docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV7.md',
  full_prompt:'docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md',
  handoff:'EXTERNAL_APP_HANDOFF_REV7.md',
  authority_file:'starter-assignment.json'
 })
});
export function selectExternalImageAppDocuments(config=readImageProcessVersions(),checkFiles=true){
 const fit=imageReleaseCompatibility(config);
 if(fit.result!=='COMPATIBLE')return {result:'RELEASE_ADMISSION_HOLD',reason:'I1_I2_STATIC_VERSION_MISMATCH',versions:fit.pair};
 const docs=DOCUMENT_PAIRS[config.image_starter_contract_version];
 if(!docs)throw Error('unsupported_external_image_docs_version');
 if(checkFiles){
  for(const [key,value] of Object.entries(docs)){
   if(key==='authority_file')continue;
   const file=path.join(root,value);
   if(!fs.existsSync(file))throw Error('missing_selected_external_image_doc:'+value);
   const body=fs.readFileSync(file,'utf8');
   if(!body.includes('Revision '+(config.image_starter_contract_version==='rev7'?'7':'6')))
     throw Error('wrong_selected_external_image_doc_version:'+value);
  }
  if(config.image_starter_contract_version==='rev7'){
   const starter=fs.readFileSync(path.join(root,docs.starter),'utf8');
   const full=fs.readFileSync(path.join(root,docs.full_prompt),'utf8');
   const handoff=fs.readFileSync(path.join(root,docs.handoff),'utf8');
   if(!starter.includes('Create the six premium images')||
     !starter.includes(docs.full_prompt)||
     !starter.includes(docs.handoff)||
     !full.includes('Create the six premium images')||
     !full.includes(docs.handoff)||
     !handoff.includes(docs.full_prompt))
      throw Error('rev7_starter_full_handoff_not_aligned');
  }
 }
 return {result:'SELECTED_EXTERNAL_IMAGE_CONTRACTS_COMPATIBLE',
  selected_version:config.image_starter_contract_version,
  authority_policy:config.image_release_authority_policy,
  files:docs,missing_real_dispatch_is_runtime_preflight_block_not_version_override:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=selectExternalImageAppDocuments();
 console.log(JSON.stringify(result,null,2));
 if(result.result==='RELEASE_ADMISSION_HOLD')process.exitCode=42;
}
