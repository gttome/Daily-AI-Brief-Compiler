import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeDiscoveryResources,validateResourceRegistry} from '../operations/resources.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const newSources=registry.resources.filter(r=>r.resource_id.startsWith('research-20261026-'));
const oldSources=registry.resources.slice(0,69); // immutable original baseline; later import waves append
const enabled=['research-20261026-a01','research-20261026-a04',
  'research-20261026-a12','research-20261026-p03'];

test('source expansion retains every legacy resource and current v1 schema',()=>{
  assert.deepEqual(validateResourceRegistry(registry),[]);
  assert.equal(registry.schema_version,'daily-compiler-resource-registry-v1');
  assert.equal(oldSources.length,69);
  assert.equal(oldSources.filter(r=>r.enabled).length,69);
  assert.ok(registry.resources.length>=97);
  assert.equal(new Set(registry.resources.map(r=>r.resource_id)).size,registry.resources.length);
  for(const type of ['article','video','podcast']){
    const expected={article:33,video:3,podcast:17}[type];
    assert.equal(oldSources.filter(r=>r.content_types.includes(type)).length,expected);
  }
});

test('exact 28 new leads: 14 articles, 7 videos, 7 podcasts with four admitted discovery routes',()=>{
  assert.equal(newSources.length,28);
  const expected=[...Array.from({length:14},(_,i)=>'a'+String(i+1).padStart(2,'0')),
    ...Array.from({length:7},(_,i)=>'v'+String(i+1).padStart(2,'0')),
    ...Array.from({length:7},(_,i)=>'p'+String(i+1).padStart(2,'0'))]
    .map(x=>'research-20261026-'+x).sort();
  assert.deepEqual(newSources.map(x=>x.resource_id).sort(),expected);
  assert.deepEqual(newSources.filter(x=>x.enabled).map(x=>x.resource_id).sort(),enabled.slice().sort());
  assert.deepEqual(['article','video','podcast'].map(type=>
    newSources.filter(r=>r.content_types.includes(type)).length),[14,7,7]);
  assert.ok(newSources.every(r=>r.content_types.length===1));
  assert.ok(newSources.every(r=>r.health.status==='unknown' &&
    r.health.last_checked_at===null && r.health.last_success_at===null &&
    r.health.observed_yield_rate===null && r.health.freshness_hit_rate===null));
});

test('new source URLs unique without squashing different original publisher routes',()=>{
  const canon=u=>u.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/+$/,'');
  const routes=registry.resources.map(r=>canon(r.url));
  assert.equal(new Set(routes).size,routes.length);
  for(const r of newSources){
    assert.match(r.url,/^https:\/\//);
    assert.equal(r.endpoint,r.url);
    assert.ok(r.notes.length>=40);
  }
});

test('EDITORIAL ingress admits qualified sources with exact ID and excludes disabled leads',()=>{
  for(const type of ['article','video','podcast']){
    const visible=activeDiscoveryResources(registry,type);
    const expectedLegacy={article:33,video:3,podcast:17}[type];
    const expectedNew={article:3,video:0,podcast:1}[type];
    const firstWave=visible.filter(r=>!r.resource_id.startsWith('deep-20261026-') &&
      !r.resource_id.startsWith('directory-') &&
      !r.resource_id.startsWith('universe-20261026-'));
    assert.equal(firstWave.length,expectedLegacy+expectedNew);
    assert.ok(visible.every(r=>r.enabled && r.content_types.includes(type)));
    for(const row of visible.filter(r=>r.resource_id.startsWith('research-20261026-'))){
      assert.ok(enabled.includes(row.resource_id));
      assert.equal(registry.resources.find(r=>r.resource_id===row.resource_id).url,row.url);
      assert.match(row.notes,/DISCOVERY ONLY/);
    }
  }
  assert.ok(!activeDiscoveryResources(registry,'video')
    .some(r=>r.resource_id.startsWith('research-20261026-')));
  assert.throws(()=>activeDiscoveryResources(registry,'watchlist'),/unsupported_discovery_content_type/);
});

test('registry consumer is deterministic read-only and producer must enforce enabled-only',()=>{
  const before=JSON.stringify(registry);
  const a=JSON.stringify(activeDiscoveryResources(registry,'article'));
  const b=JSON.stringify(activeDiscoveryResources(registry,'article'));
  assert.equal(a,b);
  assert.equal(JSON.stringify(registry),before);
  const producer=fs.readFileSync('docs/SEMANTIC-PRODUCER-CONTRACT.md','utf8');
  assert.match(producer,/config\/resource-registry\.json/);
  assert.match(producer,/enabled === true/);
  assert.match(producer,/resource_id/);
  assert.match(producer,/enabled:false/);
  assert.match(producer,/not.*including that candidate in the edition/i);
});

test('negative qualification: listed video or podcast is not an accepted item',()=>{
  assert.equal(newSources.filter(x=>x.content_types.includes('video')&&x.enabled).length,0);
  assert.equal(newSources.filter(x=>x.content_types.includes('podcast')&&x.enabled).length,1);
  assert.match(newSources.find(x=>x.resource_id==='research-20261026-p03').notes,/NOT independently verified full-audio playback/);
  assert.match(newSources.find(x=>x.resource_id==='research-20261026-v01').notes,/NOT exact playable dated videos/);
});
