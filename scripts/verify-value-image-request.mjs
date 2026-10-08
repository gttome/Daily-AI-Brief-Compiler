#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {admitD1Specifications,assertD1SubmittedPrompt} from '../image-studio/spec-admission.mjs';
import {initialD1ProofState,nextD1ProofAction,validateD1ProofState} from '../image-studio/proof-state.mjs';

// Checks this protected reference portfolio. It performs no source retrieval,
// image generation, task control, pixel review, proof construction or activation.
const prefix='qualifications/value-image-2026-10-08';
const proofId='value-image-2026-10-08';
const sourceCommit='73b41c7312c9b1ad98fc33f455dc62cdc686476b';
const protectedSourceDigest='dd29c09d412c16a0f5f5ed02b7bf38cd4a516604b517728733f37540d970cf9e';
const plannedBranch='qualification/value-image-2026-10-08';
const expectedIds=[
  'learning-without-assistant','contrastive-incentive-beliefs',
  'rendered-record-divergence','turn-aligned-behaviour',
  'weather-mesh-rollout','video-conditioned-audio'
];
const output='build/value-image-qualification/receipt.json';
const read=filename=>JSON.parse(fs.readFileSync(filename,'utf8'));
const packet=filename=>read(prefix+'/'+filename);
const digest=filename=>sha256(fs.readFileSync(filename));
const eventSha=process.env.GITHUB_SHA??null;
let engineSha=null;
if(fs.existsSync(path.join(process.cwd(),'.git'))){
  try{
    const head=execFileSync('git',['rev-parse','--verify','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    if(/^[a-f0-9]{40}$/.test(head))engineSha=head;
  }catch{}
}
const immutableQuality=value=>{
  const copy=structuredClone(value);
  // These are exactly the preactivation snapshot exceptions already allowed by
  // image-studio/proof-evidence.mjs; every quality requirement remains bound.
  for(const field of ['activation_status','activation_receipt_path','activation_receipt_sha256'])delete copy[field];
  return copy;
};
let result;
try{
  if(process.env.GITHUB_ACTIONS==='true')assert(engineSha,'actual checked-out engine SHA is required in CI');
  const sources=packet('source-records.json'),eligibility=packet('eligibility.json');
  const request=packet('request.json'),sourceEvidence=packet('source-evidence.json');
  const retainedAdmission=packet('admission.json'),quality=packet('quality-contract.json');
  const activeQuality=read('contracts/d1-image-contract.json');
  const admissionContract=read('contracts/d1-image-admission-contract.json');
  const promptBindings=packet('prompt-bindings.json'),mapping=packet('ingest-mapping.json');
  const state=packet('execution-state.json'),attemptLog=packet('attempt-log.json');
  const pending=packet('pending-request-binding.json'),evidencePlan=packet('evidence-plan.json');

  assert.equal(sources.repository,'gttome/Daily-AI-Brief-Compiler','source repository');
  assert.equal(canonicalSha(sources),protectedSourceDigest,'protected source record changed');
  assert.equal(eligibility.source_records_sha256,protectedSourceDigest,'eligibility source binding');
  assert.equal(request.source_commit,sourceCommit,'request protected source commit');
  assert.equal(sourceEvidence.source_commit,sourceCommit,'evidence protected source commit');
  assert.equal(request.execution_id,proofId,'request proof identity');
  assert.equal(sourceEvidence.execution_id,proofId,'source evidence proof identity');
  assert.equal(request.edition_date,'2026-10-08','qualification date');
  assert.deepEqual(request.stories.map(x=>x.story_id),expectedIds,'six reference case identities');
  assert.deepEqual(sourceEvidence.stories.map(x=>x.story_id),expectedIds,'six source identities');
  assert.equal(canonicalSha(immutableQuality(activeQuality)),canonicalSha(immutableQuality(quality)),'quality snapshot compatibility');
  const admission=admitD1Specifications(request,sourceEvidence);
  assert.equal(admission.result,'PASS','actual all-six admission: '+admission.errors.join(';'));
  // Admission is rerun against the active contract. Its historical snapshot
  // digest may differ only by the compatible activation metadata above.
  assert.deepEqual(retainedAdmission,{...admission,quality_contract_sha256:canonicalSha(quality)},'retained all-six admission');
  assert.equal(retainedAdmission.admission_contract_sha256,canonicalSha(admissionContract),'admission contract binding');
  assert.equal(promptBindings.request_sha256,canonicalSha(request),'prompt request binding');
  assert.equal(promptBindings.source_evidence_sha256,canonicalSha(sourceEvidence),'prompt source binding');
  assert.equal(promptBindings.admission_sha256,canonicalSha(retainedAdmission),'prompt admission binding');
  assert.equal(promptBindings.submitted_to_generator,false,'no submitted prompt assertion');
  assert.equal(promptBindings.visible_pixels_reviewed,false,'no pixel review assertion');
  assert.deepEqual(promptBindings.prompts.map(x=>x.story_id),expectedIds,'six prompt records');

  const promptRows=[];
  let components=0,facts=0;
  for(const [index,story]of request.stories.entries()){
    const source=sources.stories.find(x=>x.story.story_id===story.story_id);
    assert(source,'missing retained source case');
    assert.equal(canonicalSha(source.story),source.story_content_sha256,'retained story digest');
    assert.equal(story.story_content_sha256,source.story_content_sha256,'request story binding');
    const evidence=sourceEvidence.stories[index];
    assert.equal(evidence.story_content_sha256,source.story_content_sha256,'evidence story binding');
    assert.equal(evidence.source_url,source.story.source_url,'source URL binding');
    assert.deepEqual(evidence.verified_visual_facts,source.story.verified_visual_facts,'retained source facts');
    assert.deepEqual(story.generation.verified_visual_facts,evidence.verified_visual_facts,'generator fact projection');
    assert.equal(source.fact_support.length,evidence.verified_visual_facts.length,'retained fact references');
    assert(source.fact_support.every((x,i)=>x.fact_index===i&&typeof x.source_ref==='string'&&x.source_ref.length>0),'ordered fact references');
    const g=story.generation;
    assert.equal(g.meaningful_components_plan.length,12,'twelve individually supported components');
    const connected=new Set(g.mechanism_plan.internal_substages.flatMap(x=>[x.input_component_id,x.output_component_id])
      .concat(g.mechanism_plan.secondary_relationships.flatMap(x=>[x.from_component_id,x.to_component_id])));
    assert(g.meaningful_components_plan.every(c=>connected.has(c.component_id)),'all planned components connected');
    const binding=promptBindings.prompts[index];
    const expectedPath=prefix+'/prompts/'+String(index+1).padStart(2,'0')+'-'+story.story_id+'.txt';
    assert.equal(binding.path,expectedPath,'exact prompt path');
    const submitted=fs.readFileSync(expectedPath,'utf8');
    const compiled=assertD1SubmittedPrompt(request,sourceEvidence,story.story_id,submitted);
    assert.equal(binding.prompt_sha256,compiled.prompt_sha256,'exact prompt bytes');
    assert.equal(binding.projection_sha256,compiled.projection_sha256,'prompt projection');
    assert.equal(binding.specification_sha256,story.specification_sha256,'prompt specification');
    assert.equal(binding.story_content_sha256,story.story_content_sha256,'prompt source story');
    assert.equal(binding.components,g.meaningful_components_plan.length,'component count');
    assert.equal(binding.internal_substages,g.mechanism_plan.internal_substages.length,'substage count');
    assert.equal(binding.secondary_relationships,g.mechanism_plan.secondary_relationships.length,'relationship count');
    components+=g.meaningful_components_plan.length;
    facts+=evidence.verified_visual_facts.length;
    promptRows.push({story_id:story.story_id,path:expectedPath,prompt_sha256:compiled.prompt_sha256});
  }
  assert.equal(components,72,'complete component portfolio');
  assert.equal(facts,36,'complete retained fact portfolio');
  assert.deepEqual(attemptLog,{schema_version:'daily-compiler-d1-attempt-log-v1',proof_id:proofId,native_generations:0,stories:[]},'initial empty attempt lineage');
  assert.equal(validateD1ProofState(state).length,0,'valid initial state');
  assert(Number.isFinite(Date.parse(state.updated_at)),'actual state preparation time');
  assert.deepEqual(state,initialD1ProofState({proofId,branch:plannedBranch,requestPath:prefix+'/request.json',ingestMappingPath:prefix+'/ingest-mapping.json',updatedAt:state.updated_at}),'initial planned state without runtime binding');
  const next=nextD1ProofAction(state,{request,sourceEvidence,attemptLog});
  assert.equal(next.action,'BLOCK_REQUEST_BINDING','unbound initial state fails closed');
  assert.equal(next.quality_attempts_consumed,0,'binding check consumes no attempt');
  assert.equal(next.story_chats_opened,0,'binding check opens no story chat');
  assert.equal(pending.status,'AWAITING_PROTECTED_REQUEST_COMMIT','pending storage commit status');
  assert.equal(pending.request_commit,null,'no invented request storage commit');
  assert.equal(pending.source_commit,sourceCommit,'pending source commit');
  assert.deepEqual(pending.source_records,{path:prefix+'/source-records.json',commit:sourceCommit,sha256:protectedSourceDigest},'pending protected source record');
  assert.equal(pending.request_path,prefix+'/request.json','pending request path');
  assert.equal(pending.request_sha256,canonicalSha(request),'pending request hash');
  assert.equal(pending.source_evidence_path,prefix+'/source-evidence.json','pending evidence path');
  assert.equal(pending.source_evidence_sha256,canonicalSha(sourceEvidence),'pending evidence hash');
  assert.equal(pending.admission_sha256,canonicalSha(retainedAdmission),'pending admission hash');
  assert.equal(pending.quality_contract_sha256,canonicalSha(quality),'pending quality hash');
  assert.equal(pending.admission_contract_sha256,canonicalSha(admissionContract),'pending admission contract');
  assert.equal(pending.attempt_log_sha256,canonicalSha(attemptLog),'pending attempt lineage');
  assert.equal(pending.planned_branch,plannedBranch,'planned branch');
  assert.equal(pending.existing_task_binding,null,'no invented task binding');
  assert.equal(pending.generation_authorized,false,'preparation grants no generation');
  assert.equal(pending.live_proof,'NOT_RUN','no invented live proof');
  assert.equal(pending.activation,'NOT_APPLIED','no invented activation');
  assert.equal(mapping.schema_version,'daily-compiler-d1-proof-ingest-mapping-v2','mapping schema');
  assert.equal(mapping.repository,'gttome/Daily-AI-Brief-Compiler','mapping repository');
  assert.equal(mapping.branch,plannedBranch,'mapping branch');
  assert.equal(mapping.execution_id,proofId,'mapping proof');
  assert.equal(mapping.edition_date,request.edition_date,'mapping date');
  assert.deepEqual(mapping.items,expectedIds.map((id,i)=>{
    const filename=String(i+1).padStart(2,'0')+'-'+id+'.png';
    return {story_id:id,filename,target_path:prefix+'/images/'+filename};
  }),'six exact intended image destinations');
  // Accepted files may be added later at these exact destinations. Their
  // presence does not change the preserved zero-attempt preparation snapshot.
  const targetImagesPresent=mapping.items.filter(x=>fs.existsSync(x.target_path)).length;
  assert.equal(evidencePlan.proof_id,proofId,'evidence plan proof');
  assert.equal(evidencePlan.live_proof,'NOT_RUN','path plan is not live proof');
  assert.equal(evidencePlan.generation_authorized,false,'path plan grants no generation');
  const roles=['state','manifest','handoff','porter','request','source_evidence','attempt_log','admission','quality_contract','runtime','canonical_reviews','binary_readback','resume','set_review'];
  assert.deepEqual(evidencePlan.records.map(x=>x.role),roles,'fourteen evidence roles');
  const prepared={request:canonicalSha(request),source_evidence:canonicalSha(sourceEvidence),admission:canonicalSha(retainedAdmission),quality_contract:canonicalSha(quality)};
  for(const row of evidencePlan.records){
    assert.equal(row.commit,null,'no invented evidence commit');
    assert.equal(row.status,Object.hasOwn(prepared,row.role)?'PREPARED':'NOT_PRODUCED','evidence production state');
    assert.equal(row.sha256,prepared[row.role]??null,'evidence digest or unknown');
  }
  result={schema_version:'daily-compiler-value-image-static-qualification-v1',result:'PASS',
    scope:'ACTUAL_REFERENCE_PACKET_SPECIFICATION_AND_INITIAL_BINDINGS',historical_v1_interpretation:true,current_recipe_qualification:false,checked_at:new Date().toISOString(),
    repository:'gttome/Daily-AI-Brief-Compiler',event_sha:eventSha,engine_sha:engineSha,proof_id:proofId,
    source_commit:sourceCommit,source_records_sha256:protectedSourceDigest,request_sha256:canonicalSha(request),
    source_evidence_sha256:canonicalSha(sourceEvidence),retained_admission_sha256:canonicalSha(retainedAdmission),
    quality_snapshot_sha256:canonicalSha(quality),active_quality_sha256:canonicalSha(activeQuality),
    admission_contract_sha256:canonicalSha(admissionContract),quality_snapshot_compatible:true,
    specification_admission:'PASS',planned_diversity:admission.planned_diversity,source_stories:6,retained_facts:facts,
    connected_supported_components:components,prompts:promptRows,initial_state:'PLANNED',initial_action:next.action,
    native_generations:0,accepted_images:0,target_images_present:targetImagesPresent,live_proof:'NOT_RUN',activation:'NOT_APPLIED_BY_THIS_CHECK',
    source_retrieval_or_fact_verification_performed:false,pixel_review_performed:false,
    script_sha256:digest('scripts/verify-value-image-request.mjs'),
    validator_sha256:digest('image-studio/spec-admission.mjs'),proof_state_sha256:digest('image-studio/proof-state.mjs')};
}catch(error){
  result={schema_version:'daily-compiler-value-image-static-qualification-v1',result:'FAIL',
    scope:'ACTUAL_REFERENCE_PACKET_SPECIFICATION_AND_INITIAL_BINDINGS',historical_v1_interpretation:true,current_recipe_qualification:false,checked_at:new Date().toISOString(),
    repository:'gttome/Daily-AI-Brief-Compiler',event_sha:eventSha,engine_sha:engineSha,proof_id:proofId,
    error:error.message,live_proof:'NOT_EVALUATED',activation:'NOT_APPLIED_BY_THIS_CHECK'};
  process.exitCode=1;
}
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({result:result.result,scope:result.scope,receipt_path:output,stories:result.source_stories??null,
  components:result.connected_supported_components??null,initial_action:result.initial_action??null,error:result.error??null}));
