// Deterministic projection of the actual same-story observations required by
// the existing v5 quality profile. This module never inspects pixels, supplies
// a target as an observed value, or changes a criterion or acceptance threshold.
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {validateVisualReview} from '../image-capsules/review-contract.mjs';

export const RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS = [
  'Observation format for five existing criteria: preserve the criterion IDs, requirements and response fields. These are observations of the saved canonical pixels, not new criteria.',
  'For each criterion listed below, its observation field must be a compact JSON STRING containing exactly {"value":...,"observation":"..."}. The inner observation is a specific visible-pixel description of at least 12 characters. Keep location, pass, offending_text and missing_labels in their existing fields. All other criteria retain their existing observation format.',
  'layout.occupancy: value is the actual observed useful-canvas percentage, as a number from 0 to 100. An honest visual estimate is allowed; never copy a requested target or substitute a midpoint. This criterion can PASS only for a value from 80 through 90.',
  'layout.regions: value is the actual count of major visual regions, as a nonnegative integer. This criterion can PASS only for a count from 3 through 5.',
  'quality.minimum_internal_substages_in_dominant_mechanism: value is the actual count of visible internal substages in the dominant mechanism, as a nonnegative integer. This criterion can PASS only for a count of at least 2.',
  'quality.minimum_secondary_relationships: value is the actual count of visible secondary relationships, as a nonnegative integer. This criterion can PASS only for a count of at least 2.',
  'basic.composition: value records whether the actual background is white or near-white, as true or false. This records the already specified background requirement. This criterion can PASS only when value is true and its other existing composition requirements pass.',
  'For any of these five values, report null and set that criterion pass=false if the value cannot be determined. Preserve an observed failing value with pass=false. A value in the permitted range does not override another failure of the same existing criterion. Do not invent a measurement, count, score, observation or PASS.'
].join('\n');

const count = value => Number.isSafeInteger(value) && value >= 0;
const fields = Object.freeze([
  {id:'layout.occupancy',key:'canvas_utilization_percent',valid:value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100,passes:value=>value>=80&&value<=90},
  {id:'layout.regions',key:'major_visual_regions',valid:count,passes:value=>value>=3&&value<=5},
  {id:'quality.minimum_internal_substages_in_dominant_mechanism',key:'internal_substages',valid:count,passes:value=>value>=2},
  {id:'quality.minimum_secondary_relationships',key:'secondary_relationships',valid:count,passes:value=>value>=2},
  {id:'basic.composition',key:'white_or_near_white_background',valid:value=>typeof value==='boolean',passes:value=>value===true}
]);
const need = (condition,code) => {if(!condition)throw new Error('recipe_quality:'+code);};
const prose = value => typeof value==='string'&&value.trim().length>=12;

function criterion(recipeReview,id){
  need(Array.isArray(recipeReview?.criteria),'criteria_required');
  const rows=recipeReview.criteria.filter(row=>row?.id===id);
  need(rows.length===1,'criterion_identity:'+id);
  need(typeof rows[0].pass==='boolean','criterion_verdict:'+id);
  return rows[0];
}

// This accepts an unbound inner response or its identity-bound recipe review.
// The existing recipe validator remains responsible for the complete criterion
// set, localization, result and source/asset binding. No response is rewritten.
export function parseRecipeQualityObservations(recipeReview){
  const values={};
  for(const field of fields){
    const row=criterion(recipeReview,field.id);
    need(typeof row.observation==='string','observation_json_string:'+field.id);
    let observed;
    try{observed=JSON.parse(row.observation);}catch{throw new Error('recipe_quality:observation_json_string:'+field.id);}
    need(observed&&typeof observed==='object'&&!Array.isArray(observed)&&Object.keys(observed).length===2&&Object.hasOwn(observed,'value')&&Object.hasOwn(observed,'observation'),'observation_fields:'+field.id);
    need(prose(observed.observation),'observation_description:'+field.id);
    need(observed.value===null||field.valid(observed.value),'observation_value:'+field.id);
    need(!row.pass||observed.value!==null&&field.passes(observed.value),'criterion_value_conflict:'+field.id);
    values[field.key]=observed.value;
  }
  return values;
}

// Accepted-only evidence. Inputs must be the actual bound recipe review and
// its v3 projection; a transport may rebind the latter's path only after exact
// byte verification. Its actual complete digest is recomputed below.
export function projectRecipeQualityProfile(story,recipeReview,visualReview){
  const observed=parseRecipeQualityObservations(recipeReview);
  need(recipeReview?.schema_version==='daily-compiler-d1-recipe-review-v2'&&recipeReview.story_id===story?.story_id&&hex(story?.specification_sha256,64)&&recipeReview.specification_sha256===story.specification_sha256,'recipe_identity');
  need(recipeReview.result==='PASS'&&recipeReview.specification_conflict===false&&recipeReview.criteria.every(row=>row?.pass===true),'accepted_recipe_required');
  need(hex(recipeReview.final_sha256,64)&&/^ctx-[a-f0-9]{64}$/.test(recipeReview.reviewer_context??'')&&typeof recipeReview.reviewed_at==='string'&&Number.isFinite(Date.parse(recipeReview.reviewed_at)),'recipe_asset_context_time');
  need(visualReview?.story_id===story.story_id&&visualReview.final_sha256===recipeReview.final_sha256&&visualReview.packet_sha256===story.specification_sha256&&visualReview.reviewer_identity===recipeReview.reviewer_context&&visualReview.reviewed_at===recipeReview.reviewed_at,'visual_review_binding');
  const errors=validateVisualReview(visualReview,{packet:{envelope:{story_id:story.story_id,packet_sha256:story.specification_sha256},generation:story.generation}});
  need(visualReview.result==='PASS'&&errors.length===0,'accepted_visual_review_required');
  const components=visualReview.meaningful_components.map(value=>value.normalize('NFKC').toLowerCase().trim());
  need(components.length>=12&&new Set(components).size===components.length,'accepted_component_detail');
  const confirmed = ids => ids.every(id=>criterion(recipeReview,id).pass===true);
  const booleans={
    dimensional_mechanism_plate:confirmed(['quality.dimensional_mechanism_plate_required']),
    white_or_near_white_background:observed.white_or_near_white_background===true&&confirmed(['basic.composition']),
    no_generic_forms:confirmed(['quality.generic_infographic_aesthetic_forbidden']),
    no_decorative_geometry:confirmed(['quality.decorative_geometry_forbidden']),
    no_pseudotext:confirmed(['text.no_pseudotext']),
    story_specific_mechanism_clear:confirmed(['quality.story_specificity_required','basic.mechanism_detail','benchmark.story_specificity','source.truth']),
    premium_production_grade_textbook_editorial_finish:confirmed(['quality.premium_textbook_editorial','basic.professional_textbook_editorial_quality','benchmark.professional_finish'])
  };
  need(Object.values(booleans).every(value=>value===true),'accepted_quality_observations_required');
  const assignment=story.generation?.composition_assignment;
  const assigned={};
  for(const key of ['palette_family','mechanism_metaphor','evidence_representation','feedback_pattern']){
    need(typeof assignment?.[key]==='string'&&assignment[key].trim().length>0,'composition_assignment:'+key);
    assigned[key]=assignment[key];
  }
  return {
    story_id:story.story_id,
    canonical_sha256:recipeReview.final_sha256,
    review_sha256:canonicalSha(visualReview),
    context_id:recipeReview.reviewer_context,
    internal_substages:observed.internal_substages,
    secondary_relationships:observed.secondary_relationships,
    major_visual_regions:observed.major_visual_regions,
    canvas_utilization_percent:observed.canvas_utilization_percent,
    ...booleans,
    ...assigned
  };
}
