import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateResourceRegistry,activeDiscoveryResources} from '../operations/resources.mjs';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const registry=read('config/resource-registry.json');
const baseline=read('fixtures/resource-registry-pre-nov21-source-qualification.json');
const audit=read('config/source-qualification/2026-11-21-all-216.json');
const current=new Map(registry.resources.map(r=>[r.resource_id,r]));

test('all 216 identities are reviewed without deleting records or mutating prior admitted sources',()=>{
 assert.deepEqual(validateResourceRegistry(registry),[]);
 assert.equal(baseline.resources.length,216);
 assert.deepEqual(registry.resources.map(r=>r.resource_id),baseline.resources.map(r=>r.resource_id));
 assert.deepEqual(audit.resources.map(r=>r.resource_id),baseline.resources.map(r=>r.resource_id));
 assert.equal(new Set(audit.resources.map(r=>r.resource_id)).size,216);
 for(const row of baseline.resources){
  if(row.enabled)assert.deepEqual(current.get(row.resource_id),row,row.resource_id);
  assert.deepEqual(current.get(row.resource_id).health,row.health,'No invented production health');
 }
});

test('every actual activation has bound original evidence and all exclusions remain disabled',()=>{
 const activated=audit.resources.filter(r=>r.status==='DISCOVERY_QUALIFIED');
 assert.equal(activated.length,audit.summary.newly_discovery_qualified);
 assert.equal(activated.length+128,registry.resources.filter(r=>r.enabled).length);
 assert.equal(audit.summary.all_216_discovery_qualified,false);
 for(const q of audit.resources){
  assert.equal(current.get(q.resource_id).enabled,q.enabled_after);
  assert.ok(q.route_observation.checked_at);
  assert.match(q.route_observation.sha256,/^[a-f0-9]{64}$/);
  assert.ok([200,403,404].includes(q.route_observation.http_status));
  assert.equal(q.individual_media_playback_verified,false);
  assert.equal(q.individual_item_selection_qualified,false);
  if(q.status==='DISCOVERY_QUALIFIED'){
   const e=q.source_evidence;
   assert.ok(e.url.startsWith('https://'));
   assert.ok(e.title.length>7);
   assert.ok(q.publisher_identity.trim().length>1);
   assert.match(e.source_date.value,/^\d{4}-\d{2}(?:-\d{2})?$/);
   assert.ok(['DAY','MONTH'].includes(e.source_date.precision));
   assert.ok(e.source_date.value<=q.reviewed_at.slice(0,e.source_date.value.length));
   if(e.source_date.kind!=='ORIGINAL_PUBLICATION')
    assert.ok(q.content_types.every(t=>['research','watchlist'].includes(t)),q.resource_id);
   assert.match(current.get(q.resource_id).notes,/DISCOVERY QUALIFIED/);
   assert.ok(e.method==='CONNECTED_WEB_PRIMARY_SOURCE'||e.observation.http_status===200);
   if(e.publisher_original_date)
    assert.equal(e.publisher_original_date.slice(0,10),e.source_date.value);
   if(e.original_feed_pubdate)
    assert.equal(new Date(e.original_feed_pubdate).toISOString().slice(0,10),e.source_date.value);
  }else if(!q.was_enabled){
   assert.equal(q.enabled_after,false);
   assert.ok(q.next_action.length>40);
   assert.ok(q.reason.length>90);
  }
 }
});

test('upcoming discovery plan uses only admitted records and preserves all story/media gates',()=>{
 const p=buildEditorialResearchPlan({editionDate:'2026-11-22',registry});
 assert.ok(p.resources.every(r=>current.get(r.resource_id).enabled));
 for(const t of ['article','video','podcast'])
  assert.ok(activeDiscoveryResources(registry,t).every(r=>r.enabled&&r.content_types.includes(t)));
 for(const q of audit.resources.filter(r=>!r.enabled_after))
  assert.ok(!p.resources.some(r=>r.resource_id===q.resource_id));
 assert.equal(p.video_source_sweep.registered_count,37);
 assert.equal(p.video_source_sweep.enabled_count,registry.resources.filter(r=>r.enabled&&r.content_types.includes('video')).length);
 assert.ok(p.video_source_sweep.observations.every(r=>r.outcome==='NOT_ATTEMPTED'));
});

test('RSS newsletter timestamps cannot certify podcast freshness and metadata cannot certify playback',()=>{
 const q=audit.resources.find(r=>r.resource_id==='directory-c831ea242dd43dc46401a87a');
 assert.equal(q.source_evidence.source_date.value,'2026-10-03');
 assert.match(q.source_evidence.audio_enclosure,/\.mp3$/);
 assert.ok(q.reason.includes('newsletter'));
 const video=audit.resources.find(r=>r.resource_id==='research-20261026-v03');
 assert.equal(video.individual_media_playback_verified,false);
 assert.equal(video.individual_item_selection_qualified,false);
 const ref=audit.resources.find(r=>r.resource_id==='research-20261026-a02');
 assert.equal(ref.status,'REFERENCE_ONLY');
 assert.equal(ref.enabled_after,false);
 assert.match(ref.reason,/modification/);
});
