// TEST_ONLY. No image model, scheduler, deployment, network or remote Git write.
// Synthetic capability fixtures exercise validators; they are not live proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD1Activation} from '../image-studio/activation.mjs';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {readSourceSnapshot} from '../operations/source-discovery.mjs';
import {IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {VALUE_TARGET,PRIMARY_TASK_ID,valueReleaseInventory,compareValueReleaseBindings,qualifiedDiscoverySummary,
  compareValueSchedule,checkValueBuildProvenance,inspectIsolatedValueEvidence,auditValueRelease} from '../operations/value-release.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const A='a'.repeat(40),B='b'.repeat(40),REF='https://github.com/gttome/Daily-AI-Brief-Compiler/blob/'+A+'/TEST_ONLY/evidence.json';
const WHEN='2026-10-08T23:20:00Z';
const json=value=>JSON.stringify(value,null,2)+'\n';
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-value-release-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function copyInputs(t){
  const root=temp(t),inventory=valueReleaseInventory({repoRoot:ROOT,engineSha:A});
  for(const row of inventory.files){const target=path.join(root,row.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(ROOT,row.path),target);}
  return root;
}
function schedule(){return {observed_at:'2026-10-08T14:50:00Z',tasks:[{id:PRIMARY_TASK_ID,title:'Daily Compiler Primary',is_enabled:true,timing_mode:'exact_schedule',default_timezone:'America/Chicago',
  schedule:'BEGIN:VEVENT\nDTSTART;TZID=America/Chicago:20261008T221500\nRRULE:FREQ=DAILY;BYHOUR=22;BYMINUTE=15;BYSECOND=0\nEND:VEVENT',next_run_time:null}]};}
const completedCI=head=>({head_sha:head,status:'completed',conclusion:'success',workflow:'compiler-validation',check_name:'validate',app_id:15368,
  completed_at:'2026-10-08T23:18:00Z',check_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/123/job/456'});
const binding=head=>({source:'GIT_CHECKOUT',head_sha:head,tracked_files_clean:true});
const gate=(report,id)=>report.gates.find(row=>row.gate===id);

test('I07-T01 exact release head and scoped predecessor compatibility are different claims',()=>{
  const first=valueReleaseInventory({repoRoot:ROOT,engineSha:A}),next=valueReleaseInventory({repoRoot:ROOT,engineSha:B});
  assert.deepEqual(first.missing_required_files,[]);
  assert.equal(compareValueReleaseBindings(first,first).result,'PASS');
  assert.equal(compareValueReleaseBindings(first,next).result,'FAIL');
  assert.equal(compareValueReleaseBindings(first,next,{scopes:['implementation','contracts','sources'],componentOnly:true}).result,'PASS');
  assert.ok(first.files.some(row=>row.path==='docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md'));
  assert.ok(first.files.some(row=>row.path==='vendor/production-reader/SOURCE-MAP.json'));
});

test('I07-T01 changed contracts and added, removed or changed code invalidate scoped bindings',t=>{
  const root=copyInputs(t),first=valueReleaseInventory({repoRoot:root,engineSha:A});
  fs.appendFileSync(path.join(root,'compiler/compile.mjs'),'\n// TEST_ONLY changed core input\n');
  fs.writeFileSync(path.join(root,'compiler/TEST_ONLY-added.mjs'),'export const fixture=true;\n');
  fs.rmSync(path.join(root,'compiler/feedback-identity.mjs'));
  const file=path.join(root,'contracts/d1-image-contract.json'),contract=JSON.parse(fs.readFileSync(file,'utf8'));
  contract.quality.minimum_meaningful_components+=1;fs.writeFileSync(file,json(contract));
  const next=valueReleaseInventory({repoRoot:root,engineSha:B});
  const compared=compareValueReleaseBindings(first,next,{scopes:['implementation','contracts'],componentOnly:true});
  assert.equal(compared.result,'FAIL');
  for(const file of ['compiler/compile.mjs','compiler/TEST_ONLY-added.mjs','compiler/feedback-identity.mjs','contracts/d1-image-contract.json'])assert.ok(compared.changed_files.includes(file));
});

test('I07-T01 hash-consistent empty, duplicate, unsafe or incomplete inventories cannot certify compatibility',()=>{
  const good=valueReleaseInventory({repoRoot:ROOT,engineSha:A});
  for(const modify of [value=>value.files=[],value=>value.files.push(structuredClone(value.files[0])),value=>value.files[0].path='../escape',
    value=>value.files[0].sha256='invalid',value=>value.files[0].scope='unknown',value=>value.missing_required_files=['contracts/media-contract.json']]){
    const bad=structuredClone(good);modify(bad);bad.inventory_sha256=canonicalSha(bad.files);
    for(const scope of Object.keys(bad.scope_sha256))bad.scope_sha256[scope]=canonicalSha(bad.files.filter(row=>row.scope===scope));
    assert.equal(compareValueReleaseBindings(bad,bad).result,'FAIL');
  }
  assert.equal(compareValueReleaseBindings(good,good,{scopes:[],componentOnly:true}).result,'FAIL');
});

test('I07-T01 actual activation validator rejects a changed quality contract behind an existing six-image fixture proof',t=>{
  const f=makeD1QualificationFixture({root:temp(t)});
  applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  assert.equal(validateD1Activation({repoRoot:f.root}).result,'PASS','TEST_ONLY deterministic fixture, not live activation');
  const file=path.join(f.root,'contracts/d1-image-contract.json'),contract=JSON.parse(fs.readFileSync(file,'utf8'));
  contract.quality.minimum_meaningful_components+=1;fs.writeFileSync(file,json(contract));
  const result=validateD1Activation({repoRoot:f.root});
  assert.equal(result.result,'FAIL');assert.ok(result.errors.includes('d1_qualification_quality_contract'));
});

test('I07-T02 observer/learning absence does not change required gate conclusions or product input digests',t=>{
  const root=copyInputs(t),before=valueReleaseInventory({repoRoot:root,engineSha:A});
  const baseline=auditValueRelease({repoRoot:root,engineSha:A,recordedAt:WHEN});
  assert.equal(gate(baseline,'QUALIFIED_SOURCE_SNAPSHOT').result,'PASS');
  fs.mkdirSync(path.join(root,'observability'),{recursive:true});
  fs.writeFileSync(path.join(root,'observability/TEST_ONLY-throw.mjs'),'throw new Error("optional observation unavailable");\n');
  fs.writeFileSync(path.join(root,'operations/learning.mjs'),'throw new Error("optional learning unavailable");\n');
  fs.writeFileSync(path.join(root,'scripts/build-learning-ledger.mjs'),'throw new Error("optional report unavailable");\n');
  const changed=auditValueRelease({repoRoot:root,engineSha:A,recordedAt:WHEN,evidence:{OBSERVATION_RELEASE:'DEGRADED',LEARNING_REPORT:'PARTIAL'}});
  assert.deepEqual(changed.gates,baseline.gates);assert.deepEqual(changed.unresolved_core_blockers,baseline.unresolved_core_blockers);
  assert.equal(compareValueReleaseBindings(before,changed.inventory).result,'PASS');
  assert.equal(baseline.OBSERVATION_RELEASE,'OFF');assert.equal(baseline.LEARNING_REPORT,'UNAVAILABLE');
  // The existing I06 qualified-product/noninterference tests additionally prove
  // successful compile, exact reader bytes and terminal results with all B off.
});

test('I07-T03 code audit cannot replace current image proof, protected approval, actual runtime or completed CI',()=>{
  const result=auditValueRelease({repoRoot:ROOT,engineSha:A,recordedAt:WHEN,evidence:{CORE_RELEASE_READY:'PASS',image_activation:'PASS',image_runtime:{result:'PASS'}}});
  assert.equal(result.audit_result,'RECORDED');assert.equal(result.CORE_RELEASE_READY,'FAIL');assert.equal(result.exact_head_ci,null);
  for(const id of ['IMMUTABLE_ENGINE_IDENTITY','EXPLICIT_PROTECTED_ACTIVATION_APPROVAL','EXISTING_IMAGE_RUNTIME_READINESS_HANDOFF','COMPLETED_EXACT_HEAD_CI','APPROVED_ISOLATED_LIVE_ROUTES_AND_BYTES'])assert.equal(gate(result,id).result,'PENDING_OR_FAIL');
  assert.equal(result.release_authority,false);assert.equal(result.activation_performed,false);assert.equal(result.edition_launched,false);assert.equal(result.schedules_changed,false);
});

test('I07-T03 real capability may be idle before edition allocation; an armed wrong target cannot satisfy it',t=>{
  const f=makeD1QualificationFixture({root:temp(t)});
  applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  const activation=validateD1Activation({repoRoot:f.root}),readback=schedule();
  readback.tasks.push({id:IMAGE_TASK_ID,is_enabled:true,next_run_time:VALUE_TARGET.intended_run_start_utc,prompt_sha256:'d'.repeat(64),
    immutable_release_commit_in_prompt:A,bound_normal_edition_or_proof_target:'TEST_ONLY-other-edition'});
  const task=compareValueSchedule(readback,A).image_task_readback[0];
  const image_runtime={task_id:IMAGE_TASK_ID,engine_sha:A,proof_sha256:canonicalSha(activation.proof),result:'PASS',scope:'EXISTING_READINESS_HANDOFF_CAPABILITY',
    mode:'QUALIFICATION_TARGET_ARMED',capability_available:true,work_scope:'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST',owner_transfer_required:false,local_computer_required:false,
    complete_runtime_sha256:f.evidence.runtime.sha256,resume_proof_sha256:f.evidence.resume.sha256,
    handoff_sha256:'e'.repeat(64),task_readback_sha256:canonicalSha(task),ready_at:'2026-10-08T23:15:00Z',armed_for:task.next_run_time,
    observed_at:WHEN,evidence_ref:REF,prompt_sha256:task.prompt_sha256,target_id:'TEST_ONLY-other-edition'};
  const result=auditValueRelease({repoRoot:f.root,engineSha:A,scheduleReadback:readback,recordedAt:WHEN,evidence:{image_runtime}});
  assert.equal(gate(result,'COMPLETE_CURRENT_IMAGE_PROOF_AND_ACTIVATION').result,'PASS','synthetic validator fixture only');
  assert.equal(gate(result,'EXISTING_IMAGE_RUNTIME_READINESS_HANDOFF').result,'PENDING_OR_FAIL');
  Object.assign(readback.tasks[1],{is_enabled:false,next_run_time:null,bound_normal_edition_or_proof_target:null,immutable_release_commit_in_prompt:null});
  const paused=compareValueSchedule(readback,A).image_task_readback[0];
  Object.assign(image_runtime,{mode:'AVAILABLE_IDLE',target_id:null,armed_for:null,task_readback_sha256:canonicalSha(paused)});
  const idle=auditValueRelease({repoRoot:f.root,engineSha:A,scheduleReadback:readback,recordedAt:WHEN,evidence:{image_runtime}});
  assert.equal(gate(idle,'EXISTING_IMAGE_RUNTIME_READINESS_HANDOFF').result,'PASS','synthetic full-proof capability test; no future handoff is allocated');
  assert.equal(idle.edition_launched,false);assert.equal(idle.schedules_changed,false);
});

test('I07-T04 sufficient current role coverage remains PARTIAL and cannot grant selected media admission',()=>{
  const context=readSourceSnapshot(ROOT),summary=qualifiedDiscoverySummary(context);
  assert.equal(summary.resource_count,169);assert.equal(summary.qualified_resources,16);assert.equal(summary.SOURCE_ROLLOUT,'PARTIAL');
  assert.equal(summary.role_counts.video,1);assert.deepEqual(summary.missing_required_roles,[]);assert.equal(summary.sufficient_discovery_routes,true);
  assert.equal(summary.selected_item_admission,'NOT_RUN');
  // These negative role-summary mutants are never written or passed off as
  // validated source snapshots. Catalogue membership alone cannot supply video.
  for(const mutation of [resource=>resource.enabled=false,resource=>Object.assign(resource.discovery,{qualification_status:'pending',unattended_eligible:false})]){
    const fixture=structuredClone(context);
    for(const resource of fixture.registry.resources){
      const roles=[...(resource.content_types||[]),...(resource.catalogue?.memberships||[]).map(row=>row.layer_role)];
      if(roles.includes('video')&&resource.discovery?.qualification_status==='qualified')mutation(resource);
    }
    const insufficient=qualifiedDiscoverySummary(fixture);
    assert.equal(insufficient.role_counts.video,0);assert.deepEqual(insufficient.missing_required_roles,['video']);
    assert.equal(insufficient.sufficient_discovery_routes,false);assert.equal(insufficient.SOURCE_ROLLOUT,'PARTIAL');assert.equal(insufficient.selected_item_admission,'NOT_RUN');
  }
});

test('I07-T05 fixed October 8 Central start crosses UTC date once; recurrence does not fill an unknown next run',()=>{
  assert.equal(new Date(VALUE_TARGET.intended_run_start).toISOString(),'2026-10-09T03:15:00.000Z');
  const record=schedule(),unknown=compareValueSchedule(record,A);
  assert.equal(unknown.recurrence_result,'PASS');assert.equal(unknown.next_run_time,null);assert.equal(unknown.next_occurrence_result,'UNKNOWN');
  assert.equal(unknown.immutable_release_binding,'NOT_ESTABLISHED');
  record.tasks[0].next_run_time=VALUE_TARGET.intended_run_start_utc;
  assert.equal(compareValueSchedule(record,A).next_occurrence_result,'PASS');
  record.tasks[0].next_run_time='2026-10-10T00:15:00Z';
  assert.equal(compareValueSchedule(record,A).next_occurrence_result,'FAIL');
  for(const altered of [record=>record.tasks[0].schedule=record.tasks[0].schedule.replace('20261008','20261009'),
    record=>record.tasks[0].schedule=record.tasks[0].schedule.replace('T221500','T191500').replace('BYHOUR=22','BYHOUR=19'),
    record=>record.tasks[0].schedule+='\nDTSTART;TZID=America/Chicago:20261008T221500',record=>record.tasks[0].schedule+='\nEXDATE:20261009T001500Z',
    record=>record.tasks.push(structuredClone(record.tasks[0])),record=>record.tasks[0].schedule=record.tasks[0].schedule.replace('BYSECOND=0','BYSECOND=0;COUNT=1')]){
    const fixture=schedule();altered(fixture);assert.equal(compareValueSchedule(fixture,A).recurrence_result,'FAIL');
  }
});

test('I07-T05 verified daily configuration accepts unknown next-run metadata without waiving release or capability gates',()=>{
  const readback=schedule();
  const result=auditValueRelease({repoRoot:ROOT,engineSha:A,recordedAt:WHEN,scheduleReadback:readback});
  const configured=gate(result,'ACTUAL_TARGET_SCHEDULE');
  assert.equal(configured.result,'PASS');assert.equal(configured.detail.next_run_time,null);assert.equal(configured.detail.next_occurrence_result,'UNKNOWN');
  assert.equal(gate(result,'SCHEDULE_IMMUTABLE_ENGINE_BINDING').result,'PENDING_OR_FAIL');
  assert.equal(gate(result,'EXPLICIT_PROTECTED_ACTIVATION_APPROVAL').result,'PENDING_OR_FAIL');
  assert.equal(gate(result,'EXISTING_IMAGE_RUNTIME_READINESS_HANDOFF').result,'PENDING_OR_FAIL');
  assert.equal(result.CORE_RELEASE_READY,'FAIL');assert.equal(result.schedules_changed,false);assert.equal(result.edition_launched,false);
  for(const mutate of [record=>record.tasks[0].id='TEST_ONLY-wrong-task',record=>record.tasks[0].is_enabled=false,
    record=>record.tasks[0].default_timezone='Etc/UTC',record=>record.tasks[0].schedule=record.tasks[0].schedule.replace('BYHOUR=22','BYHOUR=20'),
    record=>record.tasks[0].next_run_time='2026-10-10T00:15:00Z',record=>record.tasks[0].next_run_time='invalid']){
    const wrong=schedule();mutate(wrong);
    const rejected=auditValueRelease({repoRoot:ROOT,engineSha:A,recordedAt:WHEN,scheduleReadback:wrong});
    assert.equal(gate(rejected,'ACTUAL_TARGET_SCHEDULE').result,'PENDING_OR_FAIL');
  }
});

test('I07-T06 live root, replay claims and PASS-only summaries cannot satisfy an isolated exact-byte delivery proof',()=>{
  const record={engine_sha:A,result:'PASS',scope:'APPROVED_ISOLATED_NON_PRODUCTION',scope_approval_ref:REF,evidence_ref:REF,
    verification_receipt_sha256:'a'.repeat(64),verified_at:WHEN,method:'ACTUAL_HTTP_READBACK',public_reader_unchanged:true,legacy_repository_unchanged:true,
    base_url:'https://gttome.github.io/Daily-AI-Brief-Compiler/'};
  assert.equal(inspectIsolatedValueEvidence({repoRoot:ROOT,engineSha:A,record}).result,'FAIL');
  record.base_url='https://TEST_ONLY.example.invalid/isolated/';
  assert.deepEqual(inspectIsolatedValueEvidence({repoRoot:ROOT,engineSha:A,record}).errors,['isolated_live_product_records_missing']);
  record.method='REPLAYED_HTTP_RESPONSES';
  assert.equal(inspectIsolatedValueEvidence({repoRoot:ROOT,engineSha:A,record}).result,'FAIL');
  // Existing release-integrity/correction tests and the exact-head Jekyll CI
  // exercise positive route/byte checks. No isolated host is claimed here.
});

test('I07-T06 old internally consistent build receipts cannot be relabeled with the current engine',()=>{
  const old=valueReleaseInventory({repoRoot:ROOT,engineSha:A}),current=valueReleaseInventory({repoRoot:ROOT,engineSha:B});
  const proof=Object.fromEntries(['compile','sourceVerify','built','live','history','manifest'].map(name=>[name,{TEST_ONLY:name,result:'PASS'}]));
  const provenance={schema_version:'daily-compiler-value-build-provenance-v1',engine_sha:A,check_url:completedCI(A).check_url,
    checkout:{head_sha:A,tracked_files_clean:true},inventory:old,product_receipt_sha256:Object.fromEntries(Object.entries(proof).map(([name,value])=>[name,canonicalSha(value)]))};
  assert.equal(checkValueBuildProvenance(provenance,old,proof).result,'PASS','binding-shape fixture only, not complete delivery proof');
  provenance.engine_sha=B;provenance.checkout.head_sha=B;
  assert.equal(checkValueBuildProvenance(provenance,current,proof).result,'FAIL');
  provenance.inventory=current;proof.built.changed_bytes='TEST_ONLY mutation';
  assert.ok(checkValueBuildProvenance(provenance,current,proof).errors.includes('isolated_live_build_receipt_binding:built'));
});

test('I07-T07 a frozen old head and its successful CI cannot certify a new head; bare hashes are not a freeze event',t=>{
  const root=copyInputs(t),before=valueReleaseInventory({repoRoot:root,engineSha:A});
  const frozen={status:'FROZEN',CORE_RELEASE_READY:'PASS',frozen_at:'2026-10-08T23:15:00Z',evidence_ref:REF,inventory:before};
  fs.appendFileSync(path.join(root,'compiler/compile.mjs'),'\n// TEST_ONLY authorized-critical-change fixture\n');
  const stale=auditValueRelease({repoRoot:root,engineSha:B,engineBinding:binding(B),recordedAt:WHEN,frozen,evidence:{exact_head_ci:completedCI(A)}});
  assert.equal(stale.freeze.status,'INVALIDATED_REQUALIFICATION_REQUIRED');assert.equal(gate(stale,'COMPLETED_EXACT_HEAD_CI').result,'PENDING_OR_FAIL');
  assert.equal(stale.CORE_RELEASE_READY,'FAIL');
  const bare=auditValueRelease({repoRoot:root,engineSha:B,recordedAt:WHEN,frozen:stale.inventory});
  assert.equal(bare.freeze.status,'INVALID_FREEZE_RECORD');
  const rebound={...frozen,inventory:stale.inventory,evidence_ref:REF.replace(A,B),frozen_at:'2026-10-08T23:19:00Z'};
  const rechecked=auditValueRelease({repoRoot:root,engineSha:B,engineBinding:binding(B),recordedAt:WHEN,frozen:rebound,evidence:{exact_head_ci:completedCI(B)}});
  assert.equal(gate(rechecked,'COMPLETED_EXACT_HEAD_CI').result,'PASS');assert.equal(gate(rechecked,'FROZEN_RELEASE_IDENTITY').result,'PASS');
  assert.equal(rechecked.CORE_RELEASE_READY,'FAIL','new deterministic bindings do not waive outstanding real image/live/scheduler gates');
});

test('completed CI requires the candidate, actual Actions app and check URL, not an arbitrary green repository link',()=>{
  for(const changed of [ci=>ci.status='in_progress',ci=>ci.check_url=REF,ci=>ci.app_id=1,ci=>ci.head_sha=B]){
    const ci=completedCI(A);changed(ci);
    const result=auditValueRelease({repoRoot:ROOT,engineSha:A,recordedAt:WHEN,evidence:{exact_head_ci:ci}});
    assert.equal(gate(result,'COMPLETED_EXACT_HEAD_CI').result,'PENDING_OR_FAIL');
  }
});

test('audit CLI independently binds a real checkout and refuses an arbitrary supplied SHA',t=>{
  const root=temp(t),out=path.join(temp(t),'audit.json'),cli=path.join(ROOT,'scripts/audit-value-release.mjs');
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','--quiet');fs.writeFileSync(path.join(root,'TEST_ONLY.txt'),'temporary checkout identity test\n');git('add','TEST_ONLY.txt');
  git('-c','user.name=TEST_ONLY','-c','user.email=TEST_ONLY@example.invalid','commit','--quiet','--no-gpg-sign','-m','TEST_ONLY checkout');
  const head=git('rev-parse','HEAD');
  const run=sha=>execFileSync(process.execPath,[cli,'--root',root,'--engine-sha',sha,'--out',out],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,GITHUB_ACTIONS:'false'}});
  assert.throws(()=>run(A),/value_release_checkout_engine_mismatch_or_tracked_changes/);
  assert.equal(fs.existsSync(out),false);
  const summary=JSON.parse(run(head)),record=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(summary.audit_result,'RECORDED');assert.equal(summary.CORE_RELEASE_READY,'FAIL');assert.equal(record.exact_head_ci,null);
  assert.deepEqual(record.engine_binding,binding(head));
  fs.appendFileSync(path.join(root,'TEST_ONLY.txt'),'changed tracked file\n');
  assert.throws(()=>run(head),/value_release_checkout_engine_mismatch_or_tracked_changes/);
});
