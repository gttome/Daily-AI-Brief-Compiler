import test from 'node:test';
import assert from 'node:assert/strict';
import {checkVideo} from '../compiler/media-quality.mjs';
import {validateVideoPrequalification} from '../compiler/production-evidence.mjs';

const video=(kind='expert_interview')=>({
 title:'Independent discussion of AI governance and emerging research',
 url:'https://www.publicresearch.edu/videos/ai-governance-debate',
 duration_minutes:11.5,
 verification:{
  content_reviewed:true,playback_verified:false,
  content_review_basis:'The complete discussion and original research references were reviewed for accuracy, disagreement and policy context.'
 },
 quality_review:{
  reviewer:'Independent editorial reviewer',
  reviewed_at:'2026-10-29T04:05:00Z',
  editorial_relevance:'Independent experts discuss what current evidence establishes about enterprise agent governance.',
  reader_value:'Readers can evaluate conflicting evidence and understand what remains unknown without a software tutorial.',
  selected_over_alternatives:'Original analysis with substantive evidence, rather than a product launch film or a sales promotion.',
  content_evidence:{
   kind,
   url:'https://www.publicresearch.edu/videos/ai-governance-debate',
   scope:'The complete interview includes original data, competing conclusions, evidence limitations and research citations.'
  },
  editorial_value_basis:'Full-program review identifies verifiable technical evidence, competing interpretations and implications for decision makers; the presentation does not depend on a vendor feature pitch.',
  promotional_risk:'low',is_advertisement:false,
  promotional_assessment:'This independent conversation is not an advertisement and discusses different approaches, limits and evidence.'
 }
});

test('Oct30 independent expert interview does not require tutorial steps or three teaching points',()=>{
 const x=video();
 assert.equal(x.quality_review.transferable_takeaways,undefined);
 assert.equal(x.quality_review.reproducible_procedure,undefined);
 assert.equal(x.quality_review.learning_objective,undefined);
 assert.equal(x.quality_review.practical_action,undefined);
 assert.equal(checkVideo(x,1,'2026-10-30').editorial_value_reviewed,true);
});
test('Oct30 permits independent news analysis and research presentations',()=>{
 for(const kind of ['news_analysis','research_presentation','original_reporting','panel_discussion','independent_analysis']){
  assert.equal(checkVideo(video(kind),1,'2026-10-30').editorial_value_reviewed,true);
 }
});
test('Oct29 sealed historical admission continues requiring the then-current instructional contract',()=>{
 assert.throws(()=>checkVideo(video(),1,'2026-10-29'),/substantiated_editorial_review_required/);
});
test('Oct30 retains anti-advertising and source-based value checks',()=>{
 const ad=video();ad.quality_review.is_advertisement=true;
 assert.throws(()=>checkVideo(ad,1,'2026-10-30'),/promotional_content_or_unreviewed_ad_risk/);
 const lacking=video();delete lacking.quality_review.editorial_value_basis;
 assert.throws(()=>checkVideo(lacking,1,'2026-10-30'),/source_grounded_editorial_value_basis_required/);
 const metadata=video();metadata.quality_review.content_evidence.kind='publisher_metadata';
 assert.throws(()=>checkVideo(metadata,1,'2026-10-30'),/promotional_metadata_not_content_evidence/);
});

test('Oct30 six-candidate pool accepts substantive editorial evidence instead of instructional teaching evidence',()=>{
 const host=['aieducation.org','independentpress.com','researchinstitute.edu'];
 const candidates=Array.from({length:6},(_,i)=>({
  url:'https://'+host[i%3]+'/ai/video-'+i,
  title:'Independent AI analysis session '+i,
  editorial_evidence:'Complete research conversation reviewed for evidence, competing perspectives and factual limitations.',
  research_disposition:'Reviewed original source and substance; candidate is not a sales pitch or short trailer.',
  content_reviewed:true,public_player_checked:true,
  duration_minutes:9,checked_at:'2026-10-29T04:05:00Z'
 }));
 const b={edition_date:'2026-10-30',video_prequalification:{candidates},
  videos:[{url:candidates[0].url},{url:candidates[1].url}]};
 assert.equal(validateVideoPrequalification(b).result,'PASS');
 b.edition_date='2026-10-29';
 assert.throws(()=>validateVideoPrequalification(b),/video_candidate_review_incomplete/);
});
