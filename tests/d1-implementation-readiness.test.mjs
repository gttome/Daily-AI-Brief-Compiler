import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('D1 implementation readiness manifest covers cloud pipeline, operations and live schedules',()=>{
  const m=read('contracts/d1-implementation-readiness.json');
  assert.equal(m.schema_version,'daily-compiler-d1-implementation-readiness-v1');
  for(const p of [
    'contracts/d1-image-contract.json','contracts/d1-dot-coordinator-contract.json',
    'contracts/d1-work-porter-contract.json','contracts/d1-transition-schedule-sync.json',
    'observability/events.mjs','operations/resources.mjs','operations/future-brief.mjs',
    'operations/corrections.mjs','operations/learning.mjs','dashboard/snapshot.mjs'
  ]) assert.ok(m.required_files.includes(p),p);
  assert.equal(m.implementation_invariants.archive_required,false);
  assert.equal(m.implementation_invariants.work_scope,'IMAGE_PACKAGE_INGEST');
  assert.equal(m.implementation_invariants.github_visual_rereview_required,false);
});

test('D1 implementation checker passes repository completeness while activation remains proof-gated',()=>{
  const raw=execFileSync(process.execPath,['scripts/check-d1-implementation-readiness.mjs','.'],{encoding:'utf8'});
  const r=JSON.parse(raw);
  assert.equal(r.result,'PASS',r.errors.join(','));
  assert.equal(r.implementation_complete,true);
  assert.equal(r.activation_ready,false);
  assert.equal(r.activation_status,'proof_required');
  assert.equal(r.work_scope,'IMAGE_PACKAGE_INGEST');
  assert.equal(r.dot_cloud_only,true);
  assert.equal(r.live_schedule_sync,'PASS');
  assert.equal(r.external_blocker,'D1_CLOUD_DOT_STUDIO_WORK_HANDOFF_NOT_YET_PROVEN');
});
