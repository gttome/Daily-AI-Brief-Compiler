import test from 'node:test';
import assert from 'node:assert/strict';
import { firstIncompleteSemanticStage, nextImageOrdinal, imageRecoveryMode, assertProgressPreserved, recoveryDecision, primaryDecision } from '../producer/recovery.mjs';

const base={
  schema_version:'daily-compiler-state-v1',
  edition_date:'2026-10-07',
  execution_id:'compiler-2026-10-07-r1',
  branch:'shadow/2026-10-07',
  state:'PRODUCING',
  stage:'EDITORIAL',
  started_at:'2026-10-06T19:15:00Z',
  updated_at:'2026-10-06T19:20:00Z',
  editorial_bundle:{status:'pending',digest:null},
  images:{required:6,accepted:[]},
  bundle:{status:'pending',digest:null},
  last_error:null,
  retryable:true
};
const clone=x=>JSON.parse(JSON.stringify(x));

test('recovery resumes the first incomplete semantic stage',()=>{
  assert.equal(firstIncompleteSemanticStage(base),'EDITORIAL');
  const content=clone(base); content.stage='CONTENT'; content.editorial_bundle={status:'complete',digest:'e1'};
  assert.equal(firstIncompleteSemanticStage(content),'CONTENT');
  const images=clone(content); images.stage='IMAGES'; images.images.accepted=['m1','m2','m3','m4'];
  assert.equal(firstIncompleteSemanticStage(images),'IMAGES');
  assert.equal(nextImageOrdinal(images),5);
  images.images.accepted=['m1','m2','m3','m4','m5','m6'];
  assert.equal(firstIncompleteSemanticStage(images),'BUNDLE');
});

test('accepted images are append-only across recovery',()=>{
  const before=clone(base); before.stage='IMAGES'; before.editorial_bundle.status='complete'; before.images.accepted=['m1','m2'];
  const after=clone(before); after.updated_at='2026-10-06T20:00:00Z'; after.images.accepted=['m1','m2','m3'];
  assert.equal(assertProgressPreserved(before,after),true);
  const bad=clone(after); bad.images.accepted=['m1','replacement','m3'];
  assert.throws(()=>assertProgressPreserved(before,bad),/accepted image identity changed/);
});

test('completed semantic work and sealed bundles cannot regress',()=>{
  const before=clone(base); before.stage='BUNDLE'; before.editorial_bundle.status='complete'; before.images.accepted=['m1','m2','m3','m4','m5','m6'];
  const regressed=clone(before); regressed.stage='CONTENT';
  assert.throws(()=>assertProgressPreserved(before,regressed),/stage regressed/);

  const sealed=clone(before); sealed.state='BUNDLE_READY'; sealed.bundle={status:'BUNDLE_READY',digest:'abc'};
  const changed=clone(sealed); changed.bundle.digest='def';
  assert.throws(()=>assertProgressPreserved(sealed,changed),/sealed bundle digest changed/);
});

test('recovery chooses newest nonterminal edition and never allocates',()=>{
  const older=clone(base); older.edition_date='2026-10-06'; older.execution_id='compiler-2026-10-06-r1'; older.branch='shadow/2026-10-06'; older.updated_at='2026-10-05T23:00:00Z';
  const newer=clone(base); newer.stage='IMAGES'; newer.images.accepted=['m1','m2'];
  const d=recoveryDecision([older,newer]);
  assert.equal(d.action,'RESUME');
  assert.equal(d.execution_id,'compiler-2026-10-07-r1');
  assert.equal(d.next_image_ordinal,3);
  assert.equal(recoveryDecision([]).action,'EXIT_NO_MUTATION');
});

test('primary reuses same-edition execution and blocks duplicates',()=>{
  const d=primaryDecision([base],'2026-10-07');
  assert.equal(d.action,'RESUME');
  assert.equal(d.execution_id,base.execution_id);
  const sealed=clone(base); sealed.state='BUNDLE_READY'; sealed.stage='BUNDLE'; sealed.bundle={status:'BUNDLE_READY',digest:'abc'};
  assert.equal(primaryDecision([sealed],'2026-10-07').action,'EXIT_NO_MUTATION');
  assert.equal(primaryDecision([],'2026-10-08').action,'ALLOCATE');
});


test('D0 recovery uses durable attempt history instead of ordinal allocation',()=>{
  const d0=clone(base); d0.stage='IMAGES'; d0.editorial_bundle.status='complete'; d0.images.strategy='d0_native_image_capsules';
  assert.equal(nextImageOrdinal(d0),null);
  assert.equal(imageRecoveryMode(d0),'D0_DURABLE_ATTEMPT_HISTORY');
  const d=recoveryDecision([d0]);
  assert.equal(d.image_recovery_mode,'D0_DURABLE_ATTEMPT_HISTORY');
});
