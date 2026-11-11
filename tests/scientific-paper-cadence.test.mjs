import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildScientificPaperCadence,validateScientificPaperEditionReceipt} from '../operations/scientific-paper-cadence.mjs';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const edition='2026-11-12';
const receipt=(d,papers=[])=>({schema_version:'daily-scientific-paper-coverage-v1',
 edition_date:d,review_status:'VERIFIED',published_papers:papers});
const chosen={story_id:'verified-technical-paper',title:'Benchmarking agent reliability across reproducible conditions',
 original_paper_url:'https://arxiv.org/abs/2611.12345',publication_status:'PREPRINT',
 research_limitations:'The benchmark sample and model choices limit generalization to other work.',
 review_scope:'METHODS_AND_RESULTS'};
const days=Array.from({length:7},(_,i)=>new Date(Date.parse(edition+'T00:00:00Z')-(i+1)*86400000).toISOString().slice(0,10));

test('scientific paper search covers real enabled primary-paper sources without activating disabled leads',()=>{
 const r=buildScientificPaperCadence({editionDate:edition,registry});
 assert.equal(r.window_editions,7);assert.equal(r.target_paper_led_stories,1);
 assert.equal(r.prior_target_status,'UNKNOWN_HISTORY_INCOMPLETE');
 assert.equal(r.paper_review_priority,'PRIORITY');assert.equal(r.nonblocking,true);
 for(const id of ['arxiv-cs-ai','arxiv-cs-cl','arxiv-cs-lg','acl-anthology','openreview','iclr','icml','neurips']){
  assert.ok(r.eligible_discovery_sources.some(s=>s.resource_id===id),id);
 }
 assert.ok(!r.eligible_discovery_sources.some(s=>s.resource_id==='directory-d3b428c2ddbc07b6f880f0e3'));
});
test('a full seven-edition audited absence makes the paper review due; unknown is not zero',()=>{
 const r=buildScientificPaperCadence({editionDate:edition,registry,recentCoverage:days.map(d=>receipt(d))});
 assert.equal(r.prior_target_status,'NOT_MET');assert.equal(r.known_paper_led_stories,0);
 assert.equal(r.verified_edition_receipts,7);assert.equal(r.unverified_edition_dates.length,0);
 const partial=buildScientificPaperCadence({editionDate:edition,registry,recentCoverage:days.slice(0,6).map(d=>receipt(d))});
 assert.equal(partial.prior_target_status,'UNKNOWN_HISTORY_INCOMPLETE');
 assert.equal(partial.paper_review_priority,'PRIORITY');
});
test('one traceable original-paper-led article satisfies the rolling target with no new publication quota',()=>{
 const r=buildScientificPaperCadence({editionDate:edition,registry,
  recentCoverage:[receipt(days[3],[chosen])]});
 assert.equal(r.prior_target_status,'MET');assert.equal(r.known_paper_led_stories,1);
 assert.equal(r.paper_review_priority,'NORMAL');assert.equal(r.nonblocking,true);
});
test('paper status distinguishes preprint from peer review and rejects unsupported blog-only attribution',()=>{
 const base=receipt(days[0],[chosen]);
 assert.equal(validateScientificPaperEditionReceipt(base,{editionDate:days[0]}).selected_paper_count,1);
 assert.throws(()=>validateScientificPaperEditionReceipt(receipt(days[0],[{...chosen,publication_status:'PEER_REVIEWED'}]),
  {editionDate:days[0]}),/ARXIV_IS_NOT_PEER_REVIEW/);
 assert.throws(()=>validateScientificPaperEditionReceipt(receipt(days[0],[{...chosen,original_paper_url:'https://example.com/blog/new-model'}]),
  {editionDate:days[0]}),/UNVERIFIED_SELECTED_PAPER/);
 const bundle={edition_date:days[0],stories:[{id:'different-story'}]};
 assert.throws(()=>validateScientificPaperEditionReceipt(base,{editionDate:days[0],bundle}),/UNVERIFIED_SELECTED_PAPER/);
});
test('duplicate dates, invalid dates and unsupported incomplete claims cannot fabricate history',()=>{
 assert.throws(()=>buildScientificPaperCadence({editionDate:'2026-11-32',registry}),/INVALID_INPUT/);
 assert.throws(()=>buildScientificPaperCadence({editionDate:edition,registry,recentCoverage:[receipt(days[0]),receipt(days[0])]}),/DUPLICATE_EDITION/);
 assert.throws(()=>validateScientificPaperEditionReceipt({...receipt(days[0],[chosen]),review_status:'INCOMPLETE'},
  {editionDate:days[0]}),/INCOMPLETE_WITH_CLAIM/);
});
test('existing source planner retains exact prior-unreviewed ordering and annotates paper opportunities',()=>{
 const gap=['arxiv-cs-ai','arxiv-cs-cl'];const prior={edition_date:'2026-11-11',
  evidence_reconciliation:{source_index_coverage:{unreviewed_ids:gap}}};
 const plan=buildEditorialResearchPlan({editionDate:edition,registry,previousAar:prior,
  recentScientificPaperEvidence:days.map(d=>receipt(d))});
 assert.equal(plan.scientific_papers.prior_target_status,'NOT_MET');
 assert.equal(plan.previously_unreviewed_prioritized,2);
 assert.ok(plan.resources.slice(0,2).every(r=>gap.includes(r.resource_id)&&r.scientific_paper_source));
 assert.ok(plan.resources.every(r=>typeof r.scientific_paper_source==='boolean'));
 assert.equal(plan.video_source_sweep.registered_count,
  registry.resources.filter(r=>r.content_types.includes('video')).length);
});
