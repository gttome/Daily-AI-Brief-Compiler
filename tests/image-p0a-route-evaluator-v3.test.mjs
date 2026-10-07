import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateP0ARoute,evaluateP0ARouteMatrix} from '../image-capsules/p0a-route-evaluator.mjs';

const matrix=JSON.parse(fs.readFileSync('contracts/d0-p0a-route-matrix.json','utf8'));

test('current zero-cost route matrix blocks another P0-A generation',()=>{
  const r=evaluateP0ARouteMatrix(matrix);
  assert.equal(r.result,'BLOCKED_NO_ZERO_COST_NATIVE_ROUTE');
  assert.equal(r.retry_allowed,false);
  assert.deepEqual(r.ready_routes,[]);
});

test('a route reopens P0-A only when all native capabilities coexist',()=>{
  const base={
    route_id:'future_native_route',status:'AVAILABLE',
    native_chatgpt_images:true,fresh_context:true,story_prompt_exactly_bindable:true,
    generated_asset_programmatically_retrievable:true,exact_bytes_available_before_context_end:true,
    post_generation_persistence_available:true,autonomous_invocation:true,
    owner_intervention:false,work:false,codex:false,paid_model_api:false,paid_image_service:false,
    billable_overage:false,new_paid_infrastructure:false,alternate_account:false,proposal1r_reader_fallback:false
  };
  assert.equal(evaluateP0ARoute(base).ready,true);
  for(const key of ['generated_asset_programmatically_retrievable','exact_bytes_available_before_context_end','post_generation_persistence_available','autonomous_invocation']){
    const x={...base,[key]:false};
    assert.equal(evaluateP0ARoute(x).ready,false,key);
  }
});

test('paid or owner-dependent route never reopens P0-A',()=>{
  const route={
    route_id:'bad',status:'AVAILABLE',
    native_chatgpt_images:true,fresh_context:true,story_prompt_exactly_bindable:true,
    generated_asset_programmatically_retrievable:true,exact_bytes_available_before_context_end:true,
    post_generation_persistence_available:true,autonomous_invocation:true,
    owner_intervention:true,paid_model_api:true
  };
  const r=evaluateP0ARoute(route);
  assert.equal(r.ready,false);
  assert.ok(r.prohibited_dependencies.includes('owner_intervention'));
  assert.ok(r.prohibited_dependencies.includes('paid_model_api'));
});


test('route matrix contains no paid, Work, Codex, alternate-account, or overage option',()=>{
  assert.equal(matrix.no_paid_capacity_branch,true);
  assert.deepEqual(matrix.excluded_non_options.sort(),[
    'alternate_account','billable_overage','codex','new_paid_infrastructure',
    'paid_ai_service','paid_image_api','paid_model_api','work'
  ]);
  const ids=matrix.routes.map(r=>r.route_id);
  assert.equal(ids.includes('paid_model_or_image_api'),false);
  assert.equal(ids.includes('work_or_computer_use'),false);
  for(const route of matrix.routes){
    assert.notEqual(route.status,'PROHIBITED');
  }
});
