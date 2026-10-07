import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualReview,BASIC_GATES,BENCHMARK_DIMENSIONS} from '../image-capsules/review-contract.mjs';

const gate={verdict:'PASS',observation:'Concrete visible evidence supports this criterion.'};
function review(){
  return {schema_version:'daily-compiler-image-review-v3',story_id:'s1',attempt:1,final_path:'shadow-runs/2026-10-08/images/attempts/s1/a01/final.png',final_sha256:'1'.repeat(64),final_git_blob_sha:'2'.repeat(40),packet_sha256:'3'.repeat(64),prompt_sha256:'4'.repeat(64),reviewed_at:'2026-10-08T00:00:00Z',reviewer_identity:'scheduled-review-1',
    basic_gates:Object.fromEntries(BASIC_GATES.map(x=>[x,{...gate}])),
    visible_text:{result:'PASS',required_labels:['A'],observed_required_labels:['A'],missing_labels:[],extra_visible_text:[]},
    meaningful_components:Array.from({length:8},(_,i)=>'Visible explanatory component '+(i+1)),
    benchmark_dimensions:Object.fromEntries(BENCHMARK_DIMENSIONS.map(x=>[x,{...gate}])),
    generic_or_sparse:false,decorative_only:false,result:'PASS'};
}
test('review requires all gates, exact text, eight components and nine benchmark dimensions',()=>{
 assert.deepEqual(validateVisualReview(review()),[]);
 const r=review(); r.visible_text.extra_visible_text=['oops']; assert.ok(validateVisualReview(r).includes('visible_text_extra'));
});
test('one benchmark failure fails the review',()=>{
 const r=review(); r.benchmark_dimensions.hierarchy.verdict='FAIL'; assert.ok(validateVisualReview(r).includes('benchmark_fail:hierarchy'));
});
