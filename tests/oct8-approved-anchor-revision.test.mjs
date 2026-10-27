import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {OCT8_ORIGINAL_BASELINE,OCT8_LIVE_BASELINE,OCT8_PODCAST_ANCHOR_REVISION,
  proveApprovedOct8ReaderRevision,auditOct8Response} from '../scripts/audit-oct8-live.mjs';
import {repairPodcastOverviewContent} from '../scripts/correct-podcast-overview-anchors.mjs';
const route='briefs/2026-10-08/index.html';
const original=fs.readFileSync(new URL('./fixtures/oct8-approved-anchor-revision/original.html',import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const repaired=()=>Buffer.from(repairPodcastOverviewContent(original.toString('utf8'),route).text);
test('approved podcast repair restores exactly the original October 8 content pin after removing two spans',()=>{
  assert.deepEqual([sha(original),original.length],OCT8_ORIGINAL_BASELINE[route]);
  const fixed=repaired();
  assert.deepEqual([sha(fixed),fixed.length],OCT8_LIVE_BASELINE[route]);
  assert.equal(proveApprovedOct8ReaderRevision(fixed).insertions,2);
  assert.equal(auditOct8Response(route,200,fixed).approved_reader_revision.result,
    'EXACT_OWNER_APPROVED_ANCHOR_REVISION');
});
test('the other sixteen protected objects and all six PNG pins remain exact',()=>{
  assert.equal(Object.keys(OCT8_LIVE_BASELINE).length,17);
  const unchanged=Object.keys(OCT8_ORIGINAL_BASELINE).filter(x=>x!==route);
  assert.equal(unchanged.length,16);
  for(const key of unchanged)assert.deepEqual(OCT8_LIVE_BASELINE[key],OCT8_ORIGINAL_BASELINE[key]);
  assert.equal(unchanged.filter(x=>x.endsWith('.png')).length,6);
});
test('missing/duplicate/wrong anchors, any unrelated byte edit, and old unrepaired HTML fail closed',()=>{
  const fixed=repaired(),insertion=OCT8_PODCAST_ANCHOR_REVISION.insertions[0];
  const variants=[original,Buffer.from(fixed.toString().replace(insertion,'')),
    Buffer.from(insertion+fixed.toString()),
    Buffer.from(fixed.toString().replace('podcast-dab-podcast-2026-10-08-1','podcast-dab-podcast-2026-10-08-3')),
    Buffer.concat([fixed,Buffer.from('\n')])];
  const changed=Buffer.from(fixed);changed[100]^=1;variants.push(changed);
  for(const bytes of variants){
    assert.throws(()=>proveApprovedOct8ReaderRevision(bytes),/oct8_approved_reader_revision/);
    assert.throws(()=>auditOct8Response(route,200,bytes),/live_oct8_hash_or_byte_drift/);
  }
});
