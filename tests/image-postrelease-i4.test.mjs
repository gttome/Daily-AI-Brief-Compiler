import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {bindAlreadyReleasedJob,verifyAlreadyLiveImages,publicImageStatusMirror} from '../scripts/verify-external-image-postrelease.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const root='external-image-packages/2026-10-10/';
const jobBytes=fs.readFileSync(root+'source/job.json'),job=JSON.parse(jobBytes),manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
const index={schema_version:'external-compiler-image-index-v1',editions:[{edition_date:job.edition_date,status:'RELEASED_VERIFIED'}]};
const release={schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED',edition_date:job.edition_date,
 immutable_job_sha256:hash(jobBytes),original_bundle_sha256:job.source.bundle_sha256,
 images:manifest.images.map(({story_id,sha256,bytes})=>({story_id,sha256,bytes,route:'briefs/images/2026-10-10/dab-edition-2026-10-10-'+(story_id.includes('t1-')?'t1':story_id.includes('t2-')?'t2':story_id.includes('k1-')?'k1':story_id.includes('k2-')?'k2':story_id.includes('a1-')?'a1':'a2')+'.png'}))};
test('I4 existing Oct10 completed assets bind by accepted hashes, not ordered manifest',()=>{
 const x=bindAlreadyReleasedJob({jobBytes,index,release,manifest:{...manifest,images:[...manifest.images].reverse()}});
 assert.equal(x.stories.length,6);
 assert.equal(new Set(x.stories.map(s=>s.image_sha256)).size,6);
 assert.throws(()=>bindAlreadyReleasedJob({jobBytes,index:{...index,editions:[{edition_date:job.edition_date,status:'PUBLISHED_PENDING'}]},release,manifest}),/no_exact_completed/);
 assert.throws(()=>bindAlreadyReleasedJob({jobBytes,index,release:{...release,images:[...release.images.slice(1),release.images[0]] .slice(0,5)},manifest}),/no_exact_completed/);
});
test('I4 verify-only never invokes placeholder replacement or regenerates accepted art',async()=>{
 const b=bindAlreadyReleasedJob({jobBytes,index,release,manifest});
 const pages=new Map();
 const dated='https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/2026-10-10/';
 pages.set(dated,b.stories.map(s=>'<h2>'+s.headline+'</h2><img src="'+s.image_url+'" alt="'+s.image_alt_text.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">').join('\n'));
 for(const s of b.stories)pages.set(s.permanent_url,'<h1>'+s.headline+'</h1><img src="'+s.image_url+'" alt="'+s.image_alt_text.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">');
 const binaryMap=new Map(manifest.images.map(i=>[b.stories.find(s=>s.story_id===i.story_id).image_url,fs.readFileSync(i.path)]));
 const fake=async url=>{const txt=pages.get(url);if(txt)return {status:200,text:async()=>txt};const bytes=binaryMap.get(url);if(bytes)return {status:200,arrayBuffer:async()=>bytes};return {status:404};};
 const result=await verifyAlreadyLiveImages({jobBytes,index,release,manifest,fetchImpl:fake});
 assert.equal(result.result,'LIVE_SIX_IMAGE_BYTES_AND_BINDINGS_PASS');
 assert.equal(result.article_contexts.length,12);
 assert.equal(result.placeholder_replacement_invocations,0);
 assert.equal(result.accepted_image_regenerations,0);
});
test('I4 public status cannot claim COMPLETE on stale public index or absent release receipt',async()=>{
 const indexBytes=Buffer.from('{"hi":true}\n'),releaseBytes=Buffer.from('{"release":true}\n');
 const good=async url=>({status:200,arrayBuffer:async()=>url.endsWith('index.json')?indexBytes:releaseBytes});
 const fail=async url=>({status:url.endsWith('release.json')?404:200,arrayBuffer:async()=>indexBytes});
 assert.equal((await publicImageStatusMirror({date:'2026-10-10',indexBytes,releaseBytes,fetchImpl:good})).result,'PUBLIC_STATUS_VERIFIED');
 assert.equal((await publicImageStatusMirror({date:'2026-10-10',indexBytes,releaseBytes,fetchImpl:fail})).result,'STATUS_SYNC_PENDING');
});
