import test from 'node:test';
import assert from 'node:assert/strict';
import {projectExecutorLiveness,C4_PRIMARY_ID} from '../compiler/admission/executor-liveness.mjs';
const task={authority:'live_chatgpt_automation',id:C4_PRIMARY_ID,is_enabled:true};
const obs={task,semantic_state:'PRODUCING',observed_at:'2026-10-10T19:20:00Z',
 invocation:{authority:'first_party_scheduled_runtime',task_id:C4_PRIMARY_ID,invocation_id:'inv-42',running:true},
 last_substantive_progress:{at:'2026-10-10T19:15:00Z',kind:'semantic_checkpoint',invocation_id:'inv-42'}};
test('C4: semantic PRODUCING and last_error:null cannot override disabled task',()=>{
 assert.equal(projectExecutorLiveness({...obs,task:{...task,is_enabled:false}}).executor_state,'STALLED_TASK_DISABLED');
});
test('C4: enabled without verified active invocation is not RUNNING',()=>{
 assert.equal(projectExecutorLiveness({...obs,invocation:null}).executor_state,'ENABLED_NO_ACTIVE_EXECUTOR_VERIFIED');
});
test('C4: controlled genuine observation fixture reaches RUNNING_VERIFIED',()=>{
 assert.equal(projectExecutorLiveness(obs).executor_state,'RUNNING_VERIFIED');
});
test('C4: stale checkpoint and mismatched invocation fail closed',()=>{
 assert.equal(projectExecutorLiveness({...obs,last_substantive_progress:{...obs.last_substantive_progress,at:'2026-10-10T18:00:00Z'}}).executor_state,'STALLED_NO_RECENT_PROGRESS');
 assert.equal(projectExecutorLiveness({...obs,last_substantive_progress:{...obs.last_substantive_progress,invocation_id:'different'}}).executor_state,'EXECUTOR_UNKNOWN');
});
test('C4: disabled new reporter returns UNKNOWN, not inferred RUNNING',()=>{
 assert.equal(projectExecutorLiveness(obs,{selector:'off'}).executor_state,'EXECUTOR_UNKNOWN');
});
test('C4: legacy unknown task record safely remains UNKNOWN',()=>{
 assert.equal(projectExecutorLiveness({semantic_state:'PRODUCING'}).executor_state,'EXECUTOR_UNKNOWN');
});
