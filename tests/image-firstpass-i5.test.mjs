import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MANDATORY_FLOOR,validateFrozenImageSpecification,verifySixFrozenImageSpecifications,routeImageCorrection} from '../scripts/preflight-image-firstpass.mjs';
import {replaceSingleTag} from '../scripts/prepare-external-image-replacement.mjs';
const job=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/source/job.json'));
const original=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/reviews/pregeneration-specifications.json'));
const source=new Map(job.stories.map(s=>[s.story_id,s]));
const freeze=s=>{
 const story=source.get(s.story_id),src=story.primary_source.url;
 return {schema_version:'external-image-firstpass-freeze-v1',story_id:s.story_id,source_url:src,
  visual_thesis:s.visual_thesis,mechanism_metaphor:s.metaphor,
  story_anchors:s.anchors,required_labels:s.labels,
  source_claim_map:s.anchors.slice(0,2).map((a,i)=>({
   id:'claim-'+i,proposition:a,supporting_source_excerpt:s.evidence,source_url:src,
   evidence_kind:'primary_source_fact'})),
  allowed_causal_edges:[{from:'source-input',to:'mechanism-stage',support_claim_id:'claim-0',
   direction:'forward',relation_supported_by_semantic_review:true}],
  excluded_claims:s.exclusions,
  composition_signature:{grammar:s.grammar,metaphor:s.metaphor,layout:s.layout,
   palette:s.palette,annotation:s.annotation},
  quality_review_plan:{explanatory_components:s.components.length,major_regions:4,
   dominant_internal_substages:2,secondary_supported_links:2},
  editorial_semantic_review:{result:'PASS',method:'semantic_primary_source_review',
   reviewer:'fixture-semantic-reviewer',source_url:src,labels_verified:true,
   causal_edges_verified:true,unsupported_claims_excluded:true,approved_before_generation:true}
 };
};
test('I5 replays the real six Oct10 pre-generation quality specs as typed, evidence-bound future specs',()=>{
 const specs=original.map(freeze);
 const v=verifySixFrozenImageSpecifications({job,specifications:specs.reverse()});
 assert.equal(v.result,'SIX_FROZEN_SPECS_READY_FOR_GENERATION');
 assert.equal(v.stories.length,6);
 assert.equal(v.quality_attempt_limit,null);
 assert.equal(v.saved_pixel_review_still_required,true);
 assert.equal(MANDATORY_FLOOR.readable_explanatory_text,true);
});
test('I5 fail-closed unsupported causality, empty text, fake labels, duplicate grammar and absent semantic review',()=>{
 const s=freeze(original[0]),story=source.get(s.story_id);
 for(const delta of [
  {required_labels:[]},{required_labels:['Fake microtext','Fake microtext','placeholder text']},
  {allowed_causal_edges:[{from:'source-input',to:'mechanism-stage',support_claim_id:'missing-claim',direction:'forward',relation_supported_by_semantic_review:true}]},
  {allowed_causal_edges:[{from:'source-input',to:'mechanism-stage',support_claim_id:'claim-0',direction:'forward',relation_supported_by_semantic_review:false}]},
  {editorial_semantic_review:{...s.editorial_semantic_review,result:'UNPROVEN'}}
 ])assert.throws(()=>validateFrozenImageSpecification({spec:{...s,...delta},story}),/image_firstpass_quality/);
 const invalid=original.map(freeze);
 for(const x of invalid)x.composition_signature={...x.composition_signature,
  grammar:'single generic grid',metaphor:'single universal diagram',annotation:'plain generic boxes'};
 assert.throws(()=>verifySixFrozenImageSpecifications({job,specifications:invalid}),/six_set_visual_convergence/);
 assert.throws(()=>verifySixFrozenImageSpecifications({job,specifications:invalid.slice(1)}),/exact_six_story_assignments/);
});
test('I5 correction until-pass does not regenerate accepted images on upload, CI or status faults',()=>{
 const accepted={accepted_locked:true,sha256:'1'.repeat(64)};
 assert.equal(routeImageCorrection({candidate:accepted,transportFailure:true}).action,'REUSE_IDENTICAL_ACCEPTED_BYTES');
 assert.equal(routeImageCorrection({candidate:accepted,defects:[{category:'mobile_legibility',region:'caption',evidence:'tiny text'}]}).action,'SEPARATE_VERSIONED_CORRECTION_REQUIRED');
 const r=routeImageCorrection({candidate:{accepted_locked:false},defects:[{category:'pseudotext',region:'legend-glyphs',evidence:'nonwords on actual pixels'}]});
 assert.equal(r.action,'REPAIR_FAILED_REGION_AND_REVIEW_UNTIL_PASS');
 assert.equal(r.quality_attempt_limit,null);
 assert.equal(routeImageCorrection({candidate:{accepted_locked:false},transportFailure:true}).regeneration_allowed,false);
});
test('I5 historic October10 rendered apostrophe/entity HTML cannot be reprocessed as a placeholder',()=>{
 const s=source.get('oct10-a2-instinct-hands-on').complete_compiler_story,alt='A reporter&#39;s prerequisite-check diagram';
 const accepted='<h1>Instinct&#39;s real-world agent tests expose the missing-prerequisite problem</h1>'+
  '<img src="https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/images/2026-10-10/dab-edition-2026-10-10-m14.png?v=ade3b51a6708" alt="'+alt+'">';
 const simulated={...s,permanent_route:'/stories/2026-10-10/'+s.permanent_route.split('/')[3]+'/'};
 assert.throws(()=>replaceSingleTag(accepted,simulated,'https://example.org/wrong.png'),/exactly_one_original_placeholder/);
});
