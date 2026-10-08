import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {readSourceSnapshot,sourceDigest,sourceJson,validateBoundSourcePlan} from '../operations/source-discovery.mjs';
import {buildSourceResearch,replayBoundSourceAcquisition,validateSourceEditorial} from '../producer/source-research.mjs';
import {validateResearchEnvelope} from '../producer/research.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir='docs/implementation/oct9-value-and-improvement/iteration-05';
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

// These tests replay saved current-source extracts. They perform no network
// calls and cannot certify a future edition, origin freshness or image quality.
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

test('I05-T03/T04/T08: saved actual due-source capture covers its original assigned scope without claiming all sources were checked',()=>{
  const context=readSourceSnapshot(root),plan=read(dir+'/due-source-plan.json');
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

test('I05-T05/T06: actual source extracts enter a bounded replay without selecting an edition or admitting media',()=>{
  const context=readSourceSnapshot(root),plan=read(dir+'/due-source-plan.json');
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

test('I05 functional CLI verifies source bindings and reproduces the committed source coverage and research receipts',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-source-i05-'));
  const cli=path.join(root,'scripts/source-discovery.mjs');
  const run=(...args)=>execFileSync(process.execPath,[cli,...args,'--root',root],{encoding:'utf8'});
  try{
    assert.equal(JSON.parse(run('verify')).result,'QUALIFIED_SNAPSHOT_PASS');
    for(const [command,file] of [['replay','source-coverage.json'],['research','research-replay.json']]){
      const out=path.join(temp,file),args=[command,'--plan',dir+'/due-source-plan.json','--observations',dir+'/rehearsal-acquisition.json','--out',out];
      if(command==='research')args.push('--requests',dir+'/research-requests.json');
      run(...args);
      assert.equal(fs.readFileSync(out,'utf8'),fs.readFileSync(path.join(root,dir,file),'utf8'));
    }
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
