import test from 'node:test';
import assert from 'node:assert/strict';
import {sealPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt,assertSubmittedPrompt} from '../image-capsules/prompt.mjs';

function packet(){
 return sealPacket({schema_version:'daily-compiler-image-packet-v3',envelope:{edition_date:'2026-10-08',story_id:'secret-story-id',candidate_id:'secret-candidate',story_content_sha256:'1'.repeat(64),set_plan_sha256:'2'.repeat(64),packet_sha256:'0'.repeat(64)},generation:{subject:'Device workflow',core_mechanism:'A neutral device workflow moves evidence through bounded gates.',verified_visual_facts:['Evidence is verified'],conceptual_elements:['neutral device','evidence token'],meaningful_components_plan:Array.from({length:8},(_,i)=>({component_id:'c'+i,description:'Component '+i,support:'approved_concept',required:true})),composition_assignment:{composition_signature:'comp',layout_signature:'layout',diagram_grammar:'bounded_workbench',hierarchy_signature:'hier',annotation_pattern_signature:'anno',reading_path:'left to right',prohibited_patterns:[]},visible_text_allowlist:['Input','Evidence','Output'],prohibited_specifics:['brand logo'],prohibited_composition_patterns:['generic dashboard'],reference_policy:'No reference images',wrong_subject_action:'discard_and_generate_fresh',render_contract:{canvas_target:'1200x630',background:'white_or_near_white',style:'professional_high_detail_textbook_editorial_mechanism',minimum_meaningful_components:8,people:'prohibited',humanoids:'prohibited',branding:'prohibited',photorealism:'prohibited',generic_ai_imagery:'prohibited',decorative_filler:'prohibited',unsupported_specifics:'prohibited',visible_text_policy:'exact_allowlist_only',low_quality_fallback:false}},review:{benchmark_profile:'sep09-sep10-premium3-v1',minimum_meaningful_components:8,generic_or_sparse_must_be:false,decorative_only_must_be:false}});
}
test('first-attempt prompt includes strict text brand abstract and human contracts',()=>{
 const p=compileGeneratorPrompt(packet()).prompt;
 for(const s of ['VISIBLE TEXT FAIL-CLOSED CONTRACT','BRAND FAIL-CLOSED CONTRACT','ABSTRACT SUBSTITUTE CONTRACT','HUMAN FIGURE CONTRACT','Use at least 8 meaningful explanatory components','No UI chrome.']) assert.ok(p.includes(s),s);
 assert.doesNotMatch(p,/secret-story-id|secret-candidate|2026-10-08/);
});
test('prompt binding rejects appended runtime instruction',()=>{
 const x=packet(),c=compileGeneratorPrompt(x);
 assert.throws(()=>assertSubmittedPrompt(x,c.prompt+'\nextra'),/not_exact_compiled_prompt/);
});
