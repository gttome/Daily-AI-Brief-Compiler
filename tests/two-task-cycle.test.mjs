import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedDate,nextEditionDate,selectCurrentCycleImageJob} from '../scripts/two-task-cycle.mjs';
const source={commit_sha:'c'.repeat(40),bundle_sha256:'b'.repeat(64)};
const job={schema_version:'external-compiler-image-job-v1',edition_date:'2026-10-12',lifecycle:'PUBLISHED_PENDING',source,stories:Array.from({length:6},(_,i)=>({story_id:'s'+i}))};
const row={edition_date:'2026-10-12',status:'PUBLISHED_PENDING',source_commit_sha:source.commit_sha,bundle_sha256:source.bundle_sha256,story_count:6,job_sha256:'a'.repeat(64)};
const index={schema_version:'external-compiler-image-index-v1',editions:[{...row,edition_date:'2026-10-10'}, {...row,edition_date:'2026-10-11'},row]};
test('Chicago cycle has a fixed following edition date, including leap and DST boundaries',()=>{
 assert.equal(nextEditionDate('2026-10-11'),'2026-10-12');
 assert.equal(nextEditionDate('2026-10-12'),'2026-10-13');
 assert.equal(nextEditionDate('2026-11-01'),'2026-11-02');
 assert.equal(nextEditionDate('2028-02-28'),'2028-02-29');
 assert.throws(()=>checkedDate('2026-02-30'));
});
test('never fall back to old eligible jobs after missing current source',()=>{
 const onlyOld={...index,editions:index.editions.slice(0,2)};
 assert.equal(selectCurrentCycleImageJob({cycleDate:'2026-10-11',index:onlyOld,job}).result,'WAITING_SOURCE');
 assert.equal(selectCurrentCycleImageJob({cycleDate:'2026-10-11',index,job}).result,'CURRENT_JOB_READY');
 assert.equal(selectCurrentCycleImageJob({cycleDate:'2026-10-12',index,job}).result,'WAITING_SOURCE');
});
test('released or corrupt current job is never reopened',()=>{
 const released={...index,editions:[{...row,status:'RELEASED_VERIFIED'}]};
 assert.deepEqual(selectCurrentCycleImageJob({cycleDate:'2026-10-11',index:released,job}).generate,false);
 assert.equal(selectCurrentCycleImageJob({cycleDate:'2026-10-11',index,job:{...job,edition_date:'2026-10-11'}}).result,'BLOCKED_INCOMPLETE');
 assert.equal(selectCurrentCycleImageJob({cycleDate:'2026-10-11',index:{...index,editions:[row,row]},job}).result,'BLOCKED_INCOMPLETE');
});
