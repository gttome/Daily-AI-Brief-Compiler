import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildDisabledSourceWorklist,recordDisabledSourceDisposition,
 validateDisabledSourceWorklist} from '../operations/oct28-source-qualification.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const data=()=>buildDisabledSourceWorklist(registry,{edition_date:'2026-10-27',
 execution_id:'actual-oct27',created_at:'2026-10-27T00:00:00Z'});
const decision=(resource_id,status='VERIFIED_ACTIVE')=>({
 resource_id,status,reviewed_at:'2026-10-27T01:00:00Z',
 indexed_source_url:'https://source.example/blog',
 original_item_url:'https://source.example/blog/detailed-article',
 original_item_date:'2026-10-25T11:00:00Z',
 publisher_identity:'Distinct original publisher verified',
 why:'Publisher original index and dated source item inspected with relevance and precise provenance; source discovery only.'
});

test('entire disabled historical portfolio is present without autoactivation',()=>{
 const q=data();
 assert.equal(q.resources.length,114);
 assert.equal(q.disabled_sources_total,114);
 assert.equal(q.reviewed_disabled_count,0);
 assert.equal(q.unreviewed_disabled_count,114);
 assert.deepEqual(q.verified_source_ids,[]);
 assert.ok(q.resources.every(x=>x.status==='UNREVIEWED'));
 const x=validateDisabledSourceWorklist(registry,q);
 assert.equal(x.result,'PENDING');
 assert.throws(()=>validateDisabledSourceWorklist(registry,q,{requireAllReviewed:true}),
  /SOURCE_QUALIFICATION_DISABLED_SOURCES_UNREVIEWED/);
});

test('one real-evidence disposition does not imply 114 were reviewed or automatically enabled',()=>{
 const q=data(),id=q.resources[0].resource_id;
 recordDisabledSourceDisposition(q,decision(id));
 const report=validateDisabledSourceWorklist(registry,q);
 assert.equal(report.reviewed,1);
 assert.equal(report.pending,113);
 assert.equal(report.verified,1);
 assert.deepEqual(q.verified_source_ids,[id]);
 assert.equal(registry.resources.find(r=>r.resource_id===id).enabled,false);
 assert.throws(()=>validateDisabledSourceWorklist(registry,q,{requireAllReviewed:true}),
  /SOURCE_QUALIFICATION_DISABLED_SOURCES_UNREVIEWED/);
});

test('cannot promote historical source without original dated item or valid publisher',()=>{
 const q=data(),id=q.resources[0].resource_id;
 assert.throws(()=>recordDisabledSourceDisposition(q,decision(id).original_item_date===null
  ?{...decision(id),original_item_date:null}:{...decision(id),original_item_date:null}),
  /SOURCE_QUALIFICATION_MISSING_ORIGINAL_DATED_SOURCE_EVIDENCE/);
 assert.throws(()=>recordDisabledSourceDisposition(q,{...decision(id),indexed_source_url:'http://insecure.example'}),
  /SOURCE_QUALIFICATION_MISSING_ORIGINAL_DATED_SOURCE_EVIDENCE/);
 assert.throws(()=>recordDisabledSourceDisposition(q,{...decision(id),original_item_date:'2031-01-01T00:00:00Z'}),
  /SOURCE_QUALIFICATION_MISSING_ORIGINAL_DATED_SOURCE_EVIDENCE/);
 assert.throws(()=>recordDisabledSourceDisposition(q,{...decision(id),status:'DUPLICATE',canonical_duplicate_id:null}),
  /SOURCE_QUALIFICATION_MISSING_CANONICAL_DUPLICATE_ID/);
});

test('canonical duplicate identities must actually exist in the current registry',()=>{
 const q=data(),id=q.resources[0].resource_id;
 recordDisabledSourceDisposition(q,{...decision(id),status:'DUPLICATE',
  canonical_duplicate_id:'not-in-the-registry'});
 assert.throws(()=>validateDisabledSourceWorklist(registry,q),
  /SOURCE_QUALIFICATION_DUPLICATE_TARGET_NOT_REGISTERED/);
});

test('worklist rows cannot be omitted or fabricated by changing totals',()=>{
 const q=data(),omitted=structuredClone(q);omitted.resources.pop();
 assert.throws(()=>validateDisabledSourceWorklist(registry,omitted),
  /SOURCE_QUALIFICATION_MISSING_DISABLED_SOURCE_ROWS/);
 const inflated=structuredClone(q);inflated.reviewed_disabled_count=114;
 assert.throws(()=>validateDisabledSourceWorklist(registry,inflated),
  /SOURCE_QUALIFICATION_INCONSISTENT_DISPOSITION_COUNTS/);
 const changed=structuredClone(q);changed.resources[0].url='https://fabricated.example';
 assert.throws(()=>validateDisabledSourceWorklist(registry,changed),
  /SOURCE_QUALIFICATION_DISABLED_SOURCE_IDENTITY_MISMATCH/);
});
