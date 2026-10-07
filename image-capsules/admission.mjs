import {sha256,hex,nonempty} from './util.mjs';
import {assertSubmittedPrompt,compileGeneratorPrompt} from './prompt.mjs';

export const ADMISSION_SCHEMA='daily-compiler-image-capsule-admission-v1';

function validProof(proof,projectionSha){
  return proof&&proof.method==='platform_fresh_capsule_boundary'&&
    hex(proof.generator_visible_context_sha256,64)&&proof.generator_visible_context_sha256===projectionSha&&
    nonempty(proof.outer_context_probe_id)&&proof.outer_context_visible_to_generator===false&&
    proof.other_story_material_visible===false&&proof.prior_image_material_visible===false&&
    nonempty(proof.evidence_ref);
}

export function buildAdmission({
  edition_date,execution_id,story_id,attempt,invocation_id,context_id,packet,
  submitted_instruction,context_proof,referenced_images=[],conversation_images_visible=false,
  seen_context_ids=new Set()
}){
  const compiled=assertSubmittedPrompt(packet,submitted_instruction);
  const expected=compiled.prompt_sha256,submitted=sha256(submitted_instruction);
  const identityOK=/^\d{4}-\d{2}-\d{2}$/.test(edition_date||'')&&nonempty(execution_id)&&nonempty(story_id)&&story_id===packet.envelope.story_id&&Number.isInteger(attempt)&&attempt>=1&&attempt<=4&&nonempty(invocation_id)&&nonempty(context_id);
  const uniqueContext=!seen_context_ids.has(context_id);
  const isolation=Array.isArray(referenced_images)&&referenced_images.length===0&&conversation_images_visible===false&&validProof(context_proof,compiled.projection_sha256);
  const authorized=identityOK&&uniqueContext&&isolation&&submitted===expected;
  return {
    schema_version:ADMISSION_SCHEMA,edition_date,execution_id,story_id,attempt,invocation_id,context_id,
    context_origin:'fresh_story_only_invocation',fresh_context:true,dedicated_story_only_context:true,
    orchestration_context_visible:false,includes_other_stories:false,conversation_images_visible,
    referenced_images:structuredClone(referenced_images),
    submitted_instruction_sha256:submitted,expected_instruction_sha256:expected,
    submitted_instruction_equals_expected:submitted===expected,same_invocation_capture_required:true,
    owner_intervention_required:false,work_used:false,codex_used:false,paid_model_api_used:false,
    proof:structuredClone(context_proof||null),generation_authorized:authorized
  };
}

export function validateAdmission(receipt,{packet,submitted_instruction,seen_context_ids=new Set()}={}){
  const errors=[];
  if(receipt?.schema_version!==ADMISSION_SCHEMA) errors.push('admission_schema');
  if(receipt?.generation_authorized!==true) errors.push('generation_not_authorized');
  if(receipt?.fresh_context!==true||receipt?.dedicated_story_only_context!==true||receipt?.context_origin!=='fresh_story_only_invocation') errors.push('fresh_dedicated_context_required');
  if(receipt?.orchestration_context_visible!==false||receipt?.includes_other_stories!==false||receipt?.conversation_images_visible!==false) errors.push('context_contamination');
  if(!Array.isArray(receipt?.referenced_images)||receipt.referenced_images.length!==0) errors.push('referenced_images_forbidden');
  if(receipt?.owner_intervention_required!==false||receipt?.work_used!==false||receipt?.codex_used!==false||receipt?.paid_model_api_used!==false) errors.push('cost_control_boundary');
  if(receipt?.same_invocation_capture_required!==true) errors.push('same_invocation_capture_required');
  if(!Number.isInteger(receipt?.attempt)||receipt.attempt<1||receipt.attempt>4) errors.push('attempt_out_of_bounds');
  if(!nonempty(receipt?.invocation_id)||!nonempty(receipt?.context_id)||seen_context_ids.has(receipt?.context_id)) errors.push('context_identity_invalid_or_reused');
  if(packet){
    const compiled=compileGeneratorPrompt(packet);
    if(receipt.story_id!==packet.envelope.story_id) errors.push('story_mismatch');
    if(receipt.expected_instruction_sha256!==compiled.prompt_sha256) errors.push('expected_prompt_sha_mismatch');
    if(!validProof(receipt.proof,compiled.projection_sha256)) errors.push('clean_capsule_proof_missing_or_invalid');
    if(submitted_instruction!==undefined){
      try{assertSubmittedPrompt(packet,submitted_instruction);}catch{errors.push('submitted_prompt_mismatch');}
      if(receipt.submitted_instruction_sha256!==sha256(submitted_instruction)) errors.push('submitted_prompt_receipt_mismatch');
    }
  } else if(!receipt?.proof) errors.push('clean_capsule_proof_missing_or_invalid');
  return [...new Set(errors)];
}

export function assertAdmission(receipt,opts){
  const errors=validateAdmission(receipt,opts);
  if(errors.length) throw new Error(errors.join(';'));
  return true;
}
