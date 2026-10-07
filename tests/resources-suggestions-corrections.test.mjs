import test from 'node:test';
import assert from 'node:assert/strict';
import {validateResourceRegistry,applyResourceObservation} from '../operations/resources.mjs';
import {validateFutureSuggestion,suggestionsForDate,resolveSuggestion} from '../operations/future-brief.mjs';
import {validateCorrection,transitionCorrection,correctionRequiresVisualReview} from '../operations/corrections.mjs';
import {buildDashboardSnapshot} from '../dashboard/snapshot.mjs';

test('resource monitoring records yield, freshness and recurring failures',()=>{
  const registry={
    schema_version:'daily-compiler-resource-registry-v1',
    updated_at:'2026-10-08T00:00:00Z',
    resources:[{
      resource_id:'source-1',name:'Source 1',url:'https://example.com',enabled:true,
      content_types:['article','watchlist'],priority:'primary',search_mode:'site_search',endpoint:null,publisher:'Example',notes:null,
      health:{status:'unknown',last_checked_at:null,last_success_at:null,consecutive_failures:0,observed_yield_rate:null,freshness_hit_rate:null}
    }]
  };
  assert.deepEqual(validateResourceRegistry(registry),[]);
  const obs={
    schema_version:'daily-compiler-resource-observation-v1',edition_date:'2026-10-08',execution_id:'e1',
    resource_id:'source-1',checked_at:'2026-10-08T00:10:00Z',content_type:'article',
    queries:2,candidates_found:10,usable_candidates:4,selected_items:1,fresh_items:3,failures:[],duration_ms:2000
  };
  const updated=applyResourceObservation(registry,obs);
  assert.equal(updated.resources[0].health.status,'healthy');
  assert.equal(updated.resources[0].health.observed_yield_rate,0.4);
  assert.equal(updated.resources[0].health.freshness_hit_rate,0.75);
});

test('future Brief inbox supports suggestions and must-include-if-valid directives',()=>{
  const a={
    schema_version:'daily-compiler-future-brief-suggestion-v1',suggestion_id:'s1',
    created_at:'2026-10-07T12:00:00Z',created_by:'owner',target_date:'2026-10-08',
    content_type:'video',mode:'must_consider',status:'queued',priority:'high',
    payload:{url:'https://example.com/video'},reason:'Use tomorrow if relevant.',source_url:'https://example.com/video',
    expires_at:null,dedupe_key:'video:https://example.com/video',resolution:null
  };
  assert.deepEqual(validateFutureSuggestion(a),[]);
  assert.equal(suggestionsForDate([a],'2026-10-08').length,1);
  assert.equal(resolveSuggestion(a,{status:'selected',resolution:{story_id:'story-1'}}).status,'selected');
});

test('post-publication corrections preserve history and never require a new execution',()=>{
  const c={
    schema_version:'daily-compiler-post-publication-correction-v1',
    correction_id:'corr-1',edition_date:'2026-10-08',requested_at:'2026-10-08T12:00:00Z',
    requested_by:'owner',correction_type:'replace_podcast',target:{id:'p1'},replacement:{id:'p2'},
    reason:'Better source.',status:'REQUESTED',preserve_original:true,new_execution_allowed:false,
    protected_pr_required:true,live_verification_required:true,semantic_scope:'media_only',
    correction_revision:1,supersedes:null,verification_receipt_path:null
  };
  assert.deepEqual(validateCorrection(c),[]);
  assert.equal(correctionRequiresVisualReview(c),false);
  const validated=transitionCorrection(c,'VALIDATED');
  assert.equal(validated.status,'VALIDATED');
  assert.throws(()=>transitionCorrection(c,'MERGED'),/illegal_correction_transition/);
});

test('dashboard snapshot combines operational surfaces for a later backend',()=>{
  const d=buildDashboardSnapshot({
    generatedAt:'2026-10-08T13:00:00Z',
    system:{status:'healthy'},
    currentRun:{edition_date:'2026-10-08'},
    recentRuns:[],resourceHealth:[],futureBriefQueue:[],corrections:[],
    usage:{dot_active_seconds:20,work_active_seconds:10},risks:[],nextActions:[]
  });
  assert.equal(d.schema_version,'daily-compiler-dashboard-snapshot-v1');
  assert.equal(d.usage.work_active_seconds,10);
});
