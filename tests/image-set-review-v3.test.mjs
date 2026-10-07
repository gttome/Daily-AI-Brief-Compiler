import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSetReview,setReviewGate} from '../image-capsules/set-review.mjs';

function review(){
 const c=Array.from({length:6},(_,i)=>({story_id:'s'+i,final_sha256:String(i+1).repeat(64).slice(0,64),composition_signature:'c'+i,layout_signature:'l'+(i%4),diagram_grammar:'g'+(i%4),hierarchy_signature:'h'+(i%4),annotation_pattern_signature:'a'+(i%3)}));
 const base={schema_version:'daily-compiler-image-set-review-v3',edition_date:'2026-10-08',candidates:c,observed_gate:{},no_labels_swapped_template:true,no_repeated_dominant_template:true,intentionally_curated:true,all_individually_benchmark_grade:true,result:'PASS',reviewed_at:'2026-10-08T00:00:00Z'};
 const g=setReviewGate(base); base.observed_gate={unique_compositions:g.unique_compositions,distinct_layouts:g.distinct_layouts,distinct_grammars:g.distinct_grammars,distinct_hierarchies:g.distinct_hierarchies,distinct_annotation_patterns:g.distinct_annotation_patterns,unique_byte_streams:g.unique_byte_streams};
 return base;
}
test('set review enforces differentiation thresholds',()=>{assert.deepEqual(validateSetReview(review()),[]);});
test('duplicate composition and byte stream fail',()=>{
 const r=review(); r.candidates[1].composition_signature=r.candidates[0].composition_signature; r.candidates[1].final_sha256=r.candidates[0].final_sha256;
 const g=setReviewGate(r); r.observed_gate={unique_compositions:g.unique_compositions,distinct_layouts:g.distinct_layouts,distinct_grammars:g.distinct_grammars,distinct_hierarchies:g.distinct_hierarchies,distinct_annotation_patterns:g.distinct_annotation_patterns,unique_byte_streams:g.unique_byte_streams};
 const e=validateSetReview(r); assert.ok(e.includes('set_review_unique_compositions')); assert.ok(e.includes('set_review_unique_bytes'));
});
