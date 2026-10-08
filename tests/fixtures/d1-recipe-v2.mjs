// TEST_ONLY: synthetic schema/rejection observations, never live source or pixels.
import {makeD1SpecificationsFixture} from './d1-specifications.mjs';
import {sealD1Specifications} from '../../image-studio/spec-admission.mjs';
import {RECIPE_PROFILE,RECIPE_PROFILE_SHA,recipeDigest,semanticRequirements,deriveRecipeCriteria} from '../../image-studio/specification-projection.mjs';
import {canonicalSha} from '../../image-capsules/util.mjs';
export function refreshSyntheticReview(story,source){
 story.recipe_profile={profile_id:RECIPE_PROFILE.profile_id,definition_sha256:RECIPE_PROFILE_SHA,semantic_review:{schema_version:'daily-compiler-d1-recipe-source-review-v2',recipe_sha256:recipeDigest(story),source_story_sha256:canonicalSha(source),reviewer:'TEST_ONLY synthetic source reviewer',reviewed_at:'2026-10-08T00:00:00Z',claims:semanticRequirements(story).map(x=>({...x,assessment:x.support==='verified_fact'?'SUPPORTED':'CONCEPTUAL',observation:'TEST_ONLY mapping observation for '+x.id+'. Not real source entailment.'})),result:'PASS'}};
}
export function makeD1RecipeFixture(){
 const f=makeD1SpecificationsFixture();
 for(const s of f.request.stories){
  const g=s.generation,es=[...g.mechanism_plan.internal_substages,...g.mechanism_plan.secondary_relationships];
  for(const [i,c] of g.meaningful_components_plan.entries())Object.assign(c,{description:c.description.replace('Four-port binding collar','Input-binding collar'),semantic_role:'explanatory_component',region:'r'+(Math.floor(i/3)+1),input_bindings:[]});
  for(const [i,e] of es.entries()){
   Object.assign(e,{relation_id:'relation-'+(i+1),kind:i<2?'artifact_flow':'constraint',support:'approved_concept',support_index:0,returned_state:null});
   if(i<2)g.meaningful_components_plan.find(c=>c.component_id===e.output_component_id).input_bindings.push({source_component_id:e.input_component_id,entry:'entry-'+(i+1),relationship_id:e.relation_id});
  }
  Object.assign(g.mechanism_plan,{selected_construction:'Expose the selected '+g.composition_assignment.mechanism_metaphor+' with distinct preparation and comparison geometry.',geometry_requirements:[{requirement_id:'entry-separation',description:'Each bound input has a distinct visible entry; keep the causal links traceable.'}]});
  refreshSyntheticReview(s,f.sourceEvidence.stories.find(x=>x.story_id===s.story_id));
 }
 f.request=sealD1Specifications(f.request,f.sourceEvidence);return f;
}
export function syntheticRecipeReview(story,{sha='f'.repeat(64),context='ctx-'+'a'.repeat(64),at='2026-10-08T22:00:10Z',failure=null,conflict=false}={}){
 const criteria=deriveRecipeCriteria(story);
 const values={'layout.occupancy':85,'layout.regions':4,'quality.minimum_internal_substages_in_dominant_mechanism':2,'quality.minimum_secondary_relationships':2,'basic.composition':true};
 const observation=id=>Object.hasOwn(values,id)?JSON.stringify({value:values[id],observation:'TEST_ONLY synthetic observed value for '+id+'. No actual pixel inspection.'}):'TEST_ONLY observed synthetic evidence for '+id+'.';
 return {schema_version:'daily-compiler-d1-recipe-review-v2',story_id:story.story_id,specification_sha256:story.specification_sha256,criteria_sha256:canonicalSha(criteria),final_sha256:sha,reviewer_context:context,reviewed_at:at,criteria:criteria.map(c=>({id:c.id,pass:c.id!==failure,location:'TEST_ONLY region '+c.id,observation:observation(c.id),offending_text:null,missing_labels:[]})),specification_conflict:conflict,result:failure||conflict?'FAIL':'PASS'};
}

export function syntheticResponse(review){return JSON.stringify({criteria:review.criteria,specification_conflict:review.specification_conflict,result:review.result});}
