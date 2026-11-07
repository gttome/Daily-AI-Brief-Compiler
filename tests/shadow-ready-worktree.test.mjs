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

test('new claimed seals fail the existing signal step with a precise readiness reason',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-seal-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const date='2026-11-08';
  const dir=path.join(root,'shadow-runs',date);
  fs.mkdirSync(dir,{recursive:true});
  const bytes=JSON.stringify({edition_date:date});
  const bundlePath=path.join(dir,'edition-bundle.json');
  const statePath=path.join(dir,'compiler-state.json');
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
  const state={edition_date:date,state:'BUNDLE_READY',stage:'BUNDLE',bundle:{status:'BUNDLE_READY',digest}};
  const run=()=>execFileSync(process.execPath,[path.join(repoRoot,'scripts/check-current-shadow-ready.mjs'),'shadow/'+date,root],{encoding:'utf8',stdio:'pipe'});
  const write=overrides=>fs.writeFileSync(statePath,JSON.stringify({...state,...overrides}));
  const expectBlocked=reason=>assert.throws(run,error=>error.status===1&&error.stderr.includes('SOURCE_READY_BLOCKED: '+reason));
  write({state:'RESEARCH'});
  assert.equal(run().trim(),'ready=false');
  write({stage:'SEAL'});
  expectBlocked('EXPECTED_BUNDLE_STAGE');
  write({});
  expectBlocked('BUNDLE_MISSING');
  fs.writeFileSync(bundlePath,bytes);
  assert.match(run(),/^ready=true$/m);
  write({edition_date:'2026-11-09'});
  expectBlocked('STATE_EDITION_MISMATCH');
  write({});
  fs.appendFileSync(bundlePath,' ');
  expectBlocked('BUNDLE_DIGEST_MISMATCH');
  write({state:'SHADOW_VERIFIED',stage:'VERIFY'});
  assert.equal(run().trim(),'ready=false');
});
