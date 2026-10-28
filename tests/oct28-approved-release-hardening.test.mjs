import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWatchlist} from '../vendor/production-reader/snapshot/_generator/lib/watchlist.mjs';
import {matchRenderedLinks} from '../scripts/verify-published-video-playback.cjs';
import {EFFECTIVE_DATE} from '../scripts/validate-release-readiness.mjs';

test('postpublication video proof binds the public media link and real article title, not a sealed stale URL',()=>{
 const items=[{index:1,title:'First Video',url:'https://example.org/old',expected_seconds:200},
  {index:2,title:'Second Video',url:'https://example.org/old2',expected_seconds:220}];
 const rows=[{id:'dab-video-2026-10-29-general',heading:'First Video',url:'https://media.example.org/current'},
   {id:'dab-video-2026-10-29-agent-skills',heading:'Second Video',url:'https://media.example.org/current2'}];
 const result=matchRenderedLinks(rows,items,'2026-10-29');
 assert.equal(result[0].url,'https://media.example.org/current');
 assert.notEqual(result[0].url,items[0].url);
 assert.throws(()=>matchRenderedLinks([{...rows[0],heading:'Other'},rows[1]],items,'2026-10-29'),/TITLE_OR_EDITION/);
 assert.throws(()=>matchRenderedLinks([rows[0],rows[0]],items,'2026-10-29'),/UNIQUE/);
 assert.equal(EFFECTIVE_DATE,'2026-10-29');
});

test('canonical Watchlist predeployment validator catches non-baseline momentum without observations',()=>{
 const data={topics:[{momentum:{classification:'rising',score:3,observations:[]}}]};
 assert.ok(validateWatchlist(data).some(x=>/Momentum requires observations/.test(x)));
});
