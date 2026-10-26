import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecentSourceDiscovery} from '../compiler/recent-source-discovery.mjs';

const date='2026-10-27';
const domains=['openai.com','ibm.com','microsoft.com','nvidia.com',
  'cohere.com','anthropic.com','research.google','arxiv.org'];
const candidates=domains.map((domain,i)=>({
  url:'https://'+domain+'/research/oct27-freshness-'+i,
  publisher:'Original source publisher '+domain,
  original_date:i>=6?'2026-10-26T18:00:00Z':'2026-10-24T12:00:00Z',
  checked_at:'2026-10-27T00:03:00Z',
  disposition:i<6?'selected':'considered',
  disposition_reason:'Reviewed original published source for verified evidence, novelty and practical reader applicability.'
}));
const stories=candidates.slice(0,6).map((candidate,i)=>({
  id:'verified-story-'+i,
  source:{url:candidate.url,published_at:candidate.original_date}
}));
const reason='The original source has stronger verified reader learning value than the alternatives because it explains practical evidence, a bounded action and a real uncertainty for this audience.';
const data=()=>({edition_date:date,stories,
  source_discovery_audit:{reviewed_at:'2026-10-27T00:04:00Z',
    candidates:structuredClone(candidates),
    fallback_decisions:stories.map(s=>({
      story_id:s.id,
      newer_sources_considered:[candidates[6].url,candidates[7].url],
      why_selected_over_recent_options:reason
    }))
  }});
test('Oct27 forbids copy/pasting one freshness explanation over six older original sources',()=>{
  const b=data();
  assert.throws(()=>validateRecentSourceDiscovery(b),
    /duplicated_non_specific_fallback_rationale/);
});
test('Distinct verified selection rationales pass without forcing a 24-hour quota',()=>{
  const b=data();
  for(const [i,item] of b.source_discovery_audit.fallback_decisions.entries())
    item.why_selected_over_recent_options+=' Distinct research question '+i+
      ' documents a different evidence limitation in the full publisher read.';
  const result=validateRecentSourceDiscovery(b);
  assert.equal(result.result,'PASS');
  assert.equal(result.selected_within_24h,0);
  assert.equal(result.independently_recorded_within_24h,2);
  assert.equal(result.distinct_older_story_fallback_explanations,6);
});
test('Earlier October editions remain unaffected by the prospective rule',()=>{
  const b=data();b.edition_date='2026-10-26';
  assert.equal(validateRecentSourceDiscovery(b).result,'PASS');
});
