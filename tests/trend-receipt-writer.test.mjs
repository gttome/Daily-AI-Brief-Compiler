import test from 'node:test';
import assert from 'node:assert/strict';
import {recordTrendSearch,recordSelectedTrendMapping} from '../operations/trend-receipt-writer.mjs';

const input={schema_version:'daily-ai-topic-top10-input-v1',edition_date:'2026-11-12',
 cycle_date:'2026-11-11',source_commit:'a'.repeat(40),report_sha256:'b'.repeat(64),
 retrieved_at:'2026-11-12T01:10:00Z'};
const base=()=>({schema_version:'daily-ai-topic-top10-search-coverage-v1',
 edition_date:input.edition_date,cycle_date:input.cycle_date,
 source_commit:input.source_commit,report_sha256:input.report_sha256,
 searches:[{topic_id:'topic-1',format:'article',query:'original paper about reliable agents',
   attempted_at:null,outcome:'not_attempted',source_urls:[],candidate_ids:[],
   reason:'No source has yet been inspected for this topic and format.'}],
 selected_mappings:[]});
const good={topic_id:'topic-1',format:'article',query:'original paper about reliable agents',
 attempted_at:'2026-11-12T01:11:00Z',outcome:'searched',
 source_urls:['https://arxiv.org/abs/2611.12345'],candidate_ids:['candidate-1'],
 reason:'The actual original scientific paper was opened and its evidence recorded.'};
test('current genuine source observation is written in canonical fields without mutating the input',()=>{
 const before=base(),next=recordTrendSearch(before,input,good);
 assert.equal(before.searches[0].outcome,'not_attempted');assert.equal(next.searches[0].outcome,'searched');
 assert.deepEqual(next.searches[0].source_urls,good.source_urls);
 assert.equal(next.searches[0].attempted_at,good.attempted_at);
});
test('noncanonical labels, missing source links, future/early attempts, duplicated searches are rejected',()=>{
 const invalid=[{...good,outcome:'candidate_discovered'}, {...good,source_urls:[]},
  {...good,attempted_at:'2026-11-12T01:09:00Z'},
  {...good,query:'made up query'}, {...good,reason:'too short'},
  {...good,source_urls:['http://arxiv.org/abs/2611.12345']}];
 for(const row of invalid)assert.throws(()=>recordTrendSearch(base(),input,row),/TREND_RECEIPT_/);
 assert.throws(()=>recordTrendSearch(base(),input,good,{selectionLockedAt:'2026-11-12T01:10:30Z'}),/UNPROVEN_SEARCH_CHRONOLOGY/);
 assert.throws(()=>recordTrendSearch(recordTrendSearch(base(),input,good),input,good),/UNKNOWN_OR_ALREADY_OBSERVED_PAIR/);
});
test('a genuine no-result outcome requires an actual checked URL but no invented candidates',()=>{
 const missing={...good,outcome:'not_found',candidate_ids:[],
  source_urls:['https://arxiv.org/list/cs.AI/recent']};
 assert.equal(recordTrendSearch(base(),input,missing).searches[0].outcome,'not_found');
 assert.throws(()=>recordTrendSearch(base(),input,{...missing,source_urls:[]}),/MISSING_GENUINE_SOURCE_OR_QUERY_EVIDENCE/);
});
test('selected mappings use exact bundle ID/URL and search origin, never ordinal or unbound links',()=>{
 const coverage=recordTrendSearch(base(),input,good);
 const bundle={edition_date:input.edition_date,stories:[{id:'story-123',source:{url:good.source_urls[0]}}]};
 const mapping={topic_id:'topic-1',format:'article',item_id:'story-123',
  url:good.source_urls[0],reason:'This exact article was selected after reading the original research claim and limits.'};
 const next=recordSelectedTrendMapping(coverage,input,bundle,mapping);
 assert.deepEqual(next.selected_mappings,[mapping]);
 assert.deepEqual(coverage.selected_mappings,[]);
 for(const m of [{...mapping,item_id:'1'}, {...mapping,url:'https://example.com/not-actually-read'},
  {...mapping,reason:'short'}])
  assert.throws(()=>recordSelectedTrendMapping(coverage,input,bundle,m),/TREND_RECEIPT_/);
 assert.throws(()=>recordSelectedTrendMapping(next,input,bundle,mapping),/DUPLICATE_SELECTION/);
});
