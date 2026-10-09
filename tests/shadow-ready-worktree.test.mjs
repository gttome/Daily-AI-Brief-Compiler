import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('readiness checker reads BUNDLE_READY state from the supplied shadow worktree root',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-ready-'));
  const date='2026-10-07';
  const stateDir=path.join(root,'shadow-runs',date);
  fs.mkdirSync(stateDir,{recursive:true});
  const digest='a'.repeat(64);
  fs.writeFileSync(path.join(stateDir,'compiler-state.json'),JSON.stringify({
    state:'BUNDLE_READY',
    stage:'BUNDLE',
    bundle:{status:'BUNDLE_READY',digest}
  },null,2));

  const output=execFileSync(process.execPath,[
    path.join(repoRoot,'scripts/check-current-shadow-ready.mjs'),
    'shadow/'+date,
    root
  ],{encoding:'utf8'});

  assert.match(output,/^ready=true$/m);
  assert.match(output,new RegExp('^bundle_digest='+digest+'$','m'));
});
