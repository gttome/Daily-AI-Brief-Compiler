import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EDITORIAL_NOVELTY_EFFECTIVE,findEditorialValueOverlap,
  isRecurringSkillAuthoringLesson,skillProcedureEvidence
} from '../compiler/editorial-novelty.mjs';

const recentDates=['2026-10-26','2026-10-25','2026-10-24',
  '2026-10-23','2026-10-22','2026-10-21','2026-10-20'];
const prior=(date,headline,summary,slug)=>({
  content_type:'Article',brief_date:date,headline,summary,
  url:'/stories/'+date+'/'+slug+'/'
});
const old=[
  prior('2026-10-25','Plaud turns reviewed meeting routines into reusable, editable Skills',
    'Plaud separates exploratory Chat from task-oriented Work. Its reusable Skills can be created from a document, conversation, form or prior artifact, with visible memory and confirmation before connected-app actions.',
    'oct25-a1-plaud-reusable-skills'),
  prior('2026-10-24','Anthropic moves the Agent Skills standard into neutral Linux Foundation governance',
    'Anthropic donated the Agent Skills specification to neutral governance. A Skill is a folder with SKILL.md, optional templates and reference files; the foundation will address security and interoperability.',
    'oct24-a1-agent-skills-foundation'),
  prior('2026-10-23','Metis turns an agent Skill into a short, testable and governed work procedure',
    'Metis shows how to package a repeated workflow as a portable Skill with SKILL.md, supporting templates and output standards. The procedure emphasizes representative tests, ownership and a registry.',
    'oct23-a2-agent-skills-procedure'),
  prior('2026-10-22','Salesforce turns a repeated office workflow into a reviewable reusable Skill',
    'Reusable Skills package instructions, context and tools for agent workflows. Coworker drafts a skill, Skill Builder reviews it, tests its behavior and publishes it for reuse.',
    'oct22-a2-salesforce-skills')
];
const microsoft={
  headline:'Microsoft publishes a reusable Skill-authoring lab for business workflows',
  summary:"Microsoft's 30-minute lab teaches makers to attach, inspect and test a Skill, call it from a workflow, or generate one from a business process. Examples include supplier-proposal comparison. The lab emphasizes scoped instructions, supporting files and iterative testing before reuse.",
  why_it_matters:'Choose a business process, generate the Skill and test normal and adverse cases before approving reuse.'
};
const distinct=Array.from({length:5},(_,i)=>({
  headline:'Novel source finding for domain '+i,
  summary:'Researchers examined an independent phenomenon in field '+i+' with a published benchmark and constraints, and mapped where the new measurements apply.',
  why_it_matters:'Readers can check the reported measurement in their own setting before changing a decision.',
}));
const bundle={edition_date:'2026-10-27',stories:[microsoft,...distinct]};
const archive={schema_version:'1.0.0',stories:old};

test('historical October 26 Microsoft near-duplicate lesson is reproducibly identified',()=>{
  assert.equal(EDITORIAL_NOVELTY_EFFECTIVE,'2026-10-27');
  const result=findEditorialValueOverlap({bundle,archive,priorEditionDates:recentDates});
  assert.equal(result.result,'NEAR_DUPLICATE');
  const violation=result.violations.find(x=>x.reason==='recurring_generic_skill_authoring_reader_lesson');
  assert.ok(violation);
  assert.equal(violation.story_index,1);
  assert.equal(violation.prior_edition_count,3);
  assert.ok(violation.prior_pages.some(x=>x.prior_date==='2026-10-25'));
  assert.ok(violation.prior_pages.some(x=>x.prior_date==='2026-10-23'));
  assert.ok(violation.prior_pages.some(x=>x.prior_date==='2026-10-22'));
  assert.ok(!violation.prior_pages.some(x=>x.prior_date==='2026-10-24'));
});
test('same broad Skills topic but distinct governance and specific tasks are not blanket banned',()=>{
  assert.equal(isRecurringSkillAuthoringLesson(old[1]),false);
  assert.equal(isRecurringSkillAuthoringLesson({
    headline:'Package a read-only expense precheck as an Agent Skill',
    summary:'Microsoft explains the specific expense checks, script approval and a bounded template.'
  }),false);
  const revised={...bundle,stories:[{
    headline:'Agent Skills governance receives neutral standards oversight',
    summary:'A research organization explains governance, interoperability, version policy and portability across agent hosts.',
    why_it_matters:'Understand how version policies affect reuse rather than learning to draft a generic skill.'
  },...distinct]};
  assert.equal(findEditorialValueOverlap({bundle:revised,archive,priorEditionDates:recentDates}).result,'PASS');
});
test('one similar prior published edition is reviewable but not a categorical veto',()=>{
  const one={schema_version:'1.0.0',stories:[old[0],old[1]]};
  const result=findEditorialValueOverlap({bundle,archive:one,priorEditionDates:recentDates});
  assert.equal(result.result,'PASS');
  assert.equal(result.reviewed_selection_count,6);
});
test('repackaging substantially the same explanation under another publisher is rejected',()=>{
  const summary='We measured latency in a new agent architecture by collecting twelve latency traces across two regions while keeping the execution environment constant and recording failure states, configuration and repeated test outcomes.';
  const copied=prior('2026-10-25','First publisher measures a new agent architecture benchmark',
    summary,'first-architecture-benchmark');
  const now={edition_date:'2026-10-27',stories:[{
    headline:'Second publisher measures the new agent architecture benchmark',
    summary,why_it_matters:''
  },...distinct]};
  const result=findEditorialValueOverlap({bundle:now,archive:{stories:[copied]},
    priorEditionDates:recentDates});
  assert.ok(result.violations.some(v=>v.reason==='near_identical_reader_explanation'));
});
test('missing canonical history cannot silently pass the future-only audit',()=>{
  assert.throws(()=>findEditorialValueOverlap({bundle,archive:null,
    priorEditionDates:recentDates}),/EDITORIAL_NOVELTY_HISTORY_REQUIRED/);
  assert.throws(()=>findEditorialValueOverlap({bundle,archive,
    priorEditionDates:[]}),/EDITORIAL_NOVELTY_HISTORY_REQUIRED/);
});
test('the two protected publisher gates continue using one shared media admission path',()=>{
  const script=fs.readFileSync('scripts/verify-media-freshness.mjs','utf8');
  assert.match(script,/EDITORIAL_NOVELTY_EFFECTIVE/);
  assert.match(script,/findEditorialValueOverlap/);
  for(const file of ['.github/workflows/bundle-ready-signal.yml',
    '.github/workflows/shadow-compile.yml']){
    assert.match(fs.readFileSync(file,'utf8'),/node scripts\/verify-media-freshness\.mjs/);
  }
});

test('Oct31+ does not allow a renamed generic Skill create-review-reuse lesson without distinct reader task evidence',()=>{
 const b={edition_date:'2026-10-31',stories:[{
  headline:'Agent Builder turns a routine into an easy repeatable review',
  summary:'The agent creates a Skill, packages instructions for a workflow, reviews and tests it before reuse.',
  agent_skills:true,agent_skills_evidence:'Create and package Skill instructions for a routine workflow.',
  audience_fit:{practical_action:'Create and review the Skill',usable_outcome:'Reusable Skill'}
 },...distinct]};
 const result=findEditorialValueOverlap({bundle:b,archive,priorEditionDates:recentDates});
 assert.ok(result.violations.some(x=>x.reason==='skill_procedure_rebrand_without_distinct_task_evidence'));
 const lead=result.review_candidates[0].skill_procedure_review;
 assert.ok(lead.compare_primary_source&&lead.compare_reader_takeaway&&lead.compare_specific_practical_action);
 assert.equal(lead.concrete_task_evidenced,false);
});
test('concrete release-note triage remains eligible for comparative editorial review rather than an automatic ban',()=>{
 const story={
  headline:'Agent Builder organizes release-note change lists before human approval',
  summary:'A Skill packages instructions for a workflow and a reviewer tests the resulting changelog.',
  agent_skills:true,source:{url:'https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-skills'},
  agent_skills_evidence:'A dated Markdown changelog groups merged changes into Features, Fixes and Other before review and testing.',
  audience_fit:{practical_action:'Categorize merged pull-request changes into Features, Fixes and Other for dated release notes',
    usable_outcome:'A dated Markdown changelog with categorized change entries'}
 };
 const b={edition_date:'2026-10-31',stories:[story,...distinct]};
 const result=findEditorialValueOverlap({bundle:b,archive,priorEditionDates:recentDates});
 assert.equal(result.violations.some(x=>x.reason==='skill_procedure_rebrand_without_distinct_task_evidence'),false);
 assert.ok(result.review_candidates[0].skill_procedure_review);
 assert.equal(skillProcedureEvidence(story).concrete_task_evidenced,true);
});
