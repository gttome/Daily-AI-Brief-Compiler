import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateEdition, compileShadow, gitBlobSha, sha256 } from '../compiler/compile.mjs';
import {canonicalWatchTopicId} from '../compiler/reader-adapter.mjs';

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

test('fixture compiles to canonical reader source without ChatGPT after BUNDLE_READY', async () => {
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-'));
  const receipt=await compileShadow({
    statePath:'fixtures/complete-edition/compiler-state.json',
    bundlePath:'fixtures/complete-edition/edition-bundle.json',
    outDir:out,
    repoRoot:'.'
  });
  assert.equal(receipt.result,'PASS');
  assert.equal(receipt.chatgpt_required_after_bundle_ready,false);
  assert.equal(receipt.reader_parity_gate.result,'PASS');
  assert.equal(receipt.verification.permanent_story_pages,6);
  assert.equal(receipt.verification.reader_contract.canonical_production_renderer,true);
  assert.equal(receipt.verification.reader_contract.watchlist,true);
  assert.equal(receipt.verification.reader_contract.ratings,true);
  assert.equal(receipt.verification.reader_contract.share,true);
  assert.equal(receipt.verification.reader_contract.subscriptions,true);
  for(const p of [
    'index.md',
    'archive.md',
    'feed.json',
    'briefs/2026-10-06.md',
    'watchlist/index.md',
    'watchlist/research/index.md',
    'stories/2026-10-06/fixture-story-01.md'
  ]) assert.ok(fs.existsSync(path.join(out,p)),p+' missing');

  const edition=fs.readFileSync(path.join(out,'briefs','2026-10-06.md'),'utf8');
  assert.match(edition,/Emerging AI Watchlist/);
  assert.match(edition,/How useful was this/);
  assert.match(edition,/Open the permanent story page/);
  assert.doesNotMatch(edition,/Original Commentary|What do stars mean/);

  const editionData=JSON.parse(fs.readFileSync(path.join(out,'_data','editions','2026-10-06.json'),'utf8'));
  assert.deepEqual(editionData.stories.map(story=>story.story_id),[
    'dab-story-2026-10-06-m01',
    'dab-story-2026-10-06-m02',
    'dab-story-2026-10-06-m10',
    'dab-story-2026-10-06-m11',
    'dab-story-2026-10-06-m12',
    'dab-story-2026-10-06-m14'
  ]);
  assert.deepEqual(editionData.stories.map(story=>path.basename(story.image.path)),[
    'dab-edition-2026-10-06-m01.png',
    'dab-edition-2026-10-06-m02.png',
    'dab-edition-2026-10-06-m10.png',
    'dab-edition-2026-10-06-m11.png',
    'dab-edition-2026-10-06-m12.png',
    'dab-edition-2026-10-06-m14.png'
  ]);
  const watchlist=JSON.parse(fs.readFileSync(path.join(out,'data','watchlist.json'),'utf8'));
  assert.ok(watchlist.topics.length>=20);
  assert.ok(watchlist.topics.every(topic=>!topic.topic_id.startsWith('dab-topic-compiler-')));
  assert.ok(watchlist.topics.every(topic=>topic.topic_id.length<=64));
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

test('reader contract rejects lossy bundles that omit permanent-page metadata', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-lossy-'));
  const bundle=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
  delete bundle.stories[0].image_alt_intent;
  const bundlePath=path.join(dir,'edition-bundle.json');
  fs.writeFileSync(bundlePath,JSON.stringify(bundle,null,2)+'\n');
  const state=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
  state.bundle.digest=sha256(fs.readFileSync(bundlePath));
  const statePath=path.join(dir,'compiler-state.json');
  fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  assert.throws(()=>validateEdition({statePath,bundlePath,repoRoot:'.'}),/story field missing: image_alt_intent/);
});

test('verified semantic bundle may be deterministically rebuilt without semantic replay', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daily-compiler-verified-'));
  const bundleText=fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8');
  const bundlePath=path.join(dir,'edition-bundle.json');
  fs.writeFileSync(bundlePath,bundleText);
  const state=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
  state.state='SHADOW_VERIFIED';
  state.stage='VERIFY';
  state.bundle.digest=sha256(Buffer.from(bundleText));
  const statePath=path.join(dir,'compiler-state.json');
  fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  const result=validateEdition({statePath,bundlePath,repoRoot:'.'});
  assert.equal(result.state.state,'SHADOW_VERIFIED');
});

test('Watchlist concept aliases preserve canonical topic identities',()=>{
  assert.equal(canonicalWatchTopicId({topic:'Enterprise context becomes the agent battleground'}),'dab-topic-trusted-enterprise-context');
  assert.equal(canonicalWatchTopicId({topic:'Persistent personal agents'}),'dab-topic-long-horizon-agents');
  assert.equal(canonicalWatchTopicId({topic:'Reusable Agent Skills'}),'dab-topic-agent-skills-observability');
  assert.equal(canonicalWatchTopicId({topic:'Agent governance and review points'}),'dab-topic-adaptive-agent-safeguards');
  assert.equal(canonicalWatchTopicId({topic:'Inference latency as agent UX'}),'dab-topic-agentic-edge-inference');
});
