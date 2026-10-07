import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateResourceRegistry} from '../operations/resources.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));

test('Compiler resource registry is seeded, extensible, and valid',()=>{
  assert.deepEqual(validateResourceRegistry(registry),[]);
  assert.ok(registry.resources.length>=50);
  assert.equal(new Set(registry.resources.map(x=>x.resource_id)).size,registry.resources.length);
  assert.ok(registry.resources.some(x=>x.content_types.includes('article')));
  assert.ok(registry.resources.some(x=>x.content_types.includes('video')));
  assert.ok(registry.resources.some(x=>x.content_types.includes('podcast')));
  assert.ok(registry.resources.some(x=>x.content_types.includes('watchlist')));
});

test('resource registry includes the migrated podcast portfolio and official first-party sources',()=>{
  const ids=new Set(registry.resources.map(x=>x.resource_id));
  for(const id of ['podcast-ai-daily-brief','podcast-everyday-ai','podcast-artificial-intelligence-show','podcast-ai-for-humans','podcast-practical-ai','podcast-latent-space','podcast-twiml']){
    assert.ok(ids.has(id),id);
  }
  assert.ok(registry.resources.some(x=>x.url.includes('openai.com')));
  assert.ok(registry.resources.some(x=>x.url.includes('anthropic.com')));
  assert.ok(registry.resources.some(x=>x.url.includes('deepmind.google')));
});

test('imported resource health begins unknown rather than pretending old production checks are current',()=>{
  assert.ok(registry.resources.every(x=>x.health.status==='unknown'));
  assert.ok(registry.resources.every(x=>x.health.last_checked_at===null));
});
