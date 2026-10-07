#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {validateD1Activation} from '../image-studio/activation.mjs';
const repoRoot=process.argv[2]||'.';
const readJson=p=>JSON.parse(fs.readFileSync(path.resolve(repoRoot,p),'utf8'));
const manifest=readJson('contracts/d1-implementation-readiness.json');
const missing=manifest.required_files.filter(p=>!fs.existsSync(path.resolve(repoRoot,p)));
const errors=[];
if(manifest.schema_version!=='daily-compiler-d1-implementation-readiness-v2') errors.push('readiness_manifest_schema');
if(missing.length) errors.push(...missing.map(x=>'missing:'+x));
let contract=null,work=null,prompts=null,sync=null;
if(!missing.length){
  contract=readJson('contracts/d1-image-contract.json'); work=readJson('contracts/d1-work-porter-contract.json');
  prompts=readJson('contracts/d1-transition-schedule-prompts.json'); sync=readJson('contracts/d1-transition-schedule-sync.json');
  const inv=manifest.implementation_invariants;
  if(contract.schema_version!==inv.contract_schema) errors.push('contract_schema');
  if(contract.strategy!==inv.strategy) errors.push('contract_strategy');
  if(contract.activation_status!==inv.activation_status&&contract.activation_status!=='active') errors.push('contract_activation_status');
  if(contract.transfer?.archive_required!==inv.archive_required) errors.push('archive_required');
  if(!Array.isArray(contract.allowed_work_scope)||!contract.allowed_work_scope.includes(inv.work_scope)) errors.push('work_scope');
  if(contract.quality?.github_visual_rereview_required!==inv.github_visual_rereview_required) errors.push('github_visual_rereview');
  if(contract.quality?.minimum_meaningful_components!==inv.minimum_meaningful_components) errors.push('image_component_density');
  if(inv.benchmark_profile_required===true && !fs.existsSync(path.resolve(repoRoot,contract.quality?.benchmark_profile_path||''))) errors.push('benchmark_profile_missing');
  if(contract.image_creation?.normal_run_owner_presence_required!==inv.owner_presence_required) errors.push('owner_presence_required');
  if(contract.forbidden_runtime_dependencies?.includes('local_computer')!==true) errors.push('local_computer_dependency');
  if(!Array.isArray(prompts.schedules)||prompts.schedules.length!==inv.transition_schedule_count) errors.push('transition_schedule_count');
  if(prompts.no_new_schedule_created!==inv.no_new_schedule_created) errors.push('transition_new_schedule');
  if(prompts.dot_owns_d1_image_coordination!==false||prompts.work_browser_owns_d1_image_coordination!==true) errors.push('image_path_owner');
  if(sync.result!=='PASS'||sync.new_schedule_created!==false||!sync.schedules?.every(x=>x.enabled===true)) errors.push('schedule_sync');
  const editorial=readJson('contracts/editorial-contract.json');
  if(editorial.post_publication_corrections?.preserve_original!==true) errors.push('corrections_support');
  if(editorial.future_brief?.resolution_required!==true) errors.push('future_suggestions_support');
}
const activation=validateD1Activation({repoRoot});
const implementationComplete=errors.length===0,activationReady=activation.result==='PASS';
const result={
  schema_version:'daily-compiler-d1-implementation-readiness-result-v2',result:implementationComplete?'PASS':'FAIL',
  implementation_complete:implementationComplete,activation_ready:activationReady,activation_status:contract?.activation_status??null,
  work_scope:work?.allowed_scope??null,image_path_owner:'work_cloud_browser',dot_required_for_image_path:false,
  live_schedule_sync:sync?.result??null,external_blocker:implementationComplete&&!activationReady?manifest.expected_external_blocker:null,
  missing_files:missing,errors
};
console.log(JSON.stringify(result,null,2)); if(!implementationComplete) process.exitCode=1;
