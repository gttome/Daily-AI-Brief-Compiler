import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectTimeoutRetries,RETRY_POLICY} from '../operations/source-timeout-retry.mjs';
const probe=(id,status='TIMED_OUT')=>({resource_id:id,status,method:'HEAD',
 attempted_at:'2026-10-27T13:00:00Z',http_status:status==='TIMED_OUT'?null:200,
 error_code:status==='TIMED_OUT'?'TIMEOUT':null});
test('Oct28 source retry only includes actually timed-out identities, at most 16',()=>{
 const first=[probe('ok','ROUTE_REACHABLE'),...Array.from({length:19},(_,i)=>probe('slow-'+i))];
 const ids=selectTimeoutRetries({editionDate:'2026-10-28',firstAttempts:first});
 assert.equal(ids.length,16);
 assert.deepEqual(ids.slice(0,2),['slow-0','slow-1']);
 assert.deepEqual(selectTimeoutRetries({editionDate:'2026-10-27',firstAttempts:first}),[]);
 assert.equal(RETRY_POLICY.second_attempt_timeout_ms,8000);
 assert.equal(RETRY_POLICY.second_attempt_concurrency,3);
});
test('fake timeout evidence, duplicate probes and unbounded counts fail closed',()=>{
 assert.throws(()=>selectTimeoutRetries({editionDate:'2026-10-28',
  firstAttempts:[probe('x'),probe('x')]}),/DUPLICATE/);
 assert.throws(()=>selectTimeoutRetries({editionDate:'2026-10-28',
  firstAttempts:[{...probe('x'),http_status:200}]}),/UNVERIFIED_FIRST_TIMEOUT/);
 assert.throws(()=>selectTimeoutRetries({editionDate:'2026-10-28',
  firstAttempts:[probe('x')],maxCount:99}),/INVALID_INPUT/);
});
test('existing public HTTPS sweep retains unchanged first-pass and strict source gate',()=>{
 const code=fs.readFileSync('scripts/source-coverage-sweep.mjs','utf8');
 assert.match(code,/TIMEOUT_MS=4000/);
 assert.match(code,/selectTimeoutRetries/);
 assert.match(code,/recordSourceProbe\(receipt/);
 assert.match(code,/timeout-retries/);
 assert.doesNotMatch(code,/TinyFish|openai\.com\/v1\/|playwright|Codex/i);
});
