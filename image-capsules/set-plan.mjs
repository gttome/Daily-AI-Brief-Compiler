import {canonicalSha,nonempty} from './util.mjs';

const REQUIRED={compositions:6,layouts:4,grammars:4,hierarchies:4,annotations:3};
const fields=['composition_signature','layout_signature','diagram_grammar','hierarchy_signature','annotation_pattern_signature','reading_path'];

export function setPlanGate(plan){
  const stories=plan?.stories||[];
  const values=f=>stories.map(x=>x?.[f]).filter(nonempty);
  return {
    story_count:stories.length,
    unique_compositions:new Set(values('composition_signature')).size,
    distinct_layouts:new Set(values('layout_signature')).size,
    distinct_grammars:new Set(values('diagram_grammar')).size,
    distinct_hierarchies:new Set(values('hierarchy_signature')).size,
    distinct_annotation_patterns:new Set(values('annotation_pattern_signature')).size
  };
}

export function validateSetPlan(plan){
  const errors=[];
  if(plan?.schema_version!=='daily-compiler-image-set-plan-v3') errors.push('set_plan_schema');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(plan?.edition_date||'')) errors.push('set_plan_edition_date');
  if(!Array.isArray(plan?.stories)||plan.stories.length!==6) errors.push('set_plan_exactly_six_stories');
  const ids=new Set();
  for(const story of plan?.stories||[]){
    if(!nonempty(story?.story_id)) errors.push('set_plan_story_id');
    if(ids.has(story?.story_id)) errors.push('set_plan_duplicate_story_id');
    ids.add(story?.story_id);
    for(const f of fields) if(!nonempty(story?.[f])) errors.push('set_plan_missing_'+f);
    if(!Array.isArray(story?.prohibited_patterns)) errors.push('set_plan_prohibited_patterns');
  }
  const g=setPlanGate(plan);
  if(g.unique_compositions!==REQUIRED.compositions) errors.push('set_plan_unique_compositions');
  if(g.distinct_layouts<REQUIRED.layouts) errors.push('set_plan_distinct_layouts');
  if(g.distinct_grammars<REQUIRED.grammars) errors.push('set_plan_distinct_grammars');
  if(g.distinct_hierarchies<REQUIRED.hierarchies) errors.push('set_plan_distinct_hierarchies');
  if(g.distinct_annotation_patterns<REQUIRED.annotations) errors.push('set_plan_distinct_annotation_patterns');
  const declared=plan?.planned_set_gate||{};
  if(declared.unique_composition_signatures!==6||declared.distinct_layout_signatures_min!==4||declared.distinct_diagram_grammars_min!==4||declared.distinct_hierarchy_signatures_min!==4||declared.distinct_annotation_patterns_min!==3) errors.push('set_plan_declared_gate');
  return [...new Set(errors)];
}

export function assertSetPlan(plan){
  const errors=validateSetPlan(plan);
  if(errors.length) throw new Error(errors.join(';'));
  return {plan_sha256:canonicalSha(plan),gate:setPlanGate(plan)};
}

export function assignmentForStory(plan,storyId){
  assertSetPlan(plan);
  const hit=plan.stories.find(x=>x.story_id===storyId);
  if(!hit) throw new Error('story_not_in_set_plan');
  const {story_id,...assignment}=hit;
  return structuredClone(assignment);
}
