import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCompilerReadiness,normalizeReadinessReceipt,REQUIRED_PRIMARY,C5_VERSION} from '../compiler/admission/release-readiness.mjs';
const good={
 target_edition:'2026-10-11',
 task:{authority:'live_chatgpt_automation',id:REQUIRED_PRIMARY,is_enabled:true,
  timezone:'America/Chicago',rrule:'FREQ=DAILY;BYHOUR=19;BYMINUTE=15;BYSECOND=0',
  target_rule:'NEXT_LOCAL_CALENDAR_DAY'},
 scheduler:{exactly_one_enabled_primary:true,legacy_tasks_disabled:true},
 same_date_guard:{authority:'live_repo_branch_readback',target_edition:'2026-10-11',unique:true},
 c2:{status:'PASS',authority:'first_party_scheduled_runtime',task_id:REQUIRED_PRIMARY,
  invocation_id:'sample-invocation-42',evidence_id:'platform-evidence-42',
  mode:'ordinary_chat',work_used:false,codex_used:false},
 c3:{status:'PASS',authority:'scheduled_same_context_github_readback',task_id:REQUIRED_PRIMARY,
  invocation_id:'sample-invocation-42',evidence_id:'github-readback-42',
  blob_sha:'a'.repeat(40),sha256:'b'.repeat(64),proof_branch:'proof/compiler-c3-rehearsal'},
 github:{main_sha:'c'.repeat(40),protected_main:true,exact_head_ci:'PASS',
  ci_commit_sha:'c'.repeat(40),publisher_workflows_preserved:true},
 history:{authority:'postdeploy_live_hash_readback',status:'PASS',oct8_protected_count:17,
  pages_history_sha:'d'.repeat(40),last_public_edition_verified:true}
};
test('C5: independent synthetic full-gate fixture is PRE_RUN_GO only',()=>{
 assert.equal(evaluateCompilerReadiness(good).status,'PRE_RUN_GO');
 assert.equal(evaluateCompilerReadiness(good).publication_status,'NOT_PROVEN_BY_PRE_RUN_ADMISSION');
});
test('C5: actual initial observed situation no C2/C3 live evidence stays NO_GO',()=>{
 const r=evaluateCompilerReadiness({...good,c2:{status:'UNPROVEN'},c3:{status:'UNPROVEN'}});
 assert.equal(r.status,'UNATTENDED_NO_GO');
 assert.ok(r.blockers.includes('C2_ORDINARY_SCHEDULED_MODE_UNPROVEN'));
 assert.ok(r.blockers.includes('C3_SAME_CONTEXT_GITHUB_WRITE_UNPROVEN'));
});
test('C5: C1 reversed disabled means NO_GO, even if everything else is intact',()=>{
 const r=evaluateCompilerReadiness({...good,task:{...good.task,is_enabled:false}});
 assert.equal(r.status,'UNATTENDED_NO_GO');
});
test('C5: C2/C3 different invocation, exact-head mismatch, missing oct8 protects fail closed',()=>{
 const x=evaluateCompilerReadiness({...good,
  c3:{...good.c3,invocation_id:'different-invocation'},
  github:{...good.github,ci_commit_sha:'e'.repeat(40)},
  history:{...good.history,oct8_protected_count:16}});
 assert.equal(x.status,'UNATTENDED_NO_GO');assert.ok(x.blockers.length>=3);
});
test('C5: versioned OFF selector forbids falsely green fallback',()=>{
 assert.equal(evaluateCompilerReadiness(good,{selector:'off'}).status,'UNATTENDED_NO_GO');
});
test('C5: reads historical older readiness receipts without replaying verdict as PASS',()=>{
 const old=normalizeReadinessReceipt({schema_version:'compiler-readiness-proposed-v1',status:'GO'});
 assert.equal(old.status,'UNATTENDED_NO_GO');assert.equal(old.record_kind,'LEGACY_READ_COMPATIBLE');
 const now=normalizeReadinessReceipt(evaluateCompilerReadiness(good));
 assert.equal(now.status,'PRE_RUN_GO');assert.equal(now.schema_version,C5_VERSION);
});
test('C5: unknown receipt versions and empty input fail closed',()=>{
 assert.equal(normalizeReadinessReceipt({schema_version:'unknown',status:'GO'}).status,'UNATTENDED_NO_GO');
 assert.equal(evaluateCompilerReadiness().status,'UNATTENDED_NO_GO');
});
