import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSha} from '../image-capsules/util.mjs';
import {sealPacket,validatePacket,generatorProjection,packetPayloadForHash} from '../image-capsules/packet.mjs';
import {assertSetPlan} from '../image-capsules/set-plan.mjs';

function plan(){
 const grammars=['layered_cutaway','forensic_split_plane','source_evidence_lattice','research_observatory','bounded_workbench','control_loop'];
 return {schema_version:'daily-compiler-image-set-plan-v3',edition_date:'2026-10-08',stories:grammars.map((g,i)=>({story_id:'s'+(i+1),composition_signature:'c'+(i+1),layout_signature:'l'+(i%4),diagram_grammar:g,hierarchy_signature:'h'+(i%4),annotation_pattern_signature:'a'+(i%3),reading_path:'r'+(i+1),prohibited_patterns:[]})),planned_set_gate:{unique_composition_signatures:6,distinct_layout_signatures_min:4,distinct_diagram_grammars_min:4,distinct_hierarchy_signatures_min:4,distinct_annotation_patterns_min:3}};
}
function packet(p){
 const setSha=assertSetPlan(p).plan_sha256;
 const assignment=structuredClone(p.stories[0]); delete assignment.story_id;
 return sealPacket({schema_version:'daily-compiler-image-packet-v3',envelope:{edition_date:'2026-10-08',story_id:'s1',candidate_id:'s1-a01',story_content_sha256:'1'.repeat(64),set_plan_sha256:setSha,packet_sha256:'0'.repeat(64)},generation:{subject:'Bounded agent verification',core_mechanism:'Evidence passes through a verification gate into an immutable result.',verified_visual_facts:['Durable state is checked'],conceptual_elements:['evidence token','verification gate'],meaningful_components_plan:Array.from({length:8},(_,i)=>({component_id:'c'+(i+1),description:'Visible mechanism component '+(i+1),support:i?'approved_concept':'verified_fact',required:true})),composition_assignment:assignment,visible_text_allowlist:['Evidence','Verify','Result'],prohibited_specifics:['provider logo'],prohibited_composition_patterns:['generic dashboard'],reference_policy:'No reference images',wrong_subject_action:'discard_and_generate_fresh',render_contract:{canvas_target:'1200x630',background:'white_or_near_white',style:'professional_high_detail_textbook_editorial_mechanism',minimum_meaningful_components:8,people:'prohibited',humanoids:'prohibited',branding:'prohibited',photorealism:'prohibited',generic_ai_imagery:'prohibited',decorative_filler:'prohibited',unsupported_specifics:'prohibited',visible_text_policy:'exact_allowlist_only',low_quality_fallback:false}},review:{benchmark_profile:'sep09-sep10-premium3-v1',minimum_meaningful_components:8,generic_or_sparse_must_be:false,decorative_only_must_be:false}});
}
test('packet validates and generator projection excludes envelope and IDs',()=>{
 const p=plan(),x=packet(p);
 assert.deepEqual(validatePacket(x,{setPlan:p}),[]);
 const projection=generatorProjection(x),text=JSON.stringify(projection);
 for(const secret of ['2026-10-08','s1-a01','story_content_sha256','set_plan_sha256','packet_sha256']) assert.equal(text.includes(secret),false,secret);
});
test('allowlist duplicates fail',()=>{
 const p=plan(),x=structuredClone(packet(p)); x.generation.visible_text_allowlist=['Duplicate','Duplicate']; x.envelope.packet_sha256=canonicalSha(packetPayloadForHash(x));
 assert.ok(validatePacket(x).includes('visible_text_label_duplicate'));
});
