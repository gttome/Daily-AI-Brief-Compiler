import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeArticleSourceRecency} from '../scripts/verify-media-freshness.mjs';
test('freshness reporting distinguishes exact 24h proof from date-only original records',()=>{
 const stories=['2026-10-28','2026-10-27','2026-10-24','2026-10-13','bad-date','2026-10-28T12:00:00Z'].map(d=>({source:{published_at:d}}));
 const x=summarizeArticleSourceRecency({edition_date:'2026-10-29',stories,
  editorial_provenance:{selection_locked_at:'2026-10-29T01:00:00Z'}});
 assert.equal(x.counts.calendar_0_to_1_days,2);
 assert.equal(x.counts.calendar_4_to_7_days,1);
 assert.equal(x.counts.older_than_7_calendar_days,1);
 assert.equal(x.counts.unknown,1);
 assert.equal(x.counts.precise_24h_original_timestamps,1);
 assert.equal(x.date_only_cannot_prove_rolling_24h,true);
 const missingClock=summarizeArticleSourceRecency({edition_date:'2026-10-29',stories});
 assert.equal(missingClock.counts.precise_24h_original_timestamps,0);
 assert.equal(missingClock.original_timestamp_cutoff_at,null);
});
