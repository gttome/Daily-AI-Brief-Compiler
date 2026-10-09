// Development qualification only. Nothing in the producer, scheduler, compiler
// or finalizer imports this module. An audit never activates or releases a run.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD1Activation} from '../image-studio/activation.mjs';
import {d1EvidencePath,readD1Evidence} from '../image-studio/proof-evidence.mjs';
import {verifyFinalizationEvidence} from '../compiler/finalization-evidence.mjs';
import {assertCompleteReleaseEvidence} from '../compiler/release-evidence.mjs';
import {validateEdition} from '../compiler/compile.mjs';
import {readSourceSnapshot} from './source-discovery.mjs';
import {IMAGE_TASK_ID} from './image-lane-handoff.mjs';

export const VALUE_TARGET=Object.freeze({edition_date:'2026-10-09',timezone:'America/Chicago',
  readiness_target:'2026-10-08T17:15:00-05:00',freeze_target:'2026-10-08T18:15:00-05:00',
  intended_run_start:'2026-10-08T23:45:00-05:00',intended_run_start_utc:'2026-10-09T04:45:00Z',
  original_intended_run_start:'2026-10-08T19:15:00-05:00',rescheduling_authority:'Owner October 8 instruction: move the run time back if needed'});
export const PRIMARY_TASK_ID='6ac57b19b3508191944ce2e0dec1d57b';
export const VALUE_TEST_COMMANDS=Object.freeze(['node --test tests/value-release.test.mjs','npm test','npm run validate:bootstrap',
  'npm run fixture:e2e','actions/jekyll-build-pages@v1','node scripts/verify-built-reader.mjs build/fixture-built build/fixture build/fixture-built-verification.json','npm run reader:parity']);
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const arr=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'&&value.trim().length>0;
const instant=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const repoRef=value=>typeof value==='string'&&/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/(?:commit|blob|pull|actions\/runs)\//.test(value);
const checkRef=value=>typeof value==='string'&&/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(value);
const safeRel=value=>text(value)&&!path.isAbsolute(value)&&!/[\\\s?#]/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');
const read=(root,relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const SCOPES={
  implementation:['compiler','f2-compiler','diagram-compiler','image-capsules','image-studio','operations','producer','work-porter'],
  contracts:['contracts','docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md','vendor/image-benchmark/benchmark-profile-v1.json','vendor/image-benchmark/PROVENANCE.json','vendor/production-reader/SOURCE-MAP.json','vendor/production-reader/PROVENANCE.json'],sources:['config/resource-registry.json','config/source-discovery-policy.json','config/source-route-qualifications.json','config/source-snapshot.json'],
  qualification:['tests','scripts','.github/workflows/ci.yml','package.json','package-lock.json']
};
// Optional projections and their schemas are not product inputs. Tests of that
// boundary remain in the qualification scope; missing observers do not block.
const OPTIONAL=new Set(['operations/learning.mjs','contracts/dashboard-snapshot.schema.json','contracts/problem-learning.schema.json',
  'contracts/run-analysis.schema.json','contracts/run-event.schema.json','contracts/run-metrics.schema.json','contracts/usage-rate-card.schema.json',
  'scripts/build-learning-ledger.mjs','scripts/finalize-run-intelligence.mjs']);
const REQUIRED=['compiler/compile.mjs','compiler/media.mjs','compiler/release-evidence.mjs','image-studio/activation.mjs',
  'image-studio/proof-evidence.mjs','image-studio/product-evidence.mjs','operations/source-discovery.mjs',
  'contracts/editorial-contract.json','contracts/media-contract.json','contracts/d1-image-contract.json','contracts/d1-image-admission-contract.json','contracts/schedule-contract.json',
  ...SCOPES.contracts.slice(1),...SCOPES.sources];

export function valueReleaseInventory({repoRoot='.',engineSha=null}={}){
  if(engineSha!==null&&!SHA.test(engineSha))throw new Error('value_release_invalid_engine_sha');
  const root=path.resolve(repoRoot),files=[];
  function collect(relative,scope){
    if(OPTIONAL.has(relative)||!fs.existsSync(path.join(root,relative)))return;
    const full=path.join(root,relative),stat=fs.lstatSync(full);
    if(stat.isSymbolicLink())throw new Error('value_release_inventory_symlink:'+relative);
    if(stat.isDirectory()){
      for(const name of fs.readdirSync(full).sort())collect(relative+'/'+name,scope);
    }else if(/\.(?:mjs|json|txt|md|ya?ml)$/.test(relative)){
      const bytes=fs.readFileSync(full);files.push({path:relative,scope,sha256:hash(bytes),bytes:bytes.length});
    }
  }
  for(const [scope,paths] of Object.entries(SCOPES))for(const relative of paths)collect(relative,scope);
  // Saved route evidence is part of the qualified source identity, including
  // when the evidence lives outside the config directory.
  try{
    const q=read(root,'config/source-route-qualifications.json');
    const refs=[...new Set(arr(q.records).map(row=>row.evidence_ref?.split('#')[0]).filter(Boolean))];
    for(const ref of refs){
      if(path.isAbsolute(ref)||ref.includes('\\')||ref.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('value_release_unsafe_source_evidence_path');
      collect(ref,'sources');
    }
  }catch(error){if(!(error instanceof SyntaxError)&&error.code!=='ENOENT')throw error;}
  files.sort((a,b)=>a.path.localeCompare(b.path));
  const scope_sha256=Object.fromEntries(Object.keys(SCOPES).map(scope=>[scope,canonicalSha(files.filter(row=>row.scope===scope))]));
  const versions={};
  for(const file of ['contracts/editorial-contract.json','contracts/media-contract.json','contracts/d1-image-contract.json','contracts/d1-image-admission-contract.json','contracts/schedule-contract.json','config/source-snapshot.json']){
    try{versions[file]=read(root,file).schema_version??null;}catch{versions[file]=null;}
  }
  return {schema_version:'daily-compiler-value-version-inventory-v1',engine_sha:engineSha,
    coverage:'Declared product code, contracts, qualified source evidence and test inputs present in this checkout. The immutable engine SHA also identifies repository assets outside this bounded read set.',
    files,scope_sha256,inventory_sha256:canonicalSha(files),contract_versions:versions,
    missing_required_files:REQUIRED.filter(file=>!files.some(row=>row.path===file))};
}

// Exact releases require the same head. A component proof can be reused across
// heads only for explicitly named unchanged scopes, and its own validator must
// still pass; compatibility alone is not a proof or activation grant.
export function compareValueReleaseBindings(previous,current,{scopes=Object.keys(SCOPES),componentOnly=false}={}){
  scopes=arr(scopes);
  const validScopes=scopes.length>0&&new Set(scopes).size===scopes.length&&scopes.every(scope=>Object.hasOwn(SCOPES,scope));
  const oldFiles=new Map(arr(previous?.files).filter(row=>scopes.includes(row.scope)).map(row=>[row.path,row.sha256]));
  const newFiles=new Map(arr(current?.files).filter(row=>scopes.includes(row.scope)).map(row=>[row.path,row.sha256]));
  const changed_files=[...new Set([...oldFiles.keys(),...newFiles.keys()])].filter(file=>oldFiles.get(file)!==newFiles.get(file)).sort();
  const identities=[previous,current].every(value=>value?.schema_version==='daily-compiler-value-version-inventory-v1'&&SHA.test(value.engine_sha||'')&&
    Array.isArray(value.files)&&value.files.length>0&&new Set(value.files.map(row=>row.path)).size===value.files.length&&
    value.files.every(row=>safeRel(row.path)&&Object.hasOwn(SCOPES,row.scope)&&DIGEST.test(row.sha256||'')&&Number.isSafeInteger(row.bytes)&&row.bytes>=0)&&
    Array.isArray(value.missing_required_files)&&value.missing_required_files.length===0&&REQUIRED.every(file=>value.files.some(row=>row.path===file))&&
    Object.keys(value.scope_sha256??{}).sort().join(',')===Object.keys(SCOPES).sort().join(',')&&
    value.inventory_sha256===canonicalSha(value.files)&&Object.keys(SCOPES).every(scope=>value.scope_sha256?.[scope]===canonicalSha(value.files.filter(row=>row.scope===scope))));
  const same_engine=previous?.engine_sha===current?.engine_sha;
  return {result:identities&&validScopes&&changed_files.length===0&&(componentOnly||same_engine)?'PASS':'FAIL',same_engine,
    comparison_scope:componentOnly?'COMPONENT_COMPATIBILITY_ONLY':'EXACT_RELEASE',changed_files,
    changed_scopes:scopes.filter(scope=>previous?.scope_sha256?.[scope]!==current?.scope_sha256?.[scope])};
}

export function qualifiedDiscoverySummary(context){
  const resources=arr(context?.registry?.resources),qualified=resources.filter(row=>row.enabled===true&&row.discovery?.qualification_status==='qualified'&&row.discovery?.unattended_eligible===true);
  const roles=row=>new Set([...arr(row.content_types),...arr(row.catalogue?.memberships).map(member=>member.layer_role)]);
  const role_counts=Object.fromEntries(['article','research','watchlist','video','podcast'].map(role=>[role,qualified.filter(row=>roles(row).has(role)).length]));
  // This is a necessary supply check, not selected-item/media admission. One
  // route can yield multiple items; no invented per-type source quota is used.
  const missing_required_roles=['article','video','podcast','watchlist'].filter(role=>role_counts[role]===0);
  return {resource_count:resources.length,qualified_resources:qualified.length,role_counts,missing_required_roles,
    sufficient_discovery_routes:missing_required_roles.length===0,
    SOURCE_ROLLOUT:context?.snapshot?.source_rollout==='SOURCE_ROLLOUT_COMPLETE'?'COMPLETE':'PARTIAL',
    selected_item_admission:'NOT_RUN',qualification_scope:'metadata_discovery_only'};
}

export function compareValueSchedule(readback={},engineSha=null){
  const tasks=Array.isArray(readback.tasks)?readback.tasks:(readback.id?[readback]:[]);
  const matches=tasks.filter(task=>task.id===PRIMARY_TASK_ID),task=matches[0]??null;
  const schedule=task?.schedule??'',rules=String(schedule).split(/\r?\n/).filter(line=>line.startsWith('RRULE:'));
  const starts=String(schedule).split(/\r?\n/).filter(line=>line.startsWith('DTSTART'));
  const targetClock=VALUE_TARGET.intended_run_start.slice(11,19).replaceAll(':','');
  const start=starts.length===1?new RegExp('^DTSTART;TZID=America/Chicago:(\\d{4})(\\d\\d)(\\d\\d)T'+targetClock+'$').exec(starts[0]):null;
  const startDate=start?start[1]+'-'+start[2]+'-'+start[3]:null;
  const startOkay=startDate!==null&&Number.isFinite(Date.parse(startDate+'T00:00:00Z'))&&new Date(startDate+'T00:00:00Z').toISOString().slice(0,10)===startDate&&startDate<='2026-10-08';
  const parts=rules.length===1?rules[0].slice(6).split(';').map(part=>part.split('=')):[];
  const rule=Object.fromEntries(parts),known=['FREQ','BYHOUR','BYMINUTE','BYSECOND','INTERVAL'];
  const cadence=matches.length===1&&task.is_enabled===true&&task.timing_mode==='exact_schedule'&&task.default_timezone==='America/Chicago'&&
    parts.length===new Set(parts.map(([key])=>key)).size&&parts.every(([key,value])=>known.includes(key)&&text(value))&&
    rule.FREQ==='DAILY'&&rule.BYHOUR===String(Number(targetClock.slice(0,2)))&&rule.BYMINUTE===String(Number(targetClock.slice(2,4)))&&rule.BYSECOND===String(Number(targetClock.slice(4,6)))&&(!rule.INTERVAL||rule.INTERVAL==='1')&&
    startOkay&&!/^(?:EXDATE|RDATE|DTEND)[;:]/m.test(schedule);
  const next=task?.next_run_time??null;
  const binding=readback.release_engine_binding;
  const bound=SHA.test(engineSha||'')&&binding?.engine_sha===engineSha&&binding.primary_task_id===PRIMARY_TASK_ID&&repoRef(binding.evidence_ref)&&
    binding.mode==='ACTUAL_IMMUTABLE_PROMPT_READBACK'&&binding.mutable_ref_resolution===false&&binding.legacy_fallback_allowed===false&&
    typeof task?.prompt==='string'&&task.prompt.includes(engineSha)&&DIGEST.test(binding.primary_prompt_sha256||'')&&binding.primary_prompt_sha256===hash(task.prompt);
  return {primary_task_id:PRIMARY_TASK_ID,image_task_id:IMAGE_TASK_ID,target:VALUE_TARGET,
    recurrence_result:cadence?'PASS':'FAIL',next_run_time:next,
    next_occurrence_result:next===null?'UNKNOWN':instant(next)&&Date.parse(next)===Date.parse(VALUE_TARGET.intended_run_start_utc)?'PASS':'FAIL',
    immutable_release_binding:bound?'PASS':'NOT_ESTABLISHED',
    image_task_readback:tasks.filter(row=>row.id===IMAGE_TASK_ID).map(row=>({id:row.id,is_enabled:row.is_enabled,next_run_time:row.next_run_time??null,
      prompt_sha256:row.prompt_sha256??(typeof row.prompt==='string'?hash(row.prompt):null),
      immutable_release_commit_in_prompt:row.immutable_release_commit_in_prompt??null,bound_normal_edition_or_proof_target:row.bound_normal_edition_or_proof_target??null})),
    evidence_observed_at:readback.observed_at??readback.lookup_completed_at??null};
}

export function checkValueBuildProvenance(provenance,currentInventory,proof){
  const errors=[],engineSha=currentInventory?.engine_sha;
  if(provenance?.schema_version!=='daily-compiler-value-build-provenance-v1'||provenance.engine_sha!==engineSha||!checkRef(provenance.check_url)||
    provenance.checkout?.head_sha!==engineSha||provenance.checkout.tracked_files_clean!==true||compareValueReleaseBindings(provenance.inventory,currentInventory).result!=='PASS')errors.push('isolated_live_build_engine_binding');
  for(const name of ['compile','sourceVerify','built','live','history','manifest'])if(!proof?.[name]||provenance?.product_receipt_sha256?.[name]!==canonicalSha(proof[name]))errors.push('isolated_live_build_receipt_binding:'+name);
  return {result:errors.length?'FAIL':'PASS',errors};
}

// A live-host attestation also needs the existing complete product validator to
// inspect persisted bundle/state, source, build, live and image-byte evidence.
// This still cannot authenticate network capture: provenance is external.
export function inspectIsolatedValueEvidence({repoRoot='.',engineSha=null,record}={}){
  try{
    if(!SHA.test(engineSha||'')||record?.engine_sha!==engineSha||record.result!=='PASS'||record.scope!=='APPROVED_ISOLATED_NON_PRODUCTION'||
      !repoRef(record.scope_approval_ref)||!repoRef(record.evidence_ref)||!DIGEST.test(record.verification_receipt_sha256||'')||!instant(record.verified_at)||
      record.method!=='ACTUAL_HTTP_READBACK'||record.public_reader_unchanged!==true||record.legacy_repository_unchanged!==true)throw new Error('isolated_live_attestation_missing_or_invalid');
    const url=new URL(record.base_url);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
      (url.hostname==='gttome.github.io'&&/^\/(?:Daily-AI-Brief-Compiler|Daily-AI-Brief)(?:\/|$)/.test(url.pathname)))throw new Error('isolated_live_scope_not_separate');
    if(!safeRel(record.build_dir)||!safeRel(record.state_path)||!safeRel(record.bundle_path))throw new Error('isolated_live_product_records_missing');
    const statePath=d1EvidencePath(repoRoot,record.state_path),bundlePath=d1EvidencePath(repoRoot,record.bundle_path);
    // Resolve a required file to prove the build directory stays in this tree.
    const marker=d1EvidencePath(repoRoot,record.build_dir+'/reader-source/build-manifest.json');
    const buildDir=path.dirname(path.dirname(marker)),bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
    const proof=verifyFinalizationEvidence({date:bundle.edition_date,pageUrl:record.base_url,stateSha256:hash(fs.readFileSync(statePath)),bundleSha256:hash(fs.readFileSync(bundlePath)),buildDir});
    if(canonicalSha(proof.live)!==record.verification_receipt_sha256)throw new Error('isolated_live_receipt_digest_mismatch');
    // A filename or a relabeled engine_sha on an old receipt is insufficient.
    // The externally retained build record binds its exact workflow checkout,
    // current input inventory and every product receipt, including live bytes.
    if(!safeRel(record.build_provenance_path)||!DIGEST.test(record.build_provenance_sha256||''))throw new Error('isolated_live_build_provenance_missing');
    const provenance=JSON.parse(fs.readFileSync(d1EvidencePath(repoRoot,record.build_provenance_path),'utf8'));
    const currentInventory=valueReleaseInventory({repoRoot,engineSha});
    if(canonicalSha(provenance)!==record.build_provenance_sha256)throw new Error('isolated_live_build_provenance_digest');
    const buildBinding=checkValueBuildProvenance(provenance,currentInventory,proof);
    if(buildBinding.result!=='PASS')throw new Error(buildBinding.errors.join(';'));
    const current=validateEdition({statePath,bundlePath,repoRoot});
    if(current.bundleDigest!==proof.compile.bundle_sha256||current.stateSha256!==proof.compile.state_sha256||
      canonicalSha(current.mediaGate)!==canonicalSha(proof.compile.media_contract_gate)||
      canonicalSha(current.d1ImageGate||current.d0ImageGate||current.legacyImageGate)!==canonicalSha(proof.compile.image_contract_gate))throw new Error('isolated_live_current_product_validation');
    assertCompleteReleaseEvidence({evidence:proof,bundle,repoRoot,sourceDir:path.join(buildDir,'reader-source')});
    return {result:'PASS',evidence_ref:record.evidence_ref,verification_receipt_sha256:record.verification_receipt_sha256,
      image_gate:proof.compile.image_contract_gate.result,media_gate:proof.compile.media_contract_gate.result,
      scope:'Current-engine delivery verification; any registered historical fixture compatibility is separate from current premium image activation.'};
  }catch(error){return {result:'FAIL',errors:[error.message]};}
}

export function auditValueRelease({repoRoot='.',engineSha=null,engineBinding=null,evidence={},scheduleReadback={},frozen=null,recordedAt=new Date().toISOString()}={}){
  const inventory=valueReleaseInventory({repoRoot,engineSha}),gates=[];
  const gate=(id,okay,detail)=>gates.push({gate:id,result:okay?'PASS':'PENDING_OR_FAIL',detail});
  gate('IMMUTABLE_ENGINE_IDENTITY',SHA.test(engineSha||'')&&!inventory.missing_required_files.length&&engineBinding?.source==='GIT_CHECKOUT'&&engineBinding.head_sha===engineSha&&engineBinding.tracked_files_clean===true,
    {engine_sha:engineSha,binding:engineBinding??{source:'SOURCE_DIGESTS_ONLY',head_sha:null},missing_required_files:inventory.missing_required_files});
  const protection=evidence.protected_release;
  gate('PROTECTED_RELEASE_BINDING',protection?.engine_sha===engineSha&&SHA.test(engineSha||'')&&protection.branch==='main'&&
    protection.method==='NORMAL_PROTECTED_MERGE'&&repoRef(protection.merge_pr_ref)&&repoRef(protection.evidence_ref)&&instant(protection.observed_at),protection??null);
  let source=null,sourceError=null;
  try{source=readSourceSnapshot(repoRoot);}catch(error){sourceError=error.message;}
  const sourceSummary=source?qualifiedDiscoverySummary(source):null;
  gate('QUALIFIED_SOURCE_SNAPSHOT',!!source,{error:sourceError});
  gate('SUFFICIENT_QUALIFIED_DISCOVERY',sourceSummary?.sufficient_discovery_routes===true,sourceSummary);
  let activation;
  try{activation=validateD1Activation({repoRoot});}catch(error){activation={result:'FAIL',errors:[error.message],receipt:null,proof:null};}
  gate('COMPLETE_CURRENT_IMAGE_PROOF_AND_ACTIVATION',activation.result==='PASS',{result:activation.result,errors:activation.errors,
    proof_id:activation.proof?.proof_id??null,proof_sha256:activation.proof?canonicalSha(activation.proof):null,receipt_sha256:activation.receipt?canonicalSha(activation.receipt):null});
  const approval=evidence.activation_approval;
  gate('EXPLICIT_PROTECTED_ACTIVATION_APPROVAL',activation.result==='PASS'&&approval?.scope==='D1_IMAGE_ACTIVATION'&&approval.decision==='APPROVED'&&
    SHA.test(approval.protected_commit||'')&&repoRef(approval.evidence_ref)&&approval.proof_sha256===canonicalSha(activation.proof)&&approval.receipt_sha256===canonicalSha(activation.receipt),approval??null);
  const schedule=compareValueSchedule(scheduleReadback,engineSha);
  // I07 requires actual configured-task readback, not a non-null future service
  // timestamp. Preserve UNKNOWN next-run telemetry; a reported contradiction
  // still fails. Immutable release binding is a separate mandatory gate below.
  gate('ACTUAL_TARGET_SCHEDULE',schedule.recurrence_result==='PASS'&&['PASS','UNKNOWN'].includes(schedule.next_occurrence_result),schedule);
  gate('SCHEDULE_IMMUTABLE_ENGINE_BINDING',schedule.immutable_release_binding==='PASS',{status:schedule.immutable_release_binding});
  const runtime=evidence.image_runtime;
  const imageTask=schedule.image_task_readback[0];
  const runtimeProof=activation.result==='PASS'?readD1Evidence(repoRoot,activation.proof.evidence):null;
  // Qualify the existing readiness-handoff capability before future content
  // exists. A paused idle task is allowed with full compatible live proof and
  // current availability/boundary readback; this never asks to arm October 9.
  const idle=runtime?.mode==='AVAILABLE_IDLE'&&imageTask?.is_enabled===false&&imageTask.next_run_time===null&&imageTask.bound_normal_edition_or_proof_target===null;
  const qualificationArmed=runtime?.mode==='QUALIFICATION_TARGET_ARMED'&&imageTask?.is_enabled===true&&instant(imageTask.next_run_time)&&
    runtime.target_id===activation.proof?.proof_id&&runtime.target_id===imageTask.bound_normal_edition_or_proof_target&&
    runtime.armed_for===imageTask.next_run_time&&instant(runtime.ready_at)&&DIGEST.test(runtime.handoff_sha256||'');
  gate('EXISTING_IMAGE_RUNTIME_READINESS_HANDOFF',activation.result==='PASS'&&schedule.image_task_readback.length===1&&(idle||qualificationArmed)&&runtime?.task_id===IMAGE_TASK_ID&&
    runtime.engine_sha===engineSha&&runtime.proof_sha256===canonicalSha(activation.proof)&&runtime.result==='PASS'&&runtime.scope==='EXISTING_READINESS_HANDOFF_CAPABILITY'&&
    runtime.capability_available===true&&runtime.work_scope==='IMAGE_BROWSER_ORCHESTRATION_AND_INGEST'&&runtime.owner_transfer_required===false&&runtime.local_computer_required===false&&
    DIGEST.test(imageTask.prompt_sha256||'')&&runtime.prompt_sha256===imageTask.prompt_sha256&&runtime.task_readback_sha256===canonicalSha(imageTask)&&
    runtime.complete_runtime_sha256===runtimeProof?.runtime.sha256&&runtime.resume_proof_sha256===runtimeProof?.resume.sha256&&
    instant(runtime.observed_at)&&repoRef(runtime.evidence_ref),runtime??null);
  const ci=evidence.exact_head_ci;
  gate('COMPLETED_EXACT_HEAD_CI',SHA.test(engineSha||'')&&ci?.head_sha===engineSha&&ci.status==='completed'&&ci.conclusion==='success'&&
    ci.workflow==='compiler-validation'&&ci.check_name==='validate'&&ci.app_id===15368&&instant(ci.completed_at)&&checkRef(ci.check_url),ci??null);
  const live=evidence.isolated_live;
  const liveResult=inspectIsolatedValueEvidence({repoRoot,engineSha,record:live});
  gate('APPROVED_ISOLATED_LIVE_ROUTES_AND_BYTES',liveResult.result==='PASS',liveResult);
  const validFreeze=frozen?.status==='FROZEN'&&frozen.CORE_RELEASE_READY==='PASS'&&instant(frozen.frozen_at)&&Date.parse(frozen.frozen_at)<=Date.parse(recordedAt)&&repoRef(frozen.evidence_ref);
  const freeze=frozen?compareValueReleaseBindings(frozen.inventory,inventory):null;
  if(freeze)gate('FROZEN_RELEASE_IDENTITY',validFreeze&&freeze.result==='PASS',{event_record_valid:validFreeze,comparison:freeze});
  const blockers=gates.filter(row=>row.result!=='PASS').map(row=>row.gate);
  return {schema_version:'daily-compiler-value-release-audit-v1',audit_result:'RECORDED',recorded_at:recordedAt,repository:'gttome/Daily-AI-Brief-Compiler',
    purpose:'DEVELOPMENT_EVIDENCE_ONLY',recorded_at_source:'runner_clock_not_scheduler_or_freeze_evidence',target:VALUE_TARGET,inventory,
    engine_binding:engineBinding??{source:'SOURCE_DIGESTS_ONLY',head_sha:null},combined_test_scope:VALUE_TEST_COMMANDS,exact_head_ci:ci??null,
    external_evidence_limitation:'External approval, scheduler, runtime and live-host records are separately supplied attestations. This offline audit cannot perform or independently authenticate those actions; their referenced records require actual tool readback.',
    gates,CORE_RELEASE_READY:blockers.length?'FAIL':'PASS',SOURCE_ROLLOUT:sourceSummary?.SOURCE_ROLLOUT??'PARTIAL',
    OBSERVATION_RELEASE:['OFF','LIVE','DEGRADED'].includes(evidence.OBSERVATION_RELEASE)?evidence.OBSERVATION_RELEASE:'OFF',
    LEARNING_REPORT:['COMPLETE','PARTIAL','UNAVAILABLE'].includes(evidence.LEARNING_REPORT)?evidence.LEARNING_REPORT:'UNAVAILABLE',
    freeze:{target_at:VALUE_TARGET.freeze_target,status:freeze?(!validFreeze?'INVALID_FREEZE_RECORD':freeze.result==='PASS'?'UNCHANGED_FROZEN_IDENTITY':'INVALIDATED_REQUALIFICATION_REQUIRED'):'NOT_RECORDED',comparison:freeze,
      critical_change_rule:'A post-freeze core change requires explicit protected critical-change authorization and requalification at the new exact head; an old receipt cannot certify it.'},
    unresolved_core_blockers:blockers,release_authority:false,activation_performed:false,edition_launched:false,schedules_changed:false};
}
