import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('readiness requires actual immutable bundle bytes, identity and saved digest',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-ready-'));
  try{
    const date='2026-10-07';
    const stateDir=path.join(root,'shadow-runs',date);
    fs.mkdirSync(stateDir,{recursive:true});
    const bundlePath=path.join(stateDir,'edition-bundle.json');
    const bytes=JSON.stringify({edition_date:date,stories:[]});
    fs.writeFileSync(bundlePath,bytes);
    const digest=crypto.createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(path.join(stateDir,'compiler-state.json'),JSON.stringify({
      state:'BUNDLE_READY',stage:'BUNDLE',bundle:{status:'BUNDLE_READY',digest}
    },null,2));

    const check=()=>execFileSync(process.execPath,[
      path.join(repoRoot,'scripts/check-current-shadow-ready.mjs'),
      'shadow/'+date,root
    ],{encoding:'utf8'});
    const output=check();
    assert.match(output,/^ready=true$/m);
    assert.ok(output.includes('bundle_digest='+digest));

    fs.appendFileSync(bundlePath,' ');
    assert.match(check(),/^ready=false$/m);
    fs.writeFileSync(bundlePath,bytes);
    fs.writeFileSync(bundlePath,JSON.stringify({edition_date:'2026-10-08',stories:[]}));
    assert.match(check(),/^ready=false$/m);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
