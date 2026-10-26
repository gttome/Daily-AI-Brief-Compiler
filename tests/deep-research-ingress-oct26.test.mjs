import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeDiscoveryResources,validateResourceRegistry} from '../operations/resources.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const isDeep=r=>r.resource_id.startsWith('deep-20261026-');
const deep=registry.resources.filter(isDeep);
const ids=[
  'deep-20261026-a01-google-research',
  'deep-20261026-a02-microsoft-ai',
  'deep-20261026-a03-nvidia-news',
  'deep-20261026-a04-synced',
  'deep-20261026-p01-lex',
  'deep-20261026-p02-data-skeptic',
  'deep-20261026-p03-talking-machines',
  'deep-20261026-v01-two-minute-papers'
];
const admitted=[
  'deep-20261026-a01-google-research',
  'deep-20261026-a02-microsoft-ai',
  'deep-20261026-a03-nvidia-news',
  'deep-20261026-p02-data-skeptic',
  'deep-20261026-v01-two-minute-papers'
];

test('second-wave source ingress keeps first 97 rows and v1 schema intact',()=>{
  assert.deepEqual(validateResourceRegistry(registry),[]);
  assert.equal(registry.schema_version,'daily-compiler-resource-registry-v1');
  assert.ok(registry.resources.length>=105);
  assert.ok(registry.resources.slice(0,97).every(r=>!isDeep(r)));
  assert.deepEqual(deep.map(r=>r.resource_id).sort(),ids.slice().sort());
  assert.equal(new Set(registry.resources.map(r=>r.resource_id)).size,registry.resources.length);
  const canon=u=>u.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/+$/,'');
  assert.equal(new Set(registry.resources.map(r=>canon(r.url))).size,registry.resources.length);
});

test('13 Deep Research results: 5 existing URLs reused, 8 catalogued, only 5 enabled',()=>{
  const preexisting=['openai-news','deepmind','meta-ai-blog','podcast-twiml','podcast-eye-on-ai'];
  for(const id of preexisting)assert.ok(registry.resources.some(r=>r.resource_id===id&&r.enabled),id);
  assert.equal(deep.length,8);
  assert.deepEqual(deep.filter(r=>r.enabled).map(r=>r.resource_id).sort(),admitted.slice().sort());
  assert.deepEqual(['article','video','podcast'].map(type=>
    deep.filter(r=>r.content_types.includes(type)).length),[4,1,3]);
  assert.ok(deep.every(r=>r.content_types.filter(t=>['article','video','podcast'].includes(t)).length===1&&r.endpoint===r.url&&
    r.health.status==='unknown'&&r.health.last_checked_at===null&&
    r.health.last_success_at===null&&r.health.observed_yield_rate===null));
});

test('read-only editorial source discovery admits only matching enabled roles',()=>{
  const before=JSON.stringify(registry);
  const byRole={
    article:admitted.filter(id=>id.startsWith('deep-20261026-a')),
    video:admitted.filter(id=>id.startsWith('deep-20261026-v')),
    podcast:admitted.filter(id=>id.startsWith('deep-20261026-p'))
  };
  for(const [role,count] of [['article',3],['video',1],['podcast',1]]){
    const visible=activeDiscoveryResources(registry,role);
    assert.deepEqual(visible.filter(isDeep).map(r=>r.resource_id).sort(),byRole[role].slice().sort());
    assert.equal(visible.filter(isDeep).length,count);
    assert.ok(visible.every(r=>r.enabled&&r.content_types.includes(role)));
  }
  assert.equal(JSON.stringify(registry),before);
  assert.deepEqual(activeDiscoveryResources(registry,'video'),activeDiscoveryResources(registry,'video'));
});

test('stale sources stay disabled; discovery does not certify individual items',()=>{
  const get=id=>deep.find(r=>r.resource_id===id);
  for(const id of ['deep-20261026-a04-synced','deep-20261026-p01-lex',
    'deep-20261026-p03-talking-machines']){
    assert.equal(get(id).enabled,false,id);
    assert.match(get(id).notes,/DISABLED/);
  }
  assert.match(get('deep-20261026-a04-synced').notes,/2025-08-14/);
  assert.match(get('deep-20261026-p03-talking-machines').notes,/2021-09-09/);
  assert.match(get('deep-20261026-v01-two-minute-papers').notes,/FULL PLAYBACK WAS NOT VERIFIED/);
  assert.match(get('deep-20261026-p02-data-skeptic').notes,/NOT approved for selection/);
  assert.match(get('deep-20261026-a01-google-research').notes,/SAME Google publishing organization/);
  assert.match(get('deep-20261026-a03-nvidia-news').notes,/NOT a second independent NVIDIA publisher/);
});

test('producer keeps enabled-only candidate ingress and historic editorial gates',()=>{
  const producer=fs.readFileSync('docs/SEMANTIC-PRODUCER-CONTRACT.md','utf8');
  assert.match(producer,/config\/resource-registry\.json/);
  assert.match(producer,/enabled === true/);
  assert.match(producer,/full.playback/i);
  assert.match(producer,/three-previous-published-edition hard program cooldown/);
  assert.match(producer,/24\/72\/168-hour/);
  const note=fs.readFileSync('docs/source-expansion/OCT26_DEEP_RESEARCH_1915_ADMISSION.md','utf8');
  assert.match(note,/AWAITING_NATURAL_CYCLE/);
  assert.match(note,/No new schedules/);
});
