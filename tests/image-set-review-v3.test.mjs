import test from 'node:test';
import assert from 'node:assert/strict';
import {observedSetGate,validateSetReview} from '../image-capsules/set-review.mjs';

function set(){
 const candidates=Array.from({length:6},(_,i)=>({story_id:'s'+i,final_sha256:String(i).padStart(64,'0'),composition_signature:'c'+i,layout_signature:'l'+(i%4),diagram_grammar:'g'+(i%4),hierarchy_signature:'h'+(i%4),annotation_pattern_signature:'a'+(i%3)}));
 const observed_gate=observedSetGate(candidates);
 return {schema_version:'daily-compiler-image-set-review-v3',edition_date:'2026-10-08',candidates,observed_gate,no_labels_swapped_template:true,no_repeated_dominant_template:true,intentionally_curated:true,all_individually_benchmark_grade:true,result:'PASS',reviewed_at:'2026-10-07T00:00:00Z'};
}
test('six-image set gate requires differentiation and byte uniqueness',()=>{
 const x=set(); assert.deepEqual(validateSetReview(x),[]);
 const bad=set(); bad.candidates[5].composition_signature=bad.candidates[0].composition_signature; bad.observed_gate=observedSetGate(bad.candidates); bad.result='FAIL';
 assert.ok(validateSetReview(bad).includes('set_unique_compositions'));
 const dup=set(); dup.candidates[5].final_sha256=dup.candidates[0].final_sha256; dup.observed_gate=observedSetGate(dup.candidates); dup.result='FAIL';
 assert.ok(validateSetReview(dup).includes('set_unique_byte_streams'));
});
