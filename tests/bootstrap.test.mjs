import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('compiler state has exactly the approved top-level states', () => {
  const schema = JSON.parse(fs.readFileSync('contracts/compiler-state.schema.json', 'utf8'));
  assert.deepEqual(schema.properties.state.enum, [
    'ALLOCATED','PRODUCING','BUNDLE_READY','COMPILING','PREVIEW_READY','SHADOW_VERIFIED','SHADOW_FAILED'
  ]);
});

test('editorial contract preserves the fixed edition allocation', () => {
  const c = JSON.parse(fs.readFileSync('contracts/editorial-contract.json', 'utf8'));
  assert.equal(c.articles.count, 6);
  assert.equal(c.articles.focus_allocation['Technical AI Engineering'], 2);
  assert.equal(c.articles.focus_allocation['Applied Generative AI for Knowledge Workers'], 2);
  assert.equal(c.articles.focus_allocation['Agents for Everyone'], 2);
  assert.equal(c.articles.agent_skills_exactly, 1);
  assert.equal(c.images.count, 6);
});

test('complexity exclusions remain explicit', () => {
  const c = JSON.parse(fs.readFileSync('contracts/editorial-contract.json', 'utf8'));
  assert.ok(c.orchestration_exclusions.includes('Supervisor'));
  assert.ok(c.orchestration_exclusions.includes('Watchdog Ring'));
});
