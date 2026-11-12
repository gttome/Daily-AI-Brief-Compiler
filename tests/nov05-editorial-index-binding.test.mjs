import test from 'node:test';
import assert from 'node:assert/strict';
import {attachEditorialIndexReview,validateEditorialIndexReview} from '../scripts/attach-editorial-index-review.mjs';

function fixture(){
 return {
  registry:{resources:[
   {resource_id:'a',enabled:true,content_types:['article']},
   {resource_id:'v',enabled:true,content_types:['video']},
   {resource_id:'p',enabled:true,content_types:['podcast']},
   {resource_id:'disabled',enabled:false,content_types:['article']} ]},
  indexReview:{schema_version:'daily-compiler-index-review-v1',edition_date:'2026-11-06',
   eligible_count:3,reviewed_at:'2026-11-06T00:15:00Z',selection_locked_at:'2026-11-06T00:17:00Z',
   inspected_ids:['a','p'],inaccessible_ids:[],unreviewed_ids:['v']},
  bundle:{edition_date:'2026-11-06',editorial_provenance:{selection_locked_at:'2026-11-06T00:19:00Z'},
   source_discovery_audit:{reviewed_at:'2026-11-06T00:19:00Z',candidates:[{url:'https://example.org/story'}]}}
 };
}
test('binds genuine source IDs and original review clock without touching candidate audit',()=>{
 const input=fixture(),got=attachEditorialIndexReview(input),idx=got.source_discovery_audit.index_review;
 assert.equal(idx.eligible,3);assert.equal(idx.inspected,2);assert.equal(idx.unreviewed,1);
 assert.deepEqual(idx.eligible_ids,['a','p','v']);
 assert.equal(idx.reviewed_at,'2026-11-06T00:15:00Z');
 assert.equal(got.source_discovery_audit.reviewed_at,'2026-11-06T00:19:00Z');
 assert.deepEqual(input.bundle.source_discovery_audit.index_review,undefined);
});

test('records qualification-only leads outside the eligible partition and preserves actual inspection depth',()=>{
 const input=fixture();
 input.registry.resources[3].content_types=['video'];
 input.indexReview.qualification_only_ids=['disabled'];
 input.indexReview.inspection_rows=[
  {resource_id:'a',index_url:'https://articles.example/index',observed_at:'2026-11-06T00:14:00Z',
   outcome:'full_dated_item_read',original_item_url:'https://articles.example/article'},
  {resource_id:'p',index_url:'https://audio.example/index',observed_at:'2026-11-06T00:15:00Z',
   outcome:'bounded_public_index_search'}
 ];
 const index=validateEditorialIndexReview(input);
 assert.equal(index.eligible,3);
 assert.deepEqual(index.qualification_only_ids,['disabled']);
 assert.equal(index.inspection_rows[0].original_item_url,'https://articles.example/article');
 input.indexReview.inspection_rows[0].original_item_url=undefined;
 assert.throws(()=>validateEditorialIndexReview(input),/INSPECTION_EVIDENCE/);
 input.indexReview.inspection_rows[0].original_item_url='https://articles.example/article';
 input.indexReview.inspected_ids=['a','disabled'];
 assert.throws(()=>validateEditorialIndexReview(input),/PARTITION/);
});
test('rejects false partitions, stale clocks, disabled entries and sealed bundles',()=>{
 for(const mutate of [
  x=>x.indexReview.inspected_ids.push('v'),
  x=>x.indexReview.inspected_ids.push('disabled'),
  x=>x.indexReview.eligible_count=87,
  x=>x.indexReview.reviewed_at='2026-11-06T00:20:00Z',
  x=>x.bundle.editorial_provenance.sealed_at='2026-11-06T00:21:00Z']){
  const v=fixture();mutate(v);
  assert.throws(()=>attachEditorialIndexReview(v),/EDITORIAL_INDEX_BINDING_/);
 }
});
