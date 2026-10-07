import test from 'node:test';
import assert from 'node:assert/strict';
import {sealPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt} from '../image-capsules/prompt.mjs';
import {buildAdmission,validateAdmission} from '../image-capsules/admission.mjs';

function packet(){
 return sealPacket({schema_version:'daily-compiler-image-packet-v3',envelope:{edition_date:'2026-10-08',story_id:'s1',candidate_id:'c1',story_content_sha256:'1'.repeat(64),set_plan_sha256:'2'.repeat(64),packet_sha256:'0'.repeat(64)},generation:{subject:'Subject',core_mechanism:'Core mechanism',verified_visual_facts:['Fact'],conceptual_elements:['Concept'],meaningful_components_plan:Array.from({length:8},(_,i)=>({component_id:'c'+i,description:'Component '+i,support:'approved_concept',required:true})),composition_assignment:{composition_signature:'c',layout_signature:'l',diagram_grammar:'g',hierarchy_signature:'h',annotation_pattern_signature:'a',reading_path:'r',prohibited_patterns:[]},visible_text_allowlist:['One'],prohibited_specifics:['logo'],prohibited_composition_patterns:['dashboard'],reference_policy:'none',wrong_subject_action:'discard_and_generate_fresh',render_contract:{canvas_target:'1200x630',background:'white_or_near_white',style:'professional_high_detail_textbook_editorial_mechanism',minimum_meaningful_components:8,people:'prohibited',humanoids:'prohibited',branding:'prohibited',photorealism:'prohibited',generic_ai_imagery:'prohibited',decorative_filler:'prohibited',unsupported_specifics:'prohibited',visible_text_policy:'exact_allowlist_only',low_quality_fallback:false}},review:{benchmark_profile:'sep09-sep10-premium3-v1',minimum_meaningful_components:8,generic_or_sparse_must_be:false,decorative_only_must_be:false}});
}
test('self-attested booleans without platform boundary proof do not authorize',()=>{
 const x=packet(),c=compileGeneratorPrompt(x);
 const r=buildAdmission({edition_date:'2026-10-08',execution_id:'e1',story_id:'s1',attempt:1,invocation_id:'i1',context_id:'ctx1',packet:x,submitted_instruction:c.prompt,context_proof:null});
 assert.equal(r.generation_authorized,false);
 assert.ok(validateAdmission(r,{packet:x,submitted_instruction:c.prompt}).includes('generation_not_authorized'));
});
test('proven fresh capsule admits once and context id cannot be reused',()=>{
 const x=packet(),c=compileGeneratorPrompt(x),proof={method:'platform_fresh_capsule_boundary',generator_visible_context_sha256:c.projection_sha256,outer_context_probe_id:'probe',outer_context_visible_to_generator:false,other_story_material_visible:false,prior_image_material_visible:false,evidence_ref:'proof/p0-a.json'};
 const r=buildAdmission({edition_date:'2026-10-08',execution_id:'e1',story_id:'s1',attempt:1,invocation_id:'i1',context_id:'ctx1',packet:x,submitted_instruction:c.prompt,context_proof:proof});
 assert.equal(r.generation_authorized,true);
 assert.deepEqual(validateAdmission(r,{packet:x,submitted_instruction:c.prompt}),[]);
 assert.ok(validateAdmission(r,{packet:x,submitted_instruction:c.prompt,seen_context_ids:new Set(['ctx1'])}).includes('context_identity_invalid_or_reused'));
});
test('referenced images fail admission',()=>{
 const x=packet(),c=compileGeneratorPrompt(x),proof={method:'platform_fresh_capsule_boundary',generator_visible_context_sha256:c.projection_sha256,outer_context_probe_id:'probe',outer_context_visible_to_generator:false,other_story_material_visible:false,prior_image_material_visible:false,evidence_ref:'proof/p0-a.json'};
 const r=buildAdmission({edition_date:'2026-10-08',execution_id:'e1',story_id:'s1',attempt:1,invocation_id:'i1',context_id:'ctx1',packet:x,submitted_instruction:c.prompt,context_proof:proof,referenced_images:['x']});
 assert.equal(r.generation_authorized,false);
});
