import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SOURCE_EVIDENCE_VERSION,
  buildSourcePlan,
  validateSourcePolicy,
  validateWebExtraction,
  assessRouteQualification,
  makeQualificationPortfolio,
  applySourceQualifications,
  makeSourceSnapshot,
  validateSourceSnapshot,
  replaySourcePlan,
  executeSourcePlan,
  sourceDigest,
  sourceJson
} from '../operations/source-discovery.mjs';
import {
  reconcileSourceDirectory,
  resourceRegistryDigest,
  validateResourceRegistry
} from '../operations/resources.mjs';

// All response bodies, source refs, .invalid routes and timestamps below are
// synthetic regression fixtures. No test performs network I/O or certifies the
// current availability of a real publisher. Existing migration files are read
// unchanged and copied before the baseline digest is rebound for each fixture.
const readJson=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
const baseline=readJson('../migrations/source-portfolio-v1/registry.before.json');
const directory=readJson('../migrations/source-portfolio-v1/directory.json');
const policy=readJson('../config/source-discovery-policy.json');
const clone=value=>structuredClone(value);
const CHECKED='2026-10-08T06:30:00Z';
const RECORDED='2026-10-08T06:45:00Z';
const CUTOFF='2026-10-08T06:00:00Z';
const DATE='2026-10-08';
const EVIDENCE_PATH='tests/synthetic-source-observations.json';
const A='synthetic-source-a',B='synthetic-source-b',C='synthetic-source-c';
const PRIMARY='https://publisher.example.invalid/catalogue';
const ALTERNATE='https://publisher.example.invalid/archive';
const PUB='synthetic-publisher';
const memberships=resource=>(resource.catalogue?.memberships||[]).map(m=>m.planning_row_id);
const resourceById=(registry,id)=>registry.resources.find(r=>r.resource_id===id);

function syntheticResource(id=A,endpoint=PRIMARY,patch={}){
  return {...clone(baseline.resources[0]),resource_id:id,name:'Synthetic source '+id,
    url:endpoint,endpoint,enabled:true,priority:'primary',search_mode:'page',
    content_types:['article'],publisher:PUB,
    notes:'Synthetic route for deterministic tests only.',
    health:{status:'unknown',last_checked_at:null,last_success_at:null,consecutive_failures:0,observed_yield_rate:null,freshness_hit_rate:null},...patch};
}

function migrated(extras=[]){
  const original=clone(baseline),input=clone(directory);
  original.resources.unshift(...clone(extras));
  input.baseline_registry.sha256=resourceRegistryDigest(original);
  input.baseline_registry.resource_ids=original.resources.map(r=>r.resource_id);
  const result=reconcileSourceDirectory(original,input,{appliedAt:CUTOFF}).registry;
  assert.deepEqual(validateResourceRegistry(result),[]);
  return result;
}

function extraction(resource,patch={}){
  const endpoint=resource.endpoint||resource.url;
  const raw='SYNTHETIC RETURNED WEB CONTENT: a dated substantive fixture item.';
  return {schema_version:SOURCE_EVIDENCE_VERSION,method:'chatgpt_web_open',
    resource_id:resource.resource_id,endpoint,checked_at:CHECKED,
    source_ref:'synthetic-web-evidence',raw_response_sha256:sourceDigest(raw),
    returned_response_bytes:Buffer.byteLength(raw),duration_ms:null,
    retrieval:{status:'healthy',http_status:null,reason:null},
    publisher_identity:{status:'verified',canonical_id:PUB,name:'Synthetic publisher',
      evidence_basis:'Synthetic publisher identity fixture; this is not a live identity assertion.'},
    items:[{url:new URL('/items/synthetic-evidence-one',endpoint).href,
      title:'Synthetic dated evidence item',publication:{precision:'date',original_value:'2026-10-06',timezone:null},
      duration_seconds:null,substantive_support:'Synthetic substantive evidence for acquisition regression tests.',
      evidence_refs:['synthetic-item-evidence']}],limitations:[],...clone(patch)};
}

function grant(extras=[syntheticResource()],options={}){
  const registry=migrated(extras);
  const observations=extras.map(r=>extraction(resourceById(registry,r.resource_id),{
    publisher_identity:{status:'verified',canonical_id:options.publishers?.[r.resource_id]||PUB,
      name:'Synthetic publisher',evidence_basis:'Synthetic retained publisher identity.'}
  }));
  if(options.alternate)observations[0].approved_alternates=[{
    endpoint:ALTERNATE,evidence_ref:'tests/synthetic-publisher-links.json#approved-alternate'
  }];
  const qualifications=makeQualificationPortfolio(registry,policy,observations,{recorded_at:RECORDED,evidence_path:EVIDENCE_PATH});
  const next=applySourceQualifications(registry,policy,qualifications);
  assert.deepEqual(validateResourceRegistry(next),[]);
  return {registry:next,qualifications,observations};
}

function planFor(registry,patch={}){
  return buildSourcePlan(registry,policy,{reference_date:DATE,cutoff_at:CUTOFF,purpose:'qualification_rehearsal',...patch});
}

function observationForGroup(registry,group,patch={}){
  return extraction(resourceById(registry,group.resource_ids[0]),{endpoint:group.endpoint,...patch});
}

function datedPlan(registry,offset,patch={}){
  const day=new Date(Date.parse(DATE+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
  return planFor(registry,{reference_date:day,...patch});
}

test('I05 research policy preserves the finite review and acquisition envelopes',()=>{
  assert.deepEqual(validateSourcePolicy(policy),[]);
  for(const [section,key,value] of [
    ['research_limits','retained_articles',21],['research_limits','article_deep_packets',10],
    ['research_limits','article_evidence_characters',12001],['research_limits','media_retained_per_type',13],
    ['research_limits','media_evidence_packets_per_type',7],['research_limits','media_evidence_characters_per_type',6001],
    ['acquisition','max_concurrency',5],['acquisition','max_response_bytes',131073],
    ['acquisition','max_items_per_response',51],['acquisition','primary_probes_per_due_endpoint',2],
    ['acquisition','approved_alternates_after_failure',2]
  ]){
    const changed=clone(policy);changed[section][key]=value;
    assert.ok(validateSourcePolicy(changed).length,section+'.'+key);
  }
  for(const mutation of [p=>{p.source_scores={score:99};},p=>{p.active_registry_mutation_from_observations=true;},
    p=>{p.acquisition.qualification_never_grants_selected_item_admission=false;}]){
    const changed=clone(policy);mutation(changed);assert.ok(validateSourcePolicy(changed).length);
  }
});

test('I05-T03/T04: plan retains 204 memberships and counts unqualified sources that are due',()=>{
  const registry=migrated(),before=clone(registry),plan=planFor(registry);
  assert.equal(plan.catalogue_memberships,204);
  assert.equal(plan.rows.flatMap(r=>r.membership_ids).length,204);
  assert.equal(new Set(plan.rows.flatMap(r=>r.membership_ids)).size,204);
  assert.equal(plan.resource_count,169);
  assert.equal(plan.rows.length,registry.resources.length);
  assert.ok(plan.rows.some(r=>r.due&&!r.unattended_eligible));
  assert.equal(plan.due_resource_count,plan.rows.filter(r=>r.due).length);
  assert.equal(plan.due_membership_count,plan.rows.filter(r=>r.due).flatMap(r=>r.membership_ids).length);
  assert.equal(plan.unique_due_endpoints,plan.probes.length);
  assert.equal(plan.required_probe_budget,plan.probes.length,'pending imports have no approved alternates');
  assert.deepEqual(registry,before,'planning must not change source priorities, cadence or enablement');
});

test('I05-T03: one AI Engineer retrieval traces both Research and Video directory roles',()=>{
  const registry=migrated(),resource=registry.resources.find(r=>r.url==='https://ai.engineer/');
  const plan=planFor(registry),groups=plan.probes.filter(p=>p.resource_ids.includes(resource.resource_id));
  assert.equal(groups.length,1);
  assert.deepEqual([...groups[0].membership_ids].sort(),['DIR-L2-114','DIR-L3-128']);
  assert.ok(groups[0].content_types.includes('research'));
  assert.ok(groups[0].content_types.includes('video'));
});

test('I05-T03: equivalent qualified endpoint, publisher identity and cutoff share one probe and response',async()=>{
  const {registry,observations}=grant([syntheticResource(A),syntheticResource(B)]);
  const plan=planFor(registry,{max_probes:1});
  const shared=plan.probes.filter(p=>p.resource_ids.includes(A));
  assert.equal(shared.length,1);
  assert.deepEqual(shared[0].resource_ids,[A,B]);
  assert.equal(plan.rows.find(r=>r.resource_id===A).probe_key,plan.rows.find(r=>r.resource_id===B).probe_key);
  const calls=[];
  const execution=await executeSourcePlan(plan,async request=>{calls.push(request);return observations[0];});
  assert.equal(calls.length,1);
  assert.equal(execution.actual_probe_count,1);
  const receipt=replaySourcePlan(plan,[observations[0]]);
  for(const id of [A,B]){
    const row=receipt.rows.find(r=>r.resource_id===id);
    assert.equal(row.coverage_status,'checked');assert.equal(row.retrieval_status,'healthy');
    assert.equal(row.duration_ms,null);
    assert.equal(row.evidence_sha256,sourceDigest(observations[0]));
  }
  assert.equal(receipt.unique_primary_probes,1);
});

test('I05-T03: different endpoint or verified identity prevents collapse; a changed cutoff prevents reuse',()=>{
  const {registry}=grant([syntheticResource(A),syntheticResource(B),syntheticResource(C,PRIMARY+'?section=agents')],{
    publishers:{[A]:'publisher-a',[B]:'publisher-b',[C]:'publisher-a'}
  });
  const first=planFor(registry),second=planFor(registry,{cutoff_at:'2026-10-08T07:00:00Z'});
  const keys=[A,B,C].map(id=>first.rows.find(r=>r.resource_id===id).probe_key);
  assert.equal(new Set(keys).size,3);
  for(const id of [A,B,C]) assert.notEqual(first.rows.find(r=>r.resource_id===id).probe_key,second.rows.find(r=>r.resource_id===id).probe_key);
  const unqualified=migrated([syntheticResource(A),syntheticResource(B)]),pending=planFor(unqualified);
  assert.notEqual(pending.rows.find(r=>r.resource_id===A).probe_key,pending.rows.find(r=>r.resource_id===B).probe_key,
    'matching URLs are insufficient while the publisher identities are unverified');
});

test('I05-T04: an insufficient explicit budget reports the uncompleted due portfolio',()=>{
  const registry=migrated([syntheticResource()]),plan=planFor(registry,{max_probes:1});
  assert.ok(plan.due_resource_count>1);
  assert.equal(plan.budget_conflict.code,'DUE_PORTFOLIO_EXCEEDS_BUDGET');
  const evidence=plan.probes.map(group=>observationForGroup(registry,group));
  const receipt=replaySourcePlan(plan,evidence);
  assert.equal(receipt.unique_primary_probes,1);
  assert.equal(receipt.coverage_result,'INCOMPLETE_DUE_PLAN');
  assert.equal(receipt.checked_resources,1);
  assert.equal(receipt.uncompleted_resource_ids.length,plan.due_resource_count-1);
  assert.ok(receipt.rows.filter(r=>r.due&&r.coverage_status!=='checked').every(r=>r.coverage_status==='budget_skipped'&&r.retrieval_status==='not_checked'));
  assert.ok(receipt.rows.filter(r=>!r.due).every(r=>r.coverage_status==='not_due'));
  const zero=planFor(registry,{max_probes:0});
  assert.equal(replaySourcePlan(zero,evidence).checked_resources,0);
});

test('I05 cadence covers Tier 2 across three editions and Tier 3 across seven, with topic acceleration',()=>{
  const registry=migrated([syntheticResource(A,PRIMARY,{priority:'secondary'}),syntheticResource(B,ALTERNATE,{priority:'fallback'})]);
  const plans=Array.from({length:7},(_,i)=>datedPlan(registry,i));
  const rows=id=>plans.map(p=>p.rows.find(r=>r.resource_id===id));
  assert.equal(rows(A).slice(0,3).filter(r=>r.due).length,1);
  assert.equal(rows(B).filter(r=>r.due).length,1);
  assert.ok(rows(A).every(r=>r.cadence.period_editions===3));
  assert.ok(rows(B).every(r=>r.cadence.period_editions===7));
  const off=rows(B).findIndex(r=>!r.due);
  const accelerated=datedPlan(registry,off,{topic_resource_ids:[B]}).rows.find(r=>r.resource_id===B);
  assert.equal(accelerated.due,true);assert.equal(accelerated.due_reason,'topic_acceleration');
  assert.equal(accelerated.cadence.period_editions,7,'topic acceleration does not rewrite the approved weekly cadence');
  assert.ok(rows(A).concat(rows(B)).every(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.next_due_date)));
  assert.throws(()=>planFor(registry,{topic_resource_ids:['unknown-resource']}),/unknown_topic_resource/);
});

test('I05-T07: assisted membership and a reachable homepage do not grant unattended source selection',()=>{
  const registry=migrated();
  const assisted=registry.resources.find(r=>r.catalogue?.memberships.some(m=>/assisted/i.test(m.recommended_role)));
  assert.ok(assisted);
  const row=planFor(registry,{topic_resource_ids:[assisted.resource_id]}).rows.find(r=>r.resource_id===assisted.resource_id);
  assert.equal(row.due,true);assert.equal(row.unattended_eligible,false);
  assert.deepEqual(row.membership_ids,memberships(assisted));
  const evidence=extraction(assisted,{items:[]});
  assert.deepEqual(validateWebExtraction(evidence),[],'a healthy empty response is distinct from a qualification grant');
  const qualification=assessRouteQualification(assisted,evidence,{policy,evidence_ref:EVIDENCE_PATH+'#assisted'});
  assert.equal(qualification.status,'pending');assert.equal(qualification.unattended_eligible,false);
  assert.equal(qualification.qualification_scope,'metadata_discovery_only');
});

test('I05-T08: actual dated sample and current method evidence remain distinct from historical directory notes',()=>{
  const registry=migrated([syntheticResource()]),resource=resourceById(registry,A),evidence=extraction(resource);
  const qualifications=makeQualificationPortfolio(registry,policy,[evidence],{recorded_at:RECORDED,evidence_path:EVIDENCE_PATH});
  assert.equal(qualifications.historical_directory_date,'2026-09-19');
  assert.equal(qualifications.qualification_time_is_not_historical_verification,true);
  const q=qualifications.records.find(r=>r.resource_id===A);
  assert.equal(q.checked_at,CHECKED);
  assert.equal(q.method,'chatgpt_web_open');
  assert.equal(q.status,'qualified');
  assert.equal(q.source_score,null);
  assert.equal(q.evidence_sha256,sourceDigest(evidence));
  assert.equal(qualifications.membership_count,204);
  assert.equal(qualifications.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
  const imported=qualifications.records.find(r=>memberships(resourceById(registry,r.resource_id)).length);
  assert.equal(imported.checked_at,null);assert.equal(imported.status,'pending');
  const old=clone(evidence);old.checked_at='2026-09-19T12:00:00Z';old.items[0].publication.original_value='2026-09-17';
  assert.equal(assessRouteQualification(resource,old,{policy,evidence_ref:'synthetic-historical-evidence'}).checked_at,old.checked_at,
    'recording a current portfolio must never relabel an old source check');
});

test('I05 qualification rejects undated, unsupported, future, homepage and unrelated-route samples',()=>{
  const registry=migrated([syntheticResource()]),resource=resourceById(registry,A);
  const edits=[
    ['undated',e=>{e.items[0].publication={precision:'unknown',original_value:null,timezone:null};}],
    ['unsupported',e=>{e.items[0].substantive_support=null;}],
    ['future publication',e=>{e.items[0].publication.original_value='2026-10-10';}],
    ['homepage as item',e=>{e.items[0].url=e.endpoint;}],
    ['unrelated route',e=>{e.endpoint='https://unrelated.example.invalid/catalogue';e.items[0].url='https://unrelated.example.invalid/items/sample';}],
    ['wrong resource',e=>{e.resource_id=B;}],
    ['invented retrieval method',e=>{e.method='guessed_rss';}]
  ];
  for(const [name,edit] of edits){
    const evidence=extraction(resource);edit(evidence);
    const q=assessRouteQualification(resource,evidence,{policy,evidence_ref:EVIDENCE_PATH+'#'+name});
    assert.notEqual(q.status,'qualified',name);assert.equal(q.unattended_eligible,false,name);
  }
});

test('I05-T01/T02: replay distinguishes healthy zero yield from access failure and preserves unknown elapsed time',()=>{
  const registry=migrated([syntheticResource()]),plan=planFor(registry,{max_probes:1}),resource=resourceById(registry,A);
  const empty=extraction(resource,{items:[]});
  const row=replaySourcePlan(plan,[empty]).rows.find(r=>r.resource_id===A);
  assert.equal(row.coverage_status,'checked');assert.equal(row.retrieval_status,'healthy');
  assert.equal(row.editorial_yield_status,'empty');assert.equal(row.metadata_items_observed,0);assert.equal(row.duration_ms,null);
  for(const [status,http] of [['access_blocked',403],['parse_error',null],['identity_unverified',null]]){
    const blocked=extraction(resource,{retrieval:{status,http_status:http,reason:'Synthetic '+status},items:[],
      publisher_identity:{status:'unverified',canonical_id:null,name:'Synthetic source',evidence_basis:'Not established.'}});
    assert.deepEqual(validateWebExtraction(blocked),[]);
    const observed=replaySourcePlan(plan,[blocked]).rows.find(r=>r.resource_id===A);
    assert.equal(observed.coverage_status,'checked');assert.equal(observed.retrieval_status,status);
    assert.equal(observed.metadata_items_observed,null);assert.equal(observed.editorial_yield_status,'not_assessed');
  }
  const falseHealthy=extraction(resource,{retrieval:{status:'healthy',http_status:403,reason:null}});
  assert.ok(validateWebExtraction(falseHealthy).includes('false_healthy'));
});

test('I05 extraction bounds cover the actual returned byte count, serialized evidence size and item count',()=>{
  const resource=syntheticResource(),valid=extraction(resource);
  assert.deepEqual(validateWebExtraction(valid),[]);
  const declared=clone(valid);declared.returned_response_bytes=131073;
  assert.ok(validateWebExtraction(declared).includes('response_limit'));
  const retained=clone(valid);retained.limitations=['x'.repeat(131072)];
  assert.ok(validateWebExtraction(retained).includes('response_limit'));
  const tooMany=clone(valid);tooMany.items=Array.from({length:51},(_,i)=>({...clone(valid.items[0]),url:`https://publisher.example.invalid/items/${i}`}));
  assert.ok(validateWebExtraction(tooMany).includes('item_limit'));
  const duplicate=clone(valid);duplicate.items.push(clone(valid.items[0]));
  assert.ok(validateWebExtraction(duplicate).includes('duplicate_item'));
  const falseTimestamp=clone(valid);falseTimestamp.checked_at='2026-10-08';
  assert.ok(validateWebExtraction(falseTimestamp).includes('route_or_check_time'));
});

test('I05 bounded acquisition uses a single approved alternate only after a primary failure',async()=>{
  const {registry}=grant([syntheticResource()],{alternate:true});
  const plan=planFor(registry,{max_probes:2});
  assert.equal(plan.required_probe_budget,plan.probes.length+1);
  const calls=[];
  const result=await executeSourcePlan(plan,async request=>{
    calls.push(request);
    return extraction(resourceById(registry,A),{endpoint:request.endpoint,
      ...(request.attempt===1?{retrieval:{status:'access_blocked',http_status:403,reason:'Synthetic access block'},items:[]}:{} )});
  });
  assert.deepEqual(calls.map(r=>[r.endpoint,r.attempt]),[[PRIMARY,1],[ALTERNATE,2]]);
  assert.deepEqual(result.attempts.map(a=>a.outcome),['access_blocked','healthy']);
  assert.equal(result.actual_probe_count,2);
  assert.ok(calls.every(r=>r.max_response_bytes===policy.acquisition.max_response_bytes));
});

test('I05 a healthy primary is never retried on the approved alternate',async()=>{
  const {registry}=grant([syntheticResource()],{alternate:true});
  const plan=planFor(registry,{max_probes:2}),calls=[];
  await executeSourcePlan(plan,async request=>{calls.push(request);return observationForGroup(registry,request);});
  assert.equal(calls.filter(r=>r.resource_ids.includes(A)).length,1);
  assert.ok(!calls.some(r=>r.endpoint===ALTERNATE));
});

test('I05 saved primary failure and its approved alternate replay as two bounded probes',()=>{
  const {registry}=grant([syntheticResource()],{alternate:true});
  const plan=planFor(registry,{max_probes:2}),resource=resourceById(registry,A);
  const alternate=extraction(resource,{endpoint:ALTERNATE,source_ref:'synthetic-alternate-evidence'});
  const primary=extraction(resource,{retrieval:{status:'parse_error',http_status:null,reason:'Synthetic missing catalogue'},items:[],alternate_attempt:alternate});
  const receipt=replaySourcePlan(plan,[primary]),row=receipt.rows.find(r=>r.resource_id===A);
  assert.equal(receipt.unique_primary_probes,1);assert.equal(receipt.alternate_probes,1);
  assert.equal(receipt.actual_metadata_probes,2);
  assert.equal(row.coverage_status,'checked');assert.equal(row.retrieval_status,'healthy');
  assert.equal(row.actual_retrieval_endpoint,ALTERNATE);
  assert.equal(row.source_ref,'synthetic-alternate-evidence');
  assert.equal(receipt.returned_response_bytes,primary.returned_response_bytes+alternate.returned_response_bytes);
  const limited=replaySourcePlan(planFor(registry,{max_probes:1}),[primary]);
  assert.equal(limited.alternate_probes,0);
  assert.equal(limited.rows.find(r=>r.resource_id===A).retrieval_status,'parse_error');
  assert.equal(limited.rows.find(r=>r.resource_id===A).actual_retrieval_endpoint,PRIMARY);
});

test('I05 saved replay forbids unauthorized alternates, alternate-after-success and publisher swaps',()=>{
  const {registry}=grant([syntheticResource()],{alternate:true});
  const plan=planFor(registry,{max_probes:2}),resource=resourceById(registry,A);
  const primary=extraction(resource,{retrieval:{status:'access_blocked',http_status:403,reason:'Synthetic access limit'},items:[],
    alternate_attempt:extraction(resource,{endpoint:ALTERNATE})});
  const unapproved=clone(primary);unapproved.alternate_attempt.endpoint='https://unrelated.example.invalid/alternate';
  assert.throws(()=>replaySourcePlan(plan,[unapproved]),/unapproved.*alternate/);
  const afterSuccess=extraction(resource,{alternate_attempt:primary.alternate_attempt});
  assert.throws(()=>replaySourcePlan(plan,[afterSuccess]),/alternate_after_success/);
  const swapped=clone(primary);swapped.alternate_attempt.publisher_identity.canonical_id='unrelated-publisher';
  const receipt=replaySourcePlan(plan,[swapped]);
  assert.notEqual(receipt.rows.find(r=>r.resource_id===A).retrieval_status,'healthy');
});

test('I05 callback errors and oversized responses consume finite attempts without unbounded retry',async()=>{
  const {registry}=grant([syntheticResource()],{alternate:true}),plan=planFor(registry,{max_probes:2});
  for(const first of ['throw','oversize']){
    let calls=0;
    const result=await executeSourcePlan(plan,async request=>{
      calls++;
      if(request.attempt===1&&first==='throw')throw new Error('Synthetic external failure');
      return extraction(resourceById(registry,A),{endpoint:request.endpoint,
        ...(request.attempt===1?{returned_response_bytes:plan.budget.max_response_bytes+1}:{})});
    });
    assert.equal(calls,2);assert.equal(result.actual_probe_count,2);
    assert.equal(result.attempts[0].outcome,first==='throw'?'unavailable':'parse_error');
    assert.equal(result.attempts[1].outcome,'healthy');
  }
});

test('I05 malformed callback payloads become bounded parse failures rather than aborting remaining acquisition',async()=>{
  const {registry}=grant([syntheticResource()],{alternate:true}),plan=planFor(registry,{max_probes:2});
  for(const malformed of [null,undefined,[],false,42,'malformed metadata',
    extraction(resourceById(registry,A),{items:[null]}),
    extraction(resourceById(registry,A),{items:[[]]}),
    extraction(resourceById(registry,A),{items:['malformed item']})]){
    assert.ok(validateWebExtraction(malformed).length,'invalid payload must return validation errors');
    let calls=0;
    const result=await executeSourcePlan(plan,async request=>{
      calls++;
      return request.attempt===1?malformed:extraction(resourceById(registry,A),{endpoint:request.endpoint});
    });
    assert.equal(calls,2);
    assert.equal(result.attempts[0].outcome,'parse_error');
    assert.equal(result.attempts[1].outcome,'healthy');
  }
});

test('I05 execution rejects a response for an unrelated resource, endpoint or qualified publisher identity',async()=>{
  const {registry}=grant([syntheticResource()],{alternate:true}),plan=planFor(registry,{max_probes:2});
  for(const [name,edit] of [
    ['resource',e=>{e.resource_id='unrelated-fixture-source';}],
    ['endpoint',e=>{e.endpoint='https://unrelated.example.invalid/catalogue';}],
    ['publisher',e=>{e.publisher_identity.canonical_id='unrelated-publisher';}]
  ]){
    const result=await executeSourcePlan(plan,async request=>{
      const evidence=extraction(resourceById(registry,A),{endpoint:request.endpoint});
      if(request.attempt===1)edit(evidence);
      return evidence;
    });
    assert.notEqual(result.attempts[0].outcome,'healthy',name);
    assert.equal(result.attempts[1]?.endpoint,ALTERNATE,name+' must not suppress the authorized alternate');
  }
});

test('I05 malformed or internally forged plans fail before callback execution or saved-evidence replay',async()=>{
  const {registry}=grant(),valid=planFor(registry,{max_probes:1});
  const mutations=[
    ['negative probe budget',p=>{p.budget.max_probes=-1;}],
    ['unbounded probe budget',p=>{p.budget.max_probes=Infinity;}],
    ['oversized response grant',p=>{p.budget.max_response_bytes=131073;}],
    ['inconsistent total response bytes',p=>{p.budget.max_total_response_bytes++;}],
    ['zero concurrency',p=>{p.budget.max_concurrency=0;}],
    ['unknown hash format',p=>{p.registry_sha256='not-a-sha256';}],
    ['wrong resource count',p=>{p.resource_count++;}],
    ['missing due probes',p=>{p.probes=[];}],
    ['unmapped row',p=>{p.rows[0].probe_key='a'.repeat(64);}],
    ['changed cutoff with old probe identities',p=>{p.cutoff_at='2026-10-08T07:00:00Z';}],
    ['unbound probe identity',p=>{p.probes[0].identity_key='forged-publisher';}],
    ['duplicate probe',p=>{p.probes.push(clone(p.probes[0]));}],
    ['unapproved extra alternates',p=>{p.probes[0].approved_alternates=[{endpoint:ALTERNATE},{endpoint:ALTERNATE+'-2'}];}]
  ];
  for(const [name,mutate] of mutations){
    const plan=clone(valid);mutate(plan);let called=false;
    await assert.rejects(()=>executeSourcePlan(plan,async()=>{called=true;return extraction(resourceById(registry,A));}),undefined,name);
    assert.equal(called,false,name+' must fail before network effects');
    assert.throws(()=>replaySourcePlan(plan,[]),undefined,name);
  }
});

test('I05 replay rejects duplicate, unrelated and conflicting shared observations',()=>{
  const {registry,observations}=grant([syntheticResource(A),syntheticResource(B)]),plan=planFor(registry,{max_probes:1});
  assert.throws(()=>replaySourcePlan(plan,[observations[0],clone(observations[0])]),/duplicate/);
  const unrelated=extraction(syntheticResource('unknown-fixture-resource'));
  assert.throws(()=>replaySourcePlan(plan,[unrelated]),/unknown|unrelated|scope|resource/i);
  const conflicting=clone(observations[1]);conflicting.raw_response_sha256=sourceDigest('DIFFERENT SYNTHETIC RAW RESPONSE');
  assert.throws(()=>replaySourcePlan(plan,[observations[0],conflicting]),/conflicting_shared_response/);
});

test('I05 snapshot binds exact registry, policy, qualifications and observed evidence digests',()=>{
  const {registry,qualifications,observations}=grant();
  const snapshot=makeSourceSnapshot(registry,policy,qualifications,{recorded_at:RECORDED});
  assert.deepEqual(validateSourceSnapshot(registry,policy,qualifications,snapshot,observations),[]);
  assert.equal(snapshot.registry_sha256,resourceRegistryDigest(registry));
  assert.equal(snapshot.policy_sha256,sourceDigest(sourceJson(policy)));
  assert.equal(snapshot.qualifications_sha256,sourceDigest(sourceJson(qualifications)));
  assert.equal(snapshot.membership_count,204);assert.equal(snapshot.selected_item_qualification,false);
  assert.equal(snapshot.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
  for(const [name,mutate] of [
    ['registry bytes',v=>{v.registry.resources[0].notes+=' Changed fixture bytes.';}],
    ['policy bytes',v=>{v.policy.acquisition.max_response_bytes--;}],
    ['qualification bytes',v=>{v.qualifications.records[0].evidence_ref+='-changed';}],
    ['observed response hash',v=>{v.observations[0].raw_response_sha256=sourceDigest('changed raw fixture');}],
    ['observed sample',v=>{v.observations[0].items[0].title='Altered fixture sample';}],
    ['missing evidence',v=>{v.observations=[];}]
  ]){
    const fixture={registry:clone(registry),policy:clone(policy),qualifications:clone(qualifications),snapshot:clone(snapshot),observations:clone(observations)};
    mutate(fixture);
    assert.ok(validateSourceSnapshot(fixture.registry,fixture.policy,fixture.qualifications,fixture.snapshot,fixture.observations).length,name);
  }
});

test('I05 rehashed qualification forgery is rejected against the retained extraction, without claiming signed origin truth',()=>{
  const original=grant(),qualifications=clone(original.qualifications);
  qualifications.records.find(q=>q.resource_id===A).publisher_id='forged-qualified-publisher';
  const registry=applySourceQualifications(migrated([syntheticResource()]),policy,qualifications);
  const snapshot=makeSourceSnapshot(registry,policy,qualifications,{recorded_at:RECORDED});
  const errors=validateSourceSnapshot(registry,policy,qualifications,snapshot,original.observations);
  assert.ok(errors.some(e=>e.includes('qualification_evidence_binding')),errors.join(';'));
  const badScope=clone(original.qualifications);badScope.records[0].resource_id='unmatched-source';
  assert.throws(()=>applySourceQualifications(migrated([syntheticResource()]),policy,badScope),/scope|binding/);
});

test('I05 snapshot cannot erase a check time, duplicate evidence or claim selected-item admission',()=>{
  const {registry,qualifications,observations}=grant();
  const snapshot=makeSourceSnapshot(registry,policy,qualifications,{recorded_at:RECORDED});
  const selected=clone(snapshot);selected.selected_item_qualification=true;
  assert.ok(validateSourceSnapshot(registry,policy,qualifications,selected,observations).length,'metadata source release cannot become selected-item admission');
  assert.ok(validateSourceSnapshot(registry,policy,qualifications,snapshot,[...observations,clone(observations[0])]).length,'duplicate observations must not be silently overwritten');
  const q=clone(qualifications);q.records.find(r=>r.resource_id===A).checked_at=null;
  assert.throws(()=>applySourceQualifications(migrated([syntheticResource()]),policy,q),/qualification|registry|proof|check/i);
});
