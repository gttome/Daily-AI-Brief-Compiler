import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {primaryDecision} from '../producer/recovery.mjs';
import {VALUE_TARGET} from '../operations/value-release.mjs';
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
test('after-midnight primary uses the current Chicago date without skipping October 9 or rewriting earlier editions',()=>{
  const primary=prompts.schedules[0].prompt;
  assert.match(primary,/daily 00:45 America\/Chicago/);
  assert.match(primary,/CURRENT LOCAL CALENDAR DAY/);
  assert.match(primary,/2026-10-09 00:45 America\/Chicago means the 2026-10-09 edition, not October 10/);
  assert.match(primary,/Preserve original edition dates of previously allocated executions/);
  assert.doesNotMatch(primary,/Resolve the target edition as the next America\/Chicago calendar day/);
  const prior={edition_date:'2026-10-08',execution_id:'TEST_ONLY-prior',branch:'shadow/2026-10-08',state:'SHADOW_VERIFIED'};
  const original=structuredClone(prior);
  for(const [instant,expected] of [[VALUE_TARGET.intended_run_start,'2026-10-09'],['2026-10-10T00:45:00-05:00','2026-10-10'],['2026-11-02T00:45:00-06:00','2026-11-02']]){
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
    const localDate=`${parts.year}-${parts.month}-${parts.day}`;
    assert.equal(localDate,expected);
    assert.deepEqual(primaryDecision([prior],localDate),{action:'ALLOCATE',edition_date:expected,branch:'shadow/'+expected});
    assert.deepEqual(prior,original);
  }
  assert.equal(primaryDecision([prior],'2026-10-08').reason,'EDITION_ALREADY_SHADOW_VERIFIED');
});
