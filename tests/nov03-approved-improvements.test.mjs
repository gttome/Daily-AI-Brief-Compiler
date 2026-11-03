import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';
import {publicationRecoveryDecision,recoveryGuardDecision} from '../operations/publication-recovery.mjs';
import {nextPublicationHealth} from '../scripts/record-publication-health.mjs';
import {summarizeVideoEditorialContinuity,sameMedia} from '../scripts/verify-media-freshness.mjs';
import {summarizeCandidateReviews} from '../scripts/top10-aar.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json'));
const edition='2026-11-04';
test('all enabled editorial sources are planned once; prior gaps come first with mixed formats',()=>{
 const eligible=registry.resources.filter(r=>r.enabled&&r.content_types.some(t=>['article','video','podcast'].includes(t)));
 const gaps=eligible.filter(r=>r.content_types.includes('video')).map(r=>r.resource_id).concat(eligible.slice(0,8).map(r=>r.resource_id));
 const previous={edition_date:'2026-11-03',evidence_reconciliation:{source_index_coverage:{unreviewed_ids:gaps}}};
 const p=buildEditorialResearchPlan({editionDate:edition,registry,previousAar:previous});
 assert.equal(p.eligible_count,eligible.length);assert.equal(new Set(p.resources.map(r=>r.resource_id)).size,eligible.length);
 const gapSet=new Set(gaps);assert.ok(p.resources.slice(0,p.previously_unreviewed_prioritized).every(r=>gapSet.has(r.resource_id)));
 assert.ok(p.resources.every(r=>r.inspection_status==='NOT_YET_RECORDED'));
 assert.deepEqual(new Set(p.resources.map(r=>r.resource_id)),new Set(eligible.map(r=>r.resource_id)));
 assert.deepEqual(p,buildEditorialResearchPlan({editionDate:edition,registry,previousAar:previous}));
 const next=buildEditorialResearchPlan({editionDate:'2026-11-05',registry,previousAar:previous});
 assert.notDeepEqual(p.resources.map(r=>r.resource_id),next.resources.map(r=>r.resource_id));
});
test('same/future edition AAR cannot invent prior research gaps and bad dates are rejected',()=>{
 const p=buildEditorialResearchPlan({editionDate:edition,registry,previousAar:{edition_date:edition}});
 assert.equal(p.previous_edition_date,null);assert.equal(p.previously_unreviewed_prioritized,0);
 assert.throws(()=>buildEditorialResearchPlan({editionDate:'2026-11-32',registry}),/INVALID_INPUT/);
});
test('media publisher aliases expose rotation repeats without making different programs duplicates',()=>{
 const now=[{type:'video',title:'A different energy analysis program',source:'TED-Ed',url:'https://www.ted.com/talks/new'},
  {type:'video',title:'A new independent oversight interview',source:'CBS News',url:'https://www.cbsnews.com/video/new/'}];
 const prior=[{type:'video',title:'Earlier education program about tools',source:'TED',url:'https://www.ted.com/talks/old'},
  {type:'video',title:'Previous Boston report about agents',source:'CBS Boston',url:'https://www.cbsnews.com/boston/video/old/'}];
 const r=summarizeVideoEditorialContinuity({videos:now,previousVideos:prior,editionDate:edition,previousEditionDate:'2026-11-03'});
 assert.equal(r.adjacent_edition_publisher_repeat_count,2);
 assert.equal(sameMedia(now[0],prior[0]),false);assert.equal(sameMedia(now[1],prior[1]),false);
 const unrelated=summarizeVideoEditorialContinuity({videos:[{source:'TEDx Local',url:'https://youtu.be/another'}],previousVideos:[prior[0]],editionDate:edition});
 assert.equal(unrelated.adjacent_edition_publisher_repeat_count,0);
});
test('recovery diagnoses actual media/reader causes and retains concurrency and terminal-state guards',()=>{
 for(const stage of ['MEDIA_HISTORY','READER_COMPATIBILITY','SEMANTIC_PREFLIGHT']){
  const health=nextPublicationHealth({editionDate:edition,status:'BLOCKED_PUBLICATION',stage,runUrl:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/1234',observedAt:'2026-11-04T01:30:00Z'});
  const r=publicationRecoveryDecision({editionDate:edition,health,activePrimary:true});
  assert.match(r.next_action,/exact|original/);assert.equal(r.requires_new_producer,false);
  assert.equal(recoveryGuardDecision({editionDate:edition,health}).write_allowed,false);
 }
});
function reviewInput(){
 const record={candidate_id:'lead-1',format:'video',source_url:'https://example.org/video',retrieved_at:'2026-11-04T01:10:00Z',reviewed_at:'2026-11-04T01:15:00Z',review_method:'full_transcript',disposition:'qualified',content_evidence:'Reviewed the complete transcript covering the specific measured agent task and its limitations.',disposition_reason:'Qualified for substantive event-matched analysis with clearly stated testing limitations.'};
 return {edition,bound:true,bundle:{edition_date:edition,editorial_provenance:{selection_locked_at:'2026-11-04T02:00:00Z'}},coverage:{edition_date:edition,searches:[{format:'video',candidate_ids:['lead-1'],outcome:'searched'}],candidate_reviews:{schema_version:'daily-compiler-candidate-reviews-v1',edition_date:edition,records:[record]}}};
}
test('substantive review is distinct from metadata and transcript review is not video playback',()=>{
 const i=reviewInput(),s=summarizeCandidateReviews(i);assert.equal(s.qualified_candidate_count,1);assert.equal(s.full_video_reviews,0);assert.equal(s.transcript_reviews,1);
 i.coverage.candidate_reviews.records[0].review_method='metadata_only';assert.equal(summarizeCandidateReviews(i).status,'INVALID');
 i.coverage.candidate_reviews.records[0].disposition='research_lead';const m=summarizeCandidateReviews(i);
 assert.equal(m.metadata_only_count,1);assert.equal(m.reviewed_candidate_count,0);assert.equal(m.qualified_candidate_count,0);
});
test('unbound, duplicated, stale and post-selection reviews cannot inflate candidate yield',()=>{
 for(const alter of [i=>i.coverage.candidate_reviews.records.push({...i.coverage.candidate_reviews.records[0]}),
  i=>{i.coverage.searches[0].candidate_ids.push('another-id');i.coverage.candidate_reviews.records.push({...i.coverage.candidate_reviews.records[0],candidate_id:'another-id'});},
  i=>i.coverage.candidate_reviews.records[0].candidate_id='unknown',i=>i.coverage.edition_date='2026-11-03',
  i=>i.coverage.candidate_reviews.records[0].reviewed_at='2026-11-04T03:00:00Z']){
  const i=reviewInput();alter(i);const s=summarizeCandidateReviews(i);assert.equal(s.status,'INVALID');assert.equal(s.qualified_candidate_count,null);
 }
 const i=reviewInput();i.coverage.candidate_reviews.records=[];assert.equal(summarizeCandidateReviews(i).qualified_candidate_count,0);
 delete i.coverage.candidate_reviews;assert.equal(summarizeCandidateReviews(i).qualified_candidate_count,null);
});
test('existing preflight gates run before dispatch and future activation preserves historical runs',()=>{
 const wf=fs.readFileSync('.github/workflows/bundle-ready-signal.yml','utf8');
 assert.ok(wf.indexOf('id: semantic_preflight')<wf.indexOf('id: media_history'));
 assert.ok(wf.indexOf('id: reader_preflight')<wf.indexOf('id: signal_dispatch'));
 assert.match(wf,/validate-semantic-bundle\.mjs/);assert.match(wf,/validate-release-readiness\.mjs/);
 assert.match(wf,/steps\.semantic_preflight\.outcome == 'failure' && 'SEMANTIC_PREFLIGHT'/);
 assert.equal((wf.match(/2026-11-04/g)||[]).length,2);
});
test('current image entrypoints include observed November 3 rejection lessons with unchanged quality floor',()=>{
 for(const f of ['EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md','Brief_Compiler_Image_App_GitHub_Prompt_REV8.md'])
  assert.match(fs.readFileSync('docs/external-app/'+f,'utf8'),/NOV03_APPROVED_AAR_IMPROVEMENTS\.md/);
 const doc=fs.readFileSync('docs/automation/NOV03_APPROVED_AAR_IMPROVEMENTS.md','utf8');
 for(const phrase of ['GDPx attempt 2','Mistral attempt 1','LifeVal attempt 1','not an attempt cap','320px','candidate_reviews','Not recorded'])assert.ok(doc.includes(phrase),phrase);
});
