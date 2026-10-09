import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256} from '../image-capsules/util.mjs';
import {applyImageCorrectionBatch} from '../operations/image-correction-batch.mjs';
import {buildImageLaneHandoff,IMAGE_TASK_ID} from '../operations/image-lane-handoff.mjs';

import {imageCorrectionFixture} from './helpers/correction-fixture.mjs';

test('selected image correction preserves all semantics, unselected images, and original bundle',()=>{
  const f=imageCorrectionFixture(),before=structuredClone(f.bundle),out=applyImageCorrectionBatch(f);
  assert.deepEqual(f.bundle,before);
  for(const key of ['stories','videos','podcasts','watchlist','book_mappings','producer_receipt']) assert.deepEqual(out.bundle[key],before[key]);
  assert.deepEqual(out.bundle.images[1],before.images[1]);
  assert.notEqual(out.bundle.images[0].sha256,before.images[0].sha256);
  assert.equal(out.receipt.publication_verified,false);
});
test('batch correction replaces all requested images atomically and refuses duplicates or stale targets',()=>{
  const f=imageCorrectionFixture(['s1','s2']);assert.equal(applyImageCorrectionBatch(f).receipt.images.length,2);
  const before=structuredClone(f.bundle);f.corrections[1].target.expected_sha256='stale';
  assert.throws(()=>applyImageCorrectionBatch(f),/stale_image/);assert.deepEqual(f.bundle,before);
  const d=imageCorrectionFixture(['s1','s2']);d.corrections[1]=structuredClone(d.corrections[0]);assert.throws(()=>applyImageCorrectionBatch(d),/duplicate/);
});
test('mismatched bytes, unreviewed canonical hash, existing paths, and strategy changes fail closed',()=>{
  for(const mutate of [f=>{f.assets.s1[24]++},f=>{f.corrections[0].replacement.image.visual_review.reviewed_sha256='x'},f=>{f.corrections[0].replacement.image.path='old1.png'},f=>{f.corrections[0].replacement.image_system={strategy:'different'}},f=>{f.corrections[0].replacement.image.width=1201},f=>{f.corrections[0].replacement.image.format='webp'},f=>{f.corrections[0].replacement.image.bytes++}]){
    const f=imageCorrectionFixture();mutate(f);assert.throws(()=>applyImageCorrectionBatch(f));
  }
});
test('I06-T03 one, subset, and all-six scopes preserve every unselected record and semantic field',()=>{
  for(const selected of [['s1'],['s2','s4','s6'],['s1','s2','s3','s4','s5','s6']]){
    const f=imageCorrectionFixture(selected),before=structuredClone(f.bundle),out=applyImageCorrectionBatch(f);
    const preserved=b=>Object.fromEntries(Object.entries(b).filter(([k])=>!['images','corrections'].includes(k)));
    assert.deepEqual(preserved(out.bundle),preserved(before));assert.deepEqual(f.bundle,before);
    for(const image of before.images) if(!selected.includes(image.story_id)) assert.deepEqual(out.bundle.images.find(i=>i.story_id===image.story_id),image);
    assert.equal(out.receipt.changed_story_ids.length,selected.length);assert.equal(out.bundle.corrections.length,selected.length);
    assert.equal(out.receipt.superseded_asset_manifest.assets.length,6);assert.equal(out.receipt.new_asset_manifest.assets.length,6);
  }
});
test('same accepted bytes and exact applied request retries create no correction or revised path',()=>{
  const f=imageCorrectionFixture(['s1','s3']),staged=applyImageCorrectionBatch(f);
  const retry=applyImageCorrectionBatch({...f,bundle:staged.bundle});
  assert.equal(retry.receipt.result,'UNCHANGED');assert.equal(retry.receipt.correction_created,false);
  assert.deepEqual(retry.bundle,staged.bundle);
  const changed=imageCorrectionFixture(['s1']);changed.bundle.images[0]=structuredClone(changed.corrections[0].replacement.image);
  changed.corrections[0].target.expected_sha256=changed.bundle.images[0].sha256;
  changed.corrections[0].replacement.image.path='unused/transport-retry.png';
  const sameBytes=applyImageCorrectionBatch(changed);
  assert.equal(sameBytes.receipt.result,'UNCHANGED');assert.deepEqual(sameBytes.bundle,changed.bundle);assert.equal(sameBytes.bundle.corrections,undefined);
});
test('mixed changed and same-byte requests record only actual corrections and changed evidence scope',()=>{
  const f=imageCorrectionFixture(['s1','s2']);
  f.bundle.images[1]=structuredClone(f.corrections[1].replacement.image);
  f.corrections[1].target.expected_sha256=f.bundle.images[1].sha256;
  const bundleText=JSON.stringify(f.bundle),baseState={schema_version:'daily-compiler-state-v1',edition_date:f.bundle.edition_date,execution_id:'TEST_ONLY-e1',state:'SHADOW_VERIFIED',stage:'VERIFY',bundle:{status:'BUNDLE_READY',digest:sha256(bundleText)}};
  const result=applyImageCorrectionBatch({...f,baseState,bundleText});
  assert.deepEqual(result.receipt.selected_story_ids,['s1','s2']);
  assert.deepEqual(result.receipt.changed_story_ids,['s1']);
  assert.deepEqual(result.revision.correction_ids,['c-s1']);
  assert.deepEqual(result.revision.selected_story_ids,['s1']);
  assert.equal(result.revision.corrections.length,1);
  assert.deepEqual(result.bundle.images[1],f.bundle.images[1]);
});
test('duplicate replacement paths and conflicting reused correction IDs fail before changes',()=>{
  const f=imageCorrectionFixture(['s1','s2']);f.corrections[1].replacement.image.path=f.corrections[0].replacement.image.path;
  assert.throws(()=>applyImageCorrectionBatch(f),/duplicate_asset_path/);
  const valid=imageCorrectionFixture(),out=applyImageCorrectionBatch(valid);
  valid.corrections[0].reason='changed request under same ID';
  assert.throws(()=>applyImageCorrectionBatch({...valid,bundle:out.bundle}),/correction_id_conflict/);
});
const handoff={edition:'2026-10-09',executionId:'e1',branch:'shadow/2026-10-09',requestPath:'requests/r1.json',requestSha256:'a'.repeat(64),readyAt:'2026-10-09T00:00:00Z',now:'2026-10-09T00:02:00Z'};
test('handoff arms same Work task after readiness with exact edition and hourly limit',()=>{
  const h=buildImageLaneHandoff({...handoff,lastRunAt:'2026-10-09T00:00:00Z'});
  assert.equal(h.due_at,'2026-10-09T01:00:00.000Z');assert.equal(h.automation_update.jawbone_id,IMAGE_TASK_ID);
  assert.equal(h.automation_update.schedule,'BEGIN:VEVENT\nDTSTART:20261009T010000Z\nEND:VEVENT');
  assert.equal(h.scheduler_readback_verified,false);
});
test('serialized handoff time meets exact fractional input bounds and matches due_at',async t=>{
  // Parse input fractions independently as integer nanoseconds, without losing
  // their submillisecond tail through Date.parse.
  const inputNanoseconds=value=>{
    const parts=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    assert.ok(parts,value);
    return BigInt(Date.parse(parts[1]+parts[3]))*1_000_000n+BigInt((parts[2]??'').padEnd(9,'0'));
  };
  const cases=[
    {name:'whole second',lastRunAt:'2026-10-09T00:00:00Z',expected:'2026-10-09T01:00:00.000Z'},
    {name:'zero fractional tail',lastRunAt:'2026-10-09T00:00:00.000000Z',expected:'2026-10-09T01:00:00.000Z'},
    {name:'millisecond last run',lastRunAt:'2026-10-09T00:00:00.927Z',expected:'2026-10-09T01:00:01.000Z'},
    {name:'actual microsecond last run',lastRunAt:'2026-10-09T02:03:17.927968Z',expected:'2026-10-09T03:03:18.000Z'},
    {name:'submillisecond last run',lastRunAt:'2026-10-09T00:00:00.000123Z',expected:'2026-10-09T01:00:01.000Z'},
    {name:'offset submillisecond last run',lastRunAt:'2026-10-08T19:00:00.000123-05:00',expected:'2026-10-09T01:00:01.000Z'},
    {name:'submillisecond handling without last run',now:'2026-10-09T00:02:00.000123Z',expected:'2026-10-09T00:03:01.000Z'},
    {name:'fractional handling dominates last run',now:'2026-10-09T01:01:00.927968Z',lastRunAt:'2026-10-09T00:00:00.000123Z',expected:'2026-10-09T01:02:01.000Z'},
    {name:'fractional hourly bound dominates whole-second handling',now:'2026-10-09T00:59:00Z',lastRunAt:'2026-10-09T00:00:00.000123Z',expected:'2026-10-09T01:00:01.000Z'},
    {name:'roll over UTC day',now:'2026-10-09T23:58:59.999999Z',expected:'2026-10-10T00:00:00.000Z'},
    {name:'nonzero precision beyond microseconds',lastRunAt:'2026-10-09T00:00:00.000000001Z',expected:'2026-10-09T01:00:01.000Z'}
  ];
  for(const {name,expected,...times} of cases) await t.test(name,()=>{
    const input={...handoff,...times},before=structuredClone(input),h=buildImageLaneHandoff(input);
    const stamp=/^BEGIN:VEVENT\nDTSTART:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\nEND:VEVENT$/.exec(h.automation_update.schedule);
    assert.ok(stamp,h.automation_update.schedule);
    const actualMs=Date.UTC(Number(stamp[1]),Number(stamp[2])-1,...stamp.slice(3).map(Number));
    const actual=BigInt(actualMs)*1_000_000n;
    assert.equal(new Date(actualMs).toISOString(),h.due_at);
    assert.equal(h.due_at,expected);
    const bounds=[inputNanoseconds(input.now)+60_000_000_000n];
    if(input.lastRunAt) bounds.push(inputNanoseconds(input.lastRunAt)+3_600_000_000_000n);
    for(const bound of bounds) assert.ok(actual>=bound,'serialized DTSTART precedes a true minimum');
    const minimum=bounds.reduce((a,b)=>a>b?a:b);
    assert.ok(actual-minimum<1_000_000_000n,'rounding adds less than one second');
    assert.equal(h.automation_update.jawbone_id,IMAGE_TASK_ID);
    assert.deepEqual(input,before);
  });
});
test('verified identical handoff does not reschedule; unverified or changed handoff does',()=>{
  const h=buildImageLaneHandoff(handoff);
  assert.equal(buildImageLaneHandoff({...handoff,previous:h}).action,'ARM_EXISTING_TASK');
  assert.equal(buildImageLaneHandoff({...handoff,previous:{...h,scheduler_readback_verified:true}}).action,'NOOP');
  assert.equal(buildImageLaneHandoff({...handoff,requestSha256:'b'.repeat(64),previous:{...h,scheduler_readback_verified:true}}).action,'ARM_EXISTING_TASK');
});
