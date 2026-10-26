import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSamePublisherLearningObjectives} from '../compiler/production-evidence.mjs';

const chosen=[
 {title:'Governance lesson A',quality_review:{
   learning_objective:'Translate an older responsible-AI compliance checklist into owners, privacy checks and release decision evidence.',
   selected_over_alternatives:'The original instructor gives a broader safety decision than the reviewed short promotional product overview.'
 }},
 {title:'Scaling lesson B',quality_review:{
   learning_objective:'Build a measurable return-on-investment decision with deployment milestones, adoption measurement and verified costs.',
   selected_over_alternatives:'The full instructional format offers more reproducible business measures than the newer vendor keynote highlights.'
 }}
];
test('future same-publisher exceptions need two different source-reviewed learner outcomes',()=>{
 const bundle={edition_date:'2026-10-27',videos:structuredClone(chosen)};
 assert.equal(validateSamePublisherLearningObjectives(bundle).distinct_teaching_objectives,2);
 bundle.videos[1].quality_review.learning_objective=bundle.videos[0].quality_review.learning_objective;
 assert.throws(()=>validateSamePublisherLearningObjectives(bundle),
   /same_publisher_videos_need_distinct_transferable_objectives/);
});
test('a copied quality exception reason is not two independently researched decisions',()=>{
 const bundle={edition_date:'2026-10-27',videos:structuredClone(chosen)};
 bundle.videos[1].quality_review.selected_over_alternatives=
   bundle.videos[0].quality_review.selected_over_alternatives;
 assert.throws(()=>validateSamePublisherLearningObjectives(bundle),
   /same_publisher_videos_need_distinct_transferable_objectives/);
});
test('existing Oct26 video selections remain unchanged and historic',()=>{
 assert.equal(validateSamePublisherLearningObjectives({
   edition_date:'2026-10-26',videos:[]}).result,'SKIPPED_HISTORICAL');
});
