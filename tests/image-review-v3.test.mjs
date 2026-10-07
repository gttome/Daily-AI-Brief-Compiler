import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualReview} from '../image-capsules/review-contract.mjs';

const gate=()=>({verdict:'PASS',observation:'Concrete visible evidence is present.'});
function review(){
 return {schema_version:'daily-compiler-image-review-v3',story_id:'s1',attempt:1,final_path:'x/final.png',final_sha256:'a'.repeat(64),final_git_blob_sha:'b'.repeat(40),packet_sha256:'c'.repeat(64),prompt_sha256:'d'.repeat(64),reviewed_at:'2026-10-07T00:00:00Z',reviewer_identity:'review-invocation-1',
 basic_gates:Object.fromEntries(['subject_match','mechanism_detail','legible_labels','contrast','composition','no_people','no_humanoids','no_branding','no_photorealism','no_overlap','no_clipping','no_unapproved_text','no_unsupported_specifics','no_context_contamination','professional_textbook_editorial_quality'].map(x=>[x,gate()])),
 visible_text:{result:'PASS',required_labels:['A'],observed_required_labels:['A'],missing_labels:[],extra_visible_text:[]},
 meaningful_components:Array.from({length:8},(_,i)=>'Visible component '+i),
 benchmark_dimensions:Object.fromEntries(['professional_finish','meaningful_detail','explanatory_mechanism','annotation_richness','visual_depth','hierarchy','composition','story_specificity','differentiation'].map(x=>[x,gate()])),
 generic_or_sparse:false,decorative_only:false,result:'PASS'};
}
test('review requires exact text, eight components and nine benchmark dimensions',()=>{
 assert.deepEqual(validateVisualReview(review()),[]);
 const a=review(); a.visible_text.extra_visible_text=['oops']; a.result='FAIL'; assert.ok(validateVisualReview(a).includes('visible_text_exact_gate'));
 const b=review(); b.meaningful_components=b.meaningful_components.slice(0,7); b.result='FAIL'; assert.ok(validateVisualReview(b).includes('meaningful_components_min_8'));
 const c=review(); c.benchmark_dimensions.hierarchy={verdict:'FAIL',observation:'Hierarchy is visibly weak.'}; c.result='FAIL'; assert.ok(validateVisualReview(c).includes('benchmark_hierarchy'));
});
