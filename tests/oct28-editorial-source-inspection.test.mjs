import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDatedCandidates,inspectEditorialIndex} from '../scripts/qualify-editorial-source-items.mjs';
const now='2026-10-29T11:00:00Z';
test('parses publisher RSS items only when dated, linked, in the 168-hour window and same official host',()=>{
 const xml='<rss><channel>'+
  '<item><title>Useful October research update</title><link>https://example.org/study-a</link><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>'+
  '<item><title>Undated content has no verified original date</title><link>https://example.org/study-b</link></item>'+
  '<item><title>Unrelated mirrored publishing story</title><link>https://evil.org/study-c</link><pubDate>Wed, 28 Oct 2026 10:00:00 GMT</pubDate></item>'+
  '<item><title>Older irrelevant publisher item</title><link>https://example.org/study-d</link><pubDate>Wed, 01 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>';
 const items=extractDatedCandidates(xml,{baseUrl:'https://example.org/feed',now});
 assert.equal(items.length,1);assert.equal(items[0].url,'https://example.org/study-a');
 assert.match(items[0].original_date,/2026-10-28T10:00:00/);
});
test('parses real dated HTML article cards without guessing dates or cross-publisher links',()=>{
 const html='<article><h3><a href="/note">Helpful original AI research announcement</a></h3><time datetime="2026-10-27">27 Oct</time></article>'+
  '<article><h3><a href="/old">Older source item</a></h3><time datetime="2026-08-01">August</time></article>';
 const a=extractDatedCandidates(html,{baseUrl:'https://example.org/blog',now});
 assert.equal(a.length,1);assert.equal(a[0].url,'https://example.org/note');
});
test('records blocked public sources as blocked, never reachable or qualified',async()=>{
 const row={resource_id:'unit-source',roles:['article'],url:'https://example.org/feed'};
 const fetchImpl=async()=>({status:403,ok:false,url:row.url,headers:{get:()=> 'text/html'}});
 const result=await inspectEditorialIndex(row,{now,fetchImpl});
 assert.equal(result.outcome,'ACCESS_BLOCKED');assert.equal(result.items.length,0);
});
