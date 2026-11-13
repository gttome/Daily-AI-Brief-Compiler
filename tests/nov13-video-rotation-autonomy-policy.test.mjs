import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeVideoEditorialContinuity} from '../scripts/verify-media-freshness.mjs';

const read=path=>fs.readFileSync(path,'utf8');

const seven=[
 ['2026-11-13','PBS / WCMU','https://www.pbs.org/video/pressing-matters-ai-shfca1/'],
 ['2026-11-13','CBS News / The Takeout','https://www.cbsnews.com/video/ai-discovers-bug-up-to-70-percent-websites-at-risk/'],
 ['2026-11-12','CBS News','https://www.cbsnews.com/video/unauthorized-ai-agents-detected-inside-accounts-at-major-banks/'],
 ['2026-11-12','TED','https://www.ted.com/talks/peter_steinberger_how_i_created_openclaw_the_breakthrough_ai_agent'],
 ['2026-11-11','PBS — Breaking the Deadlock','https://www.pbs.org/video/ai-and-the-next-decade-8ef8z8/'],
 ['2026-11-11','TED','https://www.ted.com/talks/amaryllis_liampoti_love_trust_and_marketing_in_the_age_of_ai'],
 ['2026-11-10','Fox News','https://www.foxnews.com/video/6407416427112'],
 ['2026-11-10','CBS News','https://www.cbsnews.com/video/the-risks-of-trusting-personal-ai-agents-with-your-money-data/'],
 ['2026-11-09','Fox News','https://www.foxnews.com/video/6408108124112'],
 ['2026-11-09','CBS News','https://www.cbsnews.com/video/political-ai-deepfakes-infiltrating-midterm-elections-pose-risks-voters/'],
 ['2026-11-08','CBS News','https://www.cbsnews.com/video/how-data-center-development-impacted-midterm-election-results/'],
 ['2026-11-08','PBS NewsHour','https://www.pbs.org/video/what-to-know-about-the-labor-market-amid-ai-bubble-concerns-1794008145/'],
 ['2026-11-07','CBS News','https://www.cbsnews.com/video/stock-market-plummets-as-americans-rebuke-data-center-development/'],
 ['2026-11-07','Fox News','https://www.foxnews.com/video/6408029435112']
].map(([date,source,url])=>({date,source,url,title:source+' exact November '+date}));
const dates=['2026-11-13','2026-11-12','2026-11-11','2026-11-10','2026-11-09','2026-11-08','2026-11-07'];

test('November 7–13 true publisher-family concentration does not disappear through distinct daily URLs',()=>{
 const selected=[
  {source:'PBS / WCMU',title:'New independent program',url:'https://www.pbs.org/video/a-new-program/','original_date':'2026-11-14'},
  {source:'Independent university',title:'University research seminar',url:'https://university.edu/research/lecture','original_date':'2026-11-13'}
 ];
 const audit=summarizeVideoEditorialContinuity({
   videos:selected,previousVideos:seven.slice(0,2),previousSevenVideos:seven,
   previousSevenDates:dates,editionDate:'2026-11-14',previousEditionDate:'2026-11-13'
 });
 assert.equal(audit.seven_edition_video_family_history_complete,true);
 assert.equal(audit.prior_seven_video_count,14);
 const counts=audit.seven_edition_publisher_family_counts;
 assert.equal(counts['family:cbs-news'],6);
 assert.equal(counts['family:pbs'],3);
 assert.equal(counts['family:ted'],2);
 assert.equal(counts['fox news'],3);
 assert.equal(Object.keys(counts).length,4);
 assert.equal(audit.recent_two_edition_family_repeat_count,1);
 assert.equal(audit.overrepresented_prior_seven_families.length,3);
 assert.equal(audit.current_distinct_publisher_count,2);
});
test('current producer and recovery contracts explicitly own the forward-only owner correction',()=>{
 const compiler=read('docs/automation/current/COMPILER.md');
 const recovery=read('docs/automation/current/RECOVERY.md');
 const policy=read('docs/automation/NOV13_AAR_AUTONOMY_VIDEO_DIVERSITY.md');
 for(const value of ['four of fourteen','five distinct','last three','protected','original']) {
   assert.ok(compiler.toLowerCase().includes(value), 'compiler missing '+value);
 }
 for(const value of ['no owner-prompt dependency','six assets','protected','active writer']){
   assert.ok(recovery.toLowerCase().includes(value), 'recovery missing '+value);
 }
 assert.match(policy,/CBS 6, Fox News 3, PBS 3, TED 2/);
 assert.match(policy,/not a hard substitute|not reasons to fabricate/i);
 assert.match(policy,/No new AI producer\/task\/schedule/);
});
