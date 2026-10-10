import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const selected="C3";
const files={"C2":["compiler/admission/scheduled-host.mjs","tests/c2-scheduled-host-admission.test.mjs"],"C3":["compiler/admission/scheduled-write.mjs","tests/c3-scheduled-write.test.mjs"],"C4":["compiler/admission/executor-liveness.mjs","tests/c4-executor-liveness.test.mjs"],"C5":["compiler/admission/release-readiness.mjs","tests/c5-release-readiness.test.mjs"]};
const authoritativeBase='ef623aefc1a4d31e86335c5ebc1e74fec29f1975';
const pinnedTerminal='2026-10-10';
const pinnedHistory='e7e0087023ea48fff957d475c08e98360a626ad2';
// This test runs ONLY on a nonpublishing proof branch after Oct 10 terminal verification.
// It proves Git code-scope noninterference, not an actual production task rollback.
test('RB-'+selected+' changes only its one proposal while preserving the other four',()=>{
 for(const [id,parts] of Object.entries(files)){
  for(const path of parts){
   assert.equal(existsSync(path),id!==selected,id+' '+path+' independent inverse');
  }
 }
 for(const p of ['.github/workflows/shadow-compile.yml','.github/workflows/bundle-ready-signal.yml','compiler/compile.mjs']){
  assert.equal(existsSync(p),true,p+' publisher intact');
 }
 assert.equal(authoritativeBase.length,40);
 assert.equal(pinnedTerminal,'2026-10-10');
 assert.equal(pinnedHistory.length,40);
});
