import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalReaderDate,adaptCompilerBundle} from '../compiler/reader-adapter.mjs';
import {removeEmptyAndRepeatedMediaCopy} from '../compiler/reader-materializer.mjs';
import {assertPublishedReaderQuality} from '../compiler/reader-quality.mjs';
import {fixOct22RenderedDates} from '../scripts/correct-oct22-reader-dates.mjs';
test('full UTC publisher evidence is normalized solely at the reader boundary',()=>{
 assert.equal(canonicalReaderDate('2026-10-21T00:00:00Z'),'2026-10-21');
 assert.equal(canonicalReaderDate('2026-10-21T00:00:00.000Z'),'2026-10-21');
 assert.equal(canonicalReaderDate('2026-10-21'),'2026-10-21');
 for(const x of ['2026-02-30','2026-10-21Tnot-clock','October 21, 2026','2026-10-21T23:99:00Z'])
   assert.throws(()=>canonicalReaderDate(x),/calendar date/);
});
test('canonical October 22 reader dates and source coverage exclude older evergreen videos',()=>{
 const b=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
 for(const s of b.stories)s.source.published_at='2026-10-21T00:00:00Z';
 b.videos[0].original_date='2023-11-09T00:00:00Z';
 b.videos[1].original_date='2024-05-17T00:00:00Z';
 b.podcasts[0].original_date='2026-10-20T00:00:00Z';
 b.podcasts[1].original_date='2026-10-17T00:00:00Z';
 const a=adaptCompilerBundle(b);
 assert.ok(a.edition.stories.every(s=>s.event_date==='2026-10-21'));
 assert.equal(a.edition.worth_watching.general.upload_date,'2023-11-09');
 assert.equal(a.edition.podcasts[0].publication_date,'2026-10-20');
 assert.deepEqual(a.edition.coverage_period,{start:'2026-10-21',end:'2026-10-21'});
});
test('true dates replace only verified malformed labels without rewriting narrative',()=>{
 const s='<p><strong>Date:</strong> October NaN, 2026</p><p>Summary is unchanged.</p>';
 const fixed=fixOct22RenderedDates(s,['October 21, 2026']);
 assert.match(fixed,/October 21, 2026/);
 assert.match(fixed,/Summary is unchanged/);
 assert.throws(()=>fixOct22RenderedDates(s,['November 9, 2023']),/observed date differs/);
 assert.throws(()=>fixOct22RenderedDates(s,[]),/observed date differs/);
});
test('only blank topics and exactly duplicated podcast explanation are removed',()=>{
 const original='<p><strong>Date:</strong> October 21, 2026</p>'+
   '<p><strong>Topics:</strong></p>'+
   '<p><strong>Why it matters:</strong> Test permissions and review.</p>'+
   '<p><strong>Connection to the brief:</strong> Test permissions and review.</p>';
 const fixed=removeEmptyAndRepeatedMediaCopy(original);
 assert.doesNotMatch(fixed,/Topics|Connection to the brief/);
 const inline='<p><strong>Duration:</strong> 3:57<br />\n<strong>Topics:</strong></p>';
 assert.equal(removeEmptyAndRepeatedMediaCopy(inline),'<p><strong>Duration:</strong> 3:57</p>');
 assertPublishedReaderQuality(fixed,{route:'podcast',expectedDates:1});
 assert.throws(()=>assertPublishedReaderQuality(original,{route:'original',expectedDates:1}),/empty_topics/);
 const unique='<p><strong>Connection to the brief:</strong> Separate source-grounded relation.</p>';
 assert.ok(removeEmptyAndRepeatedMediaCopy(unique).includes('Separate source-grounded relation.'));
});

test('long transcript-reviewed AI episode yields a chapter/sponsor map without playback claims',async()=>{
 const {podcastChapterGuide}=await import('../compiler/reader-materializer.mjs');
 const item={duration_minutes:85.15,quality_review:{
   content_evidence:{kind:'whole_episode_transcript'},editorial_segments:[
     {start_seconds:0,end_seconds:628,kind:'ai',topic:'Agent permissions, safety and authority boundaries'},
     {start_seconds:628,end_seconds:826,kind:'advertisement',topic:'A clearly identified publisher sponsor message'},
     {start_seconds:826,end_seconds:5109,kind:'ai',topic:'Formal verification and model provenance'}
   ]}};
 const chapter=podcastChapterGuide(item);
 assert.match(chapter,/Episode chapter guide/);
 assert.match(chapter,/10:28 — Sponsor break/);
 assert.match(chapter,/13:46 — AI discussion/);
 assert.match(chapter,/not independently observed audio playback/);
 assert.equal(podcastChapterGuide({...item,duration_minutes:5}),'');
});
test('podcast article bridge is optional but must not clone Why it matters',()=>{
 const b=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
 b.podcasts[0].connection_to_brief=b.podcasts[0].why_it_matters;
 b.podcasts[1].connection_to_brief='Compare the article permission boundary with this source-grounded expert governance discussion.';
 const a=adaptCompilerBundle(b);
 assert.equal(a.edition.podcasts[0].connection,'');
 assert.match(a.edition.podcasts[1].connection,/permission boundary/);
 assert.doesNotMatch(removeEmptyAndRepeatedMediaCopy('**Connection to the brief:** \n**Summary:** Verified'),/Connection to the brief/);
});
