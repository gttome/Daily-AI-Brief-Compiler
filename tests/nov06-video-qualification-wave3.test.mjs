import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeDiscoveryResources,validateResourceRegistry} from '../operations/resources.mjs';
import {buildVideoSourceSweepPlan} from '../operations/video-source-sweep.mjs';

const reg=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('config/video-source-qualification/2026-11-06-wave3.json','utf8'));
const videos=reg.resources.filter(r=>r.content_types.includes('video'));
const wb=videos.find(r=>r.resource_id==='directory-5c5d3d02a420135949164552');
const zap=videos.find(r=>r.resource_id==='research-20261026-v03');

test('current live video registry follows evidence to 28 enabled and exactly one pending',()=>{
 assert.deepEqual(validateResourceRegistry(reg),[]);
 assert.equal(videos.length,29);
 assert.equal(videos.filter(v=>v.enabled).length,28);
 assert.equal(videos.filter(v=>!v.enabled).length,1);
 assert.equal(ledger.proposed_registry.enabled_video,28);
 assert.equal(ledger.proposed_registry.disabled_video,1);
 assert.equal(ledger.prior_registry.enabled_video,27);
 assert.equal(activeDiscoveryResources(reg,'video').length,28);
});
test('original W&B publishing lineage is bound to a dated CoreWeave-owned video route',()=>{
 assert.equal(wb.enabled,true);
 assert.equal(wb.name,'Weights & Biases / CoreWeave Videos');
 assert.equal(wb.url,'https://www.coreweave.com/builder');
 assert.equal(wb.publisher,'CoreWeave (Weights & Biases product)');
 assert.match(wb.notes,/2026-09-09/);
 assert.match(wb.notes,/DISCOVERY QUALIFIED/);
 assert.ok(wb.notes.includes('2025-05-05'));
 const l=ledger.qualifications[0];
 assert.equal(l.original_publisher_family,'CoreWeave');
 assert.equal(l.resource_id,wb.resource_id);
 assert.equal(l.original_video_date,'2026-09-09');
 assert.match(l.verified_first_party_video_url,/coreweave\.com\/resources\/videos/);
 assert.ok(l.evidence_urls.length===3);
 assert.equal(l.individual_program_playback_verified,false);
 assert.equal(l.individual_program_selection_qualified,false);
});
test('Zapier remains unqualified and all 29 remain in dynamic discovery sweep',()=>{
 assert.equal(zap.enabled,false);
 assert.equal(ledger.qualifications[1].status,'QUALIFICATION_PENDING');
 assert.equal(ledger.qualifications[1].resource_id,zap.resource_id);
 assert.equal(ledger.qualifications[1].individual_program_playback_verified,false);
 const sweep=buildVideoSourceSweepPlan({editionDate:'2026-11-07',registry:reg});
 assert.equal(sweep.registered_count,29);
 assert.equal(sweep.enabled_count,28);
 assert.equal(sweep.qualification_only_count,1);
 assert.equal(sweep.observations.length,29);
 assert.ok(sweep.observations.some(o=>o.resource_id===zap.resource_id&&o.outcome==='NOT_ATTEMPTED'));
});
