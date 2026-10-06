import test from 'node:test';
import assert from 'node:assert/strict';
import {runFinalStaticAudits} from '../scripts/final-audits.mjs';

test('final static audits satisfy isolation, no-paid and complexity budgets',()=>{
  const r=runFinalStaticAudits();
  assert.equal(r.result,'PASS');
  assert.equal(r.isolation.production_mutation_paths,0);
  assert.equal(r.no_paid_production.model_api_sdks,0);
  assert.ok(r.complexity.runtime_workflows<=3);
  assert.equal(r.complexity.primary_schedules,1);
  assert.equal(r.complexity.recovery_schedules,3);
  assert.equal(r.complexity.continuous_ai_polling,0);
  assert.equal(r.complexity.supervisor,0);
  assert.equal(r.complexity.watchdog_ring,0);
});
