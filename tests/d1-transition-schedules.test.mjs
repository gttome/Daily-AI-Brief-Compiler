import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const prompts=JSON.parse(fs.readFileSync('contracts/d1-transition-schedule-prompts.json','utf8'));

test('D1 transition uses exactly the four existing Compiler schedules',()=>{
  assert.equal(prompts.schema_version,'daily-compiler-d1-transition-schedule-prompts-v1');
  assert.equal(prompts.apply_before_activation,true);
  assert.equal(prompts.state_driven_transition,true);
  assert.equal(prompts.no_new_schedule_created,true);
  assert.equal(prompts.dot_owns_d1_image_coordination,true);
  assert.deepEqual(prompts.schedules.map(x=>x.title),[
    'Daily Compiler Primary','Daily Compiler Recovery 1','Daily Compiler Recovery 2','Daily Compiler Recovery 3'
  ]);
});

test('preactivation remains Proposal 1R and postactivation hands D1 image work to Dot',()=>{
  for(const s of prompts.schedules){
    assert.match(s.prompt,/d1-image-contract\.json/);
    assert.match(s.prompt,/proof_required/);
    assert.match(s.prompt,/Proposal 1R/);
    assert.match(s.prompt,/activation_status=active|After D1 activation/);
    assert.match(s.prompt,/Dot/);
    assert.match(s.prompt,/IMAGE_PACKAGE_INGEST/);
    assert.match(s.prompt,/local-computer|local computer/);
  }
  const primary=prompts.schedules[0].prompt;
  assert.match(primary,/phase=SPEC_READY/);
  assert.match(primary,/Do not generate reader images in this schedule/);
});

test('D1 prompts require source registry, future suggestions and observability',()=>{
  const primary=prompts.schedules[0].prompt;
  assert.match(primary,/resource-registry\.json/);
  assert.match(primary,/future-brief-inbox\.json/);
  assert.match(primary,/resource observations/);
  assert.match(primary,/run events/);
});
