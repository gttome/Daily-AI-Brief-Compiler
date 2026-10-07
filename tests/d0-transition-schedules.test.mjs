import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const prompts=JSON.parse(fs.readFileSync('contracts/d0-transition-schedule-prompts.json','utf8'));
const sync=JSON.parse(fs.readFileSync('contracts/d0-transition-schedule-sync.json','utf8'));

test('transition prompts cover exactly the four existing Compiler schedules',()=>{
  assert.equal(prompts.schema_version,'daily-compiler-transition-schedule-prompts-v1');
  assert.equal(prompts.apply_before_activation,true);
  assert.equal(prompts.state_driven_transition,true);
  assert.equal(prompts.no_new_schedule_created,true);
  assert.deepEqual(prompts.schedules.map(x=>x.title),[
    'Daily Compiler Primary','Daily Compiler Recovery 1','Daily Compiler Recovery 2','Daily Compiler Recovery 3'
  ]);
  assert.equal(new Set(prompts.schedules.map(x=>x.title)).size,4);
});

test('all schedule prompts preserve legacy preactivation and switch to D0 only after activation',()=>{
  for(const s of prompts.schedules){
    assert.match(s.prompt,/activation_status=proof_required/);
    assert.match(s.prompt,/Proposal 1R/);
    assert.match(s.prompt,/activation_status=active/);
    assert.match(s.prompt,/daily-compiler-d0-activation-v1/);
    assert.match(s.prompt,/D0 Native Image Capsules|D0 image operation/);
    assert.match(s.prompt,/Do not access or modify gttome\/Daily-AI-Brief/);
    assert.match(s.prompt,/paid/);
  }
});

test('Recovery 3 is the only bounded D0 completion lane and preserves the existing proof/migration identities',()=>{
  const r3=prompts.schedules.find(x=>x.title==='Daily Compiler Recovery 3').prompt;
  assert.match(r3,/rehearsal\/d0-fused-live-proof-r1/);
  assert.match(r3,/contracts\/d0-p0a-route-matrix\.json/);
  assert.match(r3,/shadow\/2026-10-07/);
  assert.match(r3,/daily-compiler-shadow-2026-10-07/);
  assert.match(r3,/semantic_rework=0/);
  assert.match(r3,/Do not spend a native image to discover infrastructure/);
  for(const s of prompts.schedules.filter(x=>x.title!=='Daily Compiler Recovery 3')){
    assert.equal(s.prompt.includes('rehearsal/d0-fused-live-proof-r1'),false);
  }
});

test('live synchronization receipt preserves existing daily cadences and adds no schedule',()=>{
  assert.equal(sync.schema_version,'daily-compiler-transition-schedule-sync-v1');
  assert.equal(sync.result,'PASS');
  assert.equal(sync.new_schedule_created,false);
  assert.equal(sync.owner_intervention,false);
  assert.equal(sync.schedules.length,4);
  assert.ok(sync.schedules.every(x=>x.enabled===true&&x.timing_mode==='exact_schedule'&&x.timezone==='America/Chicago'));
  assert.deepEqual(sync.schedules.map(x=>x.cadence),[
    'RRULE:FREQ=DAILY;BYHOUR=19;BYMINUTE=15;BYSECOND=0',
    'RRULE:FREQ=DAILY;BYHOUR=21;BYMINUTE=15;BYSECOND=0',
    'RRULE:FREQ=DAILY;BYHOUR=1;BYMINUTE=15;BYSECOND=0',
    'RRULE:FREQ=DAILY;BYHOUR=5;BYMINUTE=15;BYSECOND=0'
  ]);
});
