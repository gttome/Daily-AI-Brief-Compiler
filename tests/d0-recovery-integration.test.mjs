import test from 'node:test';
import assert from 'node:assert/strict';
import {firstIncompleteSemanticStage,nextImageOrdinal,assertProgressPreserved,recoveryDecision} from '../producer/recovery.mjs';
import {nextQualityAttempt,consumesQualityAttempt,assertAttemptHistory} from '../image-capsules/state.mjs';

const state={
  schema_version:'daily-compiler-state-v1',
  edition_date:'2026-10-08',
  execution_id:'daily-compiler-shadow-2026-10-08',
  branch:'shadow/2026-10-08',
  state:'PRODUCING',
  stage:'IMAGES',
  started_at:'2026-10-07T19:15:00Z',
  updated_at:'2026-10-07T19:30:00Z',
  editorial_bundle:{status:'complete',digest:'x'},
  images:{
    required:6,
    strategy:'d0_native_image_capsules',
    stage_state:'IN_PROGRESS',
    set_plan_sha256:'1'.repeat(64),
    individual_passed:['s1','s2'],
    accepted:[],
    set_review:{status:'pending',path:null,digest:null},
    acceptance:{status:'pending',path:null,digest:null}
  },
  bundle:{status:'pending',digest:null},
  last_error:null,
  retryable:true
};

test('D0 recovery stays in IMAGES before atomic acceptance and never invents ordinal from accepted count',()=>{
  assert.equal(firstIncompleteSemanticStage(state),'IMAGES');
  assert.equal(nextImageOrdinal(state),null);
  const d=recoveryDecision([state]);
  assert.equal(d.action,'RESUME');
  assert.equal(d.image_strategy,'d0_native_image_capsules');
  assert.equal(d.next_image_ordinal,null);
});

test('D0 enters BUNDLE only after set PASS and atomic six-image acceptance',()=>{
  const x=structuredClone(state);
  x.images.stage_state='ACCEPTED';
  x.images.individual_passed=['s1','s2','s3','s4','s5','s6'];
  x.images.accepted=['s1','s2','s3','s4','s5','s6'];
  x.images.set_review={status:'PASS',path:'images/set-review.json',digest:'2'.repeat(64)};
  x.images.acceptance={status:'ACCEPTED_LOCKED',path:'images/acceptance.json',digest:'3'.repeat(64)};
  assert.equal(firstIncompleteSemanticStage(x),'BUNDLE');
});

test('infrastructure failures consume zero and quality attempts cap at four',()=>{
  assert.equal(consumesQualityAttempt('IMAGE_CAPSULE_ISOLATION_UNAVAILABLE'),false);
  assert.equal(consumesQualityAttempt('VISIBLE_TEXT_EXTRA'),true);
  const attempts=[1,2,3,4].map(n=>({
    attempt:n,state:'REJECTED_QUALITY',quality_attempt_consumed:true,context_id:'ctx'+n
  }));
  assert.equal(nextQualityAttempt(attempts),null);
  assert.deepEqual(assertAttemptHistory(attempts),[]);
});

test('D0 progress cannot change set plan or remove accepted lock',()=>{
  const accepted=structuredClone(state);
  accepted.images.stage_state='ACCEPTED';
  accepted.images.accepted=['s1','s2','s3','s4','s5','s6'];
  accepted.images.set_review={status:'PASS',path:'x',digest:'2'.repeat(64)};
  accepted.images.acceptance={status:'ACCEPTED_LOCKED',path:'a',digest:'3'.repeat(64)};
  const changed=structuredClone(accepted);
  changed.images.set_plan_sha256='4'.repeat(64);
  assert.throws(()=>assertProgressPreserved(accepted,changed),/image set plan changed/);
  const unlocked=structuredClone(accepted);
  unlocked.images.acceptance.status='pending';
  assert.throws(()=>assertProgressPreserved(accepted,unlocked),/accepted lock removed/);
});
