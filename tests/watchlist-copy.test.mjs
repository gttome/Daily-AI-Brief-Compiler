import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {watchlistCopyProblems,watchlistLegacyProblems,requireWatchlistCopy,WATCHLIST_COPY_EFFECTIVE} from '../compiler/watchlist-copy.mjs';
import {adaptCompilerBundle} from '../compiler/reader-adapter.mjs';

const good={
  summary:'Agent evaluation isolation defines boundaries for browser navigation, external network requests, and permitted tool actions.',
  why_now:'A dated publisher incident analysis provides a concrete boundary failure to evaluate this week.',
  practical_value:'Review teams could turn those controls into regression tests before giving browser agents broader access.'
};
const fixture=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
test('Watchlist requires three substantive, distinct paragraphs',()=>{
 assert.equal(WATCHLIST_COPY_EFFECTIVE,'2026-10-14');
 assert.deepEqual(watchlistCopyProblems(good),[]);
 assert.doesNotThrow(()=>requireWatchlistCopy(good));
 for(const key of ['summary','why_now','practical_value']){
   const missing={...good};delete missing[key];
   assert.ok(watchlistCopyProblems(missing).length>0,key+' missing did not fail');
   const repeated={...good,[key]:key==='summary'?good.why_now:good.summary};
   assert.ok(watchlistCopyProblems(repeated).length>0,key+' repetition did not fail');
 }
 const close={...good,why_now:good.summary+' Indeed.'};
 assert.ok(watchlistCopyProblems(close).length>0,'near duplicate did not fail');
});
test('Reader adapts independent copy rather than copying one change sentence across three fields',()=>{
 const b=structuredClone(fixture);b.edition_date='2026-10-14';
 for(const kind of ['new','updated','carried_forward','dropped'])
   b.watchlist[kind][0]={...b.watchlist[kind][0],...good};
 const adapted=adaptCompilerBundle(b);
 for(const kind of ['new','updated','carried_forward','dropped']){
   const topic=adapted.watchlist.topics.find(x=>x.name===b.watchlist[kind][0].topic);
   assert.equal(topic.summary,good.summary);
   assert.equal(topic.why_now,good.why_now);
   assert.equal(topic.practical_value,good.practical_value);
 }
});
test('Future Watchlist cannot be published with repeated/empty copy via adapter',()=>{
 const b=structuredClone(fixture);b.edition_date='2026-10-14';
 assert.throws(()=>adaptCompilerBundle(b),/Watchlist.*missing or too thin|Watchlist.*repeated/);
});
test('Historical bundles are not retroactively invalidated, but supplied editorial copy is protected',()=>{
 const b=structuredClone(fixture);
 assert.doesNotThrow(()=>adaptCompilerBundle(b));
 b.watchlist.new[0]={...b.watchlist.new[0],...good,why_now:good.summary};
 assert.throws(()=>adaptCompilerBundle(b),/Watchlist.*repeated/);
});
test('Dropped-topic evidence uses its own previous source before unrelated article fallback',()=>{
 const b=structuredClone(fixture);
 b.watchlist.dropped[0].previous_evidence={url:'https://publisher.example.org/previous',date:'2026-10-04'};
 const topic=adaptCompilerBundle(b).watchlist.topics.find(x=>x.name==='Fixture Dropped Signal');
 assert.equal(topic.evidence.at(-1).url,'https://publisher.example.org/previous');
});

test('legacy Watchlist fields are checked before publication on new editions',()=>{
  const goodLegacy={...good,topic:'Reusable audited procedures',
    why:'This signal remains active while the source is applicable.',
    what_changed:'Recent authoritative documentation describes an updated mechanism.',
    reason:'This topic is superseded by stronger verifiable coverage.'};
  for(const kind of ['new','updated','carried_forward','dropped'])
    assert.deepEqual(watchlistLegacyProblems(goodLegacy,kind),[]);
  const carried={...goodLegacy};delete carried.why;
  assert.match(watchlistLegacyProblems(carried,'carried_forward').join('; '),/why/);
  const changed={...goodLegacy};delete changed.what_changed;
  assert.match(watchlistLegacyProblems(changed,'updated').join('; '),/what_changed/);
  const fresh={...goodLegacy};delete fresh.why;
  assert.match(watchlistLegacyProblems(fresh,'new').join('; '),/why/);
  const dropped={...goodLegacy};delete dropped.reason;delete dropped.why;
  assert.match(watchlistLegacyProblems(dropped,'dropped').join('; '),/reason\/why/);
  assert.throws(()=>watchlistLegacyProblems(goodLegacy,'unknown'),/Unknown Watchlist/);
});
test('prospective validator checks reader legacy Watchlist fields before seal',()=>{
  const src=fs.readFileSync('compiler/pending-editorial.mjs','utf8');
  assert.match(src,/bundle.edition_date>='2026-10-26'/);
  assert.match(src,/watchlistLegacyProblems\(entry,kind\)/);
});
