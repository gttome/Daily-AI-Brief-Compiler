import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReadingSupport} from '../vendor/production-reader/snapshot/_generator/lib/reading-support.mjs';
import {mediaCoverageLabel} from '../compiler/reader-materializer.mjs';

const row=(id,label)=>({
 item_id:id,coverage_label:label,label_reason:'The original publication date establishes the media freshness label.',
 learning_outcome:'Review the demonstrated subject and its relevant professional use.',
 context_term:'Media context',context:'A verifiable original publisher resource with substantive reader value.'
});
function sample(date='2026-10-24'){
 const edition={brief_date:date,stories:[],worth_watching:{
  general:{status:'included',upload_date:'2024-12-19'},
  agents_non_technical_people:{status:'included',upload_date:'2024-07-17'}
 },podcasts:[
  {item_id:'dab-podcast-'+date+'-1',status:'included',publication_date:'2026-10-22'},
  {item_id:'dab-podcast-'+date+'-2',status:'included',publication_date:'2026-10-22'}
 ]};
 const sourceDates=['2024-12-19','2024-07-17','2026-10-22','2026-10-22'];
 const types=['video','video','podcast','podcast'];
 const ids=['dab-video-'+date+'-general','dab-video-'+date+'-agent-skills',
  'dab-podcast-'+date+'-1','dab-podcast-'+date+'-2'];
 const entries=ids.map((id,i)=>row(id,mediaCoverageLabel(date,sourceDates[i],types[i])));
 return {edition,data:{editions:{[date]:entries}}};
}
test('October 24 protected reader accepts the six distinct age-accurate media labels for videos and podcasts',()=>{
 const {edition,data}=sample();
 assert.equal(data.editions[edition.brief_date][0].coverage_label,'Evergreen instructional video');
 assert.equal(data.editions[edition.brief_date][1].coverage_label,'Evergreen instructional video');
 assert.equal(data.editions[edition.brief_date][2].coverage_label,'Recent AI podcast episode fallback');
 assert.doesNotThrow(()=>validateReadingSupport(edition,data));
});
test('forward media label contract rejects a false New label, wrong media type, or legacy New development',()=>{
 for(const wrong of ['New instructional video','Evergreen AI podcast episode','New development']){
  const {edition,data}=sample();
  data.editions[edition.brief_date][0].coverage_label=wrong;
  assert.throws(()=>validateReadingSupport(edition,data),/Reading support requires reviewed labels/);
 }
});
test('new podcast label is accepted only when the original episode falls in the newest publication window',()=>{
 const {edition,data}=sample();
 edition.podcasts[0].publication_date='2026-10-23';
 data.editions[edition.brief_date][2].coverage_label='New AI podcast episode';
 assert.doesNotThrow(()=>validateReadingSupport(edition,data));
 data.editions[edition.brief_date][2].coverage_label='Recent AI podcast episode fallback';
 assert.throws(()=>validateReadingSupport(edition,data),/Reading support requires reviewed labels/);
});
test('historical editions retain unchanged legacy media label vocabulary',()=>{
 const {edition,data}=sample('2026-10-22');
 data.editions[edition.brief_date].forEach(entry=>entry.coverage_label='New development');
 assert.doesNotThrow(()=>validateReadingSupport(edition,data));
 data.editions[edition.brief_date][0].coverage_label='Evergreen instructional video';
 assert.throws(()=>validateReadingSupport(edition,data),/Reading support requires reviewed labels/);
});
test('a media label cannot be used on a published article',()=>{
 const {edition,data}=sample();
 edition.stories.push({story_id:'dab-story-oct24-test',source:{
  url:'https://example.org/article',reading_evidence:{status:'verified',reading_minutes:4,full_source_read:true,verified_at:'2026-10-23T19:00:00Z',method:'publisher_main_text'}
 }});
 data.editions[edition.brief_date].push(row('dab-story-oct24-test','Evergreen instructional video'));
 assert.throws(()=>validateReadingSupport(edition,data),/Reading support requires reviewed labels/);
});
