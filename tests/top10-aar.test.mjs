import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {summarizeTop10,renderTop10Section} from '../scripts/top10-aar.mjs';

const cycle='2026-11-02',edition='2026-11-03';
const commit='a'.repeat(40),blob='b'.repeat(40);
function fixture(){
 const report={schema_version:'daily-ai-topic-top10-v1',report_date:cycle,target_edition_date:edition,
  timezone:'America/Chicago',generated_at:'2026-11-02T23:30:00Z',status:'provisional',
  sample_scope:'42 recent videos across distinct public channels; counters are third-party snapshots.',
  ranking_basis:'Distinct channel breadth, timestamped engagement and independent source coverage.',limitations:['No retention or impression metrics were available.'],
  topics:Array.from({length:10},(_,i)=>({topic_id:'topic-'+(i+1),rank:i+1,name:'AI topic '+(i+1),
   summary:'A distinct research topic supported by current original evidence.',confidence:'medium',
   suggested_searches:{article:'original research '+i,video:'independent analysis '+i,podcast:'episode topic '+i},
   evidence:[{url:'https://example.com/source/'+i,observed_at:'2026-11-02T23:20:00Z',metrics:{views:null}}],limitations:[]})),video_snapshots:[]};
 const hash=crypto.createHash('sha256').update(JSON.stringify(report,null,2)+'\n').digest('hex');
 const source={schema_version:'daily-ai-topic-top10-source-v1',cycle_date:cycle,edition_date:edition,
  source_commit:commit,source_blob_sha:blob,source_path:'signals/ai-topic-top10/'+cycle+'.json',report_sha256:hash,
  observed_at:'2026-11-05T15:00:00Z'};
 const input={schema_version:'daily-ai-topic-top10-input-v1',cycle_date:cycle,edition_date:edition,report_date:cycle,
  source_commit:'c'.repeat(40),source_blob_sha:blob,source_path:source.source_path,report_sha256:hash,
  retrieved_at:'2026-11-03T01:15:00Z',report:structuredClone(report)};
 const coverage={schema_version:'daily-ai-topic-top10-search-coverage-v1',cycle_date:cycle,edition_date:edition,
  source_commit:input.source_commit,report_sha256:hash,
  searches:report.topics.flatMap(t=>['article','video','podcast'].map(format=>({topic_id:t.topic_id,format,
   query:t.name+' '+format,attempted_at:'2026-11-03T01:20:00Z',source_urls:['https://example.com/search/'+t.topic_id+'/'+format],
   outcome:'searched',reason:'Reviewed original sources for fresh qualifying content.',candidate_ids:[]}))),
  selected_mappings:[{topic_id:'topic-1',format:'article',item_id:'story-1',url:'https://example.com/article/1',
   reason:'The source adds a new practical reader decision.'}]};
 const aar={schema_version:'daily-ai-topic-top10-run-aar-v1',cycle_date:cycle,edition_date:edition,
  started_at:'2026-11-02T23:00:00Z',finished_at:'2026-11-02T23:30:00Z',usage_percent:null,cost_usd:null,
  errors:['One public source withheld counters.'],improvements:['Compare the next timestamped view snapshot.']};
 return {e:{'top10-report':report,'top10-report-source':source,'trend-input':input,
  'trend-search-coverage':coverage,'top10-after-action':aar,
  'edition-bundle':{edition_date:edition,stories:[{id:'story-1',source:{url:'https://example.com/article/1'}}],
   videos:[{id:'video-1',url:'https://example.com/video/1'}],podcasts:[{url:'https://example.com/podcast/1'}]}},h:{'top10-report':hash}};
}

test('missing reports are unknown after activation, not retroactive failures before it',()=>{
 const missing=summarizeTop10(cycle,edition,{});
 assert.equal(missing.result,'NOT_OBSERVED');assert.equal(missing.handoff_status,'NOT_OBSERVED');
 assert.equal(missing.cost_usd,null);assert.equal(missing.usage_percent,null);assert.equal(missing.elapsed_minutes,null);
 assert.equal(missing.end_to_end_ready,false);
 const previous=summarizeTop10('2026-11-01','2026-11-02',{});
 assert.equal(previous.result,'NOT_APPLICABLE');assert.equal(previous.applicable,false);
});

test('full list, exact bytes and separate search receipts remain inspectable without claiming autonomy',()=>{
 const {e,h}=fixture();const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.report_valid,true);assert.equal(s.report_status,'provisional');assert.equal(s.topic_count,10);
 assert.equal(s.handoff_status,'RECEIVED_SNAPSHOT_BOUND');assert.equal(s.search_status,'RECEIPTS_OBSERVED');
 assert.equal(s.end_to_end_ready,true);assert.equal(s.autonomy_status,'UNPROVEN');assert.equal(s.elapsed_minutes,30);
 assert.equal(s.source_commit,commit);assert.equal(s.consumed_source_commit,'c'.repeat(40));
 assert.equal(s.search_counts.podcast.attempted,10);assert.equal(s.selected_mappings[0].item_id,'story-1');
 const md=renderTop10Section(s);
 for(let i=1;i<=10;i++)assert.match(md,new RegExp('AI topic '+i+' \\|'));
 assert.match(md,/No retention or impression metrics/);assert.match(md,/story-1/);assert.match(md,/Cost USD \| Not reported/);
 assert.match(md,/report labels its ranking provisional/);assert.match(md,/One public source withheld counters/);
});

test('later AAR collection does not make an originally fresh consumed report stale',()=>{
 const {e,h}=fixture();const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.report_freshness,'FRESH_AT_CONSUMPTION');assert.equal(s.end_to_end_ready,true);
});

test('stale or future-at-consumption reports cannot prove handoff',()=>{
 for(const [retrieved,freshness] of [['2026-11-04T01:15:00Z','STALE_AT_CONSUMPTION'],['2026-11-02T22:00:00Z','FUTURE_AT_CONSUMPTION']]){
  const {e,h}=fixture();e['trend-input'].retrieved_at=retrieved;
  const s=summarizeTop10(cycle,edition,e,h);
  assert.equal(s.report_freshness,freshness);assert.equal(s.handoff_status,'INVALID');assert.equal(s.end_to_end_ready,false);
 }
});

test('a wrong target or wrong Chicago report date is never treated as the current Top 10',()=>{
 const {e,h}=fixture();e['top10-report'].target_edition_date='2026-11-04';
 let s=summarizeTop10(cycle,edition,e,h);assert.equal(s.result,'INVALID');assert.equal(s.report_valid,false);assert.deepEqual(s.topics,[]);
 const second=fixture();second.e['top10-report'].generated_at='2026-11-03T07:00:00Z';
 s=summarizeTop10(cycle,edition,second.e,second.h);assert.equal(s.report_valid,false);
});

test('raw report hash, snapshot and blob mismatches invalidate claimed receipt binding',()=>{
 for(const mutate of [
  ({e})=>{e['trend-input'].report_sha256='0'.repeat(64);},
  ({h})=>{h['top10-report']='0'.repeat(64);},
  ({e})=>{e['trend-input'].report.topics[0].name='Different topic';},
  ({e})=>{e['trend-input'].source_blob_sha='0'.repeat(40);},
  ({e})=>{e['top10-report-source'].observed_at='2026-11-02T22:00:00Z';}
 ]){
  const f=fixture();mutate(f);const s=summarizeTop10(cycle,edition,f.e,f.h);
  assert.equal(s.handoff_status,'INVALID');assert.equal(s.end_to_end_ready,false);
 }
});

test('source claims alone cannot independently prove exact-byte readback',()=>{
 const {e}=fixture();const s=summarizeTop10(cycle,edition,e);
 assert.equal(s.report_valid,true);assert.equal(s.report_sha256,null);assert.equal(s.handoff_status,'INVALID');
 assert.equal(s.autonomy_status,'UNPROVEN');
});

test('report presence never implies the Compiler searched any format',()=>{
 const {e,h}=fixture();delete e['trend-search-coverage'];
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.handoff_status,'RECEIVED_SNAPSHOT_BOUND');assert.equal(s.search_status,'NOT_OBSERVED');assert.equal(s.end_to_end_ready,false);
 assert.equal(s.search_counts.video.attempted,0);
});

test('fabricated selected items or wrong selected URLs are not validated by a syntactic mapping receipt',()=>{
 for(const mutate of [
  e=>{e['trend-search-coverage'].selected_mappings[0].item_id='not-selected';},
  e=>{e['trend-search-coverage'].selected_mappings[0].url='https://example.com/not-selected';},
  e=>{e['edition-bundle'].stories=[];}
 ]){
  const {e,h}=fixture();mutate(e);const s=summarizeTop10(cycle,edition,e,h);
  assert.equal(s.selection_mapping_status,'INVALID');assert.deepEqual(s.selected_mappings,[]);
  assert.equal(s.end_to_end_ready,false);assert.match(renderTop10Section(s),/No validated selection-to-topic mapping/);
 }
});

test('missing or another edition bundle leaves claimed selection mappings unverified',()=>{
 for(const mutate of [e=>{delete e['edition-bundle'];},e=>{e['edition-bundle'].edition_date='2026-11-04';}]){
  const {e,h}=fixture();mutate(e);const s=summarizeTop10(cycle,edition,e,h);
  assert.equal(s.selection_mapping_status,'UNVERIFIED_BUNDLE_MISSING');assert.deepEqual(s.selected_mappings,[]);
  assert.equal(s.selection_mappings_reported,1);assert.equal(s.search_status,'RECEIPTS_OBSERVED');
  assert.equal(s.end_to_end_ready,false);
 }
});

test('media mappings require actual selected URL and actual identity, with URL fallback only if no id exists',()=>{
 const {e,h}=fixture();const mappings=e['trend-search-coverage'].selected_mappings;
 mappings.push({topic_id:'topic-1',format:'video',item_id:'video-1',url:'https://example.com/video/1',reason:'Selected independent video.'});
 mappings.push({topic_id:'topic-2',format:'podcast',item_id:'https://example.com/podcast/1',url:'https://example.com/podcast/1',reason:'Selected current episode.'});
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.selection_mapping_status,'MATCHES_EDITION_BUNDLE');assert.equal(s.selected_mappings.length,3);
 assert.equal(s.end_to_end_ready,true);
 mappings[2].item_id='invented-podcast-id';
 assert.equal(summarizeTop10(cycle,edition,e,h).selection_mapping_status,'INVALID');
});

test('an explicitly empty mapping does not invent trend-aligned selection or require a bundle',()=>{
 const {e,h}=fixture();delete e['edition-bundle'];e['trend-search-coverage'].selected_mappings=[];
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.selection_mapping_status,'NONE_RECORDED');assert.deepEqual(s.selected_mappings,[]);
 assert.equal(s.end_to_end_ready,true);
});

test('duplicate, missing, foreign-date or source-free searches cannot imply full research coverage',()=>{
 for(const mutate of [
  e=>e['trend-search-coverage'].searches.pop(),
  e=>e['trend-search-coverage'].searches.push(e['trend-search-coverage'].searches[0]),
  e=>{e['trend-search-coverage'].cycle_date='2026-11-03';},
  e=>{e['trend-search-coverage'].searches[0].source_urls=[];},
  e=>{e['trend-search-coverage'].searches[0].attempted_at='2026-11-02T23:00:00Z';}
 ]){
  const {e,h}=fixture();mutate(e);const s=summarizeTop10(cycle,edition,e,h);
  assert.equal(s.search_status,'INVALID');assert.equal(s.end_to_end_ready,false);
 }
});

test('explicit skipped searches are disclosed but never end-to-end complete',()=>{
 const {e,h}=fixture();const row=e['trend-search-coverage'].searches[0];
 row.outcome='not_attempted';row.attempted_at=null;row.source_urls=[];
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.search_status,'RECEIPTS_OBSERVED');assert.equal(s.search_counts.article.not_attempted,1);
 assert.equal(s.search_counts.article.attempted,9);assert.equal(s.end_to_end_ready,false);
});

test('all-not-attempted coverage proves only explicit skips, not completed searches',()=>{
 const {e,h}=fixture();
 for(const row of e['trend-search-coverage'].searches){row.outcome='not_attempted';row.attempted_at=null;row.source_urls=[];}
 e['trend-search-coverage'].selected_mappings=[];
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.search_status,'RECEIPTS_OBSERVED');assert.equal(s.end_to_end_ready,false);
 for(const format of ['article','video','podcast']){
  assert.equal(s.search_counts[format].attempted,0);assert.equal(s.search_counts[format].not_attempted,10);
 }
});

test('several genuinely different queries for a topic are preserved as attempts',()=>{
 const {e,h}=fixture();const extra=structuredClone(e['trend-search-coverage'].searches[0]);
 extra.query='Alternative original-source article search';e['trend-search-coverage'].searches.push(extra);
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.search_status,'RECEIPTS_OBSERVED');assert.equal(s.end_to_end_ready,true);
 assert.equal(s.search_counts.article.attempted,11);
});

test('impossible producer timing is not reported as a measured duration',()=>{
 const {e,h}=fixture();e['top10-after-action'].finished_at='2026-11-06T00:00:00Z';
 assert.equal(summarizeTop10(cycle,edition,e,h).elapsed_minutes,null);
});

test('partial rankings and unavailable metrics stay partial and are not padded',()=>{
 const {e,h}=fixture();const r=e['top10-report'];r.status='partial';r.topics=r.topics.slice(0,3);
 delete e['trend-input'];delete e['trend-search-coverage'];
 const s=summarizeTop10(cycle,edition,e,h);
 assert.equal(s.report_valid,true);assert.equal(s.topic_count,3);assert.equal(s.result,'PARTIAL');
 assert.equal(s.end_to_end_ready,false);assert.equal(s.topics.length,3);assert.equal(s.cost_usd,null);
});

test('untrusted topic text is escaped in Markdown tables',()=>{
 const {e,h}=fixture();e['top10-report'].topics[0].name='AI | <script> [bad](https://evil.example)';
 const s=summarizeTop10(cycle,edition,e,h);const md=renderTop10Section(s);
 assert.ok(md.includes('AI \\| &lt;script&gt; \\[bad\\]'));assert.ok(!md.includes('<script>'));
});
