// TEST_ONLY reconstruction of the recorded contradiction. The real exhausted
// learning-without-assistant case remains closed. This fixture grants no rerun.
import fs from 'node:fs';
import {makeD1RecipeFixture,refreshSyntheticReview} from './d1-recipe-v2.mjs';
import {sealD1Specifications} from '../../image-studio/spec-admission.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../../qualifications/value-image-2026-10-08/'+name+'.json',import.meta.url),'utf8'));
export function makeStudyContradictionFixture(){
 const f=makeD1RecipeFixture(),s=structuredClone(read('request').stories[0]),source=structuredClone(read('source-evidence').stories[0]),g=s.generation;
 for(const [i,c] of g.meaningful_components_plan.entries())Object.assign(c,{semantic_role:'study_component',region:i<3?'r1':i<5?'r2':i<9?'r3':'r4',input_bindings:[]});
 g.meaningful_components_plan[3].description='Day-10 drafting sample preserves paired treatment and control identities.';
 g.meaningful_components_plan[4].description='Day-90 drafting sample preserves the same assigned condition identities.';
 g.meaningful_components_plan[8].description='Independent assessment comparator keeps the declared drafting and unaided measurements distinct at their bound entries.';
 g.meaningful_components_plan.push({component_id:'c13',description:'A non-transporting reference rail aligns the senior and junior comparisons with their assessed measures, without numerical scales.',support:'approved_concept',support_index:2,required:true,semantic_role:'comparison_reference',region:'r3',input_bindings:[]});
 const stages=[],secondary=[];
 function edge(id,from,to,kind,description,support='verified_fact',index=0,entry=null,main=false){
  const e={...(main?{input_component_id:from,transformation:description,output_component_id:to}:{from_component_id:from,to_component_id:to,relationship:description}),relation_id:id,kind,support,support_index:index,returned_state:null};
  (main?stages:secondary).push(e);
  if(['artifact_flow','measurement','feedback'].includes(kind))g.meaningful_components_plan.find(c=>c.component_id===to).input_bindings.push({source_component_id:from,entry:entry||id,relationship_id:id});
 }
 edge('assign-assisted','c1','c2','conditioning','Random assignment supplies assistant access.');
 edge('assign-control','c1','c3','conditioning','Control assignment receives no assistant access.');
 for(const [from,condition] of [['c2','assisted'],['c3','control']])for(const [to,day] of [['c4','day10'],['c5','day90']])edge(condition+'-'+day,from,to,'artifact_flow','Carry the assigned condition into its dated drafting sample.','verified_fact',1,null,true);
 edge('time-order','c4','c5','temporal_order','Early and later drafting are separate time-specific samples.','verified_fact',1);
 edge('remove-tool','c5','c6','temporal_order','The later unaided assessment occurs without assistant access.','verified_fact',2);
 edge('unaided-boundary','c6','c7','constraint','The disconnected coupling prevents assisted input to the unaided correction task.','verified_fact',2);
 edge('locate-and-align','c7','c8','artifact_flow','Move located defect geometry into the conceptual correction-alignment surface.','approved_concept',1,null,true);
 edge('measure-day10','c4','c9','measurement','Assess day-10 drafting separately; retain the paired condition keys.','verified_fact',3,'upper-day10');
 edge('measure-day90','c5','c9','measurement','Assess day-90 drafting separately; retain the paired condition keys.','verified_fact',3,'middle-day90');
 edge('measure-unaided','c8','c9','measurement','Assess day-90 unaided correction separately from both drafting samples.','verified_fact',3,'lower-unaided',true);
 edge('experience','c9','c10','artifact_flow','Organize assessed comparisons by experience rather than claiming a universal gain.','verified_fact',5);
 edge('senior-result','c10','c11','artifact_flow','Preserve the senior condition comparison.','verified_fact',5);
 edge('junior-result','c10','c12','artifact_flow','Preserve the junior condition comparison without an invented average improvement.','verified_fact',5);
 edge('measure-reference','c9','c13','comparison_reference','Undirected association identifies the assessed measures; transport no material.','approved_concept',2);
 edge('senior-reference','c11','c13','comparison_reference','Undirected association connects the senior comparison to the measure reference rail.','approved_concept',2);
 edge('junior-reference','c12','c13','comparison_reference','Undirected association connects the junior comparison to the measure reference rail.','approved_concept',2);
 Object.assign(g.mechanism_plan,{dominant_mechanism:'An open correction assembly exposes defect location and correction alignment, followed by an independent assessment comparator with entries derived only from its declared input bindings.',internal_substages:stages,secondary_relationships:secondary,evidence_structure:'Dated drafting and unaided-correction measures remain distinct at their declared upper, middle and lower comparator entries.',feedback_path:'No feedback or participant retry occurs; experience associations are undirected comparison references only.',selected_construction:'Use branching condition ribbons at left, separate dated drafting samples above, an open unaided correction and comparator assembly centrally, and experience comparisons at right. Retain paired condition keys within each measurement stream.',geometry_requirements:[{requirement_id:'assessment-entry-placement',description:'The assessment entry upper-day10 is above middle-day90, which is above lower-unaided. Keep each incoming measure separately traceable.'},{requirement_id:'open-unaided-substages',description:'Expose the defect-location aperture and separate correction-alignment surface; no screens or document-placeholder marks.'},{requirement_id:'undirected-reference-rail',description:'The senior and junior associations terminate on the separate comparison reference rail without arrows, artifact tokens or an invented return loop.'}]});
 // The historical allowlist is not rewritten. These date-qualified labels exist
 // only in this excluded TEST_ONLY specification, never in the exhausted request.
 g.visible_text_allowlist=['Assistant access','Day 10 drafting','Day 90 drafting','Unaided correction','Independent assessment','Senior comparison','Junior comparison'];
 refreshSyntheticReview(s,source);
 f.request.stories[0]=s;f.sourceEvidence.stories[0]=source;f.request.set_plan.stories[0]={story_id:s.story_id,...g.composition_assignment};
 f.request=sealD1Specifications(f.request,f.sourceEvidence);return f;
}
