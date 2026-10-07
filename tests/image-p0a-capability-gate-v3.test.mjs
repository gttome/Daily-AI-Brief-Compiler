import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateP0ACapability,shouldGenerateP0ARetry} from '../image-capsules/p0a-capability-gate.mjs';

test('does not repeat native generations while scheduled result pixels are not programmatically retrievable',()=>{
  const g=evaluateP0ACapability({
    fresh_story_only_context_proven:true,
    generated_output_programmatically_retrievable:false,
    output_visual_inspection_proven:false,
    same_invocation_exact_byte_persistence_compatible:false
  });
  assert.equal(g.status,'BLOCKED_RETRYABLE');
  assert.equal(g.reason,'STANDALONE_TASK_RESULT_IMAGE_NOT_PROGRAMMATICALLY_RETRIEVABLE');
  assert.equal(shouldGenerateP0ARetry({
    fresh_story_only_context_proven:true,
    generated_output_programmatically_retrievable:false
  }),false);
});

test('does not confuse standalone P0-A visibility with production clean-capture compatibility',()=>{
  const g=evaluateP0ACapability({
    fresh_story_only_context_proven:true,
    generated_output_programmatically_retrievable:true,
    output_visual_inspection_proven:true,
    same_invocation_exact_byte_persistence_compatible:false
  });
  assert.equal(g.status,'BLOCKED_RETRYABLE');
  assert.equal(g.reason,'CLEAN_CAPSULE_SAME_INVOCATION_PERSISTENCE_HOOK_UNAVAILABLE');
  assert.equal(g.retry_allowed,false);
});

test('allows formal P0-A generation only after all capability primitives are proven',()=>{
  const input={
    fresh_story_only_context_proven:true,
    generated_output_programmatically_retrievable:true,
    output_visual_inspection_proven:true,
    same_invocation_exact_byte_persistence_compatible:true,
    prohibited_dependency_used:false
  };
  const g=evaluateP0ACapability(input);
  assert.equal(g.status,'READY_FOR_FORMAL_P0A');
  assert.equal(shouldGenerateP0ARetry(input),true);
});

test('prohibited dependency is a hard failure and never a retry route',()=>{
  const g=evaluateP0ACapability({prohibited_dependency_used:true});
  assert.deepEqual(g,{status:'FAIL',retry_allowed:false,reason:'prohibited_dependency_used'});
});
