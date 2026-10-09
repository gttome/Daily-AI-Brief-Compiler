// Prospective, separate read-only recovery proof. Historical qualification v1 is unchanged.
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';

export const D1_CONTINUOUS_QUALITY_MODE='continuous_six_independent_recovery';
export const D1_INDEPENDENT_RECOVERY_SCHEMA='daily-compiler-d1-independent-recovery-v1';
const need=(ok,why)=>{if(!ok)throw new Error('d1_independent_recovery_'+why);};
const when=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const ctx=v=>typeof v==='string'&&/^ctx-[a-f0-9]{64}$/.test(v);

export function assertD1IndependentRecovery({repoRoot,proofId,recovery,evidence,manifest,runtime,state,attemptLog,read}){
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
  const receipt=read(repoRoot,b.immutable_readback);
  need(hex(b.immutable_readback.commit,40)&&b.immutable_readback.commit!==a.state.commit&&receipt.schema_version==='daily-compiler-d1-recovery-readback-v1'&&receipt.result==='PASS'&&receipt.proof_id===proofId&&receipt.exercise_id===recovery.exercise_id&&receipt.task_id===IMAGE_TASK_ID&&receipt.invocation_id===b.invocation_id&&receipt.state_sha256===canonicalSha(state)&&receipt.attempt_log_sha256===canonicalSha(attemptLog)&&receipt.state_commit===a.state.commit&&receipt.native_generations===state.native_generations&&receipt.no_new_native_generations===true&&receipt.regenerated_accepted_images===0,'actual_readback');
  need(canonicalSha(receipt.locked_images)===canonicalSha(manifest.images.map(i=>({story_id:i.story_id,sha256:i.sha256,context_id:i.chat_session_id,accepted_attempt:i.attempt})))&&state.accepted_assets.length===6&&attemptLog.stories.length===6&&attemptLog.stories.every(x=>x.accepted_locked===true),'six_locks_preserved');
  return true;
}
