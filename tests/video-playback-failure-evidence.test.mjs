import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeFailedVideoPlayback} from '../scripts/record-video-playback-failure.mjs';
const video=(index,passing)=>({index,title:'Original AI instruction '+index,
 url:'https://www.youtube.com/watch?v=LPZh9BOjkQs',
 result:passing?'SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS':'PUBLIC_YOUTUBE_IDENTITY_PASS_PLAYBACK_UNVERIFIED',
 playback_verified:passing,headless_browser_limitation:'No advancing duration-matched player observed'});
const source={schema_version:'daily-compiler-public-video-playback-v1',
 edition_date:'2026-10-28',checked_at:'2026-10-27T20:00:00Z',result:'BLOCKED_PLAYBACK_UNVERIFIED',
 checked_videos:[video(1,true),video(2,false)],failed_indices:[2],publication_approved:false};
test('actual failed video index is retained, without declaring private or available',()=>{
 const q=summarizeFailedVideoPlayback(source,'2026-10-28','PREPUBLISH_SIGNAL');
 assert.equal(q.failed_videos.length,1);
 assert.equal(q.failed_videos[0].index,2);
 assert.equal(q.failed_videos[0].playback_verified,false);
 assert.match(q.interpretation,/UNVERIFIED_NOT_INDEPENDENT_PROOF/);
});
test('fabricated failures and cross-edition reports cannot be persisted',()=>{
 assert.throws(()=>summarizeFailedVideoPlayback(source,'2026-10-29','PREPUBLISH_SIGNAL'),/INVALID_SOURCE/);
 assert.throws(()=>summarizeFailedVideoPlayback({...source,failed_indices:[1]},'2026-10-28','READER_DEPLOY'),/FALSE_FAILURE/);
 assert.throws(()=>summarizeFailedVideoPlayback({...source,publication_approved:true},'2026-10-28','READER_DEPLOY'),/INVALID_SOURCE/);
});
test('both protected failures save only observed video evidence, no admission relaxation',()=>{
 for(const file of ['.github/workflows/bundle-ready-signal.yml','.github/workflows/shadow-compile.yml'])
   assert.match(fs.readFileSync(file,'utf8'),/record-video-playback-failure\.mjs/);
 const code=fs.readFileSync('scripts/verify-selected-video-playback.cjs','utf8');
 assert.match(code,/TWO_DURATION_MATCHED_PUBLIC_PLAYERS_ADVANCED/);
 assert.match(code,/BLOCKED_PLAYBACK_UNVERIFIED/);
});
