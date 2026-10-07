import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRunEvent,blankUsage} from '../observability/events.mjs';
import {aggregateRunMetrics,buildRunAnalysis} from '../observability/run-analysis.mjs';
import {validateProblemLearning,buildLearningMarkdown} from '../operations/learning.mjs';

const baseEvent=(id,t,stage,status,duration,actor='semantic_producer',usage=blankUsage())=>({
  schema_version:'daily-compiler-run-event-v1',
  event_id:id,
  timestamp:t,
  edition_date:'2026-10-08',
  execution_id:'daily-compiler-shadow-2026-10-08',
  actor,
  stage,
  event_type:id,
  status,
  duration_ms:duration,
  refs:[],
  problem_id:null,
  resource_id:null,
  usage,
  detail:null
});

test('run metrics capture timing plus Dot and Work usage without inventing charges',()=>{
  const u1=blankUsage();u1.dot_active_seconds=30;u1.web_queries=5;
  const u2=blankUsage();u2.work_active_seconds=40;u2.github_writes=3;
  const events=[
    baseEvent('editorial','2026-10-08T00:00:00Z','EDITORIAL','PASS',60000,'dot',u1),
    baseEvent('images','2026-10-08T00:02:00Z','IMAGES','PASS',90000,'image_studio',blankUsage()),
    baseEvent('porter','2026-10-08T00:04:00Z','IMAGES','PASS',40000,'work_porter',u2),
    baseEvent('verify','2026-10-08T00:05:00Z','VERIFY','PASS',30000,'compiler',blankUsage())
  ];
  for(const e of events) assert.deepEqual(validateRunEvent(e),[]);
  const metrics=aggregateRunMetrics({events,problems:[],resourceObservations:[]});
  assert.equal(metrics.wall_seconds,300);
  assert.equal(metrics.usage.dot_active_seconds,30);
  assert.equal(metrics.usage.work_active_seconds,40);
  assert.equal(metrics.usage.estimated_charge,null);
  assert.equal(metrics.usage.estimate_basis,'not_inferred_without_configured_rate_card');
  const analysis=buildRunAnalysis({metrics,problems:[],resourceObservations:[]});
  assert.ok(analysis.improvements.some(x=>x.area==='work_time'));
  assert.ok(analysis.improvements.some(x=>x.area==='dot_time'));
});

test('learning record produces durable human-readable ledger text',()=>{
  const p={
    schema_version:'daily-compiler-problem-learning-v1',
    problem_id:'problem-1',edition_date:'2026-10-08',execution_id:'e1',
    detected_at:'2026-10-08T00:00:00Z',classification:'image_transfer',
    problem:'Cloud asset handoff failed.',root_cause:'Temporary connector failure.',impact:'Image ingest delayed.',
    attempted_fixes:['retry exact transfer'],actual_fix:'Reused the same accepted bytes after connector recovery.',
    outcome:'PASS',timing_impact_seconds:120,work_time_impact_seconds:30,dot_time_impact_seconds:10,
    permanent_action:'Keep accepted bytes immutable across transport retries.',
    regression_test:'D1 porter exact-byte retry test.',recurrence:'new',status:'fixed'
  };
  assert.deepEqual(validateProblemLearning(p),[]);
  const md=buildLearningMarkdown([p]);
  assert.match(md,/Cloud asset handoff failed/);
  assert.match(md,/Keep accepted bytes immutable/);
});
