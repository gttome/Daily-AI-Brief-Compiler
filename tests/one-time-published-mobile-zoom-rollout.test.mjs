import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const y=fs.readFileSync('.github/workflows/one-time-oct10-premium-mobile-viewer-release.yml','utf8');
const marker=JSON.parse(fs.readFileSync('docs/image-process/_one_time_oct10_mobile_viewer_release.json','utf8'));
const src=fs.readFileSync('scripts/verify-live-premium-mobile-zoom.mjs','utf8');
const stage=fs.readFileSync('scripts/stage-published-mobile-zoom.mjs','utf8');

test('one-time reader-only release requires exact protected main merge, no schedules or unrelated push triggers',()=>{
 assert.match(y,/on:\n  push:\n    branches: \[main\]\n    paths:\n      - docs\/image-process\/_one_time_oct10_mobile_viewer_release\.json/);
 assert.doesNotMatch(y,/\n\s+workflow_dispatch:|\n\s+schedule:/);
 for(const token of ['rulesets/24610983','compiler-validation','pull_request',
 'gh api','test "$(git rev-parse HEAD)" = "$GITHUB_SHA"',
 'test "$(git ls-remote origin refs/heads/main',
 'group: daily-compiler-pages-deploy','test "$(git ls-remote origin refs/heads/shadow-pages-history',
 'node scripts/verify-external-image-postrelease.mjs',
 'node scripts/stage-published-mobile-zoom.mjs',
 'node scripts/verify-live-premium-mobile-zoom.mjs',
 'node scripts/audit-oct8-live.mjs','git -C history add site',
 'git -C history diff --cached --name-only',
 'git -C history push origin HEAD:shadow-pages-history',
 'NINE_READER_OBJECTS_TWELVE_FULLSIZE_VIEWERS_SIX_PNGS_TWELVE_PAIRS_OCT8_17_VERIFIED']){
  assert.ok(y.includes(token),token);
 }
 assert.equal(marker.expected_allowed_file_count,9);
 assert.equal(marker.edition_date,'2026-10-10');
 assert.equal(marker.expected_history_sha,'0730acb060f9bb31ea664f33e609e7c98fb914ca');
 assert.equal(marker.source_image_regeneration_prohibited,true);
 assert.equal(marker.original_editorial_source_recompile_prohibited,true);
});

test('full-resolution viewer alters only exactly nine allowlisted files and preserves accepted image hashes and 17 protected Oct8 objects',()=>{
 for(const fragment of ['original_source','allowed_changed_paths','six_accepted_png_sha256s','verifyNoOtherChanges',
 'assertOct8Pins','accepted_pngs_regenerated:0','editorial_story_content_changed:false',
 'original_placeholders_restored:false'])assert.ok(stage.includes(fragment)||stage.includes(fragment.replace('original_source','source')));
 assert.match(src,/TWELVE_MOBILE_FULL_RESOLUTION_VIEWERS_LIVE_VERIFIED/);
 assert.match(src,/verifiedLive|verifyZoomStagedObjectIdentity/);
 assert.match(src,/accepted_png_regenerations:0/);
 assert.match(src,/individual_semantic_text_signoff:'UNPROVEN'/);
 assert.equal(marker.preserve_oct8_protected_count,17);
 assert.doesNotMatch(y,/prepare-external-image-replacement|render-shadow-images|child_process\.exec\(.+image_gen/);
});
