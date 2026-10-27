import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateDisabledSourceWorklist} from '../operations/oct28-source-qualification.mjs';

test('frozen October 27 114-source seed remains auditable after four live activations',()=>{
 const reg=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 const worklist=JSON.parse(fs.readFileSync(
  'docs/source-expansion/OCT27_DISABLED_SOURCE_114_REVIEW_WORKLIST.json','utf8'));
 // Frozen October 26/27 review seed: four of these sources have since been
 // activated after dated first-party review. Historical rows remain unchanged.
 const baseline=structuredClone(reg);
 const historicalDisabled=new Set(worklist.resources.map(r=>r.resource_id));
 for(const row of baseline.resources){
   if(historicalDisabled.has(row.resource_id))row.enabled=false;
 }
 assert.equal(reg.resources.filter(r=>!r.enabled).length,110);
 const result=validateDisabledSourceWorklist(baseline,worklist);
 assert.equal(result.result,'PENDING');
 assert.equal(result.disabled_sources_total,114);
 assert.equal(result.reviewed,0);
 assert.equal(result.pending,114);
 assert.equal(result.verified,0);
 assert.equal(worklist.execution_id,'PREPRODUCTION_REVIEW_SEED_NO_SOURCE_CHECKS');
 assert.deepEqual(worklist.resources.map(x=>x.resource_id),
  baseline.resources.filter(r=>!r.enabled).map(r=>r.resource_id));
 assert.ok(worklist.resources.every(r=>
  r.status==='UNREVIEWED'&&r.reviewed_at===null&&
  r.original_item_url===null&&r.original_item_date===null&&r.why===null));
 assert.throws(()=>validateDisabledSourceWorklist(baseline,worklist,
  {requireAllReviewed:true}),/SOURCE_QUALIFICATION_DISABLED_SOURCES_UNREVIEWED/);
});
