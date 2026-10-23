import test from 'node:test';
import assert from 'node:assert/strict';
import {activeWatchlistTitleCollisions,requireDistinctWatchlistTitles} from '../compiler/watchlist-identity.mjs';
import {mediaCoverageLabel} from '../compiler/reader-materializer.mjs';
import {validateVideoPrequalification} from '../compiler/production-evidence.mjs';
import {checkPodcast} from '../compiler/media-quality.mjs';
import {validateRecentSourceDiscovery} from '../compiler/recent-source-discovery.mjs';
import {summarizeTaskOriginEvidence} from '../scripts/task-origin-evidence.mjs';

test('P0 Watchlist keeps distinct stable IDs but fails on duplicate active titles',()=>{
 const t=[{topic_id:'dab-topic-one',name:'Reusable skills become observable',status:'gaining_evidence'},
 {topic_id:'dab-topic-two',name:'Reusable skills become observable',status:'under_research'}];
 assert.equal(activeWatchlistTitleCollisions(t).length,1);
 assert.throws(()=>requireDistinctWatchlistTitles(t),/duplicate_active_watchlist_titles/);
 t[1].name='Governed skills require version ownership and review cycles';
 assert.equal(requireDistinctWatchlistTitles(t).active_unique_titles,2);
 t[1].name=t[0].name;t[1].status='archived';
 assert.equal(requireDistinctWatchlistTitles(t).active_unique_titles,1);
});

test('P0 older videos are not presented as new developments; episode age is original-date bound',()=>{
 assert.equal(mediaCoverageLabel('2026-10-23','2023-11-09','video'),'Evergreen instructional video');
 assert.equal(mediaCoverageLabel('2026-10-23','2024-02-23','video'),'Evergreen instructional video');
 assert.equal(mediaCoverageLabel('2026-10-23','2026-10-22','podcast'),'New AI podcast episode');
 assert.equal(mediaCoverageLabel('2026-10-23','2026-10-20','podcast'),'Recent AI podcast episode fallback');
 assert.throws(()=>mediaCoverageLabel('2026-10-24','2026-10-25','video'),/media_original_date_invalid/);
});

const videos=Array.from({length:6},(_,i)=>({
 url:'https://'+['openai.com','ibm.com','microsoft.com'][i%3]+'/lessons/episode-'+i,
 title:'Verified substantive instructional AI video '+i,
 teaching_evidence:'The independently read transcript explains a specific reproducible decision and its operational limitations.',
 research_disposition:'Selected or rejected based on the verified teaching value and topic fit.',
 content_reviewed:true,public_player_checked:true,duration_minutes:7,
 checked_at:'2026-10-23T10:00:00Z'
}));
test('P1 video pool admission needs six meaningful reviews across three publishers',()=>{
 const b={edition_date:'2026-10-24',videos:[videos[0],videos[1]],video_prequalification:{candidates:videos}};
 assert.equal(validateVideoPrequalification(b).independent_publishers,3);
 assert.throws(()=>validateVideoPrequalification({...b,video_prequalification:{candidates:videos.slice(0,5)}}),
 /six_prequalified_substantive_video_candidates_required/);
 assert.throws(()=>validateVideoPrequalification({...b,video_prequalification:{candidates:videos.map(v=>({...v,url:v.url.replace(/https:\/\/[^/]+/,'https://openai.com')}))}}),
 /video_candidate_publishers_three_required/);
 assert.equal(validateVideoPrequalification({...b,edition_date:'2026-10-23'}).result,'SKIPPED_HISTORICAL');
});

const editorialSegments=[
 {start_seconds:0,end_seconds:600,kind:'ai',topic:'Model evaluation and evidence verification by enterprise engineers'},
 {start_seconds:600,end_seconds:1200,kind:'ai',topic:'Original interviews about bounded agent permissions and human approval'},
 {start_seconds:1200,end_seconds:1800,kind:'ai',topic:'Deployment risk controls and documented exception procedures'},
 {start_seconds:1800,end_seconds:2400,kind:'other',topic:'General operations and unrelated organizational leadership commentary'}
];
const podcast={
 duration_minutes:40, verification:{content_reviewed:true,content_review_basis:'Actual full-program content review with chronological topic evidence and original producer sources.'},
 quality_review:{
 reviewer:'qualified production researcher',reviewed_at:'2026-10-23T10:00:00Z',
 learning_objective:'Understand grounded governance and measurable agent evaluation practices.',
 practical_action:'Compare one real workflow with formal permission and human review boundaries.',
 selected_over_alternatives:'The interview provides more original source context than the competing general news recap.',
 content_evidence:{url:'https://example.org/episode/transcript',kind:'whole_episode_transcript',scope:'Full forty-minute episode reviewed with original time-coded editorial segments.'},
 is_advertisement:false,promotional_risk:'low',promotional_assessment:'This episode provides original educational substance without brand sales pitches.',
 editorial_segments:editorialSegments,estimated_editorial_ai_fraction:.75,
 editorial_form:'original_interview',
 editorial_form_rationale:'The episode contains an extended firsthand interview and original reported details rather than a synthetic repetition of headlines.'
 }
};
test('P1 a long podcast must have distinct supported timestamp segments',()=>{
 assert.equal(checkPodcast(podcast,1,'2026-10-24').ai_editorial_fraction,.75);
 const p=structuredClone(podcast);p.quality_review.editorial_segments=[
 {start_seconds:0,end_seconds:2400,kind:'ai',topic:'One blanket claim describes all program content without measured topic transitions'}
 ];p.quality_review.estimated_editorial_ai_fraction=1;
 assert.throws(()=>checkPodcast(p,1,'2026-10-24'),/long_episode_requires_multiple_distinct_timecoded_topics/);
});

test('P2 source discovery forces eight dated competing sources and 24h fallback reasons',()=>{
 const domains=['openai.com','ibm.com','microsoft.com','nvidia.com','cohere.com','anthropic.com','deepmind.google','research.google'];
 const stories=domains.slice(0,6).map((d,i)=>({id:'story-'+i,
  source:{url:'https://'+d+'/research/item-'+i,published_at:'2026-10-23T00:00:00Z'}}));
 const candidates=domains.map((d,i)=>({
  url:'https://'+d+'/research/item-'+i,publisher:'Publisher '+d,
  original_date:'2026-10-23T00:00:00Z',checked_at:'2026-10-23T10:00:00Z',
  disposition:i<6?'selected':'considered',
  disposition_reason:'This source was independently screened against relevance, freshness and reader learning value.'
 }));
 const decisions=stories.map(s=>({story_id:s.id,newer_sources_considered:[],
  why_selected_over_recent_options:'This original publisher evidence is the most relevant and directly supported mechanism available for the assigned reader audience despite being more than 24 hours old.'}));
 const b={edition_date:'2026-10-24',stories,source_discovery_audit:{
  reviewed_at:'2026-10-23T11:00:00Z',candidates,fallback_decisions:decisions}};
 assert.equal(validateRecentSourceDiscovery(b).candidates_considered,8);
 const bad=structuredClone(b);bad.source_discovery_audit.fallback_decisions=[];
 assert.throws(()=>validateRecentSourceDiscovery(bad),/older_than_24h_source_requires_explicit_reason/);
});

test('P1 schedule and GitHub capability identity is UNPROVEN absent first-party data',()=>{
 assert.equal(summarizeTaskOriginEvidence(null,'2026-10-24','images').scheduler,'UNPROVEN');
 const r={edition_date:'2026-10-24',lane:'images',task_entry_observed_at:'2026-10-23T02:00:00Z',
  capability_preflight:{result:'CAPABILITY_ROUTE_PROVEN',checked_at:'2026-10-23T02:05:00Z',
   evidence_ref:'github://task-start/receipt'},
  first_native_generation_observed_at:'2026-10-23T02:07:00Z'};
 const evidence=summarizeTaskOriginEvidence(r,'2026-10-24','images');
 assert.equal(evidence.route_preflight,'SAME_INVOCATION_ROUTE_RECORDED');
 assert.equal(evidence.scheduler,'UNPROVEN');
});
