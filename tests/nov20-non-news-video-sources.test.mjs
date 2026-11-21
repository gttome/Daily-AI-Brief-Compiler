import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVideoSourceSweepPlan} from '../operations/video-source-sweep.mjs';
import {validateResourceRegistry} from '../operations/resources.mjs';
// Preserve the November 20 source expansion baseline; November 21 admission is tested separately.
const registry=JSON.parse(fs.readFileSync('fixtures/resource-registry-pre-nov21-source-qualification.json'));
const ledger=JSON.parse(fs.readFileSync('config/video-source-qualification/2026-11-20-non-news.json'));
test('eight evidenced non-news discovery routes extend rather than replace the existing portfolio',()=>{
 assert.deepEqual(validateResourceRegistry(registry),[]);
 const rows=registry.resources.filter(r=>r.content_types.includes('video'));
 assert.equal(rows.length,37);assert.equal(rows.filter(r=>r.enabled).length,36);
 assert.equal(ledger.qualifications.length,8);
 for(const q of ledger.qualifications){
  const row=rows.find(r=>r.resource_id===q.resource_id);
  assert.equal(row.url,q.source_url);assert.equal(row.enabled,true);
  assert.ok(q.evidence_urls.length);assert.ok(q.review_scope.length>80);
  assert.equal(q.individual_program_playback_verified,false);
  assert.equal(q.individual_program_selection_qualified,false);
  assert.ok(!/news/.test(row.video_discovery_class));
 }
 assert.equal(new Set(ledger.qualifications.map(q=>q.original_publisher_family)).size,7);
 assert.equal(rows.find(r=>r.resource_id==='research-20261026-v03').enabled,false);
 const plan=buildVideoSourceSweepPlan({editionDate:'2026-11-21',registry});
 assert.equal(plan.observations.length,37);
 assert.ok(plan.observations.every(x=>x.outcome==='NOT_ATTEMPTED'));
});
