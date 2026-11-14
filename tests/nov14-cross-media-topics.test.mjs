import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateMediaTopicDiversity} from '../compiler/media-topic-diversity.mjs';

const urls=['https://video-one.example/item','https://video-two.example/item',
 'https://podcast-one.example/episode/1','https://podcast-two.example/episode/2'];
const time='2026-11-14T23:30:00Z';
const eventIds=['2026-11-13-repository-security-api','2026-11-12-separate-agent-release',
 '2026-11-11-original-research-interview','2026-11-13-trust-governance-study'];
const message='Original media scope was checked against the actual source and describes a different dated development, not an alternate headline for the same incident.';
const comparison=(a,b)=>({left_url:a,right_url:b,same_event:false,
 distinct_event_evidence:message});
function fixture(){
 const selected=[{url:urls[0]},{url:urls[1]}],podcasts=[{url:urls[2]},{url:urls[3]}];
 return {edition_date:'2026-11-15',videos:selected,podcasts,
 editorial_provenance:{selection_locked_at:'2026-11-14T23:40:00Z'},
 media_topic_review:{schema_version:'daily-brief-media-topic-review-v1',reviewed_at:time,
 reviewer:'Editorial owner',
 programs:urls.map((url,i)=>({program_url:url,format:i<2?'video':'podcast',
  event_id:eventIds[i],source_evidence_url:url,source_scope:message,
  reader_question:'Which distinct decision can the audience make with this verified source?',
  distinct_contribution:message,reviewed_at:'2026-11-14T23:25:00Z'})),
 comparisons:urls.flatMap((url,i)=>urls.slice(i+1).map(other=>comparison(url,other)))}
 };
}
test('prior released edition is immutable under prospective event-diversity control',()=>{
 assert.equal(validateMediaTopicDiversity({edition_date:'2026-11-14'}).result,'SKIPPED_HISTORICAL');
});
test('new selection documents four distinct events and all six cross-media comparisons',()=>{
 const b=fixture(),result=validateMediaTopicDiversity(b);
 assert.equal(result.result,'PASS');
 assert.equal(result.pairwise_reviews,6);
 assert.equal(result.independent_semantic_truth_not_inferred,true);
});
test('different publishers covering the same underlying event must not pass',()=>{
 const b=fixture();
 b.media_topic_review.programs[1].event_id=b.media_topic_review.programs[0].event_id;
 assert.throws(()=>validateMediaTopicDiversity(b),/same_original_event_selected_more_than_once/);
});
test('missing media, invented comparisons, post-lock review and absent evidence fail',()=>{
 const cases=[
  b=>b.media_topic_review.comparisons.pop(),
  b=>b.media_topic_review.comparisons[0].same_event=true,
  b=>b.media_topic_review.programs[0].source_scope='not reviewed',
  b=>b.media_topic_review.reviewed_at='2026-11-14T23:59:00Z',
  b=>b.media_topic_review.programs[0].program_url='https://made-up.example/program',
  b=>b.media_topic_review.comparisons[0].left_url=urls[2],
  b=>b.media_topic_review.comparisons[0].right_url=urls[0],
  b=>b.media_topic_review.programs[0].reviewed_at='2026-11-15T00:00:00Z'
 ];
 for(const mutate of cases){const b=fixture();mutate(b);
  assert.throws(()=>validateMediaTopicDiversity(b),/media_topic_diversity/);}
});
test('existing media precision has future validator connected',()=>{
 const src=fs.readFileSync('compiler/production-evidence.mjs','utf8');
 assert.match(src,/validateMediaTopicDiversity\(bundle\)/);
});
