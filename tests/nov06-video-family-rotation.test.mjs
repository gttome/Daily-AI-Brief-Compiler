import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeVideoEditorialContinuity} from '../scripts/verify-media-freshness.mjs';

const dates=['2026-11-06','2026-11-05','2026-11-04','2026-11-03','2026-11-02','2026-11-01','2026-10-31'];
const prior=dates.flatMap((date,index)=>[
  {date,type:'video',title:'Independent TED program '+index,
   source:index===3?'TED-Ed':'TED',url:'https://www.ted.com/talks/dated_'+index},
  {date,type:'video',title:'Independent news program '+index,
   source:index<5?'PBS / WTTW Chicago Tonight':'CBS Boston',
   url:index<5?'https://www.pbs.org/video/dated-'+index+'/':
     'https://www.cbsnews.com/boston/video/dated-'+index+'/'}
]);
const videos=[
  {title:'New TED video',source:'TED',url:'https://www.ted.com/talks/new'},
  {title:'New PBS video',source:'PBS NewsHour',url:'https://www.pbs.org/video/new/'}
];

test('seven-edition video-family audit groups TED-Ed, PBS affiliates and CBS aliases',()=>{
  const r=summarizeVideoEditorialContinuity({
    videos,previousVideos:prior.filter(x=>x.date===dates[0]),
    previousSevenVideos:prior,previousSevenDates:dates,
    editionDate:'2026-11-07',previousEditionDate:dates[0]});
  assert.equal(r.seven_edition_video_family_history_complete,true);
  assert.equal(r.prior_seven_video_count,14);
  assert.equal(r.seven_edition_publisher_family_counts['family:ted'],7);
  assert.equal(r.seven_edition_publisher_family_counts['family:pbs'],5);
  assert.equal(r.seven_edition_publisher_family_counts['family:cbs-news'],2);
  assert.equal(r.recent_two_edition_family_repeat_count,2);
  assert.equal(r.seven_edition_current_family_exposure[0].prior_seven_video_count,7);
  assert.equal(r.seven_edition_current_family_exposure[1].prior_seven_video_count,5);
  assert.deepEqual(r.overrepresented_prior_seven_families,[
    {family:'family:ted',count:7},{family:'family:pbs',count:5}
  ]);
  assert.match(r.rule,/editorial advisories/);
});
test('missing seven-edition history stays unknown without falsely blocking older editions',()=>{
  const r=summarizeVideoEditorialContinuity({
    videos,previousVideos:[],editionDate:'2026-11-06'});
  assert.equal(r.seven_edition_publisher_family_counts,null);
  assert.equal(r.prior_seven_video_count,null);
  assert.equal(r.recent_two_edition_family_repeat_count,null);
  assert.equal(r.seven_edition_video_family_history_complete,false);
});
