import test from 'node:test';
import assert from 'node:assert/strict';
import {
 originalVideoFamily,verifiedVideoFamilies,verifiedVideoDiscovery,rollingVideoDiversity
} from '../scripts/video-publisher-analytics.mjs';
import {buildMetrics,renderMetricsMarkdown,OBSERVATION_SCHEMA} from '../scripts/aar-improvement-metrics.mjs';

const groups=['cbs','fox-news','pbs','ted'];
const urls={
 cbs:'https://www.cbsnews.com/video/review/',
 'fox-news':'https://www.foxnews.com/video/1234567890',
 pbs:'https://www.pbs.org/video/complete-documentary/',
 ted:'https://www.ted.com/talks/original_speaker'
};
const video=family=>({source:family,url:urls[family]??'https://research-university.edu/videos/program',
 verification:{identity_verified:true,duration_verified:true,content_reviewed:true,playback_verified:true}});
const dates=['2026-11-07','2026-11-08','2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13'];
const pairs=[['cbs','fox-news'],['cbs','pbs'],['cbs','fox-news'],['cbs','fox-news'],['pbs','ted'],['cbs','ted'],['pbs','cbs']];
const observations=pairs.map((pair,i)=>({
 edition_date:dates[i],
 video_publisher_families:verifiedVideoFamilies(
  {edition_date:dates[i],videos:pair.map(video)},dates[i],true)
}));
test('actual Nov 7–13 video mix fails seven-edition variety even though every daily pair has two publishers',()=>{
 const x=rollingVideoDiversity(observations,'2026-11-13');
 assert.equal(x.status,'COMPLETE');
 assert.equal(x.selected_slots,14);
 assert.deepEqual(x.selected_family_counts,{'cbs':6,'fox-news':3,'pbs':3,'ted':2});
 assert.equal(x.distinct_families,4);
 assert.equal(x.largest_family_selections,6);
 assert.equal(x.concentration_hhi,0.2959);
 assert.equal(x.variety_target_status,'NOT_MET');
 assert.equal(x.adjacent_edition_family_repeats,6);
});
test('unobserved and invalid publisher identity never produce invented seven-edition pass',()=>{
 const broken=structuredClone(observations);
 broken[3].video_publisher_families={status:'NOT_RECORDED',families:[]};
 const m=rollingVideoDiversity(broken,'2026-11-13');
 assert.equal(m.status,'INCOMPLETE');
 assert.equal(m.variety_target_status,'NOT_EVALUABLE');
 assert.equal(m.recorded_editions,6);
 assert.equal(originalVideoFamily({source:'Potential university',
  url:'https://youtube.com/watch?v=something',
  verification:{identity_verified:true}}),null);
 assert.equal(verifiedVideoFamilies({edition_date:'2026-11-13',
  videos:[video('cbs'),video('cbs')]},'2026-11-13',true).status,'UNVERIFIED_OR_DUPLICATE_ORIGIN');
});
test('a genuinely diversified fully observed future week passes only real numeric targets',()=>{
 const varied=[['cbs','fox-news'],['pbs','ted'],['cbs','ibm'],['fox-news','ted'],
  ['pbs','fortune'],['cbs','ibm'],['fox-news','fortune']];
 const urls2={ibm:'https://www.ibm.com/think/videos/new-video',fortune:'https://fortune.com/video/new-video'};
 const data=varied.map((pair,i)=>{
  const videos=pair.map(family=>family in urls2?{source:family,url:urls2[family],verification:{identity_verified:true}}:video(family));
  return {edition_date:dates[i],video_publisher_families:verifiedVideoFamilies(
   {edition_date:dates[i],videos},dates[i],true)};
 });
 const m=rollingVideoDiversity(data,'2026-11-13');
 assert.equal(m.distinct_families,6);assert.equal(m.largest_family_selections,3);
 assert.equal(m.variety_target_status,'MET');
});
test('video discovery distinguishes URL yields from verified playback, and rejects fake source coverage',()=>{
 const scan={edition_date:'2026-11-13',registered:4,attempted:4,candidate_sources:2,
  source_outcomes:[{resource_id:'a',outcome:'CANDIDATES_FOUND'},
   {resource_id:'b',outcome:'NO_RELEVANT_VIDEO'},
   {resource_id:'c',outcome:'CANDIDATES_FOUND'},
   {resource_id:'d',outcome:'NO_RELEVANT_VIDEO'}]};
 const x=verifiedVideoDiscovery(scan,'2026-11-13');
 assert.equal(x.status,'RECORDED');assert.equal(x.candidate_yield_percent,50);
 assert.match(x.interpretation,/not proof/);
 scan.source_outcomes[3].resource_id='a';
 assert.equal(verifiedVideoDiscovery(scan,'2026-11-13').status,'INVALID_UNBOUND_SWEEP');
 assert.equal(verifiedVideoDiscovery(scan,'2026-11-14').status,'NOT_RECORDED');
});
test('AAR integrates rolling video concentration as corrective action without changing any release or image gate',()=>{
 const rows=observations.map(x=>({
 ...x,schema_version:OBSERVATION_SCHEMA,metrics:{},failures:null,
 source_set_sha256:null,change_evaluations:[]
 }));
 const m=buildMetrics({edition:'2026-11-13',observations:rows,registry:{resources:[]},
  register:{schema_version:'daily-aar-improvement-register-v1',changes:[]}});
 assert.equal(m.video_publisher_diversity.variety_target_status,'NOT_MET');
 assert.equal(m.daily_action_review.findings.some(x=>x.id==='VIDEO_PUBLISHER_CONCENTRATION'),true);
 const md=renderMetricsMarkdown(m);
 assert.match(md,/Video publisher diversity and candidate qualification/);
 assert.match(md,/A discovered URL is not a fully reviewed/);
 assert.match(md,/Owner-independent recovery evidence/);
});
