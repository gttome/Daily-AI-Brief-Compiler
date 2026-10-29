import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {patchRoute} from '../scripts/stage-oct29-video-value.mjs';

const revision=JSON.parse(fs.readFileSync('config/reading-copy-revisions/2026-10-29-two-video-value.json','utf8'));
const first=revision.slots[0],second=revision.slots[1];
test('revision fixes exactly two different publisher/identity slots without changing Oct29 editorial bundle',()=>{
 assert.equal(revision.edition_date,'2026-10-29');
 assert.equal(revision.original_bundle_sha256.length,64);
 assert.equal(revision.slots.length,2);
 assert.equal(new Set(revision.slots.map(x=>x.new.source)).size,2);
 assert.equal(new Set(revision.slots.map(x=>x.new.url)).size,2);
 assert.equal(first.reader_id,'dab-video-2026-10-29-general');
 assert.equal(second.reader_id,'dab-video-2026-10-29-agent-skills');
 assert.equal(revision.no_image_generation,true);
});
test('only target Atom entries can change',()=>{
 const entry=x=>'<entry><id>'+x.reader_id+'</id><title>'+x.old.title+'</title><summary>'+x.old.summary+'</summary></entry>';
 const prior='<entry><id>dab-video-2026-10-28-general</id><title>Untouched</title><summary>Earlier edition remains unchanged</summary></entry>';
 const out=patchRoute('feed.xml',prior+entry(first)+entry(second),revision);
 assert.ok(out.startsWith(prior));
 for(const x of revision.slots){assert.ok(out.includes(x.new.title));assert.ok(!out.includes(x.old.title));}
});
test('patches only two exact JSON identities; all other rows remain equal',()=>{
 for(const [route,key,col] of [
  ['feed.json','id','items'],['data/archive-index.json','story_id','stories'],
  ['data/compiler-feedback-registry.json','canonical_reader_id','items']]){
  const before={ [col]:[{[key]:'unrelated',title:'Do not change',headline:'Another video',brief_date:'2026-10-28'}] };
  for(const x of revision.slots)before[col].push({[key]:x.reader_id,brief_date:'2026-10-29',
   title:x.old.title,headline:x.old.title,summary:x.old.summary,tags:['Workday'],topics:[],companies:['Workday']});
  const after=JSON.parse(patchRoute(route,JSON.stringify(before),revision));
  assert.deepEqual(after[col][0],before[col][0]);
  for(const x of revision.slots){
   const item=after[col].find(v=>v[key]===x.reader_id);
   assert.equal(route==='data/archive-index.json'?item.headline:item.title,x.new.title);
  }
 }
});
test('rejects missing video page rather than patching some other story',()=>{
 assert.throws(()=>patchRoute('videos/2026-10-29/general/index.html','<h1>not the requested video</h1>',revision),/OCT29_VIDEO_READER_REPAIR/);
});
