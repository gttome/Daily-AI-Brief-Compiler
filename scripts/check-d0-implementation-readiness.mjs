#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {evaluateD0ProofSet} from '../image-capsules/completion-gate.mjs';
import {evaluateP0ARouteMatrix} from '../image-capsules/p0a-route-evaluator.mjs';

const repoRoot=process.argv[2]||'.';
const readJson=p=>JSON.parse(fs.readFileSync(path.resolve(repoRoot,p),'utf8'));
const manifest=readJson('contracts/d0-implementation-readiness.json');
const missing=manifest.required_files.filter(p=>!fs.existsSync(path.resolve(repoRoot,p)));
const errors=[];
if(manifest.schema_version!=='daily-compiler-d0-implementation-readiness-v1') errors.push('readiness_manifest_schema');
if(missing.length) errors.push(...missing.map(x=>'missing:'+x));

let imageContract=null,transition=null,sync=null,routeMatrix=null,proofs=null;
if(!missing.length){
  imageContract=readJson('contracts/image-contract.json');
  transition=readJson('contracts/d0-transition-schedule-prompts.json');
  sync=readJson('contracts/d0-transition-schedule-sync.json');
  routeMatrix=readJson('contracts/d0-p0a-route-matrix.json');
  proofs=evaluateD0ProofSet({repoRoot});
  const inv=manifest.implementation_invariants;
  if(imageContract.schema_version!==inv.image_contract_schema) errors.push('image_contract_schema');
  if(imageContract.strategy!==inv.strategy) errors.push('image_contract_strategy');
  if(imageContract.paid_capacity_branch_exists!==inv.paid_capacity_branch_exists) errors.push('paid_capacity_branch');
  if(!Array.isArray(transition.schedules)||transition.schedules.length!==inv.transition_schedule_count) errors.push('transition_schedule_count');
  if(transition.no_new_schedule_created!==inv.no_new_schedule_created) errors.push('transition_new_schedule');
  const proofKeys=Object.keys(readJson('contracts/d0-proof-manifest.json').proofs||{});
  if(JSON.stringify(proofKeys.sort())!==JSON.stringify([...inv.proof_keys].sort())) errors.push('proof_key_set');
  if(sync.result!=='PASS'||sync.new_schedule_created!==false||!sync.schedules?.every(x=>x.enabled===true)) errors.push('schedule_sync');
}

const route=routeMatrix?evaluateP0ARouteMatrix(routeMatrix):null;
const implementationComplete=errors.length===0;
const activationReady=proofs?.activation_ready===true;
const externalBlocker=implementationComplete&&!activationReady&&route?.retry_allowed===false
  ? 'P0_A_ZERO_COST_NATIVE_ROUTE_UNAVAILABLE'
  : null;

const result={
  schema_version:'daily-compiler-d0-implementation-readiness-result-v1',
  result:implementationComplete?'PASS':'FAIL',
  implementation_complete:implementationComplete,
  activation_ready:activationReady,
  image_contract_activation_status:imageContract?.activation_status??null,
  p0a_route_result:route?.result??null,
  ready_routes:route?.ready_routes??[],
  proof_status:proofs?.proofs??null,
  external_blocker:externalBlocker,
  missing_files:missing,
  errors
};
console.log(JSON.stringify(result,null,2));
if(!implementationComplete) process.exitCode=1;
