import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {
  applyResourceObservation,
  reconcileSourceDirectory,
  resourceRegistryDigest,
  serializeResourceRegistry,
  sourceDirectoryDigest,
  validateResourceRegistry,
  validateSourceDirectory
} from '../operations/resources.mjs';

const readJson=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const source=readJson('../migrations/source-portfolio-v1/directory.json');
const baseline=readJson('../migrations/source-portfolio-v1/registry.before.json');
const appliedAt='2026-10-08T08:00:00Z';
const laterAt='2026-10-08T09:00:00Z';
const layerRoles=['article','research','video','podcast','watchlist'];
const compilerOnlyIds=['x-research-feeds','youtube-anthropic','youtube-openai'];
const dispositions=new Set(['mapped_existing','add_resource','add_layer_membership','alias_requires_verification','retrieval_pending']);
const clone=value=>structuredClone(value);
const migrate=(registry=baseline,directory=source,time=appliedAt)=>reconcileSourceDirectory(registry,directory,{appliedAt:time});
const byId=rows=>new Map(rows.map(row=>[row.resource_id,row]));
const catalogueMemberships=registry=>registry.resources.flatMap(resource=>resource.catalogue?.memberships||[]);
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');

// These hashes were calculated independently from the supplied planning package.
// They bind exact wording, URLs, status, descriptions, notes and source lines,
// without publishing the private planning documents themselves.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const canonicalHash=value=>sha256(JSON.stringify(canonical(value)));
const sortedRows=rows=>[...rows].sort((a,b)=>a.planning_row_id.localeCompare(b.planning_row_id));
const bindBaseline=registry=>{
  const input=clone(source);
  input.baseline_registry.sha256=resourceRegistryDigest(registry);
  if(input.baseline_registry.resource_ids) input.baseline_registry.resource_ids=registry.resources.map(r=>r.resource_id);
  return input;
};

function assertPending(qualification,message){
  assert.equal(qualification.status,'pending',message);
  assert.equal(qualification.verified_runtime_endpoint,null,message);
  assert.equal(qualification.checked_at,null,message);
  assert.equal(qualification.evidence_ref,null,message);
  assert.equal(qualification.unattended_eligible,false,message);
}

test('I04-T01: all 204 original memberships are reconciled with exact provenance and layer totals',()=>{
  assert.deepEqual(validateSourceDirectory(source),[]);
  assert.equal(source.rows.length,204);
  assert.equal(canonicalHash(sortedRows(source.rows)),'cea876f278babab17c89b2de963c692ad4ae1474170eb49b1244e1a969de2476');
  const {registry,mapping}=migrate();
  assert.deepEqual(validateResourceRegistry(registry),[]);
  assert.equal(mapping.rows.length,204);
  assert.deepEqual(sortedRows(mapping.rows.map(row=>row.original)),sortedRows(source.rows));
  assert.deepEqual(layerRoles.map((_,index)=>mapping.rows.filter(row=>row.original.layer===index+1).length),[74,40,22,28,40]);
  assert.equal(mapping.rows.filter(row=>row.original.directory_status==='Existing').length,102);
  assert.equal(mapping.rows.filter(row=>row.original.directory_status==='New').length,102);
  assert.equal(new Set(mapping.rows.map(row=>row.original.planning_row_id)).size,204);
  assert.equal(new Set(mapping.rows.map(row=>row.resource_id)).size,166);
  assert.equal(registry.resources.length,169);
  assert.equal(catalogueMemberships(registry).length,204);
  const resources=byId(registry.resources);
  for(const row of mapping.rows){
    const resource=resources.get(row.resource_id);
    assert.ok(resource,row.original.planning_row_id);
    assert.ok(dispositions.has(row.membership.disposition),row.original.planning_row_id);
    assert.equal(row.membership.planning_row_id,row.original.planning_row_id);
    assert.equal(row.membership.layer,row.original.layer);
    assert.equal(row.membership.layer_role,layerRoles[row.original.layer-1]);
    assert.equal(row.membership.recommended_role,row.original.recommended_role);
    assert.equal(row.membership.directory_status,row.original.directory_status);
    assert.equal(row.membership.source_line,row.original.source_line);
    assert.deepEqual(resource.catalogue.memberships.find(m=>m.planning_row_id===row.original.planning_row_id),row.membership);
  }
});

test('I04-T02: repeat and reordered migration preserve exact registry contents and stable identities',()=>{
  const originalBaseline=clone(baseline);
  const originalSource=clone(source);
  const first=migrate();
  const again=migrate(first.registry,source,laterAt);
  assert.deepEqual(again.registry,first.registry);
  assert.equal(resourceRegistryDigest(again.registry),resourceRegistryDigest(first.registry));
  assert.equal(again.diff.registry_changed,false);
  assert.deepEqual(again.diff.added_resource_ids,[]);
  assert.deepEqual(again.diff.added_membership_ids,[]);
  assert.deepEqual(again.diff.runtime_fields_changed,[]);
  const reordered=clone(source);
  reordered.rows.reverse();
  reordered.identity_questions.reverse();
  assert.equal(sourceDirectoryDigest(reordered),sourceDirectoryDigest(source));
  const reorderedFirst=migrate(baseline,reordered);
  assert.deepEqual(reorderedFirst.registry,first.registry);
  const reorderedAgain=migrate(first.registry,reordered,laterAt);
  assert.deepEqual(reorderedAgain.registry,first.registry);
  assert.equal(catalogueMemberships(again.registry).length,204);
  assert.equal(new Set(again.registry.resources.map(r=>r.resource_id)).size,169);
  assert.deepEqual(baseline,originalBaseline,'migration must not mutate its baseline argument');
  assert.deepEqual(source,originalSource,'migration must not mutate the supplied provenance');
});

test('I04-T02: reapplication never resets real observations or accepts a changed source under the same migration',()=>{
  const first=migrate();
  const observation={
    schema_version:'daily-compiler-resource-observation-v1',edition_date:'2026-10-08',execution_id:'iteration-04-test',
    resource_id:'anthropic',checked_at:laterAt,content_type:'research',queries:1,candidates_found:2,
    usable_candidates:1,selected_items:0,fresh_items:1,failures:[],duration_ms:100
  };
  const observed=applyResourceObservation(first.registry,observation);
  assert.equal(byId(observed.resources).get('anthropic').health.status,'healthy');
  const repeated=migrate(observed,source,'2026-10-08T10:00:00Z');
  assert.deepEqual(repeated.registry,observed,'a catalogue replay must preserve later runtime observations');
  const changed=clone(source);
  changed.rows[0].verification_note+=' Changed provenance.';
  assert.notEqual(sourceDirectoryDigest(changed),sourceDirectoryDigest(source));
  assert.throws(()=>migrate(first.registry,changed),/source|migration|digest/i);
});

test('I04-T03: identical endpoints share memberships while arXiv, DeepMind and channel routes remain distinct',()=>{
  const {registry,mapping}=migrate();
  const resourceFor=url=>mapping.rows.find(row=>row.original.url===url)?.resource_id;
  const aiEngineer=mapping.rows.filter(row=>row.original.url==='https://ai.engineer/');
  assert.equal(aiEngineer.length,2);
  assert.equal(new Set(aiEngineer.map(row=>row.resource_id)).size,1);
  assert.deepEqual(aiEngineer.map(row=>row.membership.layer_role).sort(),['research','video']);
  assert.equal(registry.resources.filter(r=>r.url==='https://ai.engineer/').length,1);
  const arxivUrls=['cs.AI','cs.LG','cs.CL','cs.SE','cs.CR','stat.ML'].map(category=>`https://arxiv.org/list/${category}/recent`);
  const arxivIds=arxivUrls.map(resourceFor);
  assert.ok(arxivIds.every(Boolean));
  assert.equal(new Set(arxivIds).size,6);
  const deepmindIds=['https://deepmind.google/discover/blog/','https://deepmind.google/blog/'].map(resourceFor);
  assert.ok(deepmindIds.every(Boolean));
  assert.equal(new Set(deepmindIds).size,2);
  for(const [handle,baselineId] of [['OpenAI','youtube-openai'],['anthropic-ai','youtube-anthropic']]){
    const handleResource=byId(registry.resources).get(baselineId);
    const videosId=resourceFor(`https://www.youtube.com/@${handle}/videos`);
    assert.ok(videosId);
    assert.notEqual(videosId,baselineId,'a channel handle and its /videos route are not proven aliases');
    assert.equal(handleResource.url,`https://www.youtube.com/@${handle}`);
  }
});

test('I04-T04: every baseline runtime field and all three Compiler-only sources are preserved',()=>{
  assert.equal(baseline.resources.length,56);
  const {registry}=migrate();
  const resources=byId(registry.resources);
  for(const original of baseline.resources){
    const actual=resources.get(original.resource_id);
    assert.ok(actual,original.resource_id);
    const {catalogue,...operational}=actual;
    assert.deepEqual(operational,original,`${original.resource_id}: preserve existing operational policy and health`);
  }
  for(const id of compilerOnlyIds){
    assert.deepEqual(resources.get(id),byId(baseline.resources).get(id));
    assert.ok(!source.rows.some(row=>row.url===resources.get(id).url));
  }
  const oldIds=new Set(baseline.resources.map(r=>r.resource_id));
  assert.equal(registry.resources.filter(r=>!oldIds.has(r.resource_id)).length,113);
  assert.equal(registry.resources.filter(r=>oldIds.has(r.resource_id)&&r.catalogue).length,53);
});

test('I04-T05: historical Active/Verified and assisted labels never qualify or activate imported routes',()=>{
  const {registry,mapping}=migrate();
  const oldIds=new Set(baseline.resources.map(r=>r.resource_id));
  const added=registry.resources.filter(r=>!oldIds.has(r.resource_id));
  assert.equal(added.length,113);
  for(const resource of added){
    assert.equal(resource.enabled,false,resource.resource_id);
    assert.equal(resource.endpoint,null,resource.resource_id);
    assert.equal(resource.health.status,'unknown',resource.resource_id);
    assert.equal(resource.health.last_checked_at,null,resource.resource_id);
    assert.equal(resource.health.last_success_at,null,resource.resource_id);
  }
  assert.ok(mapping.rows.some(row=>/Active/.test(row.original.recommended_role)));
  assert.ok(mapping.rows.some(row=>/Verified on public web 2026-09-19/.test(row.original.verification_note)));
  assert.ok(mapping.rows.some(row=>/assisted/i.test(row.original.recommended_role)));
  for(const row of mapping.rows){
    assertPending(row.pending_qualification,row.original.planning_row_id);
    assertPending(byId(registry.resources).get(row.resource_id).catalogue.qualification,row.original.planning_row_id);
    assert.equal(row.publisher_show_identity.verification_status,'pending');
    assert.equal(row.publisher_show_identity.canonical_publisher_id,null);
    assert.equal(row.publisher_show_identity.canonical_show_id,null);
    assert.equal(row.publisher_show_identity.evidence_ref,null);
  }
  for(const row of mapping.rows.filter(r=>/assisted/i.test(r.original.recommended_role))){
    assert.equal(row.pending_qualification.unattended_eligible,false);
    assert.ok(dispositions.has(row.membership.disposition));
  }
});

test('I04-T06: AI Daily Brief/AI Breakdown and Hard Fork retain explicit unresolved identities',()=>{
  const {mapping}=migrate();
  const named=name=>mapping.rows.find(row=>row.original.name===name);
  const daily=named('The AI Daily Brief');
  const breakdown=named('The AI Breakdown');
  const hardFork=named('Hard Fork');
  for(const row of [daily,breakdown,hardFork]){
    assert.ok(row);
    assert.equal(row.membership.disposition,'alias_requires_verification',row.original.name);
    assert.ok(row.identity_question_ids.length>0,row.original.name);
    assert.equal(row.publisher_show_identity.verification_status,'pending',row.original.name);
    assert.equal(row.publisher_show_identity.canonical_show_id,null,row.original.name);
    assertPending(row.pending_qualification,row.original.name);
  }
  assert.notEqual(daily.resource_id,breakdown.resource_id,'possible show renaming must not merge distinct unverified routes');
  assert.equal(daily.original.url,'https://aidailybrief.ai/');
  assert.equal(breakdown.original.url,'https://theaibreakdown.com/');
  assert.match(hardFork.original.verification_note,/monitor continuity/);
  assert.equal(hardFork.original.url,'https://www.nytimes.com/column/hard-fork');
});

test('I04-T07: all five exact rubrics and source-line references survive with no fabricated source scores',()=>{
  assert.equal(canonicalHash(source.layer_rubrics),'3e62f96a227585ca9510e25d6c732e1f10ab400c641c531026ebc28022a2c90a');
  const expectedRanges={
    'Article and publisher sources':{start:43,end:52},
    'Research and early-signal discovery':{start:54,end:63},
    'Video discovery':{start:65,end:74},
    'Podcast discovery':{start:76,end:85},
    'Emerging AI Watchlist':{start:87,end:97}
  };
  assert.deepEqual(source.rubric_source_lines,expectedRanges);
  for(const rubric of Object.values(source.layer_rubrics)){
    assert.equal(rubric.reduce((sum,item)=>sum+item.weight_percent,0),100);
    assert.ok(rubric.every(item=>item.criterion&&item.why_it_matters));
  }
  const result=migrate();
  for(const row of result.mapping.rows){
    const original=source.rows.find(item=>item.planning_row_id===row.original.planning_row_id);
    assert.equal(row.original.source_line,original.source_line);
    assert.equal(row.membership.source_line,original.source_line);
    assert.ok(source.layer_rubrics[original.layer_name]);
    assert.ok(source.rubric_source_lines[original.layer_name]);
  }
  const findScores=value=>{
    if(!value||typeof value!=='object')return;
    for(const [key,entry] of Object.entries(value)){
      assert.ok(!(/score/i.test(key)&&typeof entry==='number'),`unverified source score: ${key}`);
      findScores(entry);
    }
  };
  findScores(result);
});

test('source migration rejects duplicate row identities and retains a verifiable reversible snapshot',()=>{
  const duplicate=clone(source);
  duplicate.rows[1].planning_row_id=duplicate.rows[0].planning_row_id;
  assert.ok(validateSourceDirectory(duplicate).length>0);
  assert.throws(()=>migrate(baseline,duplicate),/row|source|duplicate/i);
  assert.deepEqual(validateResourceRegistry(baseline),[],'existing v1 fixtures remain supported');
  const snapshotBytes=fs.readFileSync(new URL('../migrations/source-portfolio-v1/registry.before.json',import.meta.url));
  assert.equal(sha256(snapshotBytes),'f26d874cdc1affa9417cbd0e87d99dfdb2508c7555b150915913db96bb616103');
  assert.equal(source.baseline_registry.sha256,sha256(snapshotBytes));
  assert.equal(resourceRegistryDigest(baseline),sha256(serializeResourceRegistry(baseline)));
});

test('source migration rejects ambiguous pre-existing exact endpoint matches instead of choosing one',()=>{
  const ambiguous=clone(baseline);
  const original=ambiguous.resources.find(resource=>resource.url===source.rows[0].url);
  assert.ok(original);
  ambiguous.resources.push({...clone(original),resource_id:'ambiguous-second-source'});
  const input=bindBaseline(ambiguous);
  assert.throws(()=>migrate(ambiguous,input),/ambiguous/i);
});

test('I04-T03: conservative matching retains slash, query, fragment and raw hostname distinctions',()=>{
  const amended=clone(baseline);
  const exactUrl='https://cohere.com/blog';
  const variants=[`${exactUrl}/`,`${exactUrl}?category=agents`,`${exactUrl}#latest`,'https://COHERE.COM/blog'];
  for(const [index,url] of variants.entries()){
    amended.resources.push({...clone(baseline.resources[0]),resource_id:`distinct-route-${index}`,url,endpoint:url});
  }
  const {registry,mapping}=migrate(amended,bindBaseline(amended));
  const mapped=mapping.rows.filter(row=>row.original.url===exactUrl);
  assert.equal(mapped.length,2);
  assert.equal(new Set(mapped.map(row=>row.resource_id)).size,1);
  assert.ok(!mapped[0].resource_id.startsWith('distinct-route-'));
  for(const [index,url] of variants.entries()){
    const retained=byId(registry.resources).get(`distinct-route-${index}`);
    assert.equal(retained.url,url);
    assert.deepEqual(retained,amended.resources.find(r=>r.resource_id===retained.resource_id));
  }
});

test('qualification handoff covers every resource exactly once and binds the candidate digest without claiming due checks',()=>{
  const {registry,mapping,diff,qualification_worklist:worklist}=migrate();
  const digest=sha256(serializeResourceRegistry(registry));
  assert.equal(mapping.candidate_registry_sha256,digest);
  assert.equal(worklist.candidate_registry_sha256,digest);
  assert.equal(diff.after_registry_sha256,digest);
  assert.equal(diff.before_registry_sha256,source.baseline_registry.sha256);
  assert.equal(mapping.input_digest,sourceDirectoryDigest(source));
  assert.equal(worklist.input_digest,sourceDirectoryDigest(source));
  assert.equal(registry.source_portfolio.input_digest,sourceDirectoryDigest(source));
  assert.deepEqual(mapping.layer_rubrics,source.layer_rubrics);
  assert.deepEqual(mapping.rubric_source_lines,source.rubric_source_lines);
  assert.equal(mapping.summary.supplied_memberships,204);
  assert.equal(mapping.summary.exact_directory_urls,166);
  assert.equal(mapping.summary.matched_baseline_resources,53);
  assert.equal(mapping.summary.new_resources,113);
  assert.equal(mapping.summary.compiler_only_resources,3);
  assert.equal(mapping.summary.pending_added_roles_on_baseline_resources,5);
  assert.equal(mapping.summary.runtime_role_changes,0);
  assert.equal(worklist.resources.length,169);
  assert.equal(worklist.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
  assert.equal(worklist.qualified_by_this_migration,0);
  assert.deepEqual(worklist.resources.map(r=>r.resource_id).sort(),registry.resources.map(r=>r.resource_id).sort());
  const groupedIds=worklist.due_priority_groups.flatMap(group=>group.resource_ids);
  assert.equal(groupedIds.length,169);
  assert.equal(new Set(groupedIds).size,169);
  assert.deepEqual(groupedIds.sort(),registry.resources.map(r=>r.resource_id).sort());
  assert.ok(worklist.due_priority_groups.every(group=>group.actual_due_count===null));
  assert.equal(worklist.resources.flatMap(r=>r.directory_row_ids).length,204);
  for(const resource of worklist.resources){
    assertPending(resource.qualification,resource.resource_id);
    assert.equal(resource.due_at,null,resource.resource_id);
    assert.equal(resource.coverage_status,'not_assessed',resource.resource_id);
    assert.equal(resource.unattended_route_required,true,resource.resource_id);
    assert.ok(resource.pending_reason,resource.resource_id);
    const current=byId(registry.resources).get(resource.resource_id);
    assert.equal(resource.current_configured_endpoint,current.endpoint);
    assert.equal(resource.current_enabled,current.enabled);
    assert.deepEqual(resource.current_runtime_content_types,current.content_types);
    assert.equal(resource.current_runtime_priority,current.priority);
    assert.deepEqual(resource.directory_row_ids,[...(current.catalogue?.memberships||[])].map(m=>m.planning_row_id));
    for(const hint of resource.historical_route_hints){
      assert.equal(hint.qualification,'not_rechecked');
      assert.equal(hint.verified_runtime_endpoint,null);
    }
  }
  const questions=new Map(worklist.identity_questions.map(q=>[q.question_id,q]));
  for(const resource of worklist.resources) for(const id of resource.identity_question_ids){
    const question=questions.get(id);
    assert.ok(question,`${resource.resource_id}: unresolved identity must be actionable`);
    assert.equal(question.status,'pending');
    assert.equal(question.evidence_ref,null);
    assert.equal(question.verified_at,null);
    assert.equal(question.resolution,null);
  }
  const retainedGroup=worklist.due_priority_groups.find(group=>group.group==='retained_compiler_only');
  assert.deepEqual([...retainedGroup.resource_ids].sort(),[...compilerOnlyIds].sort());
});

test('persisted candidate registry and reconciliation artifacts exactly match the recorded first migration',()=>{
  const registryBytes=fs.readFileSync(new URL('../config/resource-registry.json',import.meta.url));
  const current=JSON.parse(registryBytes);
  const derived=migrate(baseline,source,current.source_portfolio.applied_at);
  assert.deepEqual(current,derived.registry,'persisted candidate must preserve the approved migration result');
  assert.deepEqual(registryBytes,Buffer.from(serializeResourceRegistry(derived.registry)));
  const digest=sha256(registryBytes);
  const artifactRoot=new URL('../docs/implementation/oct9-value-and-improvement/iteration-04/reconciliation/',import.meta.url);
  for(const [filename,expected] of [['mapping.json',derived.mapping],['qualification-worklist.json',derived.qualification_worklist]]){
    const actual=fs.readFileSync(new URL(filename,artifactRoot));
    assert.deepEqual(actual,Buffer.from(JSON.stringify(expected,null,2)+'\n'),filename);
    assert.equal(JSON.parse(actual).candidate_registry_sha256,digest,`${filename}: digest must identify actual registry bytes`);
  }
  const recordedDiff=JSON.parse(fs.readFileSync(new URL('dry-run.json',artifactRoot)));
  assert.deepEqual(recordedDiff,{
    schema_version:'daily-compiler-source-directory-diff-v1',migration_id:source.migration_id,
    mode:'dry_run',summary:derived.mapping.summary,...derived.diff
  });
  assert.equal(recordedDiff.registry_changed,true);
  assert.equal(recordedDiff.after_registry_sha256,digest);
});

test('v2 validation rejects missing/duplicate memberships and unqualified activation or guessed endpoints',()=>{
  const first=migrate().registry;
  const createdId=first.source_portfolio.created_resource_ids[0];
  const scenarios=[
    ['missing membership',registry=>byId(registry.resources).get(createdId).catalogue.memberships.pop()],
    ['duplicate membership',registry=>{
      const resource=byId(registry.resources).get(createdId);
      resource.catalogue.memberships.push(clone(resource.catalogue.memberships[0]));
    }],
    ['enabled import',registry=>{byId(registry.resources).get(createdId).enabled=true;}],
    ['invented operational feed',registry=>{byId(registry.resources).get(createdId).endpoint='https://example.test/invented-feed.xml';}],
    ['unattended grant without proof',registry=>{byId(registry.resources).get(createdId).catalogue.qualification.unattended_eligible=true;}],
    ['guessed canonical show',registry=>{byId(registry.resources).get(createdId).catalogue.identity.canonical_show_id='guessed-show';}]
  ];
  for(const [label,mutate] of scenarios){
    const registry=clone(first);
    mutate(registry);
    assert.ok(validateResourceRegistry(registry).length>0,label);
    assert.throws(()=>migrate(registry),/source_portfolio/,label);
  }
});

test('replay rejects source loss even if retention lists are edited to hide a missing Compiler-only entry',()=>{
  const registry=migrate().registry;
  const missingId=compilerOnlyIds[0];
  registry.resources=registry.resources.filter(resource=>resource.resource_id!==missingId);
  registry.source_portfolio.baseline_resource_ids=registry.source_portfolio.baseline_resource_ids.filter(id=>id!==missingId);
  registry.source_portfolio.compiler_only_resource_ids=registry.source_portfolio.compiler_only_resource_ids.filter(id=>id!==missingId);
  assert.throws(()=>migrate(registry),/source|baseline|preserv/i);
});

test('v2 activation protection survives removing a resource from the self-reported creation list',()=>{
  const registry=migrate().registry;
  const createdId=registry.source_portfolio.created_resource_ids[0];
  registry.source_portfolio.created_resource_ids=registry.source_portfolio.created_resource_ids.filter(id=>id!==createdId);
  const resource=byId(registry.resources).get(createdId);
  resource.enabled=true;
  resource.endpoint=resource.url;
  assert.ok(validateResourceRegistry(registry).length>0,'creation-list edits must not remove the unqualified-route gate');
  assert.throws(()=>migrate(registry),/source|preserv|activation/i);
});

const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const sourcePath=fileURLToPath(new URL('../migrations/source-portfolio-v1/directory.json',import.meta.url));
const snapshotPath=fileURLToPath(new URL('../migrations/source-portfolio-v1/registry.before.json',import.meta.url));
const cliPath=fileURLToPath(new URL('../scripts/reconcile-source-directory.mjs',import.meta.url));
function cliFixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-source-migration-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const registryPath=path.join(dir,'registry.json');
  fs.writeFileSync(registryPath,fs.readFileSync(snapshotPath));
  fs.utimesSync(registryPath,1000,1000);
  return {dir,registryPath};
}
function runCli(registryPath,{apply=false,inputSource=sourcePath,outputDir,at=appliedAt}={}){
  const args=[cliPath,'--registry',registryPath,'--source',inputSource,'--at',at];
  if(apply)args.push('--apply');
  if(outputDir)args.push('--output-dir',outputDir);
  return spawnSync(process.execPath,args,{cwd:repoRoot,encoding:'utf8'});
}

test('CLI default dry-run produces a reviewable diff without writing registry or report files',t=>{
  const {dir,registryPath}=cliFixture(t);
  const before=fs.readFileSync(registryPath);
  const beforeMtime=fs.statSync(registryPath,{bigint:true}).mtimeNs;
  const result=runCli(registryPath);
  assert.equal(result.status,0,result.stderr);
  const output=JSON.parse(result.stdout);
  assert.equal(output.result,'SOURCE_CATALOGUE_RECONCILED');
  assert.equal(output.mode,'dry_run');
  assert.equal(output.registry_written,false);
  assert.equal(output.diff.registry_changed,true);
  assert.equal(output.diff.added_resource_ids.length,113);
  assert.equal(output.diff.added_membership_ids.length,204);
  assert.equal(output.qualification,'NOT_RUN');
  assert.equal(output.activation,'NOT_RUN');
  assert.deepEqual(fs.readFileSync(registryPath),before);
  assert.equal(fs.statSync(registryPath,{bigint:true}).mtimeNs,beforeMtime);
  assert.deepEqual(fs.readdirSync(dir),['registry.json']);
});

test('CLI apply binds persisted reports to exact registry bytes and reapplication does not rewrite the registry',t=>{
  const {dir,registryPath}=cliFixture(t);
  const snapshot=fs.readFileSync(snapshotPath);
  const snapshotMtime=fs.statSync(snapshotPath,{bigint:true}).mtimeNs;
  const outputDir=path.join(dir,'reports');
  const applied=runCli(registryPath,{apply:true,outputDir});
  assert.equal(applied.status,0,applied.stderr);
  const output=JSON.parse(applied.stdout);
  const candidateBytes=fs.readFileSync(registryPath);
  assert.equal(output.mode,'apply');
  assert.equal(output.registry_written,true);
  assert.equal(output.registry_sha256,sha256(candidateBytes));
  assert.equal(output.baseline_snapshot_sha256,sha256(snapshot));
  assert.deepEqual(validateResourceRegistry(JSON.parse(candidateBytes)),[]);
  const mapping=JSON.parse(fs.readFileSync(path.join(outputDir,'mapping.json')));
  const worklist=JSON.parse(fs.readFileSync(path.join(outputDir,'qualification-worklist.json')));
  assert.equal(mapping.candidate_registry_sha256,sha256(candidateBytes));
  assert.equal(worklist.candidate_registry_sha256,sha256(candidateBytes));
  assert.equal(mapping.rows.length,204);
  assert.equal(worklist.resources.length,169);
  fs.utimesSync(registryPath,1000,1000);
  const beforeMtime=fs.statSync(registryPath,{bigint:true}).mtimeNs;
  const replay=runCli(registryPath,{apply:true,at:laterAt});
  assert.equal(replay.status,0,replay.stderr);
  assert.equal(JSON.parse(replay.stdout).registry_written,false);
  assert.deepEqual(fs.readFileSync(registryPath),candidateBytes);
  assert.equal(fs.statSync(registryPath,{bigint:true}).mtimeNs,beforeMtime);
  assert.deepEqual(fs.readFileSync(snapshotPath),snapshot);
  assert.equal(fs.statSync(snapshotPath,{bigint:true}).mtimeNs,snapshotMtime);
});

test('CLI refuses report/source collisions and existing proof replacement before any registry write',t=>{
  const {dir,registryPath}=cliFixture(t);
  const before=fs.readFileSync(registryPath);
  const sourceDir=path.join(dir,'collision');
  fs.mkdirSync(sourceDir);
  const collidingSource=path.join(sourceDir,'mapping.json');
  const originalSourceBytes=fs.readFileSync(sourcePath);
  fs.writeFileSync(collidingSource,originalSourceBytes);
  const collided=runCli(registryPath,{apply:true,inputSource:collidingSource,outputDir:sourceDir});
  assert.notEqual(collided.status,0);
  assert.match(collided.stderr,/source_directory_report_input_collision/);
  assert.deepEqual(fs.readFileSync(collidingSource),originalSourceBytes);
  assert.deepEqual(fs.readFileSync(registryPath),before);
  assert.deepEqual(fs.readdirSync(sourceDir),['mapping.json']);
  const retainedDir=path.join(dir,'retained-proof');
  fs.mkdirSync(retainedDir);
  const proof=Buffer.from('{"retained":"exact prior proof"}\n');
  fs.writeFileSync(path.join(retainedDir,'mapping.json'),proof);
  const refused=runCli(registryPath,{apply:true,outputDir:retainedDir});
  assert.notEqual(refused.status,0);
  assert.match(refused.stderr,/source_directory_report_exists_use_new_output_dir/);
  assert.deepEqual(fs.readFileSync(registryPath),before);
  assert.deepEqual(fs.readFileSync(path.join(retainedDir,'mapping.json')),proof);
  assert.deepEqual(fs.readdirSync(retainedDir),['mapping.json']);
});
