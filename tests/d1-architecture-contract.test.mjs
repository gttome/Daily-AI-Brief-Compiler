import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateD1Activation} from '../image-studio/activation.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('D1 v5 contract uses Work Cloud Browser with a fresh regular chat per story',()=>{
  const c=read('contracts/d1-image-contract.json');
  assert.equal(c.schema_version,'daily-compiler-image-contract-v5');
  assert.equal(c.strategy,'d1_work_browser_fresh_chat');
  if(c.activation_status==='active'){
    const activation=validateD1Activation();
    assert.equal(activation.result,'PASS',activation.errors.join(','));
  }else{
    assert.equal(c.activation_status,'proof_required');
    assert.equal(c.activation_receipt_path,null);
    assert.equal(c.activation_receipt_sha256,null);
  }
  assert.equal(c.image_creation.executor,'work_cloud_browser_fresh_regular_chat_per_story');
  assert.equal(c.image_creation.fresh_regular_chat_per_story_required,true);
  assert.equal(c.image_creation.temporary_chat_forbidden,true);
  assert.equal(c.image_creation.prior_conversation_reuse_forbidden,true);
  assert.equal(c.quality.gate_location,'fresh_regular_chat_per_story');
  assert.equal(c.quality.minimum_meaningful_components,12);
  assert.equal(c.quality.benchmark_profile_path,'docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md');
  assert.equal(c.quality.dimensional_mechanism_plate_required,true);
  assert.equal(c.quality.generic_infographic_aesthetic_forbidden,true);
  assert.equal(c.quality.decorative_geometry_forbidden,true);
  assert.equal(c.transfer.archive_required,false);
  assert.equal(c.transfer.git_binary_readback_method,'exact_commit_raw_github_download');
  assert.deepEqual(c.allowed_work_scope,['IMAGE_BROWSER_ORCHESTRATION_AND_INGEST']);
  assert.equal(c.transfer.work_may_use_native_work_image_generation,false);
  assert.equal(c.transfer.work_may_make_visual_quality_decisions,false);
});

test('Work contract preserves clean story chats and exact-byte recovery',()=>{
  const w=read('contracts/d1-work-porter-contract.json');
  assert.equal(w.schema_version,'daily-compiler-d1-work-porter-v2');
  assert.equal(w.allowed_scope,'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST');
  assert.equal(w.cloud_only,true);
  assert.equal(w.browser_rules.fresh_regular_chat_per_story,true);
  assert.equal(w.browser_rules.temporary_chat_forbidden,true);
  assert.equal(w.work_native_image_generation_allowed,false);
  assert.equal(w.work_subagent_image_generation_allowed,false);
  assert.equal(w.may_visually_accept_images,false);
  assert.equal(w.binary_readback_method,'direct_raw_github_download_pinned_to_immutable_commit');
  assert.equal(w.execution_boundary.outer_executor,'chatgpt_work_task');
  assert.equal(w.execution_boundary.inner_generation_target,'ordinary_chatgpt_regular_chat');
  assert.equal(w.execution_boundary.inner_target_chat_selected,true);
  assert.equal(w.execution_boundary.inner_target_work_selected,false);
  assert.equal(w.execution_boundary.inner_chat_mode_is_required_not_violation,true);
  // Contract regression only; browser capability still needs actual invocation evidence.
  const prompt=fs.readFileSync('contracts/d1-work-browser-prompt.txt','utf8');
  assert.match(prompt,/segments of at most 2000 UTF-8 bytes each/);
  assert.match(prompt,/Preserve complete Unicode code points and every newline/);
  assert.match(prompt,/After EVERY paste, independently read the COMPLETE actual editable composer value/);
  assert.match(prompt,/Do not paste the next segment until that prefix check passes/);
  assert.match(prompt,/Never press Enter during entry/);
  assert.match(prompt,/Passing an individual prefix check is not permission to Send/);
  assert.match(prompt,/one explicit, observed Send action, separate from non-submitting entry/);
  assert.match(prompt,/Read back the COMPLETE actual sent user message/);
  assert.match(prompt,/only when those operations are supported by the current returned documentation/);
  assert.match(prompt,/Do not invent a browser API, mutate the DOM through an evaluation call/);
});

test('Dot is optional and not the reader-image path owner',()=>{
  const d=read('contracts/d1-dot-coordinator-contract.json');
  assert.equal(d.required_for_image_path,false);
  assert.equal(d.image_path_owner,'work_cloud_browser');
  assert.equal(d.local_computer_dependency,false);
});

test('schedule contract remains four coarse schedules and forbids paid dependencies',()=>{
  const s=read('contracts/schedule-contract.json');
  assert.equal(s.schema_version,'daily-compiler-schedule-contract-v2');
  assert.equal(s.schedules.length,4);
  assert.deepEqual(s.schedules.map(row=>[row.role,row.time,row.may_allocate]),[
    ['primary','00:45',true],['recovery','21:15',false],['recovery','01:15',false],['recovery','05:15',false]
  ]);
  assert.equal(s.rules.paid_model_api,false);
  assert.equal(s.rules.paid_browser_service,false);
  assert.equal(s.rules.dot_required_for_image_path,false);
  assert.deepEqual(s.rules.work_allowed_scope,['IMAGE_BROWSER_ORCHESTRATION_AND_INGEST']);
});

test('D1 executable runtime contains no paid API or local computer path',()=>{
  const paths=['image-studio/acceptance.mjs','image-studio/activation.mjs','image-studio/activation-apply.mjs','image-studio/bundle-gate.mjs','work-porter/integrity.mjs'];
  for(const p of paths){
    const t=fs.readFileSync(p,'utf8');
    assert.doesNotMatch(t,/api\.openai\.com/i,p);
    assert.doesNotMatch(t,/OPENAI_API_KEY/,p);
    assert.doesNotMatch(t,/invokeCodex\s*\(/i,p);
  }
});
