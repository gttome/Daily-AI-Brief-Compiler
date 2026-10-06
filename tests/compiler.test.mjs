import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateEdition, compileShadow, gitBlobSha, sha256 } from '../compiler/compile.mjs';

test('complete fixture validates exact editorial and image identities', () => {
  const result=validateEdition({
    statePath:'fixtures/complete-edition/compiler-state.json',
    bundlePath:'fixtures/complete-edition/edition-bundle.json',
    repoRoot:'.'
  });
  assert.equal(result.bundle.stories.length,6);
  assert.equal(result.bundle.stories.filter(s=>s.agent_skills).length,1);
  assert.equal(result.imageEvidence.length,6);
});

test('accepted image bytes match declared SHA-256 and Git blob identity', () => {
  const bytes=fs.readFileSync('fixtures/complete-edition/images/story-01.png');
  assert.equal(sha256(bytes),'9d666097651900f7d59a18ed2c0d497e0953e3341908529e546deb552bba2af2');
  assert.equal(gitBlobSha(bytes),'15234acc5dcd0dec8757f08a309cfad56091e3de');
});

test('fixture compiles to verified reader-shaped site without ChatGPT after BUNDLE_READY', () => {
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-'));
  const receipt=compileShadow({
    statePath:'fixtures/complete-edition/compiler-state.json',
    bundlePath:'fixtures/complete-edition/edition-bundle.json',
    outDir:out,
    repoRoot:'.'
  });
  assert.equal(receipt.result,'PASS');
  assert.equal(receipt.chatgpt_required_after_bundle_ready,false);
  assert.equal(receipt.verification.permanent_story_pages,6);
  assert.ok(fs.existsSync(path.join(out,'briefs','2026-10-06','index.html')));
});

test('production repository mutation target is rejected', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-negative-'));
  const bundle=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
  bundle.producer_receipt.forbidden_target='https://github.com/gttome/Daily-AI-Brief/';
  const bundlePath=path.join(dir,'edition-bundle.json');
  fs.writeFileSync(bundlePath,JSON.stringify(bundle,null,2)+'\n');
  const state=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
  state.bundle.digest=sha256(fs.readFileSync(bundlePath));
  const statePath=path.join(dir,'compiler-state.json');
  fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  assert.throws(()=>validateEdition({statePath,bundlePath,repoRoot:'.'}),/production repository mutation target forbidden/);
});
