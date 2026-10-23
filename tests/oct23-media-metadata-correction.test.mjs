import test from 'node:test';
import assert from 'node:assert/strict';
import {correctAgeBadges,removeUnverifiedHost} from '../scripts/correct-oct23-media-metadata.mjs';

const badge=s=>'<span class="coverage-label">'+s+'</span>';
const video='<h1>AI Academy</h1>'+badge('New development')+
  '<p><strong>Date:</strong> November 9, 2023</p>';
const pod=(id,date)=>'<h3>Original episode</h3>'+badge('New development')+
  '<span data-podcast-id="'+id+'"></span>'+
  '<p><strong>Show:</strong> Source<br />\n<strong>Host / guest:</strong> Not listed<br />\n'+
  '<strong>Date:</strong> '+date+'</p>';
test('old original video date receives truthful evergreen age without changing source date',()=>{
 const p=correctAgeBadges(video,{role:'video',sourceDate:'November 9, 2023'});
 assert.equal(p.changed,1);
 assert.ok(p.text.includes(badge('Evergreen instructional video')));
 assert.ok(p.text.includes('November 9, 2023'));
 assert.ok(!p.text.includes(badge('New development')));
 assert.throws(()=>correctAgeBadges(p.text,{role:'video',sourceDate:'November 9, 2023'}),/video_badge_not_exactly_one/);
});
test('October 22 podcast is new while October 20 podcast has recent fallback badge',()=>{
 const first=correctAgeBadges(pod('dab-podcast-2026-10-23-1','October 22, 2026'),{
  role:'dab-podcast-2026-10-23-1',sourceDate:'October 22, 2026'});
 const second=correctAgeBadges(pod('dab-podcast-2026-10-23-2','October 20, 2026'),{
  role:'dab-podcast-2026-10-23-2',sourceDate:'October 20, 2026'});
 assert.ok(first.text.includes(badge('New AI podcast episode')));
 assert.ok(second.text.includes(badge('Recent AI podcast episode fallback')));
 assert.throws(()=>correctAgeBadges(pod('dab-podcast-2026-10-23-2','October 20, 2026'),{
  role:'dab-podcast-2026-10-23-2',sourceDate:'October 22, 2026'}),/original_media_date_not_in_reader|date_binding_changed/);
});
test('unsupported host placeholder is removed without deleting verified show/date/summary text',()=>{
 const html=removeUnverifiedHost(pod('dab-podcast-2026-10-23-1','October 22, 2026'),'html');
 assert.equal(html.removed,1);
 assert.ok(!html.text.includes('Not listed'));
 assert.ok(html.text.includes('<strong>Show:</strong> Source'));
 assert.ok(html.text.includes('October 22, 2026'));
 const md='**Show:** Original podcast\n**Host / guest:** Not listed  \n**Date:** October 22, 2026\n';
 const markdown=removeUnverifiedHost(md,'md');
 assert.equal(markdown.removed,1);
 assert.ok(markdown.text.includes('**Show:** Original podcast'));
 assert.ok(markdown.text.includes('**Date:** October 22, 2026'));
 assert.ok(!markdown.text.includes('Not listed'));
});
