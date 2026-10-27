import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildEditorialSourceCensus,recordEditorialSourceObservation,
  validateEditorialSourceCensus} from '../operations/source-item-census.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const meta={edition_date:'2026-10-27',execution_id:'compiler-2026-10-27-r1',
 created_at:'2026-10-26T23:14:00Z'};
const observation=(resource_id,extra={})=>({resource_id,outcome:'NO_ELIGIBLE_ITEMS',
 checked_at:'2026-10-26T23:14:32Z',source_index_url:registry.resources.find(r=>r.resource_id===resource_id)?.url,
 evidence_method:'publisher_index',items:[],
 reason:'Index checked but no qualifying recent original dated source items found.',...extra});

test('all 87 enabled editorial publishers/channels/shows enumerated, no hidden shortlist',()=>{
 const p=buildEditorialSourceCensus(registry,meta);
 assert.equal(p.counts.eligible,87);
 assert.equal(p.counts.attempted,0);
 assert.equal(p.counts.not_attempted,87);
 assert.deepEqual(p.counts.role_counts,{
  article:{eligible:60,attempted:0},video:{eligible:6,attempted:0},
  podcast:{eligible:21,attempted:0}});
 assert.throws(()=>validateEditorialSourceCensus(registry,p,{requireAllVisited:true}),
  /EDITORIAL_SOURCE_CENSUS_SOURCES_NOT_ALL_ATTEMPTED/);
 assert.equal(validateEditorialSourceCensus(registry,p).result,'INCOMPLETE');
});

test('source-level discovery can carry real original-dated candidate examples',()=>{
 const p=buildEditorialSourceCensus(registry,meta);
 const id=p.resources[0].resource_id;
 recordEditorialSourceObservation(p,observation(id,{
  outcome:'CANDIDATES_FOUND',items:[{
   url:'https://publisher.example/actual-article',
   title:'Real published article examined from original publisher',
   original_date:'2026-10-25T15:00:00Z'
  }],
  reason:'Read original publisher index, recorded the dated original item, but have not certified publication value.'
 }));
 const r=validateEditorialSourceCensus(registry,p);
 assert.equal(r.attempted,1);
 assert.equal(r.candidates_found,1);
 assert.equal(r.result,'INCOMPLETE');
 assert.equal(r.item_publication_admission,'SEPARATE_EXISTING_GATES');
});

test('every source can be accounted for without claiming all produced candidates',()=>{
 const p=buildEditorialSourceCensus(registry,meta);
 for(const row of p.resources)
  recordEditorialSourceObservation(p,observation(row.resource_id,{
   source_index_url:row.url
  }));
 const r=validateEditorialSourceCensus(registry,p,{requireAllVisited:true});
 assert.equal(r.attempted,87);
 assert.equal(r.no_eligible_items,87);
 assert.equal(r.candidates_found,0);
 assert.equal(r.result,'ALL_SOURCES_ACCOUNTED');
});

test('absence and falsified or stale source rows fail validation',()=>{
 const p=buildEditorialSourceCensus(registry,meta);
 const missing=structuredClone(p);missing.resources.pop();
 assert.throws(()=>validateEditorialSourceCensus(registry,missing),/INCOMPLETE_SOURCE_SET/);
 const fake=structuredClone(p);fake.resources[0].outcome='NO_ELIGIBLE_ITEMS';
 assert.throws(()=>validateEditorialSourceCensus(registry,fake),/MISSING_VISIT_EVIDENCE/);
 const renamed=structuredClone(p);renamed.resources[0].resource_id='unregistered';
 assert.throws(()=>validateEditorialSourceCensus(registry,renamed),/SOURCE_MAPPING_MISMATCH/);
 const counted=structuredClone(p);counted.counts.attempted=83;
 assert.throws(()=>validateEditorialSourceCensus(registry,counted),/MISSTATED_COUNTS/);
});

test('candidates without exact dated identity and non-HTTPS indexes cannot pass',()=>{
 const p=buildEditorialSourceCensus(registry,meta),id=p.resources[0].resource_id;
 assert.throws(()=>recordEditorialSourceObservation(p,observation(id,{
  outcome:'CANDIDATES_FOUND',items:[{title:'An undated item',url:'https://publisher.example/undated'}]
 })),/CANDIDATE_ORIGINAL_EVIDENCE/);
 assert.throws(()=>recordEditorialSourceObservation(p,observation(id,{
  source_index_url:'http://example.ai/latest'
 })),/MISSING_VISIT_EVIDENCE/);
 assert.throws(()=>recordEditorialSourceObservation(p,observation(id,{
  reason:'No'
 })),/MISSING_VISIT_EVIDENCE/);
 assert.throws(()=>recordEditorialSourceObservation(p,observation(id,{
  source_index_url:'https://unrelated.example/latest'
 })),/UNBOUND_PUBLISHER_INDEX/);
 assert.throws(()=>recordEditorialSourceObservation(p,observation(id,{
  outcome:'CANDIDATES_FOUND',items:[{
   title:'Future item absent at the recorded research time',
   url:'https://publisher.example/post',original_date:'2028-10-26T15:00:00Z'
  }]
 })),/CANDIDATE_ORIGINAL_EVIDENCE/);
});
