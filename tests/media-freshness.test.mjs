import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateMediaFreshness,sameMedia,samePodcastShow,podcastShowKeys,findFullArchiveRepeats} from '../scripts/verify-media-freshness.mjs';

const root=()=>fs.mkdtempSync(path.join(os.tmpdir(),'media-freshness-'));
function makeHistory(root,date,shows=[
  {title:'Prior podcast A',source:'Previous Show Alpha',url:'https://podcasts.apple.com/us/podcast/previous-a/id1668002681?i=1000500000001'},
  {title:'Prior podcast B',source:'Previous Show Beta',url:'https://podcasts.apple.com/us/podcast/previous-b/id1668002682?i=1000500000002'}
]){
  const page=(kind,title,url,source)=>'<html><h1 class="project-name">'+title+'</h1><p><strong>'+
    (kind==='video'?'Source':'Listen / watch')+':</strong> <a href="'+url+'">'+source+'</a></p></html>';
  fs.mkdirSync(path.join(root,'briefs',date),{recursive:true});
  fs.writeFileSync(path.join(root,'briefs',date,'index.html'),'Published edition');
  for(const [folder,slug,title,url,source] of [
    ['videos','general','Prior video one','https://www.youtube.com/watch?v=ABCDEFGHIJK','Previous Video A'],
    ['videos','agent-skills','Prior video two','https://www.youtube.com/watch?v=ZBCDEFGHIJK','Previous Video B'],
    ...shows.map((s,i)=>['podcasts','episode-'+i,s.title,s.url,s.source])
  ]){
    const dir=path.join(root,folder,date,slug);fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),page(folder==='videos'?'video':'podcast',title,url,source));
  }
}
const article=(url,publisher='Original publisher')=>({source:{url,publisher}});
const stories=[
  article('https://aws.amazon.com/blogs/machine-learning/a'),
  article('https://news.sap.com/story/b'),
  article('https://github.blog/post/c'),
  article('https://research.google/blog/d'),
  article('https://www.anthropic.com/news/e'),
  article('https://openai.com/index/f')
];
const fresh={edition_date:'2026-10-19',stories,videos:[
  {title:'Entirely new video #1',url:'https://www.youtube.com/watch?v=NEWVIDEOAAA'},
  {title:'Entirely new video #2',url:'https://www.youtube.com/watch?v=NEWVIDEOBBB'}
],podcasts:[
  {source:'Fresh Show Gamma',title:'Entirely new podcast one',url:'https://podcasts.apple.com/us/podcast/show-gamma/id1777000001?i=1000500000101'},
  {source:'Fresh Show Delta',title:'Entirely new podcast two',url:'https://podcasts.apple.com/us/podcast/show-delta/id1777000002?i=1000500000102'}
]};
test('fresh source-diverse selection passes seven-edition episode and three-edition show gate',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const result=validateMediaFreshness({bundle:fresh,historyRoot:h});
  assert.equal(result.result,'PASS');
  assert.equal(result.article_diversity.distinct_publishers,6);
  assert.equal(result.podcast_show_cooldown_editions,3);
  assert.equal(result.seven_edition_article_history_complete,false); // fixture has no story history
});
test('previous video and Apple episode IDs reject exact media repeats',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const b=structuredClone(fresh);b.videos[0].url='https://youtu.be/ABCDEFGHIJK?feature=shared';
  b.podcasts[0].url='https://podcasts.apple.com/us/other/show?i=1000500000002';
  assert.throws(()=>validateMediaFreshness({bundle:b,historyRoot:h}),/MEDIA_REUSE_VIOLATION/);
});
test('same program with a genuinely different episode is now rejected',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const b=structuredClone(fresh);b.podcasts[0].source='Previous Show Alpha';
  assert.throws(()=>validateMediaFreshness({bundle:b,historyRoot:h}),/PODCAST_SHOW_ROTATION_VIOLATION/);
});
test('Apple program ID prevents disguised cross-host source label changes',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const b=structuredClone(fresh);
  b.podcasts[0].source='Completely Different Program Display Label';
  b.podcasts[0].url='https://podcasts.apple.com/us/podcast/another-slug/id1668002681?i=1000500000999';
  assert.throws(()=>validateMediaFreshness({bundle:b,historyRoot:h}),/PODCAST_SHOW_ROTATION_VIOLATION/);
});
test('show aliases normalize repeated a16z and AI Daily Brief appearances',()=>{
  assert.equal(samePodcastShow({source:'The a16z Show / Andreessen Horowitz'},
    {source:'The a16z Show'}),true);
  assert.equal(samePodcastShow({source:'The AI Daily Brief — Nathaniel Whittemore'},
    {source:'The AI Daily Brief'}),true);
  assert.equal(samePodcastShow({source:'AGORÀ Intelligence — The Briefing'},
    {source:'Agora Intelligence - The Briefing'}),true);
  assert.deepEqual(podcastShowKeys({source:'',url:'https://podcasts.apple.com/podcast/foo/id10203?i=990'}),['apple-show:10203']);
});
test('two current episodes from one podcast program are invalid',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const b=structuredClone(fresh);b.podcasts[1].source='Fresh Show Gamma';
  assert.throws(()=>validateMediaFreshness({bundle:b,historyRoot:h}),/PODCAST_SHOW_ROTATION_VIOLATION/);
});
test('three previous editions are checked, but fourth-oldest does not prevent an episode-free return',()=>{
  const h=root();
  makeHistory(h,'2026-10-15',[{source:'Fresh Show Gamma',title:'Old Gamma Episode',url:'https://podcasts.apple.com/us/podcast/gamma/id1777000001?i=1000500000005'},
    {source:'Other Old Show',title:'Other episode',url:'https://podcasts.apple.com/us/podcast/other/id1668002677?i=1000500000004'}]);
  for(const d of ['2026-10-16','2026-10-17','2026-10-18'])makeHistory(h,d);
  assert.equal(validateMediaFreshness({bundle:fresh,historyRoot:h}).result,'PASS');
  makeHistory(h,'2026-10-16',[{source:'Fresh Show Gamma',title:'Different Gamma Episode',url:'https://podcasts.apple.com/us/podcast/gamma/id1777000001?i=1000500000006'},
    {source:'Prior Show Beta',title:'Other episode',url:'https://podcasts.apple.com/us/podcast/previous-b/id1668002682?i=1000500000007'}]);
  assert.throws(()=>validateMediaFreshness({bundle:fresh,historyRoot:h}),/PODCAST_SHOW_ROTATION_VIOLATION/);
});
test('same substantive title on changed URL is still a repeat',()=>{
  assert.equal(sameMedia({type:'video',title:'Identical long media title',url:'https://youtube.com/watch?v=A'},
    {type:'video',title:'Identical long media title',url:'https://youtube.com/watch?v=B'}),true);
});
test('unknown show identity cannot satisfy the new rotation contract',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const b=structuredClone(fresh);delete b.podcasts[0].source;
  assert.throws(()=>validateMediaFreshness({bundle:b,historyRoot:h}),/PODCAST_SHOW_IDENTITY_REQUIRED/);
});
test('October 18 and earlier published editions are never revalidated by this new gate',()=>{
  assert.equal(validateMediaFreshness({bundle:{edition_date:'2026-10-18'},historyRoot:'/nonexistent'}).result,
    'SKIPPED_HISTORICAL');
});
test('missing real predecessor evidence is not silently treated as variety',()=>{
  assert.throws(()=>validateMediaFreshness({bundle:fresh,historyRoot:root()}),/media history unavailable/);
});

test('Oct 26 forward-only entire archive catches media from October 17 beyond seven editions',()=>{
  const h=root();
  makeHistory(h,'2026-10-17');
  for(let day=18;day<=25;day++){
    const d='2026-10-'+day;
    fs.mkdirSync(path.join(h,'briefs',d),{recursive:true});
    fs.writeFileSync(path.join(h,'briefs',d,'index.html'),'Published edition');
    for(const [slot,title] of [['general','Unique video '+day],['agent-skills','Another unique video '+day]]){
      const dir=path.join(h,'videos',d,slot);
      fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'index.html'),
        '<html><meta property="og:title" content="'+title+'"/><strong>Source:</strong> <a href="https://publisher.test/watch/'+day+'/'+slot+'">Publisher</a></html>');
    }
  }
  const dates=fs.readdirSync(path.join(h,'briefs')).sort().reverse();
  const b=structuredClone(fresh);
  b.edition_date='2026-10-26';
  b.videos[0]={title:'Prior video one',url:'https://youtu.be/ABCDEFGHIJK?feature=shared'};
  let x=findFullArchiveRepeats({bundle:b,historyRoot:h,dates});
  assert.equal(x.checked_dates,9);
  assert.ok(x.media_duplicates.some(a=>a.prior_date==='2026-10-17'&&a.type==='video'));
  assert.ok(!x.media_duplicates.some(a=>a.prior_date>='2026-10-18'));
  b.videos[0]={title:'New unique video lesson',url:'https://publisher.test/watch/brand-new'};
  b.podcasts[0]={...b.podcasts[0],title:'Rehosted older episode',
    url:'https://podcasts.apple.com/us/podcast/rehosted/id1668002681?i=1000500000001'};
  x=findFullArchiveRepeats({bundle:b,historyRoot:h,dates});
  assert.ok(x.media_duplicates.some(a=>a.prior_date==='2026-10-17'&&a.type==='podcast'));
});
test('Oct 26 full-archive scan rejects prior article source with a new headline',()=>{
  const h=root(),date='2026-10-17';
  makeHistory(h,date);
  const dir=path.join(h,'stories',date,'item');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),
    '<html><meta property="og:title" content="Old research covered previously"/><strong>Source:</strong> <a href="https://publisher.test/research-record?campaign=old">Publisher</a></html>');
  const b=structuredClone(fresh);
  b.stories[0]={headline:'Same source rewritten under another headline',
    source:{url:'https://publisher.test/research-record'}};
  const old=findFullArchiveRepeats({bundle:b,historyRoot:h,dates:[date]});
  assert.equal(old.article_pages,1);
  assert.deepEqual(old.article_duplicates.map(x=>x.reason),['same_source_url']);
  b.stories[0]={headline:'New primary research',source:{url:'https://publisher.test/new-record'}};
  assert.deepEqual(findFullArchiveRepeats({bundle:b,historyRoot:h,dates:[date]}).article_duplicates,[]);
});
test('media-uniqueness expansion is forward-only and preserves show cooldown',()=>{
  const src=fs.readFileSync('scripts/verify-media-freshness.mjs','utf8');
  assert.match(src,/FULL_ARCHIVE_UNIQUENESS_EFFECTIVE='2026-10-26'/);
  assert.match(src,/date>=FULL_ARCHIVE_UNIQUENESS_EFFECTIVE\?/);
  assert.match(src,/const showDates=historyDates.slice\(0,3\)/);
});
