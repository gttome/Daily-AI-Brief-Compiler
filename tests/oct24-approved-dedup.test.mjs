import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFinalImageCheckpoint} from '../scripts/worker-checkpoint-consistency.mjs';
import {validateMediaPrecision} from '../compiler/production-evidence.mjs';

const SHA=n=>String(n).repeat(64);
const imgs=Array.from({length:6},(_,i)=>({story_id:'future-story-'+i,sha256:SHA(i+1)}));
const reviews=imgs.map((x,i)=>({...x,generation_attempts:i<3?2:1}));
function checkpoint(){
 return {
  edition:'2026-10-25',
  worker:{phase:'PUBLISHED_COMPLETE',lease_status:'RELEASED',job_sha256:'a'.repeat(64),
    actual_generation_count:9,accepted_images:imgs.map(x=>({...x})),accepted_hashes:imgs.map(x=>x.sha256)},
  release:{images:imgs.map(x=>({...x}))},
  manifest:{job_sha256:'a'.repeat(64),images:imgs.map(x=>({...x}))},
  aar:{images:reviews,production:{actual_generation_count:9,accepted_count:6,rejected_count:3}}
 };
}
test('future final worker checkpoint requires exact story hashes and generation accounting',()=>{
 const args=checkpoint();
 assert.equal(verifyFinalImageCheckpoint(args).result,'PASS');
 assert.equal(verifyFinalImageCheckpoint({...args,edition:'2026-10-24'}).result,'HISTORICAL_NOT_GATED');
 const badCount=structuredClone(args);
 badCount.worker.actual_generation_count=8;
 assert.match(verifyFinalImageCheckpoint(badCount).reason,/generation_count/);
 const stale=structuredClone(args);
 stale.worker.accepted_images[0].sha256=SHA(12);
 assert.match(verifyFinalImageCheckpoint(stale).reason,/binding/);
 const unaccounted=structuredClone(args);
 unaccounted.aar.images[0].generation_attempts=3;
 assert.match(verifyFinalImageCheckpoint(unaccounted).reason,/attempts/);
});
const lesson=(url,title)=>({
 url,title,source:'Editorial lesson',duration_minutes:7,
 verification:{content_reviewed:true,playback_verified:false,
  content_review_basis:'Transcript, chapter-by-chapter content scope, and original episode teaching material were reviewed.'},
 quality_review:{
  reviewer:'Qualified editor',reviewed_at:'2026-10-24T10:30:00Z',
  learning_objective:'Understand evidence-based guardrails for safe and useful assisted professional workflows.',
  practical_action:'Perform a controlled comparison of verified source evidence and reviewed final outputs.',
  selected_over_alternatives:'This instructional demonstration is substantive and has transferable operational procedures.',
  content_evidence:{url:'https://openai.com/research/lesson-transcript',kind:'transcript',
   scope:'The full lesson transcript explains practical steps, reviewed constraints, and limits of evidence.'},
  promotional_risk:'low',is_advertisement:false,
  promotional_assessment:'No advertising claim or promotional-only trailer was accepted as instructional evidence.',
  transferable_takeaways:[
   'Review the original source before deciding what a tool can support safely.',
   'Separate retrieved facts and reviewed actions from speculative model outputs.',
   'Use measurable human quality checks before publishing an autonomous workflow.'
  ]
 }
});
const segments=[
 {start_seconds:0,end_seconds:360,kind:'ai',topic:'Enterprise AI agents and practical oversight with human authorization'},
 {start_seconds:360,end_seconds:720,kind:'ai',topic:'Evidence-grounded evaluation patterns and deployment limitations'},
 {start_seconds:720,end_seconds:840,kind:'other',topic:'General organizational development outside the artificial intelligence material'}
];
const podcast=i=>({
 url:'https://podcasts.apple.com/us/podcast/independent-ai-show/id12345?i='+String(123456+i),
 duration_minutes:14,
 verification:{content_reviewed:true,playback_verified:false,
  content_review_basis:'Full chapter-by-chapter podcast agenda and source transcript were evaluated independently.'},
 quality_review:{
  reviewer:'Qualified editor',reviewed_at:'2026-10-24T11:00:00Z',
  learning_objective:'Understand practical governance and verifiable evidence in professional AI systems.',
  practical_action:'Compare a real working process to each episode claim and a documented human review boundary.',
  selected_over_alternatives:'This program gives concrete techniques and evidence rather than promotional generalities.',
  content_evidence:{url:'https://openai.com/research/podcast-transcript',
   kind:'whole_episode_transcript',scope:'Complete episode scope reviewed with direct chronological editorial subject evidence.'},
  promotional_risk:'low',is_advertisement:false,
  promotional_assessment:'The editorial episode is independently useful and not a product sales trailer.',
  editorial_segments:segments,
  estimated_editorial_ai_fraction:720/840,
  editorial_form:'original_interview',
  editorial_form_rationale:'This episode features original interview testimony and concrete implementation lessons rather than a synthetic roundup.'
 }
});
const candidates=Array.from({length:6},(_,i)=>{
 const host=i<2?'openai.com':i<4?'ibm.com':'microsoft.com';
 return {
  url:'https://'+host+'/training/video-'+i,
  title:'Substantive AI training video number '+i,
  teaching_evidence:'Full lesson or original transcript contains a reproducible procedure, bounded risks and applied lessons.',
  research_disposition:'The documented review evaluated educational value, public playback, source quality and alternative perspectives.',
  content_reviewed:true,public_player_checked:true,duration_minutes:7,checked_at:'2026-10-24T10:30:00Z'
 };
});
function mediaBundle(){
 return {edition_date:'2026-10-25',
  videos:[lesson(candidates[0].url,candidates[0].title),lesson(candidates[1].url,candidates[1].title)],
  podcasts:[podcast(1),podcast(2)],
  video_prequalification:{candidates},
  video_diversity_exception:{
   reviewer:'Professional editor',
   reason:'Verified signed-out playback and source specificity eliminate the independently evaluated alternatives this cycle, so distinct publishers cannot be supported without fabricating playable evidence.',
   alternatives_reviewed:[
    {...candidates[2],reason:'The public-facing playback could not be independently demonstrated at the required instructional length.'},
    {...candidates[4],reason:'The episode lacks the required verifiable signed-out duration-matched playback evidence.'}
   ]
  }
 };
}
test('Oct25 same-video-publisher exception cites only real previously reviewed candidate URLs',()=>{
 const b=mediaBundle();
 assert.equal(validateMediaPrecision(b).video_diversity_exception,true);
 b.video_diversity_exception.alternatives_reviewed[0].url='https://ibm.com/not-in-pool';
 assert.throws(()=>validateMediaPrecision(b),/video_diversity_exception_alternative_not_prequalified/);
});
