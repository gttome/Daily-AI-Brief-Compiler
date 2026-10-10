import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const f='.github/workflows/oct10-existing-images-one-time-public-status-sync.yml';
const marker='docs/image-process/_one_time_oct10_public_metadata_sync.json';
test('one-time Oct10 public metadata repair is explicit protected main merge ONLY, no workflow dispatch bypass or schedule',()=>{
 const y=fs.readFileSync(f,'utf8');
 const m=JSON.parse(fs.readFileSync(marker,'utf8'));
 assert.match(y,/on:\n  push:\n    branches: \[main\]/);
 assert.ok(y.includes(marker));
 assert.doesNotMatch(y,/\n  workflow_dispatch:|\n  schedule:/);
 assert.equal(m.edition_date,'2026-10-10');
 assert.equal(m.source_main_before_request,'8e821afc12d8cbf31c7b4d80af1d04c2b4ed918e');
 assert.equal(m.pages_history_commit,'0730acb060f9bb31ea664f33e609e7c98fb914ca');
 assert.equal(m.original_job_sha256,'15301d33191ad1e04eb8bba0ce9f40a5ac53809bdcc363f1647bce5f97b2749e');
 assert.equal(m.only_site_output,'IDENTICAL_CURRENT_HISTORY_SITE_BYTES');
 assert.ok(m.excludes.includes('new_image_generation'));
 for(const fragment of ['rulesets/24610983','bypass_actors','pull_request','compiler-validation',
  'git worktree add --detach history','test "$(git ls-remote origin refs/heads/shadow-pages-history',
  'test "$(git ls-remote origin refs/heads/main',
  'path: history/site','actions/deploy-pages@v4',
  'verify-external-image-postrelease.mjs','audit-oct8-live.mjs',
  'PUBLIC_STATUS_VERIFIED','objects_verified!==17','accepted_image_regenerations!==0',
  'placeholder_replacement_invocations!==0','group: daily-compiler-pages-deploy']){
  assert.ok(y.includes(fragment),fragment);
 }
 assert.doesNotMatch(y,/prepare-external-image-replacement|render-shadow-images|\bimage_gen\b|git -C history (commit|push)|git push origin|schedule:/);
});
test('repair cannot turn image or artwork pixel review into accepted status',()=>{
 const y=fs.readFileSync(f,'utf8');
 assert.ok(y.includes("PUBLIC_STATUS_VERIFIED"));
 assert.doesNotMatch(y,/VISUAL_24_VERIFIED|PUBLISHED_COMPLETE|owner_personal_artwork_review_claimed:true/);
});
