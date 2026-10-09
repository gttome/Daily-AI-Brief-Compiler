import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {OCT9_RECOVERY_BRANCH,OCT9_EXCEPTION_VERSION,OCT9_FAILED_HEAD,isAuthorizedOct9Recovery,allowedPendingEditionBranch} from '../compiler/oct9-owner-exception.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function example(){
  const state={schema_version:'daily-compiler-state-v1',edition_date:'2026-10-09',branch:OCT9_RECOVERY_BRANCH,
    execution_id:'daily-compiler-oct9-owner-placeholder-recovery-r1',state:'BUNDLE_READY',stage:'BUNDLE',
    images:{required:6,accepted:[],mode:'images_pending',placeholder_id:'illustration-pending-1200x630-v1'},
    one_time_recovery:{
      schema_version:OCT9_EXCEPTION_VERSION,owner_authorized:true,
      owner_authorization_scope:'publish_oct9_placeholders_and_provide_external_work_handoff_only',
      historical_branch:'shadow/2026-10-09',historical_commit_sha:OCT9_FAILED_HEAD,
      historical_execution_id:'daily-compiler-shadow-2026-10-09-validation-r1',
      historical_terminal_state:'SHADOW_FAILED',historical_retryable:false,
      historical_accepted_images:0,historical_editorial_blob_sha:'39489270a150dde168f43348ebce99d8a535e61f',
      normal_schedule_unchanged:true,not_an_unattended_release_one_proof:true,
      image_generation_disabled:true
    },
    bundle:{status:'BUNDLE_READY',digest:null}};
  const bundle={edition_date:'2026-10-09',image_representation:{status:'images_pending'},
    producer_receipt:{result:'PASS',owner_intervention:true,work_used:false,codex_used:false,
      paid_model_api_used:false,accepted_image_regenerations:0,
      exception_contract:OCT9_EXCEPTION_VERSION,scheduled_execution:false,
      historical_failed_execution_reopened:false}};
  return {state,bundle};
}
test('one exact historical-failure-fenced manual Oct9 recovery is eligible but not an unattended run',()=>{
  const f=example();
  assert.equal(isAuthorizedOct9Recovery(f),true);
  assert.equal(allowedPendingEditionBranch(f),true);
  assert.equal(f.bundle.producer_receipt.owner_intervention,true);
  assert.equal(f.state.one_time_recovery.not_an_unattended_release_one_proof,true);
});
test('exception cannot be reused across date, branch, parent failure, source, schedule or a Work/image invocation',()=>{
  const f=example();
  const altered=[
    [x=>{x.state.edition_date='2026-10-10';}],
    [x=>{x.state.branch='shadow/2026-10-09';}],
    [x=>{x.state.one_time_recovery.historical_commit_sha='0'.repeat(40);}],
    [x=>{x.state.one_time_recovery.historical_terminal_state='SHADOW_VERIFIED';}],
    [x=>{x.state.one_time_recovery.normal_schedule_unchanged=false;}],
    [x=>{x.state.one_time_recovery.image_generation_disabled=false;}],
    [x=>{x.state.one_time_recovery.historical_editorial_blob_sha='0'.repeat(40);}],
    [x=>{x.bundle.producer_receipt.work_used=true;}],
    [x=>{x.bundle.producer_receipt.owner_intervention=false;}],
    [x=>{x.bundle.producer_receipt.scheduled_execution=true;}],
    [x=>{x.bundle.image_representation.status='accepted';}]
  ];
  for(const [mutate] of altered){const x=structuredClone(f);mutate(x);assert.equal(isAuthorizedOct9Recovery(x),false);}
});
test('sealed special recovery is one-time BUNDLE_READY signal; unsealed/reverted cannot trigger',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'oct9-rescue-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const runDir=path.join(temp,'shadow-runs','2026-10-09');
  fs.mkdirSync(runDir,{recursive:true});
  const f=example(),bundleBytes=Buffer.from(JSON.stringify(f.bundle,null,2)+'\n');
  f.state.bundle.digest=sha(bundleBytes);
  const write=()=>{
    fs.writeFileSync(path.join(runDir,'edition-bundle.json'),bundleBytes);
    fs.writeFileSync(path.join(runDir,'compiler-state.json'),JSON.stringify(f.state,null,2)+'\n');
  };
  write();
  const script='scripts/check-current-shadow-ready.mjs';
  const invoke=()=>execFileSync('node',[script,OCT9_RECOVERY_BRANCH,temp],{encoding:'utf8'});
  assert.match(invoke(),/ready=true/);
  f.state.one_time_recovery.historical_retryable=true;write();
  assert.match(invoke(),/ready=false/);
  f.state.one_time_recovery.historical_retryable=false;
  f.state.state='SHADOW_FAILED';f.state.stage='IMAGES';write();
  assert.match(invoke(),/ready=false/);
});
test('normal schedule and source branch grammar remain unchanged; exception is exact and limited',()=>{
  const schema=JSON.parse(fs.readFileSync('contracts/compiler-state.schema.json','utf8'));
  assert.equal(new RegExp(schema.properties.branch.pattern).test('shadow/2026-10-10'),true);
  assert.equal(new RegExp(schema.properties.branch.pattern).test(OCT9_RECOVERY_BRANCH),true);
  assert.equal(new RegExp(schema.properties.branch.pattern).test('shadow/2026-10-11-owner-placeholder-20261011'),false);
  const job=fs.readFileSync('scripts/external-image-jobs.mjs','utf8');
  assert.match(job,/state.branch/);assert.match(job,/one_time_owner_recovery/);
  const workflow=fs.readFileSync('.github/workflows/shadow-compile.yml','utf8');
  assert.match(workflow,/shadow\/2026-10-09-owner-placeholder-20261009/);
  assert.match(workflow,/TARGET_DATE=2026-10-09/);
  const signal=fs.readFileSync('.github/workflows/bundle-ready-signal.yml','utf8');
  assert.match(signal,/branches:/);
  assert.doesNotMatch(signal,/\n\s+-\s+schedule:/);
});
