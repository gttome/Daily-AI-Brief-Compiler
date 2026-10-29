import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVideoEditorialBalance} from '../compiler/video-editorial-balance.mjs';
const v=risk=>({quality_review:{promotional_risk:risk}});
const check=(date,first,second,keys)=>validateVideoEditorialBalance({
 edition_date:date,videos:[v(first),v(second)],publishers:keys
});
test('October 29 sealed edition remains historically replayable',()=>{
 assert.equal(check('2026-10-29','medium','medium',['workday','workday']).result,'SKIPPED_HISTORICAL');
});
test('October 30 rejects one company supplying both videos even when low risk',()=>{
 assert.throws(()=>check('2026-10-30','low','low',['workday','workday']),
  /two_distinct_original_video_publishers_required/);
});
test('October 30 rejects a pair of vendor-led medium-risk product tutorials',()=>{
 assert.throws(()=>check('2026-10-30','medium','medium',['workday','ibm']),
  /two_promotional_risk_videos_not_independent_education/);
});
test('October 30 allows a reviewed low-risk independent lesson and a medium-risk lesson',()=>{
 const ok=check('2026-10-30','low','medium',['teacher-a','vendor-b']);
 assert.equal(ok.result,'PASS');
 assert.equal(ok.low_promotion_videos,1);
});
test('unreviewed promotional status cannot bypass the balanced selection gate',()=>{
 assert.throws(()=>check('2026-10-31',undefined,'medium',['a','b']),
  /two_promotional_risk_videos_not_independent_education/);
});
