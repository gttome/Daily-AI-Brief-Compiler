import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateMediaFreshness,sameMedia} from '../scripts/verify-media-freshness.mjs';
const root=()=>fs.mkdtempSync(path.join(os.tmpdir(),'media-freshness-'));
function makeHistory(root,date){
  const page=(kind,title,url)=>'<html><h1 class="project-name">'+title+'</h1><p><strong>'+
    (kind==='video'?'Source':'Listen / watch')+':</strong> <a href="'+url+'">Source</a></p></html>';
  fs.mkdirSync(path.join(root,'briefs',date),{recursive:true});
  fs.writeFileSync(path.join(root,'briefs',date,'index.html'),'Published edition');
  for(const [kind,folder,slug,title,url] of [
    ['video','videos','general','Video one','https://www.youtube.com/watch?v=ABCDEFGHIJK'],
    ['video','videos','agent-skills','Video two','https://www.youtube.com/watch?v=ZBCDEFGHIJK'],
    ['podcast','podcasts','episode-one','Unique prior podcast one','https://podcasts.apple.com/show?i=1000500000001'],
    ['podcast','podcasts','episode-two','Unique prior podcast two','https://podcasts.apple.com/show?i=1000500000002']]){
    const dir=path.join(root,folder,date,slug);fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),page(kind,title,url));
  }
}
const fresh={edition_date:'2026-10-19',videos:[
  {title:'Entirely new video #1',url:'https://www.youtube.com/watch?v=NEWVIDEOAAA'},
  {title:'Entirely new video #2',url:'https://www.youtube.com/watch?v=NEWVIDEOBBB'}
],podcasts:[
  {title:'Entirely new podcast one',url:'https://podcasts.apple.com/episode?a=1&i=1000500000101'},
  {title:'Entirely new podcast two',url:'https://podcasts.apple.com/episode?a=1&i=1000500000102'}
]};
test('fresh media passes and same publisher with genuinely different episode is allowed',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  assert.equal(validateMediaFreshness({bundle:fresh,historyRoot:h}).result,'PASS');
});
test('exact video identity and Apple episode identity reject repeats even with link variants',()=>{
  const h=root();makeHistory(h,'2026-10-18');
  const b=structuredClone(fresh);b.videos[0].url='https://youtu.be/ABCDEFGHIJK?feature=shared';
  b.podcasts[0].url='https://podcasts.apple.com/us/another/show?i=1000500000002';
  assert.throws(()=>validateMediaFreshness({bundle:b,historyRoot:h}),/MEDIA_REUSE_VIOLATION/);
});
test('same title on a different URL does not disguise repeated content',()=>{
  assert.equal(sameMedia({type:'video',title:'Identical long media title',url:'https://youtube.com/watch?v=A'},{type:'video',title:'Identical long media title',url:'https://youtube.com/watch?v=B'}),true);
});
test('historical editions are unchanged by the forward-only gate',()=>{
  const b={edition_date:'2026-10-18'};
  assert.equal(validateMediaFreshness({bundle:b,historyRoot:'/nonexistent'}).result,'SKIPPED_HISTORICAL');
});
test('missing real predecessor evidence fails closed',()=>{
  assert.throws(()=>validateMediaFreshness({bundle:fresh,historyRoot:root()}),/media history unavailable/);
});
