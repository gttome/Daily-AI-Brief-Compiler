import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('readiness checker reads BUNDLE_READY state from the supplied shadow worktree root',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-ready-'));
  const date='2026-10-07';
  const stateDir=path.join(root,'shadow-runs',date);
  fs.mkdirSync(stateDir,{recursive:true});
  const bytes=JSON.stringify({edition_date:date,stories:[]});
  fs.writeFileSync(path.join(stateDir,'edition-bundle.json'),bytes);
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
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
  assert.match(output,new RegExp('^bundle_digest='+digest+'
});
,'m'));
  fs.appendFileSync(path.join(stateDir,'edition-bundle.json'),' ');
  const tampered=execFileSync(process.execPath,[path.join(repoRoot,'scripts/check-current-shadow-ready.mjs'),'shadow/'+date,root],{encoding:'utf8'});
  assert.match(tampered,/^ready=false$/m);
});
