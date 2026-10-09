import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('D1 v5 readiness covers Work browser path and six-image rehearsal',()=>{
  const m=read('contracts/d1-implementation-readiness.json');
  assert.equal(m.schema_version,'daily-compiler-d1-implementation-readiness-v2');
  for(const p of ['contracts/d1-work-browser-prompt.txt','docs/D1-WORK-BROWSER-SIX-IMAGE-REHEARSAL.md','rehearsals/d1-six-image-browser-r1/plan.json']) assert.ok(m.required_files.includes(p),p);
  assert.equal(m.implementation_invariants.work_scope,'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST');
  assert.equal(m.implementation_invariants.dot_required_for_image_path,false);
});

test('readiness is implementation PASS but activation remains gated on full six-image proof',()=>{
  const raw=execFileSync(process.execPath,['scripts/check-d1-implementation-readiness.mjs','.'],{encoding:'utf8'});const r=JSON.parse(raw);
  assert.equal(r.result,'PASS',r.errors.join(','));assert.equal(r.implementation_complete,true);assert.equal(r.activation_ready,false);
  assert.equal(r.activation_status,'proof_required');assert.equal(r.work_scope,'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST');
  assert.equal(r.image_path_owner,'work_cloud_browser');
  assert.equal(r.external_blocker,'D1_V5_FULL_SIX_IMAGE_BROWSER_REHEARSAL_NOT_YET_PROVEN');
});
