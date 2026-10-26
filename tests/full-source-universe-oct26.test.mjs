import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateResourceRegistry,activeDiscoveryResources} from '../operations/resources.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const inventory=JSON.parse(fs.readFileSync(
  'docs/source-expansion/OCT26_FULL_SOURCE_UNIVERSE_RECONCILIATION.json','utf8'));
const baselineIds=inventory.current_baseline_105_ids;
const current=new Map(registry.resources.map(r=>[r.resource_id,r]));
const canon=u=>u.toLowerCase().replace(/^https?:\/\//,'')
  .replace(/^www\./,'').replace(/\/+$/,'');

test('204 historical memberships reconciled to 169 source records without lost rows',()=>{
  assert.equal(inventory.schema_version,'daily-ai-brief-complete-source-universe-reconciliation-v1');
  assert.equal(inventory.historical_source_mapping.length,169);
  assert.equal(inventory.exact_204_historical_membership_reconciliation.length,204);
  assert.deepEqual(inventory.historical_204_membership_counts,{
    article:74,research:40,video:22,podcast:28,watchlist:40
  });
  const count=inventory.source_catalogue_decisions;
  assert.deepEqual(count,{
    already_present_id:56,already_present_route:2,
    verified_same_show_or_channel_alias:6,platform_directory_only:3,
    imported_enabled_discovery:15,imported_disabled_pending:87
  });
  assert.equal(Object.values(count).reduce((a,b)=>a+b,0),169);
  const ids=new Set();
  for(const item of inventory.exact_204_historical_membership_reconciliation){
    assert.match(item.row_id,/^DIR-L[1-5]-\d+$/);
    assert.ok(!ids.has(item.row_id),item.row_id);
    ids.add(item.row_id);
    assert.ok(item.description.length>20);
    assert.match(item.url,/^https:\/\//);
    if(item.disposition==='platform_directory_only')
      assert.equal(item.canonical_registry_id,null);
    else assert.ok(current.has(item.canonical_registry_id),
      item.row_id+' missing current canonical registry entry');
  }
});

test('append-only current v1 schema keeps all 105 original source IDs in exact order',()=>{
  assert.deepEqual(validateResourceRegistry(registry),[]);
  assert.equal(registry.schema_version,'daily-compiler-resource-registry-v1');
  assert.equal(registry.resources.length,208);
  assert.deepEqual(registry.resources.slice(0,105).map(r=>r.resource_id),baselineIds);
  assert.equal(inventory.preserved_main_sha,
    '93c9fbd88297f75429d02fb69680129cdff5274d');
  assert.equal(inventory.current_registry_counts.before,105);
  assert.equal(inventory.current_registry_counts.after,208);
  const ids=registry.resources.map(r=>r.resource_id);
  assert.equal(new Set(ids).size,ids.length);
  const routes=registry.resources.map(r=>canon(r.url));
  assert.equal(new Set(routes).size,routes.length);
});

test('103 new records comprise 102 historical routes plus one new applied AI publisher',()=>{
  assert.equal(inventory.imported_resources.length,103);
  for(const r of inventory.imported_resources){
    const saved=current.get(r.resource_id);
    assert.ok(saved,r.resource_id);
    assert.equal(saved.url,r.url);
    assert.equal(saved.enabled,r.enabled);
    assert.deepEqual(saved.content_types,r.content_types);
    assert.equal(saved.health.status,'unknown');
    assert.equal(saved.health.last_checked_at,null);
    assert.equal(saved.health.last_success_at,null);
    assert.equal(saved.health.observed_yield_rate,null);
    assert.equal(saved.health.freshness_hit_rate,null);
    assert.equal(saved.health.consecutive_failures,0);
  }
  assert.ok(current.has('universe-20261026-every-ai-editorial'));
  const newOn=inventory.imported_resources.filter(r=>r.enabled);
  assert.equal(newOn.length,16);
  assert.ok(newOn.every(r=>/DISCOVERY QUALIFIED/.test(r.source_evidence_or_blocker)));
  assert.ok(inventory.imported_resources.filter(r=>!r.enabled)
    .every(r=>/HISTORICAL CATALOGUE ONLY/.test(r.source_evidence_or_blocker)));
});

test('discovery sees all enabled roles but never unqualified historical records',()=>{
  const totals={article:[111,51],video:[29,6],podcast:[40,21]};
  assert.equal(registry.resources.filter(r=>r.enabled).length,94);
  for(const [type,[total,active]] of Object.entries(totals)){
    assert.equal(registry.resources.filter(r=>r.content_types.includes(type)).length,total);
    const selected=activeDiscoveryResources(registry,type);
    assert.equal(selected.length,active);
    assert.ok(selected.every(r=>r.enabled&&r.content_types.includes(type)));
    const historical=selected.filter(r=>r.resource_id.startsWith('directory-'));
    assert.ok(historical.every(r=>/DISCOVERY QUALIFIED/.test(r.notes)));
  }
  for(const name of ['YouTube','Apple Podcasts','Spotify'])
    assert.ok(!registry.resources.some(r=>r.name===name && r.enabled));
});

test('video and podcast sources are discovery leads, not falsely approved items',()=>{
  const imported=inventory.imported_resources.filter(r=>r.enabled);
  for(const r of imported.filter(x=>x.content_types.includes('video')))
    assert.match(r.source_evidence_or_blocker,/full playback.*NOT VERIFIED/i);
  for(const r of imported.filter(x=>x.content_types.includes('podcast')))
    assert.match(r.source_evidence_or_blocker,/(listening|75% AI fraction).*NOT VERIFIED/i);
  const show=current.get('directory-54d90ff964a74ff98851ae11');
  assert.equal(show.name,'The Every Podcast (formerly AI & I)');
  assert.ok(!current.has('directory-6a6f2329446088f00c16886a'));
});

test('source-universe reconciliation is idempotent, deterministic and read-only',()=>{
  const original=JSON.stringify(registry);
  const importAgain=()=>inventory.imported_resources.reduce((acc,r)=>
    current.has(r.resource_id)?acc:acc+1,0);
  assert.equal(importAgain(),0);
  assert.equal(importAgain(),0);
  assert.deepEqual(activeDiscoveryResources(registry,'article'),
    activeDiscoveryResources(registry,'article'));
  assert.equal(JSON.stringify(registry),original);
});

test('no new billed retrievers or production workflow requirements',()=>{
  const prod=fs.readFileSync('docs/SEMANTIC-PRODUCER-CONTRACT.md','utf8');
  assert.match(prod,/config\/resource-registry\.json/);
  assert.match(prod,/enabled === true/);
  assert.match(prod,/three-previous-published-edition hard program cooldown/);
  assert.match(prod,/signed-out/i);
  assert.match(prod,/24\/72\/168-hour/);
  assert.match(prod,/No Work\/Codex\/TinyFish/);
});
