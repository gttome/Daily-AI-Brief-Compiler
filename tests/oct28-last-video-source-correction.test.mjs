import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {replaceOnlyPlayerHref,stagePublicVideoRepair} from '../scripts/stage-oct28-last-video-link.mjs';
const OLD='https://play.vidyard.com/8Cf5xrViAVpvQLikjEutkb?disable_popouts=1&amp;type=inline&amp;v=4.3.26&amp;autoplay=1';
const NEW='https://www.youtube.com/watch?v=TpJsRDZ29Os';
const TITLE='Todd’s Take: Securing identity in the age of AI';
const ROUTES=[
 'index.html','latest.html','latest.md','briefs/2026-10-28/index.html',
 'videos/2026-10-28/agent-skills/index.html'
];
const gitBlob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const videoPage=route=>'<article><h2>'+TITLE+'</h2><span>dab-video-2026-10-28-agent-skills</span>'+
 '<p><a href="'+OLD+'">'+(route.startsWith('videos/')?'Okta':'Watch on Okta')+'</a></p></article>';
test('replace only reported unavailable player with same official publisher YouTube upload',()=>{
 for(const route of ROUTES){
  const old=videoPage(route),result=replaceOnlyPlayerHref(old,{route});
  assert.equal(result.includes(OLD),false);
  assert.equal(result.split(NEW).length,2);
  assert.ok(result.includes(TITLE));
  assert.ok(result.includes(route.startsWith('videos/')?'official YouTube':'Watch on Okta’s official YouTube channel'));
  assert.throws(()=>replaceOnlyPlayerHref(result,{route}),/original_media_link_or_identity_drift/);
 }
 assert.throws(()=>replaceOnlyPlayerHref(videoPage('index.html').replace(TITLE,'Other'),{route:'index.html'}),/identity_drift/);
});
test('media-only published revision changes precisely five URLs and never touches images',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'oct28-last-video-'));
 const original=path.join(root,'original'),out=path.join(root,'patched');
 try{
  const pins={};
  for(const route of ROUTES){
   const file=path.join(original,route);
   fs.mkdirSync(path.dirname(file),{recursive:true});
   const bytes=Buffer.from(videoPage(route));
   fs.writeFileSync(file,bytes);
   pins[route]=gitBlob(bytes);
  }
  fs.mkdirSync(path.join(original,'briefs/images/2026-10-28'),{recursive:true});
  const png=Buffer.from([137,80,78,71,27,28,10,25]);
  fs.writeFileSync(path.join(original,'briefs/images/2026-10-28/keep.png'),png);
  fs.mkdirSync(path.join(original,'videos/2026-10-28/general'),{recursive:true});
  fs.writeFileSync(path.join(original,'videos/2026-10-28/general/index.html'),'<h1>First video retained</h1>');
  const revision={
   schema_version:'daily-compiler-reading-copy-correction-v1',
   correction_type:'OCT28_PRIVATE_LAST_VIDEO_LINK_ONLY',
   scope:'EXACT_FIVE_PUBLIC_VIDEO_LINK_SURFACES_ONLY',
   requested_by:'owner',edition_date:'2026-10-28',
   official_video_id:'TpJsRDZ29Os',
   old_video_url:OLD,new_video_url:NEW,expected_previous_pages:pins
  };
  const revisionFile=path.join(root,'rev.json');
  fs.writeFileSync(revisionFile,JSON.stringify(revision));
  const r=stagePublicVideoRepair({revisionFile,historySite:original,outSite:out});
  assert.equal(r.result,'PASS');
  assert.equal(r.files_changed,5);
  assert.deepEqual(r.changed.map(x=>x.route),ROUTES);
  assert.ok(r.owner_reported_original_player_private);
  assert.equal(r.original_semantic_bundle_unchanged,true);
  assert.equal(r.playback_observation_scope,'official_publisher_public_index_not_full_length_browser_playback');
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/images/2026-10-28/keep.png')),png);
  assert.deepEqual(fs.readFileSync(path.join(out,'videos/2026-10-28/general/index.html')),
   fs.readFileSync(path.join(original,'videos/2026-10-28/general/index.html')));
  assert.throws(()=>stagePublicVideoRepair({revisionFile,historySite:out,outSite:path.join(root,'again')}),/published_video_reader_drift/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
