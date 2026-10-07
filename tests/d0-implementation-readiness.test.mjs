import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('D0 repository implementation is complete while activation remains externally blocked',()=>{
  const out=execFileSync(process.execPath,['scripts/check-d0-implementation-readiness.mjs','.'],{encoding:'utf8'});
  const r=JSON.parse(out);
  assert.equal(r.result,'PASS');
  assert.equal(r.implementation_complete,true);
  assert.equal(r.activation_ready,false);
  assert.equal(r.image_contract_activation_status,'proof_required');
  assert.equal(r.p0a_route_result,'BLOCKED_NO_ZERO_COST_NATIVE_ROUTE');
  assert.deepEqual(r.ready_routes,[]);
  assert.equal(r.external_blocker,'P0_A_ZERO_COST_NATIVE_ROUTE_UNAVAILABLE');
  assert.equal(r.proof_status.p0_b.result,'PASS');
  assert.equal(r.proof_status.p0_c.result,'PASS');
  assert.equal(r.proof_status.p0_a.result,'BLOCKED');
  assert.equal(r.proof_status.p0_d.result,'BLOCKED');
  assert.equal(r.proof_status.p0_e.result,'MISSING');
  assert.equal(r.proof_status.p0_f.result,'MISSING');
});
