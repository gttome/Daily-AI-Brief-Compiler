// TEST_ONLY synthetic observations. No images, pixel review, live operation or
// actual qualification is performed or asserted by these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS,parseRecipeQualityObservations,projectRecipeQualityProfile} from '../image-studio/recipe-quality-observations.mjs';
import {BASIC_GATES,BENCHMARK_DIMENSIONS} from '../image-capsules/review-contract.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';

const measured=[
  ['layout.occupancy',83.5],
  ['layout.regions',5],
  ['quality.minimum_internal_substages_in_dominant_mechanism',4],
  ['quality.minimum_secondary_relationships',3],
  ['basic.composition',true]
];
const description='TEST_ONLY synthetic observation; not an actual pixel finding.';
const observed=value=>JSON.stringify({value,observation:description});
function sample(){
  const story={story_id:'TEST_ONLY-quality-profile',specification_sha256:'a'.repeat(64),generation:{visible_text_allowlist:['TEST_ONLY'],composition_assignment:{palette_family:'TEST_ONLY blue',mechanism_metaphor:'TEST_ONLY cutaway',evidence_representation:'TEST_ONLY references',feedback_pattern:'TEST_ONLY no return'}}};
  const ids=[...BASIC_GATES.map(key=>'basic.'+key),...BENCHMARK_DIMENSIONS.map(key=>'benchmark.'+key),'source.truth','text.no_pseudotext','quality.dimensional_mechanism_plate_required','quality.generic_infographic_aesthetic_forbidden','quality.decorative_geometry_forbidden','quality.story_specificity_required','quality.premium_textbook_editorial',...measured.map(([id])=>id)];
  const recipe={schema_version:'daily-compiler-d1-recipe-review-v2',story_id:story.story_id,specification_sha256:story.specification_sha256,criteria_sha256:'b'.repeat(64),final_sha256:'c'.repeat(64),reviewer_context:'ctx-'+'d'.repeat(64),reviewed_at:'2026-10-08T22:00:00Z',criteria:[...new Set(ids)].map(id=>({id,pass:true,location:'TEST_ONLY region',observation:description,offending_text:null,missing_labels:[]})),specification_conflict:false,result:'PASS'};
  for(const [id,value] of measured)recipe.criteria.find(row=>row.id===id).observation=observed(value);
  const gate=()=>({verdict:'PASS',observation:description});
  const visual={schema_version:'daily-compiler-image-review-v3',story_id:story.story_id,attempt:1,final_path:'TEST_ONLY/accepted.png',final_sha256:recipe.final_sha256,final_git_blob_sha:'e'.repeat(40),packet_sha256:story.specification_sha256,prompt_sha256:'f'.repeat(64),reviewed_at:recipe.reviewed_at,reviewer_identity:recipe.reviewer_context,basic_gates:Object.fromEntries(BASIC_GATES.map(key=>[key,gate()])),visible_text:{result:'PASS',required_labels:['TEST_ONLY'],observed_required_labels:['TEST_ONLY'],missing_labels:[],extra_visible_text:[]},meaningful_components:Array.from({length:12},(_,index)=>'TEST_ONLY distinct observed component '+index),benchmark_dimensions:Object.fromEntries(BENCHMARK_DIMENSIONS.map(key=>[key,gate()])),generic_or_sparse:false,decorative_only:false,result:'PASS'};
  return {story,recipe,visual};
}
const row=(recipe,id)=>recipe.criteria.find(item=>item.id===id);
const reject=(recipe,id,value)=>{const item=row(recipe,id);item.observation=observed(value);item.pass=false;recipe.result='FAIL';};
const project=f=>projectRecipeQualityProfile(f.story,f.recipe,f.visual);

test('frozen instruction requests actual values in existing fields without targets as observations',()=>{
  assert.equal(typeof RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS,'string');
  for(const [id] of measured)assert.ok(RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS.includes(id));
  assert.match(RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS,/never copy a requested target or substitute a midpoint/);
  assert.match(RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS,/report null and set that criterion pass=false/);
});

test('parser preserves observed nondefault values and leaves the complete response unchanged',()=>{
  const f=sample(),before=structuredClone(f.recipe);
  assert.deepEqual(parseRecipeQualityObservations(f.recipe),{canvas_utilization_percent:83.5,major_visual_regions:5,internal_substages:4,secondary_relationships:3,white_or_near_white_background:true});
  assert.deepEqual(f.recipe,before);
});

test('missing, duplicate, unstructured or extra observation fields cannot become measurements',async t=>{
  const mutations=[
    ['missing criterion',f=>f.recipe.criteria=f.recipe.criteria.filter(item=>item.id!=='layout.occupancy')],
    ['duplicate criterion',f=>f.recipe.criteria.push(structuredClone(row(f.recipe,'layout.occupancy')))],
    ['unstructured prose',f=>row(f.recipe,'layout.occupancy').observation='TEST_ONLY within the target range; no observed percentage.'],
    ['object instead of JSON string',f=>row(f.recipe,'layout.occupancy').observation={value:85,observation:description}],
    ['extra score field',f=>row(f.recipe,'layout.occupancy').observation=JSON.stringify({value:85,observation:description,score:100})],
    ['description missing',f=>row(f.recipe,'layout.occupancy').observation=JSON.stringify({value:85})],
    ['description too short',f=>row(f.recipe,'layout.occupancy').observation=JSON.stringify({value:85,observation:'PASS'})],
    ['description blank',f=>row(f.recipe,'layout.occupancy').observation=JSON.stringify({value:85,observation:' '.repeat(20)})]
  ];
  for(const [name,mutate] of mutations)await t.test(name,()=>{const f=sample();mutate(f);assert.throws(()=>parseRecipeQualityObservations(f.recipe),/recipe_quality:/);});
});

test('every unknown value requires FAIL, stays null and cannot create an accepted profile',async t=>{
  for(const [id] of measured)await t.test(id,()=>{
    const f=sample();row(f.recipe,id).observation=observed(null);
    assert.throws(()=>parseRecipeQualityObservations(f.recipe),/criterion_value_conflict/);
    row(f.recipe,id).pass=false;f.recipe.result='FAIL';
    assert.ok(Object.values(parseRecipeQualityObservations(f.recipe)).includes(null));
    assert.throws(()=>project(f),/accepted_recipe_required/);
  });
});

test('observed failing values survive, while false PASS or impossible value types are rejected',async t=>{
  for(const [id,value] of [['layout.occupancy',79.5],['layout.occupancy',90.5],['layout.regions',2],['layout.regions',6],['quality.minimum_internal_substages_in_dominant_mechanism',1],['quality.minimum_secondary_relationships',0],['basic.composition',false]])await t.test(id+':'+value,()=>{
    const f=sample();row(f.recipe,id).observation=observed(value);
    assert.throws(()=>parseRecipeQualityObservations(f.recipe),/criterion_value_conflict/);
    reject(f.recipe,id,value);assert.ok(Object.values(parseRecipeQualityObservations(f.recipe)).includes(value));
    assert.throws(()=>project(f),/accepted_recipe_required/);
  });
  for(const [id,value] of [['layout.occupancy',-1],['layout.occupancy',101],['layout.occupancy','85'],['layout.regions',3.5],['layout.regions',-1],['quality.minimum_internal_substages_in_dominant_mechanism',Number.MAX_SAFE_INTEGER+1],['quality.minimum_secondary_relationships',true],['basic.composition','true'],['basic.composition',1]])await t.test('invalid '+id+':'+value,()=>{
    const f=sample();reject(f.recipe,id,value);assert.throws(()=>parseRecipeQualityObservations(f.recipe),/observation_value/);
  });
});

test('passing numeric boundaries are inclusive and another existing criterion failure is preserved',()=>{
  for(const values of [[80,3,2,2,true],[90,5,9,8,true]]){
    const f=sample();measured.forEach(([id],index)=>row(f.recipe,id).observation=observed(values[index]));
    assert.doesNotThrow(()=>parseRecipeQualityObservations(f.recipe));
  }
  const f=sample();reject(f.recipe,'basic.composition',true);
  assert.equal(parseRecipeQualityObservations(f.recipe).white_or_near_white_background,true);
  assert.throws(()=>project(f),/accepted_recipe_required/);
});

test('accepted profile binds exact observations, actual review digest and sealed assignments without mutating inputs',()=>{
  const f=sample(),before=structuredClone(f),profile=project(f);
  assert.deepEqual(profile,{story_id:f.story.story_id,canonical_sha256:f.recipe.final_sha256,review_sha256:canonicalSha(f.visual),context_id:f.recipe.reviewer_context,internal_substages:4,secondary_relationships:3,major_visual_regions:5,canvas_utilization_percent:83.5,dimensional_mechanism_plate:true,white_or_near_white_background:true,no_generic_forms:true,no_decorative_geometry:true,no_pseudotext:true,story_specific_mechanism_clear:true,premium_production_grade_textbook_editorial_finish:true,...f.story.generation.composition_assignment});
  assert.deepEqual(f,before);
  const moved=structuredClone(f);moved.visual.final_path='TEST_ONLY/transported-same-bytes.png';
  const transported=project(moved);assert.equal(transported.canonical_sha256,profile.canonical_sha256);
  assert.equal(transported.review_sha256,canonicalSha(moved.visual));assert.notEqual(transported.review_sha256,profile.review_sha256);
});

test('mismatched bindings, unsupported PASS, missing quality observations and artificial detail prevent a profile',async t=>{
  const mutations=[
    ['story mismatch',f=>f.visual.story_id='TEST_ONLY-other-story'],
    ['canonical bytes mismatch',f=>f.visual.final_sha256='1'.repeat(64)],
    ['packet mismatch',f=>f.visual.packet_sha256='1'.repeat(64)],
    ['context mismatch',f=>f.visual.reviewer_identity='ctx-'+'1'.repeat(64)],
    ['review time mismatch',f=>f.visual.reviewed_at='2026-10-08T23:00:00Z'],
    ['invalid context',f=>f.recipe.reviewer_context='unbound'],
    ['invalid review time',f=>f.recipe.reviewed_at='unobserved'],
    ['specification conflict',f=>f.recipe.specification_conflict=true],
    ['failed full criterion with PASS result',f=>row(f.recipe,'source.truth').pass=false],
    ['v3 FAIL',f=>f.visual.result='FAIL'],
    ['v3 failed gate claiming PASS',f=>f.visual.basic_gates.no_overlap.verdict='FAIL'],
    ['missing dimensional observation',f=>f.recipe.criteria=f.recipe.criteria.filter(item=>item.id!=='quality.dimensional_mechanism_plate_required')],
    ['missing actual source observation',f=>f.recipe.criteria=f.recipe.criteria.filter(item=>item.id!=='source.truth')],
    ['missing assignment',f=>delete f.story.generation.composition_assignment.palette_family],
    ['fewer than twelve components',f=>f.visual.meaningful_components.pop()],
    ['duplicate detail',f=>f.visual.meaningful_components[1]=f.visual.meaningful_components[0].toUpperCase()]
  ];
  for(const [name,mutate] of mutations)await t.test(name,()=>{const f=sample();mutate(f);assert.throws(()=>project(f),/recipe_quality:/);});
});
