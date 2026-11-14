import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateBoundEditorialIndex} from '../compiler/editorial-index-certification.mjs';
const now='2026-11-14T23:25:00Z';
const registry={resources:[
 {resource_id:'a',enabled:true,content_types:['article']},
 {resource_id:'p',enabled:true,content_types:['podcast']},
 {resource_id:'v',enabled:true,content_types:['video']},
 {resource_id:'disabled',enabled:false,content_types:['video']}
]};
function fixture(){
 return {edition_date:'2026-11-15',editorial_provenance:{selection_locked_at:'2026-11-14T23:30:00Z'},
 source_discovery_audit:{index_review:{source:'GENUINE_PRESELECTION_INDEX_REVIEW',
  eligible:3,eligible_ids:['a','p','v'],inspected:2,inspected_ids:['a','p'],
  inaccessible:1,inaccessible_ids:['v'],unreviewed:0,unreviewed_ids:[],reviewed_at:now,
  qualification_only_ids:['disabled'],
  inspection_rows:[
   {resource_id:'a',index_url:'https://paper.example/index',
    original_item_url:'https://paper.example/nov14-study',observed_at:'2026-11-14T23:20:00Z',
    outcome:'full_dated_item_read'},
   {resource_id:'p',index_url:'https://podcasts.example/latest',
    observed_at:'2026-11-14T23:22:00Z',outcome:'bounded_public_index_search'}
  ]}}};
}
test('historical edition remains immutable and future bound partition reports true depth',()=>{
 assert.equal(validateBoundEditorialIndex({bundle:{edition_date:'2026-11-14'},registry}).result,'SKIPPED_HISTORICAL');
 const r=validateBoundEditorialIndex({bundle:fixture(),registry});
 assert.equal(r.result,'PASS');assert.equal(r.eligible,3);
 assert.equal(r.full_original_item_rows,1);assert.equal(r.index_only_rows,1);
});
test('future receipts fail for invented inspections and unaccounted eligible source IDs',()=>{
 const mutate=[
  x=>x.source_discovery_audit.index_review.inspection_rows.pop(),
  x=>x.source_discovery_audit.index_review.inspected_ids.push('disabled'),
  x=>x.source_discovery_audit.index_review.inaccessible_ids.push('p'),
  x=>x.source_discovery_audit.index_review.eligible_ids=['a','v','p'],
  x=>x.source_discovery_audit.index_review.reviewed_at='2026-11-15T01:00:00Z',
  x=>x.source_discovery_audit.index_review.inspection_rows[0].original_item_url=undefined,
  x=>x.source_discovery_audit.index_review.inspection_rows[0].observed_at='2026-11-14T23:40:00Z',
  x=>x.source_discovery_audit.index_review.qualification_only_ids=['v']
 ];
 for(const fn of mutate){const b=fixture();fn(b);assert.throws(()=>validateBoundEditorialIndex({bundle:b,registry}),/editorial_index_certification/);}
});
test('current source discovery gate invokes exact enabled-ID certification prospectively',()=>{
 const code=fs.readFileSync('compiler/recent-source-discovery.mjs','utf8');
 assert.match(code,/validateBoundEditorialIndex\(\{bundle,registry\}\)/);
});
