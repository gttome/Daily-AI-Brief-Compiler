#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {validateD1Activation} from '../image-studio/activation.mjs';

const repoRoot=process.argv[2]||'.';
const readJson=p=>JSON.parse(fs.readFileSync(path.resolve(repoRoot,p),'utf8'));
const manifest=readJson('contracts/d1-implementation-readiness.json');
const missing=manifest.required_files.filter(p=>!fs.existsSync(path.resolve(repoRoot,p)));
const errors=[];
if(manifest.schema_version!=='daily-compiler-d1-implementation-readiness-v1') errors.push('readiness_manifest_schema');
if(missing.length) errors.push(...missing.map(x=>'missing:'+x));

let contract=null,dot=null,work=null,prompts=null,sync=null;
if(!missing.length){
  contract=readJson('contracts/d1-image-contract.json');
  dot=readJson('contracts/d1-dot-coordinator-contract.json');
  work=readJson('contracts/d1-work-porter-contract.json');
  prompts=readJson('contracts/d1-transition-schedule-prompts.json');
  sync=readJson('contracts/d1-transition-schedule-sync.json');
  const inv=manifest.implementation_invariants;
  if(contract.schema_version!==inv.contract_schema) errors.push('contract_schema');
  if(contract.strategy!==inv.strategy) errors.push('contract_strategy');
  if(contract.activation_status!==inv.activation_status&&contract.activation_status!=='active') errors.push('contract_activation_status');
  if(contract.transfer?.archive_required!==inv.archive_required) errors.push('archive_required');
  if(contract.transfer?.work_exception!==inv.work_scope) errors.push('work_scope');
  if(contract.quality?.github_visual_rereview_required!==inv.github_visual_rereview_required) errors.push('github_visual_rereview');
  if(dot.local_computer_dependency!==inv.local_computer_dependency) errors.push('local_computer_dependency');
  if(dot.owner_presence_required!==inv.owner_presence_required) errors.push('owner_presence_required');
  if(!Array.isArray(prompts.schedules)||prompts.schedules.length!==inv.transition_schedule_count) errors.push('transition_schedule_count');
  if(prompts.no_new_schedule_created!==inv.no_new_schedule_created) errors.push('transition_new_schedule');
  if(sync.result!=='PASS'||sync.new_schedule_created!==false||!sync.schedules?.every(x=>x.enabled===true)) errors.push('schedule_sync');
  const editorial=readJson('contracts/editorial-contract.json');
  if(editorial.post_publication_corrections?.preserve_original!==true) errors.push('corrections_support');
  if(editorial.future_brief?.resolution_required!==true) errors.push('future_suggestions_support');
  if(editorial.observability?.run_events_required!==true||editorial.observability?.post_run_analysis_required!==true||editorial.observability?.dashboard_snapshot_required!==true) errors.push('observability_support');
}

const activation=validateD1Activation({repoRoot});
const implementationComplete=errors.length===0;
const activationReady=activation.result==='PASS';
const externalBlocker=implementationComplete&&!activationReady?manifest.expected_external_blocker:null;
const result={
  schema_version:'daily-compiler-d1-implementation-readiness-result-v1',
  result:implementationComplete?'PASS':'FAIL',
  implementation_complete:implementationComplete,
  activation_ready:activationReady,
  activation_status:contract?.activation_status??null,
  work_scope:work?.allowed_scope??null,
  dot_cloud_only:dot?dot.local_computer_dependency===false:null,
  live_schedule_sync:sync?.result??null,
  external_blocker:externalBlocker,
  missing_files:missing,
  errors
};
console.log(JSON.stringify(result,null,2));
if(!implementationComplete) process.exitCode=1;
