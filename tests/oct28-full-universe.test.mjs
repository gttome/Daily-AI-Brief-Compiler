import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createOct28Plan,saveOct28Observation,validateOct28Plan}
 from '../operations/oct28-full-universe.mjs';
import {activeDiscoveryResources} from '../operations/resources.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const time='2026-10-27T23:15:00Z';
const create=(date='2026-10-28')=>createOct28Plan(registry,{
 edition_date:date,execution_id:'oct28-actual-run',created_at:time});
const proof=(id,overrides={})=>({resource_id:id,result:'REACHABLE',
 checked_at:'2026-10-27T23:15:22Z',method:'HEAD',http_status:200,
 final_url:'https://publisher.example/latest',elapsed_ms:25,error_code:null,...overrides});

test('the Oct28-only full universe includes 208 original IDs and disabled leads',()=>{
 const p=create();
 assert.equal(p.counts.registered,208);
 assert.equal(p.counts.enabled,94);
 assert.equal(p.counts.qualification_only,114);
 assert.equal(p.counts.attempted,0);
 assert.equal(p.counts.not_attempted,208);
 assert.equal(p.counts.complete,false);
 assert.deepEqual(p.rows.map(r=>r.resource_id),
  registry.resources.map(r=>r.resource_id));
 assert.equal(p.rows.filter(r=>!r.enabled&&r.scope==='QUALIFICATION_ONLY').length,114);
 assert.equal(p.rows.filter(r=>r.enabled&&r.scope==='DISCOVERY_CANDIDATE').length,94);
 assert.throws(()=>validateOct28Plan(registry,p,{requireAll:true}),/208_SOURCE_SWEEP_INCOMPLETE/);
});

test('Oct27 and earlier cannot allocate this new full-universe process',()=>{
 assert.throws(()=>create('2026-10-27'),/NOT_EFFECTIVE/);
 assert.throws(()=>create('2026-10-26'),/NOT_EFFECTIVE/);
 assert.equal(create('2026-10-28').edition_date,'2026-10-28');
});

test('individual observed outcomes cannot be promoted into invented success',()=>{
 const p=create(),id=p.rows[0].resource_id;
 assert.throws(()=>saveOct28Observation(p,proof(id,{result:'REACHABLE',http_status:403})),
  /FAKE_REACHABLE/);
 assert.throws(()=>saveOct28Observation(p,proof(id,{result:'RATE_LIMITED',http_status:200})),
  /FAKE_RATE_LIMIT/);
 saveOct28Observation(p,proof(id,{result:'BLOCKED',http_status:403}));
 const r=validateOct28Plan(registry,p);
 assert.equal(r.attempted,1);
 assert.equal(r.reachable,0);
 assert.equal(r.result,'INCOMPLETE');
});

test('test-only synthetic full receipt proves bookkeeping, not real HTTP or editorial content',()=>{
 const p=create();
 for(const row of p.rows)saveOct28Observation(p,proof(row.resource_id,{result:'BLOCKED',
  http_status:403,final_url:row.url}));
 const v=validateOct28Plan(registry,p,{requireAll:true});
 assert.equal(v.result,'ALL_ROUTE_ATTEMPTS_ACCOUNTED');
 assert.equal(v.registered,208);
 assert.equal(v.qualification_only,114);
 assert.equal(v.reachable,0);
 assert.equal(v.source_content_verified,false);
 assert.equal(v.disabled_autoenabled,false);
 assert.equal(registry.resources.filter(r=>r.enabled).length,94);
 assert.equal(activeDiscoveryResources(registry,'article').length,56);
});

test('source identity, enablement and counts cannot be altered in receipts',()=>{
 const p=create();
 const x=structuredClone(p);x.rows.pop();
 assert.throws(()=>validateOct28Plan(registry,x),/MISSING_RESOURCES/);
 const y=structuredClone(p);y.rows[0].enabled=false;
 assert.throws(()=>validateOct28Plan(registry,y),/SOURCE_IDENTITY_CHANGED/);
 const z=structuredClone(p);z.counts.attempted=208;
 assert.throws(()=>validateOct28Plan(registry,z),/FAKE_COUNTS/);
 const w=structuredClone(p);w.registry_digest='0'.repeat(64);
 assert.throws(()=>validateOct28Plan(registry,w),/STALE_REGISTRY/);
});
