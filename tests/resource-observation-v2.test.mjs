import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESOURCE_OBSERVATION_SCHEMA,
  LEGACY_RESOURCE_OBSERVATION_SCHEMA,
  validateResourceObservation,
  applyResourceObservation
} from '../operations/resources.mjs';

const registry=()=>({
  schema_version:'daily-compiler-resource-registry-v1',updated_at:'2026-10-08T00:00:00Z',
  resources:[{
    resource_id:'source-1',name:'Source 1',url:'https://example.com/blog',enabled:true,
    content_types:['article','watchlist'],priority:'primary',search_mode:'feed',
    endpoint:'https://example.com/feed',publisher:'Example',notes:null,
    health:{status:'failing',last_checked_at:'2026-10-07T00:00:00Z',last_success_at:null,
      consecutive_failures:4,observed_yield_rate:null,freshness_hit_rate:null}
  }]
});

const empty=()=>({
  schema_version:RESOURCE_OBSERVATION_SCHEMA,edition_date:'2026-10-08',execution_id:'iteration-05-rehearsal',
  resource_id:'source-1',checked_at:'2026-10-08T07:00:00Z',content_type:'article',queries:1,
  candidates_found:0,usable_candidates:0,selected_items:0,fresh_items:0,failures:[],duration_ms:null,
  retrieval:{status:'healthy',http_status:200,reason:null},
  coverage:{status:'checked',due:true},editorial_yield:{status:'empty',reason:null}
});

const limited=status=>({
  ...empty(),candidates_found:null,usable_candidates:null,selected_items:null,fresh_items:null,
  retrieval:{status,http_status:status==='access_blocked'?403:status==='unavailable'?null:200,
    reason:`Observed ${status} on the configured retrieval route.`},
  editorial_yield:{status:'not_assessed',reason:'Access or parsing did not establish editorial yield.'}
});

test('I05-T01: healthy empty metadata resets access failures without inventing editorial yield rates',()=>{
  const input=registry(), before=structuredClone(input), observation=empty(), original=structuredClone(observation);
  assert.deepEqual(validateResourceObservation(observation),[]);
  const result=applyResourceObservation(input,observation), health=result.resources[0].health;
  assert.equal(health.status,'healthy');
  assert.equal(health.consecutive_failures,0);
  assert.equal(health.last_success_at,observation.checked_at);
  assert.equal(health.observed_yield_rate,null);
  assert.equal(health.freshness_hit_rate,null);
  assert.equal(observation.duration_ms,null,'unknown duration stays unknown');
  assert.deepEqual(input,before,'the approved input registry is immutable');
  assert.deepEqual(observation,original,'applying a observation never rewrites its evidence');
});

test('I05-T02: blocked access, parse error, identity uncertainty and unavailable routes remain distinct',()=>{
  for(const status of ['access_blocked','parse_error','identity_unverified','unavailable']){
    const observation=limited(status), before=structuredClone(observation);
    assert.deepEqual(validateResourceObservation(observation),[],status);
    const result=applyResourceObservation(registry(),observation);
    assert.equal(result.resources[0].health.status,'failing',status);
    assert.equal(result.resources[0].health.consecutive_failures,5,status);
    assert.equal(result.resources[0].health.last_success_at,null,status);
    assert.equal(result.resources[0].health.observed_yield_rate,null,status);
    assert.deepEqual(observation,before,'distinct access evidence remains intact');
  }
});

test('I05-T02: access failure cannot claim healthy retrieval or zero available candidates',()=>{
  const blocked=limited('access_blocked');
  blocked.candidates_found=0;
  assert.ok(validateResourceObservation(blocked).includes('resource_observation_unknown_yield'));
  const falseHealthy=empty();
  falseHealthy.retrieval.http_status=403;
  assert.ok(validateResourceObservation(falseHealthy).includes('resource_observation_healthy_http'));
  const unexplained=limited('parse_error');
  unexplained.retrieval.reason=null;
  assert.ok(validateResourceObservation(unexplained).includes('resource_observation_limitation_reason'));
});

test('coverage not_due, pending and budget_skipped cannot change active configuration or source health',()=>{
  for(const status of ['not_due','pending','budget_skipped']){
    const observation=limited('not_checked');
    observation.queries=0;
    observation.retrieval.http_status=null;
    observation.coverage={status,due:status!=='not_due'};
    assert.deepEqual(validateResourceObservation(observation),[],status);
    const input=registry();
    assert.deepEqual(applyResourceObservation(input,observation),input,status);
  }
});

test('retrieval and coverage consistency rejects unprobed checks and budget skips disguised as checks',()=>{
  const checked=limited('not_checked');
  assert.ok(validateResourceObservation(checked).includes('resource_observation_check_consistency'));
  const skipped=empty();
  skipped.coverage={status:'budget_skipped',due:true};
  assert.ok(validateResourceObservation(skipped).includes('resource_observation_check_consistency'));
  assert.ok(validateResourceObservation(skipped).includes('resource_observation_unchecked_probe'));
  const notDue=limited('not_checked');
  notDue.coverage={status:'not_due',due:true};
  assert.ok(validateResourceObservation(notDue).includes('resource_observation_coverage'));
});

test('low yield and no fresh item do not alter priority, enablement, route, identity or cadence',()=>{
  const observation=empty();
  Object.assign(observation,{candidates_found:12,usable_candidates:0,selected_items:0,fresh_items:0});
  observation.editorial_yield={status:'no_fresh_items',reason:'No original publication date meets the research cutoff.'};
  observation.failures=['Candidate rejected for freshness; retrieval itself succeeded.'];
  assert.deepEqual(validateResourceObservation(observation),[]);
  const input=registry(), updated=applyResourceObservation(input,observation);
  assert.equal(updated.resources[0].health.status,'healthy');
  assert.equal(updated.resources[0].health.consecutive_failures,0);
  assert.equal(updated.resources[0].health.observed_yield_rate,0);
  assert.equal(updated.resources[0].health.freshness_hit_rate,0);
  const {health:oldHealth,...oldConfiguration}=input.resources[0];
  const {health:newHealth,...newConfiguration}=updated.resources[0];
  assert.deepEqual(newConfiguration,oldConfiguration,'all active resource configuration is preserved');
});

test('partial semantic review keeps unknown counts and rates null',()=>{
  const observation=empty();
  Object.assign(observation,{candidates_found:4,usable_candidates:null,selected_items:null,fresh_items:null});
  observation.editorial_yield={status:'candidates',reason:'Metadata discovered; semantic review is pending.'};
  assert.deepEqual(validateResourceObservation(observation),[]);
  const health=applyResourceObservation(registry(),observation).resources[0].health;
  assert.equal(health.status,'healthy');
  assert.equal(health.observed_yield_rate,null);
  assert.equal(health.freshness_hit_rate,null);
});

test('v2 validation rejects negative, missing and inconsistent counters and elapsed time',()=>{
  for(const field of ['queries','candidates_found','usable_candidates','selected_items','fresh_items','duration_ms']){
    const negative=empty(); negative[field]=-1;
    assert.ok(validateResourceObservation(negative).includes(`resource_observation_${field}`),field);
    const missing=empty(); delete missing[field];
    assert.ok(validateResourceObservation(missing).includes(`resource_observation_${field}`),field);
  }
  const inconsistent=empty(); inconsistent.selected_items=1;
  assert.ok(validateResourceObservation(inconsistent).includes('resource_observation_empty_yield'));
  assert.ok(validateResourceObservation(inconsistent).includes('resource_observation_counter_order'));
});

test('legacy v1 zero yield remains a successful check and preserves original evidence',()=>{
  const observation=empty();
  observation.schema_version=LEGACY_RESOURCE_OBSERVATION_SCHEMA;
  delete observation.retrieval; delete observation.coverage; delete observation.editorial_yield;
  const original=structuredClone(observation);
  assert.deepEqual(validateResourceObservation(observation),[]);
  const result=applyResourceObservation(registry(),observation);
  assert.equal(result.resources[0].health.status,'healthy');
  assert.equal(result.resources[0].health.consecutive_failures,0);
  assert.deepEqual(observation,original);
  observation.failures=['HTTP 403 reported by original legacy observer'];
  assert.equal(applyResourceObservation(result,observation).resources[0].health.consecutive_failures,1);
});

test('v2 freshness uses all found metadata while legacy rate meaning is preserved',()=>{
  const observation=empty();
  Object.assign(observation,{candidates_found:10,usable_candidates:4,selected_items:1,fresh_items:3});
  observation.editorial_yield={status:'candidates',reason:null};
  const modern=applyResourceObservation(registry(),observation).resources[0].health;
  assert.equal(modern.observed_yield_rate,0.4);
  assert.equal(modern.freshness_hit_rate,0.3);
  observation.schema_version=LEGACY_RESOURCE_OBSERVATION_SCHEMA;
  delete observation.retrieval; delete observation.coverage; delete observation.editorial_yield;
  const historical=applyResourceObservation(registry(),observation).resources[0].health;
  assert.equal(historical.observed_yield_rate,0.4);
  assert.equal(historical.freshness_hit_rate,0.75);
});
