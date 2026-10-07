import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const prompts=JSON.parse(fs.readFileSync('contracts/d1-transition-schedule-prompts.json','utf8'));

test('D1 v5 preserves four schedules and hands image lane to Work browser',()=>{
  assert.equal(prompts.schema_version,'daily-compiler-d1-transition-schedule-prompts-v3');
  assert.equal(prompts.state_driven_transition,true);assert.equal(prompts.no_new_schedule_created,true);
  assert.equal(prompts.work_browser_owns_d1_image_coordination,true);assert.equal(prompts.dot_owns_d1_image_coordination,false);
  assert.equal(prompts.edition_strategy_binding,true);assert.equal(prompts.activation_cutover_rule,'new_editions_only');
  assert.deepEqual(prompts.schedules.map(x=>x.title),['Daily Compiler Primary','Daily Compiler Recovery 1','Daily Compiler Recovery 2','Daily Compiler Recovery 3']);
});
test('postactivation semantic schedules stop at SPEC_READY and never generate reader images',()=>{
  const primary=prompts.schedules[0].prompt;
  assert.match(primary,/SPEC_READY/);assert.match(primary,/Work Cloud Browser/);assert.match(primary,/bind images\.strategy exactly once/);assert.match(primary,/later global D1 activation\/deactivation must never switch/);
  assert.match(primary,/TinyFish/);assert.match(primary,/local computer/);
  for(const s of prompts.schedules) assert.match(s.prompt,/Proposal 1R/);
});
