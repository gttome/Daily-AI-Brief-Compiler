import {validateRecipeCompanion,hasRecipeProfile} from './specification-projection.mjs';
import fs from 'node:fs';
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {validateVisualReview} from '../image-capsules/review-contract.mjs';
import {validateSetReview} from '../image-capsules/set-review.mjs';
import {assertD1Specifications,compileD1StoryPrompt} from './spec-admission.mjs';
import {readD1Evidence} from './proof-evidence.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>canonicalSha(a)===canonicalSha(b);
const instant=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
const sameStories=(rows,ids)=>Array.isArray(rows)&&rows.length===ids.length&&new Set(rows.map(row=>row?.story_id)).size===ids.length&&rows.every(row=>ids.includes(row?.story_id));

// Consume the actual story-chat records already required by the image contract.
// This validates their identity and bytes; GitHub performs no subjective review,
// image generation, browser invocation or new qualification rehearsal here.
export function validateD1ProductEvidence({bundle,state,manifest,handoff,porter,repoRoot,reference,validatedCorrection=false}){
  try{
    const record=readD1Evidence(repoRoot,reference);
    need(record.schema_version==='daily-compiler-d1-canonical-reviews-v1','d1_product_review_schema');
    need(record.edition_date===bundle.edition_date&&record.execution_id===handoff.execution_id&&record.contract_version===bundle.image_system.contract_version,'d1_product_review_identity');
    need(record.manifest_sha256===canonicalSha(manifest)&&instant(manifest.accepted_at),'d1_product_review_manifest');
    const request=readD1Evidence(repoRoot,record.request),sources=readD1Evidence(repoRoot,record.source_evidence),admission=readD1Evidence(repoRoot,record.admission);
    const admitted=assertD1Specifications(request,sources);
    validateRecipeCompanion(request,sources,record);
    need(same(admission,admitted),'d1_product_specification_admission');
    need(request.edition_date===bundle.edition_date&&request.execution_id===handoff.execution_id,'d1_product_request_identity');
    const ids=bundle.stories.map(story=>story.id);
    for(const rows of [request.stories,sources.stories,record.images,record.observations,record.sessions,record.binary_readback?.images])need(sameStories(rows,ids),'d1_product_six_story_rows');
    const quality=JSON.parse(fs.readFileSync(new URL('../contracts/d1-image-contract.json',import.meta.url),'utf8')).quality;
    const set=record.set_review,readback=record.binary_readback;
    need(validateSetReview(set).length===0&&set.result==='PASS'&&set.edition_date===bundle.edition_date&&sameStories(set.candidates,ids)&&instant(set.reviewed_at),'d1_product_set_review');
    need(readback.result==='PASS'&&readback.method==='exact_commit_raw_github_download'&&hex(readback.commit,40)&&instant(readback.verified_at),'d1_product_binary_readback');
    let lastLocked=null;
    for(const selected of bundle.stories){
      const id=selected.id,story=request.stories.find(x=>x.story_id===id),source=sources.stories.find(x=>x.story_id===id);
      const image=manifest.images.find(x=>x.story_id===id),asset=bundle.images.find(x=>x.story_id===id),mapped=handoff.items.find(x=>x.story_id===id),ported=porter.images.find(x=>x.story_id===id);
      const review=record.images.find(x=>x.story_id===id),profile=record.observations.find(x=>x.story_id===id),session=record.sessions.find(x=>x.story_id===id),rb=readback.images.find(x=>x.story_id===id);
      need(story.story_content_sha256===canonicalSha(selected)&&source.source_url===selected.source.url,'d1_product_selected_story_binding:'+id);
      const prompt=compileD1StoryPrompt(request,sources,id);
      need(image.composition_signature===story.generation.composition_assignment.composition_signature&&same(image.visible_text_allowlist,story.generation.visible_text_allowlist),'d1_product_story_assignment:'+id);
      need(review.reviewer_identity===image.chat_session_id&&review.prompt_sha256===prompt.prompt_sha256,'d1_product_review_context:'+id);
      const errors=validateVisualReview(review,{packet:{envelope:{story_id:id,packet_sha256:story.specification_sha256},generation:story.generation},finalReceipt:{story_id:id,attempt:image.attempt,final:{path:asset.path,sha256:asset.sha256,git_blob_sha:asset.git_blob_sha}}});
      need(errors.length===0&&review.result==='PASS'&&instant(review.reviewed_at)&&review.meaningful_components.length>=quality.minimum_meaningful_components&&new Set(review.meaningful_components.map(x=>x.normalize('NFKC').toLowerCase().trim())).size===review.meaningful_components.length,'d1_product_canonical_review:'+id);
      need(profile.canonical_sha256===image.sha256&&profile.review_sha256===canonicalSha(review)&&profile.context_id===image.chat_session_id,'d1_product_profile_binding:'+id);
      for(const [key,min] of [['internal_substages',quality.minimum_internal_substages_in_dominant_mechanism],['secondary_relationships',quality.minimum_secondary_relationships]])need(Number.isInteger(profile[key])&&profile[key]>=min,'d1_product_profile:'+id+':'+key);
      need(Number.isInteger(profile.major_visual_regions)&&profile.major_visual_regions>=3&&profile.major_visual_regions<=5&&Number.isFinite(profile.canvas_utilization_percent)&&profile.canvas_utilization_percent>=80&&profile.canvas_utilization_percent<=90,'d1_product_profile_layout:'+id);
      for(const key of ['dimensional_mechanism_plate','white_or_near_white_background','no_generic_forms','no_decorative_geometry','no_pseudotext','story_specific_mechanism_clear','premium_production_grade_textbook_editorial_finish'])need(profile[key]===true,'d1_product_profile:'+id+':'+key);
      for(const key of ['palette_family','mechanism_metaphor','evidence_representation','feedback_pattern'])need(profile[key]===story.generation.composition_assignment[key],'d1_product_profile_assignment:'+id+':'+key);
      const observed=set.candidates.find(x=>x.story_id===id);
      need(observed.final_sha256===image.sha256,'d1_product_set_asset:'+id);
      for(const key of ['composition_signature','layout_signature','diagram_grammar','hierarchy_signature','annotation_pattern_signature'])need(observed[key]===story.generation.composition_assignment[key],'d1_product_observed_assignment:'+id+':'+key);
      need(session.context_id===image.chat_session_id&&/^ctx-[a-f0-9]{64}$/.test(session.context_id)&&session.fresh_regular_conversation===true&&session.temporary_chat===false&&session.work_mode===false&&session.only_own_story_prompt===true&&session.prior_context_reused===false&&session.prompt_sha256===prompt.prompt_sha256,'d1_product_story_context:'+id);
      for(const when of [session.started_at,session.generated_at,session.locked_at])need(instant(when),'d1_product_story_time:'+id);
      need(Date.parse(session.started_at)<=Date.parse(session.generated_at)&&Date.parse(session.generated_at)<=Date.parse(review.reviewed_at)&&Date.parse(review.reviewed_at)<=Date.parse(session.locked_at),'d1_product_story_chronology:'+id);
      // A correction reuses untouched locks; their old chronological position is
      // intentionally retained instead of pretending the set was regenerated.
      if(!validatedCorrection){need(lastLocked===null||Date.parse(session.started_at)>=Date.parse(lastLocked),'d1_product_story_order:'+id);lastLocked=session.locked_at;}
      need(Array.isArray(session.attempts)&&session.attempts.length===image.attempt,'d1_product_attempts:'+id);
      let previous=session.started_at;
      session.attempts.forEach((attempt,index)=>{
        need(attempt.attempt===index+1&&attempt.context_id===image.chat_session_id&&attempt.native_generation_completed===true&&attempt.result===(index===session.attempts.length-1?'PASS':'FAIL')&&hex(attempt.raw_sha256,64)&&instant(attempt.generated_at)&&instant(attempt.reviewed_at)&&Date.parse(previous)<=Date.parse(attempt.generated_at)&&Date.parse(attempt.generated_at)<=Date.parse(attempt.reviewed_at),'d1_product_attempt_lineage:'+id);
        previous=attempt.reviewed_at;
      });
      for(const identity of [rb.raw,rb.canonical])need(identity&&hex(identity.sha256,64)&&hex(identity.git_blob_sha,40)&&Number.isInteger(identity.bytes)&&identity.bytes>0&&Number.isInteger(identity.width)&&identity.width>0&&Number.isInteger(identity.height)&&identity.height>0&&identity.format==='png','d1_product_raw_canonical_identity:'+id);
      const raw=rb.raw,canonical=rb.canonical;
      need(canonical.path===asset.path&&canonical.sha256===image.sha256&&canonical.git_blob_sha===asset.git_blob_sha&&canonical.bytes===image.bytes&&canonical.width===1200&&canonical.height===630,'d1_product_canonical_binding:'+id);
      // A correction adds assets at a later immutable commit while preserving
      // untouched per-image readbacks exactly. Their original commit stays valid.
      const assetCommit=rb.commit??readback.commit;
      need(hex(assetCommit,40)&&rb.readback_sha256===image.sha256&&rb.readback_git_blob_sha===ported.git_blob_sha&&rb.readback_bytes===image.bytes&&rb.url===`https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/${assetCommit}/${mapped.target_path}`,'d1_product_immutable_readback:'+id);
      need(rb.normalization?.semantic_editing===false,'d1_product_normalization:'+id);
      if(raw.width===1200&&raw.height===630)need(rb.normalization.method==='none'&&same({...raw,path:canonical.path},canonical),'d1_product_raw_identity:'+id);
      else need(rb.normalization.method==='deterministic_resize_only'&&raw.sha256!==canonical.sha256&&raw.git_blob_sha!==canonical.git_blob_sha,'d1_product_resize:'+id);
      const finalAttempt=session.attempts.at(-1);
      need(finalAttempt.raw_sha256===raw.sha256&&finalAttempt.generated_at===session.generated_at&&Date.parse(finalAttempt.reviewed_at)<=Date.parse(review.reviewed_at),'d1_product_original_review_binding:'+id);
      need(Date.parse(manifest.accepted_at)>=Date.parse(session.locked_at)&&Date.parse(set.reviewed_at)>=Date.parse(session.locked_at)&&Date.parse(readback.verified_at)>=Date.parse(session.locked_at),'d1_product_completion_time:'+id);
    }
    if(state)need(state.edition_date===bundle.edition_date&&state.execution_id===handoff.execution_id&&state.branch===handoff.branch,'d1_product_base_run_binding');
    return {result:'PASS',errors:[],canonical_reviews_sha256:canonicalSha(record),reviewed_images:ids.length,subjective_rereview_performed:false,live_runtime_invoked:false};
  }catch(error){return {result:'FAIL',errors:[error.message]};}
}
