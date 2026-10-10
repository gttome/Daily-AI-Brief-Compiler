import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateAcceptedSixTransportFixture} from '../scripts/qualify-existing-six-image-github-transport.mjs';
const jobBytes=fs.readFileSync('external-image-packages/2026-10-10/source/job.json');
const manifest=JSON.parse(fs.readFileSync('external-image-packages/2026-10-10/manifest.json'));
test('six accepted historical PNG bytes and Git blob SHAs remain exactly equal to source manifest',()=>{
 const rows=validateAcceptedSixTransportFixture({manifest,jobBytes});
 assert.equal(rows.length,6);
 assert.equal(new Set(rows.map(x=>x.sha256)).size,6);
 assert.ok(rows.every(x=>x.bytes>10000&&/^[a-f0-9]{64}$/.test(x.sha256)&&/^[a-f0-9]{40}$/.test(x.git_blob_sha)));
});
test('never accept fabricated historical PNG identities, wrong story pairing or altered accepted bytes',()=>{
 for(const modified of [
  {...manifest,images:manifest.images.slice(0,5)},
  {...manifest,job_sha256:'a'.repeat(64)},
  {...manifest,edition_date:'2026-10-11'},
  {...manifest,images:manifest.images.map((x,i)=>i===0?{...x,sha256:'a'.repeat(64)}:x)},
  {...manifest,images:[manifest.images[0],manifest.images[0],...manifest.images.slice(2)]},
  {...manifest,images:manifest.images.map((x,i)=>i===0?{...x,accepted_locked:false}:x)}
 ])assert.throws(()=>validateAcceptedSixTransportFixture({manifest:modified,jobBytes}),/existing_six_github_binary_transport/);
});
test('binary proof does not edit refs, create new art or start a Pages release',()=>{
 const src=fs.readFileSync('scripts/qualify-existing-six-image-github-transport.mjs','utf8');
 for(const must of ['github_api_binary','raw.githubusercontent.com','git_refs_before',
   'new_images_generated:0','new_commits_created:0','pages_deployments_started:0',
   'authenticated_chat_plugin_file_transfer_not_inferred:true']){
  assert.ok(src.includes(must)||src.includes(must.replace('github_api_binary','remote_api_binary_readback')),must);
 }
 assert.doesNotMatch(src,/git\s*\(\s*\[(?:'push'|'commit'|'update-ref')/);
 assert.doesNotMatch(src,/image_gen|render-shadow-images|prepare-external-image-replacement/);
});
