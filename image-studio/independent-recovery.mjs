// Prospective, separate read-only recovery proof. Historical qualification v1 is unchanged.
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';
import {nextD1ProofAction} from './proof-state.mjs';
import {hasRecipeProfile} from './specification-projection.mjs';

export const D1_CONTINUOUS_QUALITY_MODE='continuous_six_independent_recovery';
export const D1_INDEPENDENT_RECOVERY_SCHEMA='daily-compiler-d1-independent-recovery-v1';
const need=(ok,why)=>{if(!ok)throw new Error('d1_independent_recovery_'+why);};
const when=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const ctx=v=>typeof v==='string'&&/^ctx-[a-f0-9]{64}$/.test(v);

export function assertD1IndependentRecovery({repoRoot,proofId,recovery,evidence,manifest,runtime,state,attemptLog,request,sourceEvidence,read}){
  need(recovery?.schema_version===D1_INDEPENDENT_RECOVERY_SCHEMA&&recovery.result==='PASS'&&recovery.proof_id===proofId&&recovery.mode==='SEPARATE_READ_ONLY_RECOVERY'&&recovery.exercise_id!==proofId&&typeof recovery.exercise_id==='string','identity');
  need(recovery.task_id===IMAGE_TASK_ID&&recovery.native_generations_consumed===0&&recovery.regenerated_accepted_images===0,'no_regeneration');
  const a=recovery.before,b=recovery.after;
  need(ctx(a?.invocation_id)&&ctx(b?.invocation_id)&&a.invocation_id!==b.invocation_id&&a.invocation_id===runtime.sessions.at(-1)?.invocation_id&&when(a.observed_at)&&when(b.observed_at)&&Date.parse(a.observed_at)>Date.parse(manifest.accepted_at)&&Date.parse(b.observed_at)>Date.parse(a.observed_at),'separate_invocations');
  for(const point of [a,b]) for(const [name,expected] of [['state',state],['attempt_log',attemptLog]]){
    const ref=point[name],known=evidence[name];
    need(ref?.path===known.path&&ref?.sha256===known.sha256&&hex(ref.commit,40)&&ref.commit===a.state.commit&&canonicalSha(read(repoRoot,ref))===canonicalSha(expected),'unaltered_'+name);
  }
  need(a.state.commit===a.attempt_log.commit&&b.state.commit===b.attempt_log.commit,'immutable_checkpoint');
  const first=read(repoRoot,a.task_readback),second=read(repoRoot,b.task_readback);
  for(const t of [first,second])need(t.schema_version==='daily-compiler-d1-task-observation-v1'&&t.source==='actual_scheduler_readback'&&t.task_id===IMAGE_TASK_ID&&when(t.last_run_time)&&when(t.observed_at)&&hex(t.saved_conversation_sha256,64)&&hex(t.prompt_sha256,64),'task_readback');
  need(a.task_readback.commit!==b.task_readback.commit&&hex(a.task_readback.commit,40)&&hex(b.task_readback.commit,40)&&Date.parse(first.last_run_time)<Date.parse(second.last_run_time)&&first.prompt_sha256===second.prompt_sha256&&first.saved_conversation_sha256===second.saved_conversation_sha256,'task_separation');
  // Replay the actual two-lock checkpoint against the unchanged state machine
  // in a SEPARATE read-only recovery exercise. The quality lane has already
  // completed all six; this checkpoint does not interrupt it.
  const savedState=read(repoRoot,recovery.checkpoint?.state);
  const savedLog=read(repoRoot,recovery.checkpoint?.attempt_log);
  need(savedState.status==='BROWSER_RUNNING'&&savedState.proof_id===proofId
    &&savedState.branch===state.branch&&savedState.request_path===state.request_path
    &&savedState.accepted_assets.length===2&&savedState.accepted_story_chats.length===2
    &&savedLog.stories.length===2&&savedLog.native_generations<=state.native_generations
    &&savedState.native_generations===savedLog.native_generations
    &&savedState.specification_binding?.attempt_log_sha256===canonicalSha(savedLog)
    &&recovery.checkpoint.state.commit===recovery.checkpoint.attempt_log.commit
    &&hex(recovery.checkpoint.state.commit,40),'two_lock_checkpoint');
  for(let i=0;i<2;i++){
    const old=savedLog.stories[i],full=attemptLog.stories[i],image=manifest.images[i];
    need(old.story_id===request.stories[i].story_id&&old.accepted_locked===true
      &&old.sha256===image.sha256&&old.accepted_attempt===image.attempt
      &&canonicalSha(old)===canonicalSha(full)
      &&savedState.accepted_story_chats[i]===image.chat_session_id
      &&savedState.accepted_assets[i]===full.accepted_assets[0],'two_lock_integrity');
  }
  const op=nextD1ProofAction(savedState,{request,sourceEvidence,attemptLog:savedLog,
    historicalVerification:!hasRecipeProfile(request),requestSource:{branch:state.branch,
      request_path:evidence.request.path,source_evidence_path:evidence.source_evidence.path,
      commit:evidence.request.commit}});
  need(op.action===(hasRecipeProfile(request)?'RESUME_FIRST_UNACCEPTED_STORY':'HISTORICAL_NEXT_STORY')
    &&op.story_id===request.stories[2].story_id,'next_unaccepted_story');
  const receipt=read(repoRoot,b.immutable_readback);
  need(hex(b.immutable_readback.commit,40)&&b.immutable_readback.commit!==a.state.commit&&receipt.schema_version==='daily-compiler-d1-recovery-readback-v1'&&receipt.result==='PASS'&&receipt.proof_id===proofId&&receipt.exercise_id===recovery.exercise_id&&receipt.task_id===IMAGE_TASK_ID&&receipt.invocation_id===b.invocation_id&&receipt.state_sha256===canonicalSha(state)&&receipt.attempt_log_sha256===canonicalSha(attemptLog)&&receipt.state_commit===a.state.commit&&receipt.native_generations===state.native_generations&&receipt.no_new_native_generations===true&&receipt.regenerated_accepted_images===0&&receipt.checkpoint_state_sha256===canonicalSha(savedState)&&receipt.checkpoint_attempt_log_sha256===canonicalSha(savedLog)&&receipt.resumed_action===op.action&&receipt.resumed_story_id===op.story_id,'actual_readback');
  need(canonicalSha(receipt.locked_images)===canonicalSha(manifest.images.map(i=>({story_id:i.story_id,sha256:i.sha256,context_id:i.chat_session_id,accepted_attempt:i.attempt})))&&state.accepted_assets.length===6&&attemptLog.stories.length===6&&attemptLog.stories.every(x=>x.accepted_locked===true),'six_locks_preserved');
  return true;
}
