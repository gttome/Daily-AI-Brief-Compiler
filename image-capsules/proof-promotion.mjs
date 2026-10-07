import {validateD0CapabilityProofV2} from './capability-proof-v2.mjs';

export function assertCapabilityProofPass(receipt){
  const errors=validateD0CapabilityProofV2(receipt);
  if(errors.length) throw new Error(errors.join(';'));
  if(receipt.status!=='PASS') throw new Error('d0_capability_proof_not_pass');
  return true;
}

export function promotePreproofToP0A(receipt){
  assertCapabilityProofPass(receipt);
  return {
    schema_version:'daily-compiler-d0-p0-a-v1',
    result:'PASS',
    capability_proof_id:receipt.proof_id,
    evidence_reused_without_regeneration:true,
    native_generations_added_for_promotion:0,
    successful_run_ids:receipt.runs.map(r=>r.run_id),
    distinct_task_titles:receipt.repeatability.distinct_task_titles,
    distinct_run_nonces:receipt.repeatability.distinct_run_nonces,
    distinct_story_packets:receipt.repeatability.distinct_story_packets,
    isolation_evidence:receipt.runs.map(r=>({
      run_id:r.run_id,
      method:r.session_boundary.method,
      task_title:r.session_boundary.task_title,
      run_nonce:r.session_boundary.run_nonce,
      prompt_sha256:r.generator_submission.prompt_sha256,
      outer_probe_id:r.canary.outer_probe_id,
      outer_probe_leakage_detected:r.canary.outer_probe_leakage_detected,
      unrelated_context_leakage_detected:r.canary.unrelated_context_leakage_detected,
      story_subject_correct:r.canary.story_subject_correct
    }))
  };
}

export function promotePreproofToP0B(receipt){
  assertCapabilityProofPass(receipt);
  return {
    schema_version:'daily-compiler-d0-p0-b-v1',
    result:'PASS',
    capability_proof_id:receipt.proof_id,
    evidence_reused_without_regeneration:true,
    native_generations_added_for_promotion:0,
    successful_run_ids:receipt.runs.map(r=>r.run_id),
    distinct_raw_byte_streams:receipt.repeatability.distinct_raw_byte_streams,
    persistence_evidence:receipt.runs.map(r=>({
      run_id:r.run_id,
      generated_file_id:r.native_generation.generated_file_id,
      bridge_kind:r.same_run_handoff.bridge_kind,
      raw_fetched_before_run_end:r.same_run_handoff.raw_fetched_before_run_end,
      git_persisted_before_run_end:r.same_run_handoff.git_persisted_before_run_end,
      ephemeral_file_deleted:r.same_run_handoff.ephemeral_file_deleted,
      raw_identity:structuredClone(r.raw_identity)
    }))
  };
}
