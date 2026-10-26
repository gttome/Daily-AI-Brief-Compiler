import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateDisabledSourceWorklist} from '../operations/oct28-source-qualification.mjs';

test('October 27 source worklist enumerates every disabled resource without invented review',()=>{
 const reg=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 const worklist=JSON.parse(fs.readFileSync(
  'docs/source-expansion/OCT27_DISABLED_SOURCE_114_REVIEW_WORKLIST.json','utf8'));
 const result=validateDisabledSourceWorklist(reg,worklist);
 assert.equal(result.result,'PENDING');
 assert.equal(result.disabled_sources_total,114);
 assert.equal(result.reviewed,0);
 assert.equal(result.pending,114);
 assert.equal(result.verified,0);
 assert.equal(worklist.execution_id,'PREPRODUCTION_REVIEW_SEED_NO_SOURCE_CHECKS');
 assert.deepEqual(worklist.resources.map(x=>x.resource_id),
  reg.resources.filter(r=>!r.enabled).map(r=>r.resource_id));
 assert.ok(worklist.resources.every(r=>
  r.status==='UNREVIEWED'&&r.reviewed_at===null&&
  r.original_item_url===null&&r.original_item_date===null&&r.why===null));
 assert.throws(()=>validateDisabledSourceWorklist(reg,worklist,
  {requireAllReviewed:true}),/SOURCE_QUALIFICATION_DISABLED_SOURCES_UNREVIEWED/);
});
