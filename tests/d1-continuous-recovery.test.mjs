import test from 'node:test';
import assert from 'node:assert/strict';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD1CloudProof} from '../image-studio/activation.mjs';
import {IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';
import {D1_CONTINUOUS_QUALITY_MODE} from '../image-studio/independent-recovery.mjs';
import {hasRecipeProfile} from '../image-studio/specification-projection.mjs';

const ctx=name=>'ctx-'+canonicalSha('TEST_ONLY independent '+name);
const ref=(path,obj,commit)=>({path,sha256:canonicalSha(obj),commit});
const check=f=>validateD1CloudProof(f.proof,{repoRoot:f.root});
function upgrade(f){
  // All six independent story chats can be generated and reviewed in one Work
  // invocation. The recovery exercise is separate and AFTER quality completes.
  for(const s of f.data.runtime.sessions)s.invocation_id=ctx('quality');
  const id=f.data.state.proof_id,firstAt='2026-10-08T02:05:00Z',laterAt='2026-10-08T03:42:00Z';
  const beforeTask={schema_version:'daily-compiler-d1-task-observation-v1',source:'actual_scheduler_readback',task_id:IMAGE_TASK_ID,observed_at:'2026-10-08T02:03:00Z',last_run_time:'2026-10-08T02:01:00Z',prompt_sha256:'a'.repeat(64),saved_conversation_sha256:'b'.repeat(64)};
  const afterTask={...beforeTask,observed_at:'2026-10-08T03:41:00Z',last_run_time:'2026-10-08T03:40:00Z'};
  const receipt={schema_version:'daily-compiler-d1-recovery-readback-v1',result:'PASS',proof_id:id,exercise_id:'TEST_ONLY-separate-recovery-01',task_id:IMAGE_TASK_ID,invocation_id:ctx('recovered'),observed_at:laterAt,state_sha256:canonicalSha(f.data.state),attempt_log_sha256:canonicalSha(f.data.attempt_log),state_commit:'1'.repeat(40),native_generations:f.data.state.native_generations,no_new_native_generations:true,regenerated_accepted_images:0,checkpoint_state_sha256:canonicalSha(f.checkpoints.before_state),checkpoint_attempt_log_sha256:canonicalSha(f.checkpoints.before_log),resumed_action:hasRecipeProfile(f.data.request)?'RESUME_FIRST_UNACCEPTED_STORY':'HISTORICAL_NEXT_STORY',resumed_story_id:f.data.request.stories[2].story_id,locked_images:f.data.manifest.images.map(i=>({story_id:i.story_id,sha256:i.sha256,context_id:i.chat_session_id,accepted_attempt:i.attempt}))};
  const folder='TEST_ONLY/qualification/independent',pt=folder+'/before-task.json',qt=folder+'/after-task.json',rt=folder+'/readback.json';
  f.write(pt,beforeTask);f.write(qt,afterTask);f.write(rt,receipt);
  const snapshot={state:ref(f.paths.state,f.data.state,'1'.repeat(40)),attempt_log:ref(f.paths.attempt_log,f.data.attempt_log,'1'.repeat(40))};
  f.data.resume={schema_version:'daily-compiler-d1-independent-recovery-v1',result:'PASS',mode:'SEPARATE_READ_ONLY_RECOVERY',proof_id:id,exercise_id:receipt.exercise_id,task_id:IMAGE_TASK_ID,native_generations_consumed:0,regenerated_accepted_images:0,checkpoint:{state:ref('TEST_ONLY/qualification/before_state.json',f.checkpoints.before_state,'5'.repeat(40)),attempt_log:ref('TEST_ONLY/qualification/before_log.json',f.checkpoints.before_log,'5'.repeat(40))},
    before:{invocation_id:ctx('quality'),observed_at:firstAt,...structuredClone(snapshot),task_readback:ref(pt,beforeTask,'2'.repeat(40))},
    after:{invocation_id:ctx('recovered'),observed_at:laterAt,...structuredClone(snapshot),task_readback:ref(qt,afterTask,'3'.repeat(40)),immutable_readback:ref(rt,receipt,'4'.repeat(40))}};
  f.evidence.schema_version='daily-compiler-d1-qualification-evidence-v2';
  f.evidence.qualification_mode=D1_CONTINUOUS_QUALITY_MODE;
  f.refresh();
  return {beforeTask,afterTask,receipt,folder};
}

test('Continuous six-image quality has no forced Story 2 pause; independent later recovery qualifies',async t=>{
  for(const recipeV2 of [false,true])await t.test('recipe-v2='+recipeV2,()=>{
    const f=makeD1QualificationFixture({recipeV2});try{
      upgrade(f);assert.deepEqual(check(f),[]);
      assert.equal(new Set(f.data.runtime.sessions.map(s=>s.invocation_id)).size,1);
      assert.equal(f.data.attempt_log.native_generations,6);
    }finally{f.cleanup();}
  });
});

test('A fabricated, missing or same-invocation recovery cannot activate the continuous six-image proof',async t=>{
  const cases=[
    ['missing recovery readback',f=>{delete f.data.resume.after.immutable_readback;}],
    ['same invocation',f=>{f.data.resume.after.invocation_id=f.data.resume.before.invocation_id;}],
    ['recovery during image production',f=>{f.data.resume.before.observed_at='2026-10-08T01:20:00Z';}],
    ['restarted task has changed prompt',(f,data)=>{f.write('TEST_ONLY/qualification/independent/after-task.json',{...data.afterTask,prompt_sha256:'f'.repeat(64)});}],
    ['regenerated one accepted image',f=>{f.data.resume.regenerated_accepted_images=1;}],
    ['missing actual scheduler witness',f=>{f.data.resume.before.task_readback={};}],
    ['missing completed lock',f=>{f.data.attempt_log.stories[0].accepted_locked=false;f.data.state.specification_binding.attempt_log_sha256=canonicalSha(f.data.attempt_log);}],
  ];
  for(const [label,fn] of cases)await t.test(label,()=>{
    const f=makeD1QualificationFixture();try{
      const data=upgrade(f);
      fn(f,data);f.refresh();assert.notDeepEqual(check(f),[],label);
    }finally{f.cleanup();}
  });
});

test('Historical v1 keeps the exact forced two-image interruption contract unchanged',()=>{
  const f=makeD1QualificationFixture();try{
    assert.deepEqual(check(f),[]);
    f.data.resume.resumed_invocation_id=f.data.resume.interrupted_invocation_id;
    f.refresh();assert.ok(check(f).includes('d1_qualification_resume_invocation'));
  }finally{f.cleanup();}
});
