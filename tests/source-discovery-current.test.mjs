import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {applySourceQualifications,assessRouteQualification,makeSourceSnapshot,readSourceSnapshot,sourceDigest,sourceJson,validateBoundSourcePlan} from '../operations/source-discovery.mjs';
import {buildSourceResearch,replayBoundSourceAcquisition,validateSourceEditorial} from '../producer/source-research.mjs';
import {validateResearchEnvelope} from '../producer/research.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir='docs/implementation/oct9-value-and-improvement/iteration-05';
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const baselineDigests={
  'resource-registry.json':'4f558dee6e26650453c20330f081666f28840776ccbddbec15a0f58247ac00d1',
  'source-discovery-policy.json':'81852b990847be99a811d4653e4e073627b7df996ab54f4973389e2fe1506f0a',
  'source-route-qualifications.json':'15be312ff3477073d67fc7445ccf4e0a4c923f0486213dd1b3e61f9de6e3902d',
  'source-snapshot.json':'6f81cd37f20ed238529acb726710076dff660996e3757572913919724e58f560'
};
function baselineRoot(t){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-source-i05-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  fs.cpSync(path.join(root,'tests/fixtures/source-iteration05/config'),path.join(temp,'config'),{recursive:true});
  fs.mkdirSync(path.dirname(path.join(temp,dir)),{recursive:true});
  fs.cpSync(path.join(root,dir),path.join(temp,dir),{recursive:true});
  return temp;
}
function refreshedFixture(t){
  const temp=baselineRoot(t),context=readSourceSnapshot(temp),qualifications=structuredClone(context.qualifications);
  const index=qualifications.records.findIndex(q=>q.status==='qualified'),original=qualifications.records[index];
  const resource=context.registry.resources.find(r=>r.resource_id===original.resource_id);
  const observation=structuredClone(context.observations.find(row=>row.resource_id===resource.resource_id));
  observation.limitations.push('TEST_ONLY targeted refresh fixture; no live qualification is claimed.');
  const evidencePath='TEST_ONLY/route-refresh.json';
  fs.mkdirSync(path.join(temp,'TEST_ONLY'));
  fs.writeFileSync(path.join(temp,evidencePath),sourceJson({observations:[observation]}));
  qualifications.records[index]=assessRouteQualification(resource,observation,{policy:context.policy,evidence_ref:evidencePath+'#'+resource.resource_id});
  const registry=applySourceQualifications(context.registry,context.policy,qualifications);
  const snapshot=makeSourceSnapshot(registry,context.policy,qualifications,{recorded_at:context.snapshot.recorded_at});
  for(const [name,value] of [['resource-registry',registry],['source-route-qualifications',qualifications],['source-snapshot',snapshot]])
    fs.writeFileSync(path.join(temp,'config',name+'.json'),sourceJson(value));
  return {temp,context,index,original,observation,evidencePath};
}

// Saved Iteration 5 extracts are replayed against their immutable source inputs.
// Current qualification is checked separately. No test fetches sources or
// certifies a future edition, origin freshness, selected media or image quality.
test('I05-T08: current protected source snapshot retains historical import provenance and evidence scope',()=>{
  const {registry,qualifications,snapshot}=readSourceSnapshot(root);
  assert.equal(registry.resources.length,169);
  assert.equal(snapshot.membership_count,204);
  assert.equal(registry.source_portfolio.supplied_memberships,204);
  assert.equal(qualifications.records.length,169);
  assert.ok(qualifications.qualified_resources>1);
  assert.equal(qualifications.qualification_scope,'metadata_discovery_only');
  assert.equal(snapshot.selected_item_qualification,false);
  assert.equal(snapshot.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
  for(const r of registry.resources){
    if(r.catalogue){
      assert.equal(r.catalogue.qualification.status,'pending');
      assert.equal(r.catalogue.qualification.checked_at,null);
    }
    assert.equal(r.health.status,'unknown');
    if(!registry.source_portfolio.baseline_resource_ids.includes(r.resource_id)&&r.enabled){
      assert.equal(r.discovery.qualification_status,'qualified');
      assert.equal(r.discovery.unattended_eligible,true);
    }
  }
  const contract=read('contracts/editorial-contract.json');
  assert.equal(contract.research.source_snapshot_path,'config/source-snapshot.json');
  assert.equal(contract.research.source_rollout_complete_required_for_core,false);
  assert.equal(contract.research.retained_article_limit,20);
  assert.equal(contract.research.article_deep_packet_limit,9);
  assert.equal(contract.research.article_evidence_character_limit,12000);
});

test('I05-T03/T04/T08: saved actual due-source capture covers its original assigned scope without claiming all sources were checked',t=>{
  const context=readSourceSnapshot(baselineRoot(t)),plan=read(dir+'/due-source-plan.json');
  const acquisition=read(dir+'/rehearsal-acquisition.json'),capture=read(dir+'/source-observations.json');
  const assignment=read(dir+'/preassigned-scope.json'),expected=read(dir+'/source-coverage.json');
  assert.deepEqual(validateBoundSourcePlan(context.registry,context.policy,plan),[]);
  assert.equal(acquisition.acquisition_mode,'saved_evidence_replay');
  assert.equal(acquisition.source_evidence_sha256,sourceDigest(sourceJson(capture)));
  const actual=replayBoundSourceAcquisition(context,plan,acquisition);
  assert.deepEqual(actual,expected);
  assert.equal(actual.catalogue_memberships,204);
  assert.equal(actual.resource_count,169);
  assert.equal(actual.unique_primary_probes,104);
  assert.equal(actual.alternate_probes,2);
  assert.equal(actual.checked_resources,104);
  assert.equal(actual.rows.filter(r=>r.coverage_status==='not_due').length,65);
  assert.equal(actual.coverage_result,'COMPLETE_DUE_PLAN');
  assert.equal(actual.selected_items_qualified,false);
  assert.equal(actual.future_edition_selected,false);
  assert.deepEqual(plan.rows.filter(r=>r.due).map(r=>r.resource_id).sort(),assignment.resources.filter(r=>r.due).map(r=>r.resource_id).sort());
  assert.equal(capture.observations.length,104);
  assert.equal(capture.raw_response_inventory.length,123);
  assert.ok(capture.raw_response_inventory.every(r=>r.measurement_basis==='saved_tool_result_record_envelope'&&r.bytes<=plan.budget.max_response_bytes));
  for(const row of actual.rows){
    assert.equal(row.duration_ms,null);
    if(!['healthy','not_checked'].includes(row.retrieval_status))assert.equal(row.metadata_items_observed,null);
  }
  const unresolved=read(dir+'/unresolved-routes.json');
  assert.equal(unresolved.resource_count,169-context.qualifications.qualified_resources);
  assert.deepEqual(unresolved.records.map(r=>r.resource_id).sort(),context.qualifications.records.filter(q=>q.status!=='qualified').map(q=>q.resource_id).sort());
});

test('I05-T05/T06: actual source extracts enter a bounded replay without selecting an edition or admitting media',t=>{
  const context=readSourceSnapshot(baselineRoot(t)),plan=read(dir+'/due-source-plan.json');
  const document=read(dir+'/rehearsal-acquisition.json'),requests=read(dir+'/research-requests.json');
  const actual=buildSourceResearch(context,plan,document,requests);
  assert.deepEqual(actual,read(dir+'/research-replay.json'));
  assert.deepEqual(validateResearchEnvelope(actual.envelope),[]);
  assert.equal(actual.envelope.retained_articles.length,10);
  assert.equal(actual.envelope.deep_packets.length,9);
  assert.ok(actual.evidence_characters.article<=12000);
  assert.equal(actual.envelope.media.podcast.retained_candidates.length,5);
  assert.equal(actual.envelope.media.video.retained_candidates.length,0);
  assert.equal(actual.selected_media_admission,'NOT_RUN');
  assert.equal(actual.future_edition_selected,false);
  assert.ok(actual.envelope.media.podcast.retained_candidates.some(p=>p.duration_seconds===null));
  const errors=validateSourceEditorial(context,plan,document,requests,actual,{selected_ids:[]},{state:'PRODUCING',stage:'EDITORIAL',research_cutoff_at:plan.cutoff_at});
  assert.ok(errors.includes('qualification_rehearsal_cannot_select_edition'));
  assert.ok(errors.includes('article_selection_exactly_six'));
});

test('I05 functional CLI verifies source bindings and reproduces the committed source coverage and research receipts',t=>{
  const temp=baselineRoot(t);
  const cli=path.join(root,'scripts/source-discovery.mjs');
  const run=(...args)=>execFileSync(process.execPath,[cli,...args,'--root',temp],{encoding:'utf8'});
  assert.equal(JSON.parse(run('verify')).result,'QUALIFIED_SNAPSHOT_PASS');
  for(const [command,file] of [['replay','source-coverage.json'],['research','research-replay.json']]){
    const out=path.join(temp,file),args=[command,'--plan',dir+'/due-source-plan.json','--observations',dir+'/rehearsal-acquisition.json','--out',out];
    if(command==='research')args.push('--requests',dir+'/research-requests.json');
    run(...args);
    assert.equal(fs.readFileSync(out,'utf8'),fs.readFileSync(path.join(root,dir,file),'utf8'));
  }
});

test('I07 source follow-up preserves I5 qualifications and proof inputs while the old plan rejects the changed current snapshot',t=>{
  const temp=baselineRoot(t),baseline=readSourceSnapshot(temp),current=readSourceSnapshot(root),plan=read(dir+'/due-source-plan.json');
  for(const [file,digest] of Object.entries(baselineDigests))assert.equal(sourceDigest(fs.readFileSync(path.join(temp,'config',file))),digest,file);
  assert.equal(baseline.qualifications.qualified_resources,15);
  assert.equal(current.qualifications.qualified_resources,16);
  assert.equal(current.observations.length,107);
  assert.equal(new Set(current.qualifications.records.filter(q=>q.evidence_ref).map(q=>q.evidence_ref.split('#')[0])).size,2);
  for(const q of baseline.qualifications.records.filter(q=>q.status==='qualified'))
    assert.deepEqual(current.qualifications.records.find(row=>row.resource_id===q.resource_id),q);
  assert.deepEqual(current.registry.source_portfolio,baseline.registry.source_portfolio);
  assert.deepEqual(current.policy,baseline.policy);
  assert.deepEqual(validateBoundSourcePlan(baseline.registry,baseline.policy,plan),[]);
  assert.deepEqual(validateBoundSourcePlan(current.registry,current.policy,plan),['plan_does_not_match_approved_snapshot']);
  assert.equal(current.snapshot.selected_item_qualification,false);
  assert.equal(current.snapshot.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
});

test('source evidence loader resolves a targeted refresh from its referenced document while retaining the older capture',t=>{
  const f=refreshedFixture(t),oldPath=path.join(f.temp,dir,'source-observations.json'),before=fs.readFileSync(oldPath);
  const current=readSourceSnapshot(f.temp);
  assert.equal(current.observations.length,f.context.observations.length);
  assert.deepEqual(current.observations.find(row=>row.resource_id===f.observation.resource_id),f.observation);
  assert.equal(current.qualifications.qualified_resources,f.context.qualifications.qualified_resources);
  assert.notDeepEqual(f.context.observations.find(row=>row.resource_id===f.observation.resource_id),f.observation);
  assert.deepEqual(fs.readFileSync(oldPath),before);
});

test('source evidence loader rejects missing, wrong-file, conflicting, unsafe or unbound refresh evidence',t=>{
  const f=refreshedFixture(t),qualificationPath=path.join(f.temp,'config/source-route-qualifications.json'),evidencePath=path.join(f.temp,f.evidencePath);
  const qualifications=JSON.parse(fs.readFileSync(qualificationPath,'utf8')),document={observations:[f.observation]};
  const cases=[
    {name:'missing document',error:/source_evidence_document_missing/,mutate:()=>fs.rmSync(evidencePath)},
    {name:'missing referenced resource',error:/source_evidence_record_missing/,mutate:()=>fs.writeFileSync(evidencePath,sourceJson({observations:[]}))},
    {name:'wrong document with older evidence',error:/source_evidence_record_digest/,qual:q=>q.records[f.index].evidence_ref=f.original.evidence_ref},
    {name:'wrong resource fragment',error:/source_evidence_reference/,qual:q=>q.records[f.index].evidence_ref=f.evidencePath+'#TEST_ONLY-wrong-resource'},
    {name:'conflicting duplicate row',error:/duplicate_source_document_evidence/,mutate:()=>fs.writeFileSync(evidencePath,sourceJson({observations:[f.observation,{...f.observation,limitations:['TEST_ONLY conflict']}]}))},
    {name:'changed evidence digest',error:/source_evidence_record_digest/,mutate:()=>fs.writeFileSync(evidencePath,sourceJson({observations:[{...f.observation,limitations:['TEST_ONLY changed bytes']}]}))},
    {name:'path traversal',error:/unsafe_evidence_path/,qual:q=>q.records[f.index].evidence_ref='../outside.json#'+f.observation.resource_id},
    {name:'duplicate qualification',error:/duplicate_or_unknown_source_qualification/,qual:q=>q.records.push(structuredClone(q.records[f.index]))},
    {name:'unobserved resource cannot carry evidence',error:/unobserved_source_evidence_binding/,qual:q=>q.records.find(row=>row.checked_at===null).evidence_ref=f.evidencePath+'#'+f.observation.resource_id}
  ];
  for(const example of cases){
    const changed=structuredClone(qualifications);if(example.qual)example.qual(changed);
    fs.writeFileSync(qualificationPath,sourceJson(changed));fs.writeFileSync(evidencePath,sourceJson(document));
    if(example.mutate)example.mutate();
    assert.throws(()=>readSourceSnapshot(f.temp),example.error,example.name);
  }
  fs.writeFileSync(qualificationPath,sourceJson(qualifications));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-source-outside-'));
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  fs.writeFileSync(path.join(outside,'observations.json'),sourceJson(document));
  fs.rmSync(evidencePath);fs.symlinkSync(path.join(outside,'observations.json'),evidencePath);
  assert.throws(()=>readSourceSnapshot(f.temp),/unsafe_evidence_path/,'symlink outside repository');
});
