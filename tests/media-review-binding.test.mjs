import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMediaSelection} from '../compiler/media.mjs';
import {makeMediaFixture,makeMediaEvidence} from './fixtures/media.mjs';

const staleReview=/reader review.*(?:stale|different|evidence|bound)|reviewed evidence.*mismatch/i;

test('I03-T06 changing selected story meaning invalidates the prior media reader-value review',()=>{
  for(const field of ['summary','why_it_matters']){
    const fixture=makeMediaFixture();
    assert.equal(validateMediaSelection(fixture).result,'PASS');
    const reviewed=JSON.stringify(fixture.evidence.records.filter(record=>record.kind==='reader_value_review'));
    fixture.bundle.stories[0][field]='The selected coverage now describes an unrelated professional policy and no longer supports the media connection reviewed earlier.';
    assert.equal(JSON.stringify(fixture.evidence.records.filter(record=>record.kind==='reader_value_review')),reviewed);
    assert.throws(()=>validateMediaSelection(fixture),staleReview,`${field} changed under an unchanged reader review`);
  }
});

test('I03-T06 changing retained supporting evidence cannot reuse a prior review under the same reference IDs',()=>{
  const mutations=[
    record=>{record.source_excerpt='Replacement evidence discusses a different professional workflow and supports a materially different relationship to the selected coverage. The original review has not been repeated.';},
    record=>{record.supports.connection_to_brief='The replacement support claims a different relationship than the source evidence used in the original reader-value review.';},
    record=>{record.evidence_url='https://unrelated.example/changed-source-observation';}
  ];
  for(const mutate of mutations){
    const fixture=makeMediaFixture();
    assert.equal(validateMediaSelection(fixture).result,'PASS');
    const support=fixture.evidence.records.find(record=>record.kind==='content_support');
    const ids=fixture.evidence.records.map(record=>record.id);
    const reviewed=JSON.stringify(fixture.evidence.records.filter(record=>record.kind==='reader_value_review'));
    mutate(support);
    assert.deepEqual(fixture.evidence.records.map(record=>record.id),ids);
    assert.equal(JSON.stringify(fixture.evidence.records.filter(record=>record.kind==='reader_value_review')),reviewed);
    assert.throws(()=>validateMediaSelection(fixture),staleReview);
  }
});

test('I03-T04 Apple country, slug and display aliases cannot count one show as two sources',()=>{
  for(const sourcePlatform of ['apple','spotify']){
    const fixture=makeMediaFixture();
    fixture.bundle.podcasts.forEach((podcast,index)=>{
      const country=index?'gb':'us',slug=index?'test-show-with-host':'test-show';
      podcast.item_id=String(100000001+index);
      podcast.url=`https://podcasts.apple.com/${country}/podcast/${slug}/id111111111?i=${podcast.item_id}`;
      podcast.source_url=sourcePlatform==='apple'
        ?`https://podcasts.apple.com/${country}/podcast/${slug}/id111111111`
        :`https://open.spotify.com/show/${index?'ABCDE':'FGHIJ'}`;
      podcast.source_id=index?'second-source-alias':'first-source-alias';
      podcast.source=index?'Test Show with Host':'Test Show';
    });
    fixture.evidence=makeMediaEvidence(fixture.bundle);
    assert.throws(()=>validateMediaSelection(fixture),/distinct canonical shows|duplicate.*show/i,sourcePlatform);
  }
});

test('I03-T04 a www alias or named show landing path cannot become a selected podcast episode',()=>{
  for(const sourceUrl of ['https://www.podcast1.example/shows/synthetic-podcast','https://podcast1.example/feed.xml']){
    const fixture=makeMediaFixture(),podcast=fixture.bundle.podcasts[0];
    podcast.url='https://podcast1.example/shows/synthetic-podcast';
    podcast.source_url=sourceUrl;
    fixture.evidence=makeMediaEvidence(fixture.bundle);
    assert.throws(()=>validateMediaSelection(fixture),/source\/show listing|generic media listing|show.*landing|exact.*episode/i);
  }
});
