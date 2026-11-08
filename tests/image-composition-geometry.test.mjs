import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compositionPlanDigest,compositionGeometryPromptBlock,validateCompositionGeometry} from '../scripts/image-layout-contract.mjs';
import {validateFrozenImageSpecification} from '../scripts/preflight-image-firstpass.mjs';
const original=JSON.parse(fs.readFileSync('external-image-packages/2026-10-31/reviews/six-frozen-specs.json'))[0];
const story={story_id:original.story_id,primary_source:{url:original.source_url,verified_read_evidence:{status:'verified',full_source_read:true}}};
function fixture(){
 const s=structuredClone(original);s.edition_date='2026-11-01';s.quality_review_plan.major_regions=3;
 const qc=s.pre_generation_checks;
 const regions=[0,1,2].map(i=>({id:'stage-'+i,description:'Story-specific mechanism stage '+i,bounding_box_px:{x:40,y:40+176*i,width:1120,height:174}}));
 for(const label of qc.label_layout)label.region_id='stage-'+Math.floor((label.bounding_box_px.y-45)/176);
 const labels=new Map(qc.label_layout.map(l=>[l.label,l]));
 const point=l=>({x:l.bounding_box_px.x+10,y:l.bounding_box_px.y+10});
 qc.composition_geometry={schema_version:'image-composition-geometry-v1',regions,
  connector_anchors:s.allowed_causal_edges.map(e=>({...e,from_region_id:labels.get(e.from).region_id,to_region_id:labels.get(e.to).region_id,origin_px:point(labels.get(e.from)),target_px:point(labels.get(e.to))})),
  prompt_geometry_review:{result:'PASS',reviewer:'fixture-reviewer',regions_match_composition:true,labels_match_regions:true,connectors_match_source:true}};
 s.native_generation_prompt='Create the source-grounded story illustration, using these exact planned regions and anchors.\n'+compositionGeometryPromptBlock(s);
 qc.composition_geometry.prompt_geometry_review.geometry_sha256=compositionPlanDigest(s);return s;
}
test('Nov1 valid bound geometry passes existing full preflight but is not pixel approval',()=>{
 const s=fixture();assert.equal(validateCompositionGeometry(s).result,'COMPOSITION_PLAN_BOUND_NOT_PIXEL_APPROVAL');
 assert.equal(validateFrozenImageSpecification({spec:s,story}).result,'FROZEN_PREGENERATION_SPEC_PASS');
});
test('October31 historic spec remains unchanged, November1 generic unbound grid fails',()=>{
 assert.equal(validateFrozenImageSpecification({spec:original,story}).result,'FROZEN_PREGENERATION_SPEC_PASS');
 const s=structuredClone(original);s.edition_date='2026-11-01';
 assert.throws(()=>validateFrozenImageSpecification({spec:s,story}),/story_specific_regions_required/);
});
test('reject region, label, anchor, and stale semantic binding defects',()=>{
 const mutations=[
  s=>{s.pre_generation_checks.composition_geometry.regions[0].bounding_box_px.x=0;},
  s=>{s.pre_generation_checks.composition_geometry.regions[1].id='stage-0';},
  s=>{s.pre_generation_checks.label_layout[0].region_id='stage-2';},
  s=>{s.pre_generation_checks.label_layout[0].bounding_box_px.height=20;},
  s=>{s.pre_generation_checks.composition_geometry.connector_anchors[0].target_px.x=1190;},
  s=>{s.pre_generation_checks.composition_geometry.connector_anchors[0].to_region_id='stage-2';},
  s=>{s.pre_generation_checks.composition_geometry.connector_anchors.pop();},
  s=>{const a=s.pre_generation_checks.composition_geometry.connector_anchors;a[1]=structuredClone(a[0]);},
  s=>{s.composition_signature.layout='Changed arrangement after review';},
  s=>{s.native_generation_prompt+=' Now change the arrangement.';},
  s=>{s.native_generation_prompt='Create any diagram without the planned geometry';},
  s=>{s.pre_generation_checks.composition_geometry.prompt_geometry_review.regions_match_composition=false;},
 ];
 for(const mutate of mutations){const s=fixture();mutate(s);assert.throws(()=>validateCompositionGeometry(s),/image_composition_geometry/);}
});
test('digest binds labels, source, composition and endpoint coordinates',()=>{
 const s=fixture(),before=compositionPlanDigest(s);
 s.pre_generation_checks.composition_geometry.connector_anchors[0].origin_px.x++;
 assert.notEqual(compositionPlanDigest(s),before);
 assert.throws(()=>validateCompositionGeometry(s),/exact_generation_prompt_with_geometry_required/);
});

test('review digest binds exact prompt text and rejects an omitted geometry block',()=>{
 const s=fixture();s.native_generation_prompt+=' Add a new instruction.';
 assert.throws(()=>validateCompositionGeometry(s),/exact_plan_semantic_review_required/);
 s.native_generation_prompt='A different prompt';
 s.pre_generation_checks.composition_geometry.prompt_geometry_review.geometry_sha256=compositionPlanDigest(s);
 assert.throws(()=>validateCompositionGeometry(s),/exact_generation_prompt_with_geometry_required/);
});

const acceptedNov1Bytes=fs.readFileSync('external-image-packages/2026-11-01/reviews/six-frozen-specs.json');
const acceptedNov1=JSON.parse(acceptedNov1Bytes);
const storyFor=s=>({story_id:s.story_id,primary_source:{url:s.source_url,verified_read_evidence:{status:'verified',full_source_read:true}}});
test('all six exact accepted Nov1 specifications retain existing full preflight acceptance',()=>{
 for(const spec of acceptedNov1){
  assert.equal(validateCompositionGeometry(spec).result,'ACCEPTED_PREACTIVATION_SPEC_UNCHANGED');
  assert.equal(validateFrozenImageSpecification({spec,story:storyFor(spec)}).result,'FROZEN_PREGENERATION_SPEC_PASS');
 }
 assert.deepEqual(fs.readFileSync('external-image-packages/2026-11-01/reviews/six-frozen-specs.json'),acceptedNov1Bytes);
});
test('historical exception cannot admit modified Nov1 or future unbound specifications',()=>{
 const mutations=[
  s=>{s.edition_date='2026-11-02';},
  s=>{s.edition_date='2027-01-01';},
  s=>{s.story_id+='-new';},
  s=>{s.source_url+='?different-source';},
  s=>{s.composition_signature.layout+=' changed';},
  s=>{s.pre_generation_checks.label_layout[0].bounding_box_px.x++;},
  s=>{s.allowed_causal_edges[0].to='Different endpoint';},
  s=>{s.editorial_semantic_review.reviewer='Another reviewer';},
  s=>{s.native_generation_prompt='A newly submitted prompt';},
 ];
 for(const original of acceptedNov1)for(const mutate of mutations){
  const spec=structuredClone(original);mutate(spec);
  assert.throws(()=>validateCompositionGeometry(spec),/story_specific_regions_required/);
 }
});
test('accepted historical exception never bypasses existing source-verification gate',()=>{
 const spec=acceptedNov1[0],story=storyFor(spec);
 story.primary_source.verified_read_evidence.full_source_read=false;
 assert.throws(()=>validateFrozenImageSpecification({spec,story}),/missing_structural_or_source_faithful_spec/);
});
test('future bound specification continues to pass rather than depending on legacy schema opt-in',()=>{
 const spec=fixture();spec.edition_date='2027-01-01';
 const q=spec.pre_generation_checks;
 for(const label of q.label_layout){
  const b=label.bounding_box_px;
  b.x=Math.max(52,b.x);b.y=Math.max(52,b.y);b.width=Math.min(b.width,1148-b.x);
 }
 for(const anchor of q.composition_geometry.connector_anchors){
  anchor.origin_px.x=601;anchor.target_px.x=605;
 }
 spec.native_generation_prompt=compositionGeometryPromptBlock(spec);
 q.composition_geometry.prompt_geometry_review.geometry_sha256=compositionPlanDigest(spec);
 assert.equal(validateFrozenImageSpecification({spec,story}).result,'FROZEN_PREGENERATION_SPEC_PASS');
});

test('Nov02 exact accepted specifications remain valid, modified copies do not inherit the exception',()=>{
 const specs=JSON.parse(fs.readFileSync('external-image-packages/2026-11-02/reviews/frozen-specifications.json'));
 for(const spec of specs){
  assert.equal(validateCompositionGeometry(spec).result,'ACCEPTED_PREACTIVATION_SPEC_UNCHANGED');
  assert.throws(()=>validateCompositionGeometry({...spec,visual_thesis:spec.visual_thesis+' changed'}));
 }
});

test('November 9 planning rejects narrow glyph buffers and label-attached connectors',()=>{
 const s=fixture();s.edition_date='2026-11-09';
 assert.throws(()=>validateCompositionGeometry(s),/glyph_buffer/);
 for(const label of s.pre_generation_checks.label_layout){
  const b=label.bounding_box_px;
  b.x=Math.max(52,b.x);b.y=Math.max(52,b.y);b.width=Math.min(b.width,1148-b.x);
 }
 assert.throws(()=>validateCompositionGeometry(s),/endpoints_must_touch_objects/);
});
