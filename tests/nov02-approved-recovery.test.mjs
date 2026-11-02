import test from 'node:test';import assert from 'node:assert/strict';
import {recoveryGuardDecision} from '../operations/publication-recovery.mjs';
import {appendExecutionMilestone} from '../operations/execution-milestones.mjs';
const input=()=>({observedAt:'2026-11-03T02:55:01Z',editionDate:'2026-11-03',health:{edition_date:'2026-11-03',status:'BLOCKED_PUBLICATION',outstanding_blocker:{stage:'DISPATCH_FAILED'}},expectedHead:'a'.repeat(40),observedHead:'a'.repeat(40),ownership:{writer:'existing_recovery_guard',primary_active:false,pending_publication_pr:false,healthy_image_lease:false,recent_semantic_progress:false,checked_at:'2026-11-03T02:55:00Z'}});
test('bounded rehearsal: observe failed exact source, admit one guard, yield on competing or ambiguous writer',()=>{
 const i=input();assert.equal(recoveryGuardDecision(i).write_allowed,true);
 for(const key of ['primary_active','pending_publication_pr','healthy_image_lease','recent_semantic_progress']){
  for(const value of [true,undefined])assert.equal(recoveryGuardDecision({...i,ownership:{...i.ownership,[key]:value}}).write_allowed,false);
 }
 assert.equal(recoveryGuardDecision({...i,observedHead:'b'.repeat(40)}).write_allowed,false);
 assert.equal(recoveryGuardDecision({...i,attempts:1}).write_allowed,false);
 assert.equal(recoveryGuardDecision({...i,observedAt:'2026-11-03T03:01:00Z'}).write_allowed,false);
 assert.equal(recoveryGuardDecision(i).unattended_recovery_proven,false);
});
test('released edition cannot be misclassified as missing handoff or repaired again',()=>{
 const i={...input(),state:{edition_date:'2026-11-03',state:'SHADOW_VERIFIED'},imageIndex:{editions:[{edition_date:'2026-11-03',status:'RELEASED_VERIFIED'}]}};
 assert.equal(recoveryGuardDecision(i).result,'PUBLICATION_AND_IMAGES_RELEASED');assert.equal(recoveryGuardDecision(i).write_allowed,false);
});
test('resealing appends milestones and cannot replace the original observed start',()=>{
 const base={edition_date:'2026-11-03',execution_id:'test-run',source_ref:'test-only'};
 const start=appendExecutionMilestone(null,{...base,event:'EXECUTION_OBSERVED',observed_at:'2026-11-03T01:15:00Z'});
 const seal=appendExecutionMilestone(start,{...base,event:'BUNDLE_SEALED',observed_at:'2026-11-03T02:00:00Z'});
 assert.equal(seal.initial_execution_observed_at,start.initial_execution_observed_at);assert.equal(seal.events.length,2);
 assert.throws(()=>appendExecutionMilestone(seal,{...base,event:'RECOVERY_OBSERVED',observed_at:'2026-11-03T01:59:00Z'}),/regression/);
});
