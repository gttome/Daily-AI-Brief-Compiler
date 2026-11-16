import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {summarizeTop10} from '../scripts/top10-aar.mjs';
import {initializeTrendSearchCoverage} from '../operations/editorial-research-plan.mjs';
import {canonicalVideoTitle} from '../scripts/preseal-video-playback.mjs';

const cycle='2026-11-16',edition='2026-11-17',sha40='a'.repeat(40);
function fixture(){
 const report={schema_version:'daily-ai-topic-top10-v1',report_date:cycle,target_edition_date:edition,
  timezone:'America/Chicago',generated_at:'2026-11-16T23:05:00Z',status:'provisional',
  limitations:['Only bounded public metadata was available; rank is a research discovery order.'],
  topics:Array.from({length:10},(_,i)=>({rank:i+1,topic_id:'event-original-'+(i+1),
    name:'Distinct event '+(i+1),summary:'Research and evidence for a concrete topic.',confidence:'medium',
    suggested_searches:{article:'exact article query '+i,video:'exact video query '+i,podcast:'exact podcast query '+i},
    evidence:[{source_url:'https://example.org/source/'+i}]}))};
 const hash=crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
 const src={schema_version:'daily-ai-topic-top10-source-v1',cycle_date:cycle,edition_date:edition,
  source_path:'signals/ai-topic-top10/'+cycle+'.json',source_commit:sha40,source_blob_sha:'b'.repeat(40),
  report_sha256:hash,observed_at:'2026-11-17T01:15:20Z'};
 const input={schema_version:'daily-ai-topic-top10-trend-input-v1',cycle_date:cycle,edition_date:edition,
  report_date:cycle,source_path:src.source_path,source_commit:src.source_commit,source_blob_sha:src.source_blob_sha,
  report_sha256:hash,retrieved_at:'2026-11-17T01:15:00Z',report:structuredClone(report)};
 const coverage=initializeTrendSearchCoverage(edition,input);
 coverage.searches=coverage.searches.map(x=>({...x,outcome:'searched',attempted_at:'2026-11-17T01:30:00Z',
  source_urls:['https://example.org/search/'+x.topic_id+'/'+x.format],candidate_ids:[],
  reason:'Actual bounded source discovery for this exact event and publication format.'}));
 const bundle={edition_date:edition,editorial_provenance:{selection_locked_at:'2026-11-17T02:05:00Z'},stories:[],videos:[],podcasts:[]};
 const e={'top10-report':report,'top10-report-source':src,'trend-input':input,
   'trend-search-coverage':coverage,'edition-bundle':bundle};
 return {e,h:{'top10-report':hash}};
}
test('new-edition Top 10 search requires 30 exact event-and-format identities',()=>{
 const x=fixture();const got=summarizeTop10(cycle,edition,x.e,x.h);
 assert.equal(got.search_status,'RECEIPTS_OBSERVED');
 assert.equal(got.search_identity_policy,'EXACT_CONSUMED_TOPIC_AND_FORMAT_QUERY');
 assert.equal(got.search_counts.article.attempted,10);
 assert.deepEqual(new Set(x.e['trend-search-coverage'].searches.map(r=>r.topic_id)),
   new Set(x.e['top10-report'].topics.map(t=>t.topic_id)));
});
test('generic IDs, mismatched queries, duplicate slots and fake search landing URLs fail closed',()=>{
 for(const change of [
  rows=>{rows[0].topic_id='topic-01';},
  rows=>{rows[0].query='unrelated unrelated query';},
  rows=>{rows.push({...rows[0],attempted_at:'2026-11-17T01:31:00Z'});},
  rows=>{rows[0].source_urls=['https://www.google.com/search'];},
  rows=>{rows[0].source_urls=['https://www.youtube.com/results'];},
  rows=>{rows[0].attempted_at='2026-11-17T03:30:00Z';}
 ]){
  const x=fixture();change(x.e['trend-search-coverage'].searches);
  assert.equal(summarizeTop10(cycle,edition,x.e,x.h).search_status,'INVALID');
 }
});
test('exact generation plan starts with zero attempts and cannot manufacture editorial research',()=>{
 const x=fixture(),p=initializeTrendSearchCoverage(edition,x.e['trend-input']);
 assert.equal(p.searches.length,30);
 assert.ok(p.searches.every(s=>s.outcome==='not_attempted'&&s.attempted_at===null&&
  s.source_urls.length===0));
});
test('video display punctuation is normalized but URL and duration are not transformed',()=>{
 assert.equal(canonicalVideoTitle("What Huang’s resignation means"),canonicalVideoTitle("What Huang's resignation means"));
 assert.equal(canonicalVideoTitle('Cafe\u0301'),canonicalVideoTitle('Café'));
 assert.notEqual(canonicalVideoTitle('Short preview'),canonicalVideoTitle('Full episode'));
});
test('report packaging keeps the collector and its transitive operations modules together',()=>{
 const workflow=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');
 assert.match(workflow,/cp scripts\/collect-top10-consumed-report\.mjs "\$tmp\/scripts\/"/);
 assert.match(workflow,/cp operations\/top10-handoff-check\.mjs operations\/top10-input-identity\.mjs "\$tmp\/operations\/"/);
 assert.match(workflow,/cp scripts\/top10-aar\.mjs "\$tmp\/top10-aar\.mjs"/);
});

test('paper-cadence upgrade changes only prospective editions, not historical seven-edition evidence',async()=>{
 const {buildScientificPaperCadence}=await import('../operations/scientific-paper-cadence.mjs');
 const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 assert.equal(buildScientificPaperCadence({editionDate:'2026-11-16',registry}).window_editions,7);
 const future=buildScientificPaperCadence({editionDate:edition,registry});
 assert.equal(future.window_editions,3);
 assert.equal(future.nonblocking,true);
 assert.match(future.selection_rule,/three|3 editions/);
});
test('bounded receipt repair never upgrades invalid search rows into completed research',async()=>{
 const {spawnSync}=await import('node:child_process');
 const os=await import('node:os'),path=await import('node:path');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'top10-exact-'));
 try{
  const f=fixture();
  const input=path.join(folder,'input.json'),old=path.join(folder,'old.json'),out=path.join(folder,'output.json');
  const coverage=f.e['trend-search-coverage'];
  coverage.searches[0].topic_id='topic-01';
  coverage.searches[1].query='unrelated search';
  coverage.searches[2].source_urls=['https://www.google.com/search'];
  fs.writeFileSync(input,JSON.stringify(f.e['trend-input']));
  fs.writeFileSync(old,JSON.stringify(coverage));
  const run=spawnSync(process.execPath,['scripts/prepare-top10-search-receipts.mjs',input,old,out],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const got=JSON.parse(fs.readFileSync(out));
  assert.equal(got.searches.length,30);
  assert.equal(got.receipt_recovery.genuine_attempts_preserved,27);
  assert.equal(got.receipt_recovery.remaining_real_searches,3);
  assert.equal(got.searches.filter(x=>x.outcome==='not_attempted').length,3);
  assert.equal(got.selected_mappings.length,0);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
