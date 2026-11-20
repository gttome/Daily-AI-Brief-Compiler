import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVideoDiscoveryWorklist,recordVideoCandidate,summarizeVideoCandidateDiscovery} from '../operations/video-discovery-quality.mjs';
import {validateObservedSourceMetadata,validateSpecificFallbackComparisons} from '../operations/editorial-metadata-checkpoint.mjs';
import {recordTrendSearch,recordSelectedTrendMapping} from '../operations/trend-receipt-writer.mjs';
import {summarizeNov20Evidence} from '../scripts/nov20-evidence-review.mjs';
import {assessFirstPassPlanningRisks} from '../scripts/preflight-image-firstpass.mjs';
import {inspectEditorialIndex} from '../scripts/qualify-editorial-source-items.mjs';
import {mediaCoverageLabel,neutralVideoCoverageReaderOverlay} from '../compiler/reader-materializer.mjs';
const edition='2026-11-21',observed='2026-11-21T01:10:00Z',locked='2026-11-21T01:20:00Z';
const registry=JSON.parse(fs.readFileSync('config/resource-registry.json'));
const story={id:'test-original',focus:'Technical AI Engineering',source:{url:'https://example.org/paper',title:'An original paper title',published_at:'2026-11-18T00:00:00Z'}};
const bundle=()=>({edition_date:edition,stories:[structuredClone(story)],videos:[],editorial_provenance:{selection_locked_at:locked}});
const candidate={program_url:'https://example.org/video',source_evidence_url:'https://example.org/transcript',title:'Original mechanism demonstration',original_publisher_family:'Original lab',original_date:'2026-11-20',duration_minutes:8,content_kind:'technical_demonstration',review_scope:'COMPLETE_TRANSCRIPT',editorial_value_basis:'The complete transcript explains the evaluated mechanism, its actual comparison and practical limitations in detail.',promotional_risk:'low',disposition:'qualified',reviewed_at:observed};
test('video worklist broadens the real roster without claiming inspections or playback',()=>{
 const work=buildVideoDiscoveryWorklist({editionDate:edition,registry});
 assert.equal(work.registered_routes,37);assert.equal(work.routes.length,37);
 assert.ok(work.routes.slice(0,8).every(x=>x.discovery_class!=='review_item_before_classification'));
 assert.ok(work.routes.every(x=>x.inspection_status==='NOT_ATTEMPTED'));
 assert.equal(work.targets.non_news_candidates,8);assert.equal(work.targets.publication_blocker,false);
 assert.equal(new Set(work.routes.slice(0,8).map(x=>x.original_publisher_family)).size,7);
});
test('candidate recording rejects retrospective and metadata-only reviews while retaining transcript scope',()=>{
 const b=bundle();delete b.editorial_provenance.selection_locked_at;
 const ledger={schema_version:'daily-video-candidate-discovery-v1',edition_date:edition,candidates:[]};
 const next=recordVideoCandidate(ledger,b,candidate,{now:locked});
 assert.equal(ledger.candidates.length,0);assert.equal(next.candidates.length,1);
 assert.throws(()=>recordVideoCandidate(next,b,candidate,{now:locked}),/duplicate_program/);
 assert.throws(()=>recordVideoCandidate(ledger,bundle(),candidate,{now:locked}),/selection_locked/);
 for(const bad of [{...candidate,review_scope:'metadata_only'},{...candidate,reviewed_at:'2026-11-22T00:00:00Z'},{...candidate,original_date:'2026-11-31'},{...candidate,duration_minutes:30}])
  assert.throws(()=>recordVideoCandidate(ledger,b,bad,{now:locked}),/video_candidate_discovery/);
 const result=summarizeVideoCandidateDiscovery({...bundle(),videos:[{url:candidate.program_url}],video_candidate_discovery:next});
 assert.equal(result.non_news_candidates,1);assert.equal(result.no_full_program_playback_inferred,true);
 assert.equal(summarizeVideoCandidateDiscovery(bundle()).substantive_candidates,null);
});
test('selected trend mapping must bind the candidate from its own real topic/format search',()=>{
 const input={schema_version:'daily-ai-topic-top10-input-v1',edition_date:edition,cycle_date:'2026-11-20',source_commit:'a'.repeat(40),report_sha256:'b'.repeat(64),retrieved_at:'2026-11-21T01:00:00Z'};
 const c={schema_version:'daily-ai-topic-top10-search-coverage-v1',edition_date:edition,cycle_date:input.cycle_date,source_commit:input.source_commit,report_sha256:input.report_sha256,searches:[{topic_id:'test-topic',format:'article',query:'original mechanism evidence',outcome:'not_attempted',source_urls:[],candidate_ids:[]}],selected_mappings:[]};
 const coverage=recordTrendSearch(c,input,{topic_id:'test-topic',format:'article',query:'original mechanism evidence',attempted_at:observed,outcome:'searched',source_urls:[story.source.url],candidate_ids:['original-candidate'],reason:'Read the exact original paper and recorded its actual scope and limitations.'});
 const m={topic_id:'test-topic',format:'article',item_id:story.id,url:story.source.url,reason:'Selected this original paper after assessing its specific mechanism and limitations.'};
 assert.throws(()=>recordSelectedTrendMapping(coverage,input,bundle(),m),/NOT_IN_RECORDED_CANDIDATES/);
 assert.equal(recordSelectedTrendMapping(coverage,input,bundle(),{...m,candidate_id:'original-candidate'}).selected_mappings.length,1);
});
test('publisher metadata cannot silently replace original dates or be backfilled after lock',()=>{
 const b=bundle(),row={story_id:story.id,source_url:story.source.url,evidence_url:story.source.url,original_title:story.source.title,original_date:'2026-11-18',date_precision:'day',observed_at:observed};
 b.editorial_provenance.source_metadata=[row];
 assert.equal(validateObservedSourceMetadata(b).status,'OBSERVED_METADATA_MATCH');
 for(const bad of [{...row,original_date:'2026-11-19'},{...row,original_title:'Different original title'},{...row,observed_at:'2026-11-21T01:21:00Z'}]){
  b.editorial_provenance.source_metadata=[bad];assert.throws(()=>validateObservedSourceMetadata(b),/mismatch/);
 }
 assert.equal(validateObservedSourceMetadata(bundle()).status,'NOT_RECORDED');
});
test('older-story alternatives require real newer same-lane candidates and allow an honest gap',()=>{
 const b=bundle();b.source_discovery_audit={candidates:[],fallback_decisions:[{story_id:story.id,newer_sources_considered:[story.source.url]}]};
 assert.throws(()=>validateSpecificFallbackComparisons(b),/self_comparison/);
 const d=b.source_discovery_audit.fallback_decisions[0];d.newer_sources_considered=[];d.comparisons=[];
 d.search_gap={query:'newer original mechanism evidence',checked_urls:['https://example.org/research'],attempted_at:observed,reason:'The original research index had no newer relevant study with a substantiated result and usable methods.'};
 assert.equal(validateSpecificFallbackComparisons(b).stories[0].status,'SEARCH_GAP_DISCLOSED');
 const alt={url:'https://example.org/newer',original_date:'2026-11-20'};b.source_discovery_audit.candidates=[alt];
 d.comparisons=[{...alt,focus:story.focus,reviewed_at:observed,substantive_rejection_reason:'The newer paper measured an unrelated mechanism and could not answer the specific practical decision.'}];
 assert.equal(validateSpecificFallbackComparisons(b).stories[0].status,'SPECIFIC_COMPARISON');
 d.comparisons[0].focus='Applied AI';assert.throws(()=>validateSpecificFallbackComparisons(b),/unbound_newer/);
});
test('report preserves contradictory declarations, actual rubric totals and unknown costs',()=>{
 const rubric=s=>Object.fromEntries(Object.entries(s).map(([k,score])=>[k,{score}]));
 const e={'edition-bundle':{edition_date:'2026-11-20',producer_receipt:{work_used:true,codex_used:true,paid_model_api_used:false}},'published-watchlist':{edition_date:'2026-11-20',topics:[{topic_id:'example-a',first_detected:'2026-11-20',research_score:86,rubric:rubric({novelty:4,evidence:5,independence:4,momentum:4,relevance:5,durability:3}),evidence:[{url:'https://example.org/original'},{url:'https://example.net/independent'}]}]}};
 const r=summarizeNov20Evidence('2026-11-20',e);
 assert.equal(r.runtime_policy.status,'DECLARED_RESTRICTED_EDITORIAL_RUNTIME');
 assert.equal(r.runtime_policy.declared_flags.work_used,true);assert.equal(r.runtime_policy.actual_billing,null);
 assert.equal(r.watchlist_score_reconciliation[0].calculated_score,86);assert.equal(r.watchlist_score_reconciliation[0].original_evidence_urls.length,2);
 assert.equal(r.video_candidate_discovery.substantive_candidates,null);assert.equal(r.paper_window_editions,3);
 assert.equal(r.image_efficiency_target.attempt_limit,null);assert.equal(r.image_three_edition_evaluation.owner_artwork_acceptance,'UNKNOWN');
});
test('extra label planning buffer is advisory and cannot cap attempts or certify pixels',()=>{
 const r=assessFirstPassPlanningRisks({edition_date:edition,pre_generation_checks:{label_layout:[{label:'Detached caveat',bounding_box_px:{x:45,y:540,width:300,height:40}}]}});
 assert.equal(r.risks.length,1);assert.equal(r.mandatory_floor_px,40);assert.equal(r.new_publication_gate,false);assert.equal(r.attempt_limit,null);
});
test('video index size failure and access refusal stay distinct from an empty catalog',async()=>{
 const row={resource_id:'test-video',url:'https://example.org/videos',roles:['video']};
 const blocked=await inspectEditorialIndex(row,{fetchImpl:async()=>new Response('',{status:403})});
 assert.equal(blocked.outcome,'ACCESS_BLOCKED');assert.equal(blocked.failure_kind,'ACCESS_BLOCKED');
 const big=await inspectEditorialIndex(row,{fetchImpl:async()=>new Response('x'.repeat(4*1048576+1),{headers:{'content-type':'text/html'}})});
 assert.equal(big.outcome,'SOURCE_ERROR');assert.equal(big.failure_kind,'RESPONSE_SIZE_LIMIT');
 const empty=await inspectEditorialIndex(row,{fetchImpl:async()=>new Response('<html>No dated programs</html>',{headers:{'content-type':'text/html'}})});
 assert.equal(empty.outcome,'NO_ELIGIBLE_ITEMS');assert.equal(empty.failure_kind,null);
});
test('generated neutral labels agree with the materialized strict validator across age bands',()=>{
 const source=neutralVideoCoverageReaderOverlay(fs.readFileSync('vendor/production-reader/snapshot/_generator/lib/reading-support.mjs','utf8'));
 const body=source.match(/function expectedMediaCoverageLabel\([^]*?\n\}/)?.[0];
 assert.ok(body);const expected=Function(body+';return expectedMediaCoverageLabel;')();
 for(const date of ['2026-11-20','2026-11-21'])for(const original of ['2026-11-20','2026-11-18','2026-10-01']){
  assert.equal(mediaCoverageLabel(date,original,'video'),expected(date,original,'video'));
 }
 assert.equal(expected('2026-11-21','2026-11-18','video'),'Recent AI video fallback');
 assert.equal(expected('2026-11-20','2026-11-18','video'),'Recent instructional video fallback');
});
