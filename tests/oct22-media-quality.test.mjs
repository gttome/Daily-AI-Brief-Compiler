import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMediaEducationalValue} from '../compiler/media-quality.mjs';
import {validateMediaPrecision,validateEditorialChronology} from '../compiler/production-evidence.mjs';
import playback from '../scripts/verify-selected-video-playback.cjs';
import {ownerReportedWorkUsage} from '../scripts/owner-usage.mjs';
import {validateImageAfterAction} from '../scripts/image-aar-contract.mjs';

const reviewed='2026-10-21T00:11:00Z';
const vQuality=()=>({
  reviewer:'Named editor reviewing complete source material',
  reviewed_at:reviewed,
  learning_objective:'Distinguish a real explanatory mechanism from a promotional announcement to improve daily AI decisions.',
  practical_action:'Apply the observed three techniques to a bounded team workflow with human verification.',
  selected_over_alternatives:'Chosen for independent transferable education instead of a short product advertisement.',
  content_evidence:{
    kind:'transcript',url:'https://publisher.example/education/actual-transcript',
    scope:'Reviewed the complete episode transcript and all concrete sections; recorded mechanisms and limitations rather than publisher launch claims.'
  },
  is_advertisement:false,promotional_risk:'low',
  promotional_assessment:'No product-purchase pitch or launch montage dominates instructional content.',
  transferable_takeaways:[
    'Explain how source retrieval improves grounded answers compared with unverified guesses.',
    'Compare changes in training data with simple prompt context and know each limitation.',
    'Design a human review checkpoint that preserves source citations for a practical task.'
  ]
});
const pQuality=()=>({
  ...vQuality(),
  content_evidence:{
    kind:'whole_episode_transcript',url:'https://podcasts.example/episodes/123/transcript',
    scope:'Reviewed the complete episode transcript with timestamped AI practice, contextual non-AI conversation and paid interruptions.'
  },
  estimated_editorial_ai_fraction:0.91,
  editorial_segments:[
    {start_seconds:0,end_seconds:600,kind:'ai',topic:'Hands-on AI-assisted decision checks and evaluation examples'},
    {start_seconds:600,end_seconds:1000,kind:'ai',topic:'Retrieval workflow decisions and human approval steps'},
    {start_seconds:1000,end_seconds:1100,kind:'other',topic:'Brief unrelated personal news discussion and acknowledgements'},
    {start_seconds:1100,end_seconds:1200,kind:'advertisement',topic:'Paid sponsorship and reading of a commercial message'}
  ]
});
const video=(url)=>({
 title:'Detailed educational mechanism',source:'Independent educator',url,duration_minutes:8,
 verification:{identity_verified:true,duration_verified:true,content_reviewed:true,
  playback_verified:false,content_review_basis:'Full original teaching transcript and practical procedure checked.'},
 quality_review:vQuality()
});
const podcast=(url)=>({
 title:'AI practice episode',source:'Independent AI show',url,duration_minutes:20,
 verification:{identity_verified:true,duration_verified:true,content_reviewed:true,
  playback_verified:false,content_review_basis:'Read the timestamped whole-episode transcript with all topic boundaries.',
  episode_url:url,episode_identifier:'ep-12345'},
 quality_review:pQuality()
});
const future=()=>({
 edition_date:'2026-10-22',
 videos:[video('https://reuters.com/learning/one'),video('https://bbc.com/learning/two')],
 podcasts:[podcast('https://practicalai.show/episodes/123'),podcast('https://aishow.example/episodes/456')]
});
test('new editions pass substantive educational review but old sealed editions replay without the new gate',()=>{
 const b=future();
 assert.equal(validateMediaEducationalValue(b).result,'PASS');
 assert.equal(validateMediaPrecision(b).educational_value.result,'PASS');
 assert.ok(validateMediaEducationalValue(b).podcasts.every(x=>x.ai_editorial_fraction>=.75));
 b.edition_date='2026-10-21';delete b.videos[0].quality_review;
 assert.equal(validateMediaEducationalValue(b).result,'SKIPPED_HISTORICAL');
});
test('32/96-second promotion and description-only evidence are rejected despite valid URLs and verified identity',()=>{
 for(const duration of [32/60,96/60]){
   const b=future();b.videos[0].duration_minutes=duration;
   assert.throws(()=>validateMediaEducationalValue(b),/short_trailer_or_runtime_out_of_bounds/);
 }
 for(const fault of [b=>b.videos[0].quality_review.content_evidence.kind='promotional_description',
   b=>b.videos[0].quality_review.is_advertisement=true,
   b=>b.videos[0].quality_review.promotional_risk='high',
   b=>b.videos[0].quality_review.transferable_takeaways=['Brand new model announced today'],
   b=>b.videos[0].verification.content_reviewed=false]){
   const b=future();fault(b);
   assert.throws(()=>validateMediaEducationalValue(b),/media_quality:/);
 }
});
test('whole-episode AI denominator excludes ads but rejects general-news digest or selective AI clipping',()=>{
 const b=future();b.podcasts[0].quality_review.editorial_segments=[
   {start_seconds:0,end_seconds:120,kind:'ai',topic:'A limited short AI news story on model capability'},
   {start_seconds:120,end_seconds:1120,kind:'other',topic:'Global politics, sports and weather stories unrelated to AI'},
   {start_seconds:1120,end_seconds:1200,kind:'advertisement',topic:'Paid sponsor announcements and commercial messages'}
 ];
 delete b.podcasts[0].quality_review.estimated_editorial_ai_fraction;
 assert.throws(()=>validateMediaEducationalValue(b),/below_75_percent/);
 const selective=future();selective.podcasts[0].quality_review.editorial_segments=[
   {start_seconds:450,end_seconds:550,kind:'ai',topic:'Only an AI fragment inside an unrelated news episode'}
 ];
 assert.throws(()=>validateMediaEducationalValue(selective),/insufficient_whole_episode_scope/);
 const overlap=future();overlap.podcasts[0].quality_review.editorial_segments[1].start_seconds=599;
 assert.throws(()=>validateMediaEducationalValue(overlap),/overlapping_timecoded_segment/);
});
test('review timestamp belongs after content verification and before selection lock',()=>{
 const b=future();
 b.stories=[];b.watchlist={refreshed_at:'2026-10-21T00:12:00Z'};
 b.editorial_provenance={selection_locked_at:'2026-10-21T00:15:00Z',sealed_at:'2026-10-21T00:16:00Z'};
 for(const m of [...b.videos,...b.podcasts]){
   m.content_retrieved_at='2026-10-21T00:05:00Z';
   m.verification.checked_at='2026-10-21T00:10:00Z';
 }
 const state={started_at:'2026-10-21T00:00:00Z',updated_at:'2026-10-21T00:16:00Z'};
 assert.equal(validateEditorialChronology({bundle:b,state,now:'2026-10-21T01:00:00Z'}).result,'PASS');
 b.videos[0].quality_review.reviewed_at='2026-10-21T00:17:00Z';
 assert.throws(()=>validateEditorialChronology({bundle:b,state,now:'2026-10-21T01:00:00Z'}),/media_quality_review_not_between/);
});
test('new video publication cannot promote oEmbed identity or thumbnails to actual playback',()=>{
 const yes={index:1,result:'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS',
   playback_verified:true,duration_matched_player_advanced:true,full_episode_watched:false};
 const fallback={index:2,result:'PUBLIC_YOUTUBE_IDENTITY_PASS_PLAYBACK_UNVERIFIED',playback_verified:false};
 assert.equal(playback.assessPlaybackAdmission('2026-10-21',[yes,fallback]).approved,true);
 assert.equal(playback.assessPlaybackAdmission('2026-10-22',[yes,fallback]).result,'BLOCKED_PLAYBACK_UNVERIFIED');
 assert.equal(playback.assessPlaybackAdmission('2026-10-22',[yes,{...yes,index:2}]).approved,true);
});
test('future usage requires exact owner statement and per-cycle percentage scope; historical entries stay intact',()=>{
 const b={schema_version:'daily-ai-brief-owner-work-usage-v1',cycle_date:'2026-10-21',edition_date:'2026-10-22',
 source:'owner_reported_in_chat',report_date:'2026-10-21',owner_statement:'The run used 3 percent of my weekly allocation.',
 measurement_scope:'cycle_increment_percent',work_usage_percent:3,carry_forward_allowed:false};
 assert.equal(ownerReportedWorkUsage(b,'2026-10-21','2026-10-22'),3);
 assert.equal(ownerReportedWorkUsage({...b,source:'estimated_from_git'},'2026-10-21','2026-10-22'),null);
 assert.equal(ownerReportedWorkUsage({...b,cycle_date:'2026-10-20'},'2026-10-21','2026-10-22'),null);
 assert.equal(ownerReportedWorkUsage({...b,measurement_scope:'weekly_remaining'},'2026-10-21','2026-10-22'),null);
 assert.equal(ownerReportedWorkUsage({...b,carry_forward_allowed:true},'2026-10-21','2026-10-22'),null);
 assert.equal(ownerReportedWorkUsage({cycle_date:'2026-10-12',edition_date:'2026-10-13',work_usage_percent:2},'2026-10-12','2026-10-13'),2);
});
test('future image package cannot claim unknown or invented generation-start provenance',()=>{
 const prior=JSON.parse((awaitFile('external-image-packages/2026-10-21/reviews/after-action.json')));
 const man=JSON.parse((awaitFile('external-image-packages/2026-10-21/manifest.json')));
 const job={edition_date:'2026-10-22',stories:man.images.map(x=>({story_id:x.story_id}))};
 const aar={...prior,edition_date:'2026-10-22',human_readable_path:'external-image-packages/2026-10-22/reviews/after-action.md'};
 const manifest={...man,edition_date:'2026-10-22'};
 assert.throws(()=>validateImageAfterAction({aar,job,manifest}),/genuine_forward_only/);
 const now=Date.now();
 aar.production={...aar.production,host_execution_observed_at:new Date(now-120000).toISOString(),
 host_execution_observation_source:'executor_observed_in_same_invocation',
 generation_started_at:new Date(now-60000).toISOString(),
 generation_start_source:'executor_observed_before_first_native_call'};
 assert.equal(validateImageAfterAction({aar,job,manifest}).result,'PASS');
 aar.production.generation_start_source='inferred_from_commit';
 assert.throws(()=>validateImageAfterAction({aar,job,manifest}),/genuine_forward_only/);
});
import fs from 'node:fs';
const awaitFile=path=>fs.readFileSync(path,'utf8');
