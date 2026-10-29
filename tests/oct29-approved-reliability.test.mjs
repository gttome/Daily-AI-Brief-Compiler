import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractDatedCandidates,inspectEditorialIndex} from '../scripts/qualify-editorial-source-items.mjs';
import {EDITORIAL_INDEX_RETRY_POLICY,selectEditorialIndexRetries,
 isRetryableEditorialIndexFailure,summarizeEditorialIndexRetries} from '../operations/editorial-source-retry.mjs';
import {compileDailyReports,renderMarkdown} from '../scripts/compile-daily-aar.mjs';
import {summarizeTaskOriginEvidence} from '../scripts/task-origin-evidence.mjs';
import {validateFrozenImageSpecification} from '../scripts/preflight-image-firstpass.mjs';

const date='2026-10-30',now=date+'T11:00:00Z';
test('prospective index retries are transient-only, bounded and rotated, never admission',()=>{
 const timeout=id=>({resource_id:id,outcome:'SOURCE_ERROR',
  reason:'Could not inspect original publisher index: This operation was aborted; no items qualified.'});
 const a=Array.from({length:39},(_,i)=>timeout('publisher-'+String(i).padStart(2,'0')));
 a.push({resource_id:'blocked',outcome:'ACCESS_BLOCKED',reason:'HTTP 429'});
 a.push({resource_id:'undated',outcome:'NO_ELIGIBLE_ITEMS',reason:'No dated candidates'});
 a.push({resource_id:'bad-content',outcome:'SOURCE_ERROR',reason:'Could not inspect original publisher index: index did not return HTML/RSS/Atom text'});
 assert.equal(EDITORIAL_INDEX_RETRY_POLICY.max_second_attempts,16);
 assert.equal(isRetryableEditorialIndexFailure(a[0]),true);
 assert.equal(isRetryableEditorialIndexFailure(a[a.length-1]),false);
 const first=selectEditorialIndexRetries({editionDate:date,observations:a});
 const second=selectEditorialIndexRetries({editionDate:'2026-10-31',observations:a});
 assert.equal(first.length,16);
 assert.equal(new Set(first).size,16);
 assert.notDeepEqual(first,second);
 assert.ok(first.every(id=>id.startsWith('publisher-')));
 assert.deepEqual(selectEditorialIndexRetries({editionDate:'2026-10-29',observations:a}),[]);
 assert.throws(()=>selectEditorialIndexRetries({editionDate:date,observations:[a[0],a[0]]}),/DUPLICATE/);
 const summary=summarizeEditorialIndexRetries([
  {second_attempt:{outcome:'CANDIDATES_FOUND'}},{second_attempt:{outcome:'NO_ELIGIBLE_ITEMS'}},
  {second_attempt:{outcome:'SOURCE_ERROR'}}]);
 assert.deepEqual([summary.attempted,summary.recovered_to_index_read,
  summary.recovered_to_candidate,summary.still_unavailable],[3,2,1,1]);
 assert.equal(summary.editorial_content_admission,'NOT_PROVEN_FROM_INDEX_RETRIES');
});
test('explicit publisher JSON-LD article chronology is admitted as an index candidate, not a verified article',()=>{
 const source='https://example.org/news';
 const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[
  {'@type':'NewsArticle',headline:'New independently dated AI mechanism',url:'https://example.org/reports/ai',datePublished:'2026-10-29T09:00:00Z'},
  {'@type':'BlogPosting',headline:'An undated publisher update',url:'https://example.org/no-date'},
  {'@type':'NewsArticle',headline:'A distinct external publisher update',url:'https://other.example.net/post',datePublished:'2026-10-29T09:00:00Z'}
 ]})+'</script>';
 const found=extractDatedCandidates(html,{baseUrl:source,now});
 assert.equal(found.length,1);
 assert.equal(found[0].url,'https://example.org/reports/ai');
 const fetchImpl=async()=>new Response(html,{status:200,headers:{'content-type':'text/html'}});
 return inspectEditorialIndex({resource_id:'firstparty',roles:['article'],url:source},
  {now,fetchImpl}).then(receipt=>{
   assert.equal(receipt.outcome,'CANDIDATES_FOUND');
   assert.equal(receipt.items.length,1);
   assert.notEqual(receipt.evidence_method,'full_article_read');
  });
});
test('Compiler AAR preserves owner-detected corrected defect rather than claiming zero incidents',()=>{
 const e={'postpublication-incidents':{edition_date:'2026-10-29',incidents:[{
  incident_id:'oct29-workday-product-marketing-pair',detected_by:'owner',
  status:'CORRECTED_LIVE_VERIFIED',corrective_pr:290
 }]},'postpublish-video-playback':{edition_date:'2026-10-29',
  result:'TWO_PUBLISHED_VIDEOS_PLAYBACK_PASS'}};
 const c=compileDailyReports({cycleDate:'2026-10-28',evidence:e}).compiler;
 assert.equal(c.postpublication_incidents_recorded,1);
 assert.equal(c.owner_detected_postpublication_defects,1);
 assert.equal(c.corrected_postpublication_defects,1);
 assert.ok(c.defects.some(s=>s.includes('PR #290')));
 assert.match(renderMarkdown(c),/CORRECTED_LIVE_VERIFIED/);
 assert.match(renderMarkdown(c),/Original postpublication playback check/);
 assert.equal(c.autonomy_status,'UNPROVEN');
 assert.equal(c.owner_intervention_required,null);
});
test('unverified task scheduler never becomes authenticated from repo record',()=>{
 const missing=summarizeTaskOriginEvidence(null,'2026-10-30','compiler');
 assert.ok(missing.evidence_gaps.includes('NO_INDEPENDENT_FIRST_PARTY_SCHEDULER_ATTESTATION'));
 const claimed=summarizeTaskOriginEvidence({edition_date:'2026-10-30',lane:'compiler',
  task_entry_observed_at:'2026-10-30T00:15:00Z',
  scheduler:{source:'first_party_scheduler',invocation_id:'12345678',
   invoked_at:'2026-10-30T00:15:00Z',receipt_ref:'synthetic-repo-reference-123'},
  capability_preflight:{result:'CAPABILITY_ROUTE_PROVEN',
   checked_at:'2026-10-30T00:15:02Z',evidence_ref:'repo-ref-verified-locally'}
 },'2026-10-30','compiler');
 assert.equal(claimed.missing_first_party_verification,true);
 assert.ok(claimed.evidence_gaps.includes('NO_INDEPENDENT_FIRST_PARTY_SCHEDULER_ATTESTATION'));
 assert.equal(claimed.repository_record_is_not_authentication,true);
});
test('October 30 first-pass rules reject unsupported visual motifs and tiny preview labels, no Oct29 reseal',()=>{
 const original=JSON.parse(fs.readFileSync('external-image-packages/2026-10-29/reviews/six-frozen-specs.json','utf8'))[0];
 const story={story_id:original.story_id,primary_source:{url:original.source_url,
  verified_read_evidence:{status:'verified',full_source_read:true}}};
 assert.equal(validateFrozenImageSpecification({spec:original,story}).result,'FROZEN_PREGENERATION_SPEC_PASS');
 const prospective=structuredClone(original);
 prospective.edition_date='2026-10-30';
 assert.throws(()=>validateFrozenImageSpecification({spec:prospective,story}),/oct30_mobile_inline_and_forbidden_motif/);
 const qc=prospective.pre_generation_checks;
 Object.assign(qc,{mobile_inline_390px_review_planned:true,
  no_avatars_shields_gears_control_knobs:true,no_unsupported_memory_or_permission_flow:true,
  no_pseudotext_decorative_microstrokes:true});
 assert.throws(()=>validateFrozenImageSpecification({spec:prospective,story}),/oct30_mobile_priority_or_secondary/);
 const priority=new Set(qc.thumbnail_priority_labels);
 for(const label of qc.label_layout)
  label.minimum_font_px=Math.max(label.minimum_font_px,priority.has(label.label)?36:28);
 assert.equal(validateFrozenImageSpecification({spec:prospective,story}).result,'FROZEN_PREGENERATION_SPEC_PASS');
 qc.no_avatars_shields_gears_control_knobs=false;
 assert.throws(()=>validateFrozenImageSpecification({spec:prospective,story}),/oct30_mobile_inline_and_forbidden_motif/);
});
