import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeDiscoveryResources,validateResourceRegistry} from '../operations/resources.mjs';
import {buildVideoSourceSweepPlan} from '../operations/video-source-sweep.mjs';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const prior=JSON.parse(fs.readFileSync('config/video-source-qualification/2026-11-06.json','utf8'));
const wave2=JSON.parse(fs.readFileSync('config/video-source-qualification/2026-11-06-wave2.json','utf8'));
const video=registry.resources.filter(x=>x.content_types.includes('video'));
const now=video.filter(x=>x.enabled);
const wave2On=wave2.qualifications.filter(x=>x.status==='DISCOVERY_ELIGIBLE');
const pending=wave2.qualifications.filter(x=>x.status==='QUALIFICATION_PENDING');

test('second-wave admission increases discovery to 27 of the same 29 registered sources',()=>{
 assert.deepEqual(validateResourceRegistry(registry),[]);
 assert.equal(wave2.schema_version,'daily-video-source-qualification-review-v1');
 assert.equal(wave2.prior_registry.enabled_video,prior.proposed_registry.enabled_video);
 assert.equal(wave2.prior_registry.disabled_video,prior.proposed_registry.disabled_video);
 assert.equal(video.length,wave2.proposed_registry.registered_video);
 assert.ok(now.length>=wave2.proposed_registry.enabled_video); // post-wave2 additions can qualify later
 assert.equal(wave2On.length,wave2.new_discovery_qualifications);
 assert.equal(pending.length,wave2.pending_qualifications);
 assert.equal(wave2On.length+pending.length,wave2.qualifications.length);
 assert.equal(wave2.qualifications.length,new Set(wave2.qualifications.map(x=>x.resource_id)).size);
 assert.equal(wave2.qualifications.length,prior.proposed_registry.disabled_video);
});
test('each of 13 activated sources retains dated item evidence without falsely certifying videos',()=>{
 for(const q of wave2On){
  const source=video.find(v=>v.resource_id===q.resource_id);
  assert.ok(source?.enabled,q.name);
  assert.equal(source.search_mode,'site_search',q.name);
  assert.ok(source.endpoint?.startsWith('https://'));
  assert.match(source.notes,/DISCOVERY QUALIFIED/);
  assert.match(source.notes,/DOES NOT VERIFY/);
  assert.ok(/^2026-\d\d-\d\d$/.test(q.original_example_date),q.name);
  assert.ok(q.original_example_title?.length>15,q.name);
  assert.ok(q.example_url?.startsWith('https://'),q.name);
  assert.ok(q.evidence_urls.length>=1,q.name);
  assert.ok(q.evidence_urls.every(x=>x.startsWith('https://')));
  assert.equal(q.individual_program_playback_verified,false);
  assert.equal(q.individual_program_selection_qualified,false);
 }
});
test('Zapier and W&B are the only pending leads, with unambiguous original video blockers',()=>{
 assert.deepEqual(pending.map(x=>x.name).sort(),[
  'Weights & Biases YouTube','Zapier Official Tutorials'].sort());
 for(const q of pending){
  assert.ok(video.find(v=>v.resource_id===q.resource_id));
  assert.equal(q.eligible_for_discovery,false); // historic wave2 snapshot, not a live status
  assert.ok(q.blocker_or_next_action?.length>=60);
  assert.equal(q.individual_program_playback_verified,false);
  assert.equal(q.individual_program_selection_qualified,false);
 }
 const mechanics=video.find(v=>v.name==='Microsoft Mechanics YouTube');
 assert.equal(mechanics?.url,'https://www.youtube.com/@msftmechanics/videos');
});
test('29-source mandatory sweep follows current registry as historical pending entries qualify',()=>{
 const sweep=buildVideoSourceSweepPlan({editionDate:'2026-11-07',registry});
 const plan=buildEditorialResearchPlan({editionDate:'2026-11-07',registry});
 assert.equal(sweep.registered_count,video.length);
 assert.equal(sweep.enabled_count,activeDiscoveryResources(registry,'video').length);
 assert.equal(sweep.qualification_only_count,video.filter(x=>!x.enabled).length);
 assert.equal(plan.video_source_sweep.registered_count,video.length);
 assert.ok(sweep.observations.every(x=>x.outcome==='NOT_ATTEMPTED'));
 assert.equal(new Set(sweep.observations.map(x=>x.resource_id)).size,video.length);
});
