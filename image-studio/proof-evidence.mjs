import {validateRecipeCompanion,hasRecipeProfile} from './specification-projection.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {validateSetReview} from '../image-capsules/set-review.mjs';
import {validateVisualReview} from '../image-capsules/review-contract.mjs';
import {assertD1Specifications,compileD1StoryPrompt} from './spec-admission.mjs';
import {validateD1ProofState,nextD1ProofAction} from './proof-state.mjs';
import {assertD1AcceptanceManifest,buildD1IngestPlan,D1_WORK_SCOPE} from './acceptance.mjs';
import {sha256,gitBlobSha,pngDimensions} from '../work-porter/integrity.mjs';
import {IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';
import {assertD1IndependentRecovery,D1_CONTINUOUS_QUALITY_MODE} from './independent-recovery.mjs';

export const D1_QUALIFICATION_EVIDENCE_SCHEMA='daily-compiler-d1-qualification-evidence-v1';
export const D1_QUALIFICATION_EVIDENCE_SCHEMA_V2='daily-compiler-d1-qualification-evidence-v2';
const records=['state','manifest','handoff','porter','request','source_evidence','attempt_log','admission','quality_contract','runtime','canonical_reviews','binary_readback','resume','set_review'];
const need=(condition,code)=>{if(!condition) throw new Error(code);};
const same=(a,b)=>canonicalSha(a)===canonicalSha(b);
const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const instant=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const opaque=value=>typeof value==='string'&&/^ctx-[a-f0-9]{64}$/.test(value);
const immutableQuality=contract=>Object.fromEntries(Object.entries(contract).filter(([key])=>!['activation_status','activation_receipt_path','activation_receipt_sha256'].includes(key)));

// Every input is durable and repository-relative. Resolve symlinks before reading;
// a digest is evidence integrity, not permission to read outside the checkout.
export function d1EvidencePath(repoRoot,relative){
  need(typeof relative==='string'&&relative.length>0&&!path.isAbsolute(relative)&&!relative.includes('\\')&&!/[\s:#?]/.test(relative)&&!relative.split('/').some(x=>!x||x==='.'||x==='..'),'d1_evidence_unsafe_path');
  const root=fs.realpathSync(repoRoot),full=fs.realpathSync(path.resolve(root,relative));
  const rel=path.relative(root,full);
  need(rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel),'d1_evidence_path_escape');
  need(fs.statSync(full).isFile(),'d1_evidence_not_file');
  return full;
}
export function readD1Evidence(repoRoot,reference){
  need(reference&&hex(reference.sha256,64)&&Object.keys(reference).every(key=>['path','sha256','commit'].includes(key)),'d1_evidence_reference');
  if(reference.commit!==undefined) need(hex(reference.commit,40),'d1_evidence_reference_commit');
  const full=d1EvidencePath(repoRoot,reference.path);
  need(fs.statSync(full).size<=2_000_000,'d1_evidence_record_too_large');
  const record=JSON.parse(fs.readFileSync(full,'utf8'));
  need(reference.sha256===canonicalSha(record),'d1_evidence_digest_mismatch:'+reference.path);
  // Public evidence uses opaque context digests; private conversation URLs never belong here.
  need(!/https?:\/\/(?:(?:www\.)?chatgpt\.com|chat\.openai\.com)\/(?:c|g)\//i.test(JSON.stringify(record)),'d1_evidence_private_chat_url');
  return record;
}

export function validateD1QualificationEvidence({repoRoot='.',evidence,proofId}={}){
  try{
    const e=readD1Evidence(repoRoot,evidence);
    const continuous=e.schema_version===D1_QUALIFICATION_EVIDENCE_SCHEMA_V2;
    need((continuous||e.schema_version===D1_QUALIFICATION_EVIDENCE_SCHEMA)&&e.proof_id===proofId,'d1_qualification_identity');
    need((continuous?e.qualification_mode===D1_CONTINUOUS_QUALITY_MODE:!Object.hasOwn(e,'qualification_mode'))&&Object.keys(e).every(key=>['schema_version','proof_id',...(continuous?['qualification_mode']:[]),...records].includes(key)),'d1_qualification_fields');
    const data=Object.fromEntries(records.map(key=>[key,readD1Evidence(repoRoot,e[key])]));
    const {state,manifest,handoff,porter,request,runtime,canonical_reviews:reviews,binary_readback:readback,resume,set_review:set,quality_contract:quality,admission}=data;
    need(validateD1ProofState(state).length===0&&['GITHUB_VERIFIED','COMPLETE'].includes(state.status)&&state.proof_id===proofId,'d1_qualification_state');
    assertD1AcceptanceManifest(manifest);
    const plan=buildD1IngestPlan(manifest,handoff);
    for(const [field,key] of [['request_path','request'],['acceptance_manifest_path','manifest'],['ingest_handoff_path','handoff'],['work_porter_receipt_path','porter']]) need(state[field]===e[key].path,'d1_qualification_state_path:'+field);
    need(handoff.repository==='gttome/Daily-AI-Brief-Compiler'&&handoff.branch===state.branch&&handoff.execution_id===proofId&&request.execution_id===proofId&&handoff.edition_date===manifest.edition_date&&request.edition_date===manifest.edition_date,'d1_qualification_target');
    const currentQuality=JSON.parse(fs.readFileSync(d1EvidencePath(repoRoot,'contracts/d1-image-contract.json'),'utf8'));
    const currentAdmission=JSON.parse(fs.readFileSync(d1EvidencePath(repoRoot,'contracts/d1-image-admission-contract.json'),'utf8'));
    need(e.quality_contract.path!=='contracts/d1-image-contract.json'&&same(immutableQuality(currentQuality),immutableQuality(quality)),'d1_qualification_quality_contract');
    const admitted=assertD1Specifications(request,data.source_evidence);
    need(admission.schema_version===admitted.schema_version&&admission.result==='PASS'&&admission.gate==='IMAGE_SPEC_ADMISSION'&&admission.all_six_validated===true,'d1_qualification_admission');
    for(const key of ['request_sha256','source_evidence_sha256','set_plan_sha256']) need(admission[key]===admitted[key],'d1_qualification_admission_binding:'+key);
    need(admission.quality_contract_sha256===canonicalSha(quality)&&admission.admission_contract_sha256===canonicalSha(currentAdmission),'d1_qualification_admission_contract');
    need(state.specification_binding?.request_commit===e.request.commit&&hex(e.request.commit,40)&&state.specification_binding?.source_evidence_path===e.source_evidence.path,'d1_qualification_source_binding');
    const operation=nextD1ProofAction({...state,status:'BROWSER_RUNNING'},{request,sourceEvidence:data.source_evidence,attemptLog:data.attempt_log,requestSource:{branch:state.branch,request_path:e.request.path,source_evidence_path:e.source_evidence.path,commit:e.request.commit}});
    need(operation.action==='REUSE_ACCEPTED_LOCKED','d1_qualification_attempt_lineage');
    need(sameSet(state.accepted_story_chats,manifest.images.map(x=>x.chat_session_id)),'d1_qualification_context_locks');
    need(porter.schema_version==='daily-compiler-d1-work-porter-receipt-v2'&&porter.result==='PASS'&&porter.scope===D1_WORK_SCOPE&&porter.browser_orchestration_performed===true&&porter.visual_quality_review_performed===false&&porter.work_native_image_generation_performed===false&&porter.owner_intervention===false,'d1_qualification_porter');
    need(porter.manifest_sha256===canonicalSha(manifest)&&porter.ingest_handoff_sha256===canonicalSha(handoff),'d1_qualification_porter_binding');
    need(runtime.proof_id===proofId&&runtime.result==='PASS'&&instant(runtime.observed_at)&&runtime.existing_task_id===IMAGE_TASK_ID&&runtime.unattended_execution===true,'d1_qualification_runtime');
    need(readback.proof_id===proofId&&readback.result==='PASS'&&instant(readback.verified_at)&&readback.method==='exact_commit_raw_github_download'&&hex(readback.commit,40),'d1_qualification_readback');
    need(reviews.proof_id===proofId,'d1_qualification_review_identity');
    validateRecipeCompanion(request,data.source_evidence,{...reviews,sessions:runtime.sessions});
    if(hasRecipeProfile(request)) need(same(admission.recipe_profile,admitted.recipe_profile),'d1_qualification_recipe_admission');
    const collections=[porter.images,runtime.sessions,reviews.images,reviews.observations,readback.images,data.attempt_log.stories];
    for(const rows of collections) need(Array.isArray(rows)&&rows.length===6&&sameSet(rows.map(x=>x?.story_id),request.stories.map(x=>x.story_id)),'d1_qualification_six_mapped_rows');
    need(validateSetReview(set).length===0&&set.result==='PASS'&&set.edition_date===manifest.edition_date,'d1_qualification_set_review');
    const locked=[];let previousLockedAt=null;
    for(const story of request.stories){
      const image=manifest.images.find(x=>x.story_id===story.story_id),mapped=plan.items.find(x=>x.story_id===story.story_id);
      const ported=porter.images.find(x=>x.story_id===story.story_id),session=runtime.sessions.find(x=>x.story_id===story.story_id),review=reviews.images.find(x=>x.story_id===story.story_id),rb=readback.images.find(x=>x.story_id===story.story_id),history=data.attempt_log.stories.find(x=>x.story_id===story.story_id);
      need(image&&mapped&&opaque(image.chat_session_id)&&image.composition_signature===story.generation.composition_assignment.composition_signature&&sameSet(image.visible_text_allowlist,story.generation.visible_text_allowlist),'d1_qualification_story_assignment');
      need(history.accepted_locked===true&&history.accepted_attempt===image.attempt&&history.sha256===image.sha256&&history.accepted_assets.length===1&&[image.cloud_asset_id,mapped.target_path].includes(history.accepted_assets[0]),'d1_qualification_story_lock');
      locked.push(history.accepted_assets[0]);
      const compiled=compileD1StoryPrompt(request,data.source_evidence,story.story_id);
      need(session.context_id===image.chat_session_id&&opaque(session.invocation_id)&&instant(session.started_at)&&session.fresh_regular_conversation===true&&session.temporary_chat===false&&session.work_mode===false&&session.only_own_story_prompt===true&&session.prior_context_reused===false&&session.prompt_sha256===compiled.prompt_sha256,'d1_qualification_story_context');
      need(review.reviewer_identity===image.chat_session_id&&review.prompt_sha256===compiled.prompt_sha256,'d1_qualification_review_context');
      const visualErrors=validateVisualReview(review,{packet:{envelope:{story_id:story.story_id,packet_sha256:story.specification_sha256},generation:story.generation},finalReceipt:{story_id:story.story_id,attempt:image.attempt,final:{path:mapped.target_path,sha256:image.sha256,git_blob_sha:ported.git_blob_sha}}});
      need(visualErrors.length===0&&review.result==='PASS'&&instant(review.reviewed_at)&&review.meaningful_components.length>=quality.quality.minimum_meaningful_components&&new Set(review.meaningful_components.map(x=>x.normalize('NFKC').toLowerCase().trim())).size===review.meaningful_components.length,'d1_qualification_canonical_review');
      need(instant(session.generated_at)&&instant(session.locked_at)&&history.accepted_at===session.locked_at&&Date.parse(session.started_at)<=Date.parse(session.generated_at)&&Date.parse(session.generated_at)<=Date.parse(review.reviewed_at)&&Date.parse(review.reviewed_at)<=Date.parse(session.locked_at)&&(previousLockedAt===null||Date.parse(session.started_at)>=Date.parse(previousLockedAt)),'d1_qualification_story_chronology');
      previousLockedAt=session.locked_at;
      const genuine=history.attempts.filter(x=>x.native_generation_completed===true||['PASS','FAIL'].includes(x.result??x.review));
      need(Array.isArray(session.attempts)&&session.attempts.length===genuine.length&&session.attempts.length===image.attempt,'d1_qualification_runtime_attempt_count');
      let previousReviewed=session.started_at;
      for(let index=0;index<session.attempts.length;index++){
        const attempt=session.attempts[index];
        need(attempt.attempt===index+1&&attempt.context_id===image.chat_session_id&&attempt.native_generation_completed===true&&attempt.result===(genuine[index].result??genuine[index].review)&&hex(attempt.raw_sha256,64)&&instant(attempt.generated_at)&&instant(attempt.reviewed_at)&&Date.parse(previousReviewed)<=Date.parse(attempt.generated_at)&&Date.parse(attempt.generated_at)<=Date.parse(attempt.reviewed_at),'d1_qualification_runtime_attempt_context');
        previousReviewed=attempt.reviewed_at;
      }
      const profile=reviews.observations.find(x=>x.story_id===story.story_id);
      need(profile.canonical_sha256===image.sha256&&profile.review_sha256===canonicalSha(review)&&profile.context_id===image.chat_session_id,'d1_qualification_profile_binding');
      for(const [key,minimum] of [['internal_substages',quality.quality.minimum_internal_substages_in_dominant_mechanism],['secondary_relationships',quality.quality.minimum_secondary_relationships]]) need(Number.isInteger(profile[key])&&profile[key]>=minimum,'d1_qualification_profile:'+key);
      need(Number.isInteger(profile.major_visual_regions)&&profile.major_visual_regions>=3&&profile.major_visual_regions<=5&&Number.isFinite(profile.canvas_utilization_percent)&&profile.canvas_utilization_percent>=80&&profile.canvas_utilization_percent<=90,'d1_qualification_profile_layout');
      for(const key of ['dimensional_mechanism_plate','white_or_near_white_background','no_generic_forms','no_decorative_geometry','no_pseudotext','story_specific_mechanism_clear','premium_production_grade_textbook_editorial_finish']) need(profile[key]===true,'d1_qualification_profile:'+key);
      for(const key of ['palette_family','mechanism_metaphor','evidence_representation','feedback_pattern']) need(profile[key]===story.generation.composition_assignment[key],'d1_qualification_profile_assignment:'+key);
      const observed=set.candidates.find(x=>x.story_id===story.story_id);
      need(observed?.final_sha256===image.sha256,'d1_qualification_set_asset');
      for(const key of ['composition_signature','layout_signature','diagram_grammar','hierarchy_signature','annotation_pattern_signature']) need(observed[key]===story.generation.composition_assignment[key],'d1_qualification_observed_assignment:'+key);
      need(ported.target_path===mapped.target_path&&ported.source_sha256===image.sha256&&ported.readback_sha256===image.sha256&&hex(ported.git_blob_sha,40)&&ported.dimensions==='1200x630'&&ported.integrity_result==='PASS','d1_qualification_porter_row');
      const raw=rb.raw,canonical=rb.canonical;
      for(const identity of [raw,canonical]) need(identity&&hex(identity.sha256,64)&&hex(identity.git_blob_sha,40)&&Number.isInteger(identity.bytes)&&identity.bytes>0&&Number.isInteger(identity.width)&&identity.width>0&&Number.isInteger(identity.height)&&identity.height>0&&identity.format==='png','d1_qualification_asset_identity');
      const acceptedAttempt=session.attempts.at(-1);
      need(acceptedAttempt.raw_sha256===raw.sha256&&acceptedAttempt.generated_at===session.generated_at&&Date.parse(acceptedAttempt.reviewed_at)<=Date.parse(review.reviewed_at),'d1_qualification_runtime_raw_binding');
      need(canonical.path===mapped.target_path&&canonical.sha256===image.sha256&&canonical.git_blob_sha===ported.git_blob_sha&&canonical.bytes===image.bytes&&canonical.width===1200&&canonical.height===630,'d1_qualification_canonical_binding');
      need(rb.url===`https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/${readback.commit}/${mapped.target_path}`&&rb.readback_sha256===canonical.sha256&&rb.readback_git_blob_sha===canonical.git_blob_sha&&rb.readback_bytes===canonical.bytes,'d1_qualification_binary_readback_binding');
      need(rb.normalization?.semantic_editing===false,'d1_qualification_normalization');
      if(raw.width===1200&&raw.height===630) need(rb.normalization.method==='none'&&raw.sha256===canonical.sha256&&raw.git_blob_sha===canonical.git_blob_sha&&raw.bytes===canonical.bytes,'d1_qualification_raw_identity');
      else need(rb.normalization.method==='deterministic_resize_only'&&quality.normalization.permitted===true&&quality.normalization.method==='deterministic_resize_only'&&raw.sha256!==canonical.sha256&&raw.git_blob_sha!==canonical.git_blob_sha,'d1_qualification_resize_rule');
      const bytes=fs.readFileSync(d1EvidencePath(repoRoot,mapped.target_path)),dimensions=pngDimensions(bytes);
      need(bytes.length===canonical.bytes&&sha256(bytes)===canonical.sha256&&gitBlobSha(bytes)===canonical.git_blob_sha&&dimensions.width===1200&&dimensions.height===630,'d1_qualification_repository_bytes');
    }
    need(sameSet(state.accepted_assets,locked),'d1_qualification_asset_locks');
    need(instant(manifest.accepted_at)&&Date.parse(manifest.accepted_at)>=Date.parse(previousLockedAt)&&Date.parse(readback.verified_at)>=Date.parse(previousLockedAt)&&Date.parse(runtime.observed_at)>=Date.parse(previousLockedAt)&&instant(set.reviewed_at)&&Date.parse(set.reviewed_at)>=Date.parse(previousLockedAt),'d1_qualification_completion_chronology');
    // Prospective v2 validates a separate read-only recovery exercise after all
    // six quality locks. No forced interruption is part of the image sequence.
    if(continuous){
      assertD1IndependentRecovery({repoRoot,proofId,recovery:resume,evidence:e,manifest,runtime,state,attemptLog:data.attempt_log,request,sourceEvidence:data.source_evidence,read:readD1Evidence});
    }else{
    // Revalidate retained checkpoints: two accepted locks, then a different
    // continuation with its first pending Story 3 generation and no lock changes.
    need(resume.proof_id===proofId&&resume.result==='PASS'&&instant(resume.interrupted_at)&&instant(resume.resumed_at)&&Date.parse(resume.interrupted_at)<Date.parse(resume.resumed_at)&&resume.next_story_id===request.stories[2].story_id&&resume.regenerated_accepted_images===0,'d1_qualification_resume');
    need(opaque(resume.interrupted_invocation_id)&&opaque(resume.resumed_invocation_id)&&resume.interrupted_invocation_id!==resume.resumed_invocation_id,'d1_qualification_resume_invocation');
    const before=readD1Evidence(repoRoot,resume.before?.state),beforeLog=readD1Evidence(repoRoot,resume.before?.attempt_log),after=readD1Evidence(repoRoot,resume.after?.state),afterLog=readD1Evidence(repoRoot,resume.after?.attempt_log);
    need(hex(resume.before.state.commit,40)&&hex(resume.after.state.commit,40)&&resume.before.state.commit!==resume.after.state.commit&&resume.before.attempt_log.commit===resume.before.state.commit&&resume.after.attempt_log.commit===resume.after.state.commit,'d1_qualification_resume_commits');
    const prefix=request.stories.slice(0,2).map(x=>x.story_id),third=request.stories[2].story_id;
    const expectedRows=prefix.map(id=>data.attempt_log.stories.find(x=>x.story_id===id));
    for(const [checkpoint,log] of [[before,beforeLog],[after,afterLog]]){
      need(checkpoint.status==='BROWSER_RUNNING'&&checkpoint.proof_id===proofId&&checkpoint.branch===state.branch&&checkpoint.request_path===state.request_path&&sameSet(checkpoint.accepted_assets,expectedRows.map(x=>x.accepted_assets[0]))&&sameSet(checkpoint.accepted_story_chats,prefix.map(id=>manifest.images.find(x=>x.story_id===id).chat_session_id)),'d1_qualification_resume_checkpoint');
      const next=nextD1ProofAction(checkpoint,{request,sourceEvidence:data.source_evidence,attemptLog:log,historicalVerification:!hasRecipeProfile(request),requestSource:{branch:state.branch,request_path:e.request.path,source_evidence_path:e.source_evidence.path,commit:e.request.commit}});
      need(next.action===(checkpoint===before?(hasRecipeProfile(request)?'RESUME_FIRST_UNACCEPTED_STORY':'HISTORICAL_NEXT_STORY'):'RESUME_EXISTING_CANDIDATE'),'d1_qualification_resume_operation');
      if(checkpoint===after) need(next.story_id===third&&next.attempt===1,'d1_qualification_resume_first_generation');
      need(same(prefix.map(id=>log.stories.find(x=>x.story_id===id)),expectedRows),'d1_qualification_resume_locks');
    }
    need(beforeLog.stories.length===2&&afterLog.stories.length===3&&after.native_generations===before.native_generations+1,'d1_qualification_resume_generations');
    const thirdSession=runtime.sessions.find(x=>x.story_id===third);
    const firstPending=afterLog.stories.find(x=>x.story_id===third)?.attempts?.[0],firstGeneration=thirdSession.attempts[0];
    need(firstPending?.native_generation_completed===true&&firstPending.raw_sha256===firstGeneration.raw_sha256,'d1_qualification_resume_candidate');
    const secondSession=runtime.sessions.find(x=>x.story_id===prefix[1]);
    need(prefix.every(id=>{const session=runtime.sessions.find(x=>x.story_id===id);return session.invocation_id!==resume.resumed_invocation_id&&Date.parse(session.locked_at)<=Date.parse(resume.interrupted_at);})&&secondSession.invocation_id===resume.interrupted_invocation_id&&thirdSession.invocation_id===resume.resumed_invocation_id&&Date.parse(thirdSession.started_at)>=Date.parse(resume.resumed_at)&&instant(before.updated_at)&&instant(after.updated_at)&&Date.parse(before.updated_at)<=Date.parse(resume.interrupted_at)&&Date.parse(after.updated_at)>=Date.parse(firstGeneration.generated_at),'d1_qualification_resume_runtime');
    }
    const claims={browser_orchestrator:runtime.browser_orchestrator,story_chats:runtime.story_chats,handoff:runtime.handoff,git_readback:readback.git_readback,cloud_only:runtime.cloud_only,owner_intervention:runtime.owner_intervention,local_computer_used:runtime.local_computer_used,prohibited_dependencies_used:runtime.prohibited_dependencies_used};
    return {result:'PASS',errors:[],claims,evidence:e,data};
  }catch(error){return {result:'FAIL',errors:[error.message],claims:null,evidence:null,data:null};}
}
