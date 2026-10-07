import test from 'node:test';
import assert from 'node:assert/strict';
import {countsAsQualityAttempt,nextD0ImageOperation,validateAttemptHistory,assertAcceptedImageImmutable} from '../image-capsules/state.mjs';

test('infrastructure blockers consume zero and allow same ordinal in a fresh capsule',()=>{
  assert.equal(countsAsQualityAttempt('CAPABILITY_BLOCKED_NATIVE_SAME_INVOCATION_CAPTURE'),false);
  const attempts=[{attempt:1,state:'BLOCKED_INFRASTRUCTURE',quality_attempt_consumed:false,context_id:'ctx1',invocation_id:'i1'}];
  assert.deepEqual(validateAttemptHistory(attempts),[]);
  assert.deepEqual(nextD0ImageOperation(attempts),{action:'ALLOCATE_FRESH_CAPSULE',attempt:1});
});
test('unfinished generated candidate is resumed before allocating a duplicate',()=>{
  const attempts=[{attempt:1,state:'RAW_PERSISTED',quality_attempt_consumed:true,context_id:'ctx1',invocation_id:'i1'}];
  assert.deepEqual(nextD0ImageOperation(attempts),{action:'RESUME_EXISTING_CANDIDATE',attempt:1,state:'RAW_PERSISTED'});
});
test('four genuine quality rejections fail closed',()=>{
  const attempts=Array.from({length:4},(_,i)=>({attempt:i+1,state:'REJECTED_QUALITY',quality_attempt_consumed:true,context_id:'c'+i,invocation_id:'i'+i}));
  assert.equal(nextD0ImageOperation(attempts).action,'FAIL_ATTEMPT_LIMIT');
});
test('accepted image cannot regenerate',()=>{
  const attempts=[{attempt:1,state:'ACCEPTED_LOCKED',quality_attempt_consumed:true,context_id:'c1',invocation_id:'i1'}];
  assert.equal(nextD0ImageOperation(attempts).action,'REUSE_ACCEPTED_LOCKED');
  assert.throws(()=>assertAcceptedImageImmutable(attempts),/accepted_image_regeneration_forbidden/);
});
test('same context id cannot be reused across attempts',()=>{
  const attempts=[
    {attempt:1,state:'REJECTED_QUALITY',quality_attempt_consumed:true,context_id:'same',invocation_id:'i1'},
    {attempt:2,state:'REJECTED_QUALITY',quality_attempt_consumed:true,context_id:'same',invocation_id:'i2'}
  ];
  assert.ok(validateAttemptHistory(attempts).includes('context_id_reused'));
});
