import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';
import {activeDiscoveryResources,validateResourceRegistry} from '../operations/resources.mjs';
import {sourceRegistrySummary} from '../compiler/source-transparency.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const audit=JSON.parse(fs.readFileSync('config/video-source-qualification/2026-11-06.json','utf8'));
const video=registry.resources.filter(r=>r.content_types.includes('video'));
const newly=audit.qualifications.filter(q=>q.status==='DISCOVERY_ELIGIBLE');
const pending=audit.qualifications.filter(q=>q.status==='QUALIFICATION_PENDING');

test('qualification ledger covers the full November 6 previously disabled population exactly once',()=>{
  assert.deepEqual(validateResourceRegistry(registry),[]);
  assert.equal(audit.schema_version,'daily-video-source-qualification-review-v1');
  assert.equal(audit.registry_at_start.disabled_video,audit.qualifications.length);
  assert.equal(audit.qualifications.length,new Set(audit.qualifications.map(x=>x.resource_id)).size);
  assert.equal(audit.new_discovery_qualifications,newly.length);
  assert.equal(audit.pending_qualifications,pending.length);
  assert.equal(audit.new_discovery_qualifications+audit.pending_qualifications,audit.registry_at_start.disabled_video);
  assert.equal(audit.proposed_registry.enabled_video,audit.registry_at_start.enabled_video+newly.length);
  assert.equal(audit.proposed_registry.disabled_video,pending.length);
  assert.equal(audit.proposed_registry.total_video,audit.registry_at_start.total_video);
});
test('each activated discovery lead has specific public evidence and no false player acceptance',()=>{
  for(const q of newly){
    const r=video.find(x=>x.resource_id===q.resource_id);
    assert.ok(r?.enabled, q.name);
    assert.ok(['site_search','targeted','page','feed'].includes(r.search_mode));
    assert.match(r.notes,/DISCOVERY QUALIFIED/);
    assert.ok(q.example_url?.startsWith('https://'));
    assert.ok(/^2026(?:-\d\d){0,2}$/.test(q.example_original_date),q.name);
    assert.ok(q.evidence_urls?.length>=1);
    assert.ok(q.evidence_urls.every(x=>x.startsWith('https://')));
    assert.equal(q.individual_program_playback_verified,false);
    assert.equal(q.individual_program_selection_qualified,false);
  }
});
test('unqualified source leads remain tracked and next qualification action is explicit',()=>{
  for(const q of pending){
    assert.equal(q.eligible_for_discovery,false);
    assert.ok(q.blocker_or_next_action?.length>75);
    assert.equal(q.individual_program_playback_verified,false);
    assert.equal(q.individual_program_selection_qualified,false);
  }
});
test('research planner and active discovery use actual enabled status, while all-source sweep retains disabled leads',()=>{
  const active=activeDiscoveryResources(registry,'video');
  assert.equal(active.length,video.filter(v=>v.enabled).length);
  const p=buildEditorialResearchPlan({editionDate:'2026-11-07',registry});
  assert.equal(p.video_source_sweep.registered_count,video.length);
  assert.equal(p.video_source_sweep.enabled_count,active.length);
  assert.equal(p.video_source_sweep.qualification_only_count,video.length-active.length);
  assert.equal(p.video_source_sweep.observations.length,video.length);
  assert.ok(p.video_source_sweep.observations.every(x=>x.outcome==='NOT_ATTEMPTED'));
});

test('current public-source registry totals remain genuinely dynamic after evidence-backed activation',()=>{
 const summary=sourceRegistrySummary(registry);
 assert.equal(summary.registered,registry.resources.length);
 assert.equal(summary.enabled,registry.resources.filter(r=>r.enabled).length);
 assert.equal(summary.pending,registry.resources.filter(r=>!r.enabled).length);
 assert.equal(summary.roles.video.enabled,video.filter(r=>r.enabled).length);
 assert.equal(summary.roles.video.registered,video.length);
});
