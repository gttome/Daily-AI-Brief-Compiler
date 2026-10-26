import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildSourceCoveragePlan,recordSourceProbe,sourceCoverageCounts,
  validateSourceCoverageReceipt
} from '../operations/source-coverage.mjs';

const liveRegistry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const meta={edition_date:'2026-10-27',execution_id:'compiler-2026-10-27-r1',
  created_at:'2026-10-26T23:15:00.000Z'};
const fakeProbe=(resource_id,extra={})=>({resource_id,status:'ROUTE_REACHABLE',
  attempted_at:'2026-10-26T23:15:40Z',method:'HEAD',http_status:200,
  final_url:'https://source.test/index',elapsed_ms:31,error_code:null,...extra});

test('complete source census enumerates 208 including all 94 enabled, not just a shortlist',()=>{
 const plan=buildSourceCoveragePlan(liveRegistry,meta);
 assert.equal(plan.resources.length,208);
 assert.equal(plan.counts.registered,208);
 assert.equal(plan.counts.enabled,94);
 assert.equal(plan.counts.disabled,114);
 assert.equal(plan.counts.attempted,0);
 assert.equal(plan.counts.remaining,94);
 assert.equal(plan.counts.all_enabled_attempted,false);
 assert.deepEqual(plan.counts.enabled_by_role,{
  article:56,video:6,podcast:21,research:71,watchlist:55});
 const report=validateSourceCoverageReceipt(liveRegistry,plan);
 assert.equal(report.result,'INCOMPLETE');
 assert.throws(()=>validateSourceCoverageReceipt(liveRegistry,plan,
  {requireAllAttempts:true}),/SOURCE_COVERAGE_INCOMPLETE_ENABLED_SOURCE_SWEEP/);
});

test('only observed HTTPS attempts count: successful, blocked, rate-limited and timeout distinct',()=>{
 const plan=buildSourceCoveragePlan(liveRegistry,meta);
 const ids=plan.resources.filter(r=>r.enabled).map(r=>r.resource_id);
 recordSourceProbe(plan,fakeProbe(ids[0]));
 recordSourceProbe(plan,fakeProbe(ids[1],{status:'HTTP_BLOCKED',http_status:403}));
 recordSourceProbe(plan,fakeProbe(ids[2],{status:'RATE_LIMITED',http_status:429}));
 recordSourceProbe(plan,fakeProbe(ids[3],{status:'TIMED_OUT',http_status:null,error_code:'TIMEOUT'}));
 const report=validateSourceCoverageReceipt(liveRegistry,plan);
 assert.equal(report.attempted,4);
 assert.equal(report.reachable,1);
 assert.equal(report.blocked,2);
 assert.equal(report.failures,1);
 assert.equal(report.remaining,90);
 assert.equal(report.item_discovery_not_certified,true);
 assert.equal(report.result,'INCOMPLETE');
});

test('a full real-format attempt census can pass accounting but never certifies editorial items',()=>{
 const plan=buildSourceCoveragePlan(liveRegistry,meta);
 for(const row of plan.resources.filter(x=>x.enabled))
   recordSourceProbe(plan,fakeProbe(row.resource_id,{
     final_url:row.url,http_status:403,status:'HTTP_BLOCKED'}));
 const result=validateSourceCoverageReceipt(liveRegistry,plan,{requireAllAttempts:true});
 assert.equal(result.result,'ALL_ATTEMPTS_ACCOUNTED');
 assert.equal(result.attempted,94);
 assert.equal(result.reachable,0);
 assert.equal(result.blocked,94);
 assert.equal(result.route_reachability_only,true);
 assert.equal(result.item_discovery_not_certified,true);
 // These are deliberately test fixtures; no HTTP requests were made here.
});

test('coverage integrity rejects omitted sources, corrupted identity and fabricated success',()=>{
 const base=buildSourceCoveragePlan(liveRegistry,meta);
 const partial=structuredClone(base);partial.resources.pop();
 assert.throws(()=>validateSourceCoverageReceipt(liveRegistry,partial),/MISSING_RESOURCE_ROWS/);
 const changed=structuredClone(base);changed.resources[0].resource_id='made-up';
 assert.throws(()=>validateSourceCoverageReceipt(liveRegistry,changed),/SOURCE_IDENTITY_MISMATCH/);
 const falsified=structuredClone(base);const row=falsified.resources.find(r=>r.enabled);
 row.status='ROUTE_REACHABLE';row.http_status=200;row.method='HEAD';
 assert.throws(()=>validateSourceCoverageReceipt(liveRegistry,falsified),/INVALID_PROBE_EVIDENCE/);
 const wrong=structuredClone(base);wrong.registry_digest='0'.repeat(64);
 assert.throws(()=>validateSourceCoverageReceipt(liveRegistry,wrong),/STALE_REGISTRY/);
 const fakeCount=structuredClone(base);fakeCount.counts.attempted=94;
 assert.throws(()=>validateSourceCoverageReceipt(liveRegistry,fakeCount),/INCONSISTENT_COUNTS/);
});

test('missing verified date or invalid HTTP code cannot masquerade as a route check',()=>{
 const p=buildSourceCoveragePlan(liveRegistry,meta);
 const id=p.resources.find(x=>x.enabled).resource_id;
 assert.throws(()=>recordSourceProbe(p,fakeProbe(id,{attempted_at:null})),/INVALID_PROBE_EVIDENCE/);
 assert.throws(()=>recordSourceProbe(p,fakeProbe(id,{http_status:403})),/UNSUPPORTED_SUCCESS/);
 assert.throws(()=>recordSourceProbe(p,fakeProbe(id,{final_url:'http://source.test'})),/INVALID_PROBE_EVIDENCE/);
 assert.throws(()=>recordSourceProbe(p,fakeProbe(id,{status:'FETCH_FAILED',http_status:200,error_code:'NETWORK'})),
   /NETWORK_ERROR_HAS_HTTP_STATUS/);
});

test('disabled sources never count as checked; no account keys or paid service integrations',()=>{
 const p=buildSourceCoveragePlan(liveRegistry,meta);
 const disabled=p.resources.find(r=>!r.enabled);
 assert.equal(disabled.status,'SKIPPED_DISABLED');
 assert.throws(()=>recordSourceProbe(p,fakeProbe(disabled.resource_id)),/INVALID_PROBE_TARGET/);
 const code=fs.readFileSync('scripts/source-coverage-sweep.mjs','utf8');
 assert.match(code,/TIMEOUT_MS=4000/);
 assert.match(code,/CONCURRENCY=6/);
 assert.match(code,/method='HEAD'/);
 assert.doesNotMatch(code,/openai\.com\/v1\//);
 assert.doesNotMatch(code,/TinyFish|Codex|playwright|Work Cloud/i);
});
