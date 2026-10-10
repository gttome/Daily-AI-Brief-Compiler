import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {ALL_ENABLED,FEATURE_GROUPS,simulatePostproductionSingleProposalRollback,inspectHistoricalRollbackFixture} from '../scripts/drill-image-postproduction-rollback.mjs';
import {slotsFor} from '../scripts/prepare-external-image-replacement.mjs';
import {OCT8_LIVE_BASELINE} from '../scripts/audit-oct8-live.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const prefix='external-image-packages/2026-10-10/';
const jobBytes=fs.readFileSync(prefix+'source/job.json'),job=JSON.parse(jobBytes);
const manifest=JSON.parse(fs.readFileSync(prefix+'manifest.json'));
const slot=slotsFor({stories:job.stories.map(s=>s.complete_compiler_story)});
const index={schema_version:'external-compiler-image-index-v1',
 editions:[{edition_date:'2026-10-10',status:'RELEASED_VERIFIED'}]};
const release={schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED',edition_date:'2026-10-10',
 original_source_commit_sha:job.source.commit_sha,original_bundle_sha256:job.source.bundle_sha256,
 immutable_job_sha256:hash(jobBytes),images:manifest.images.map(m=>({
  story_id:m.story_id,sha256:m.sha256,bytes:m.bytes,
  route:'briefs/images/2026-10-10/dab-edition-2026-10-10-'+slot.get(m.story_id)+'.png'
 }))};
test('five individually reversible after-production policies preserve the other four groups',()=>{
 assert.equal(Object.keys(FEATURE_GROUPS).length,5);
 const reports=Object.keys(FEATURE_GROUPS).map(id=>simulatePostproductionSingleProposalRollback(id));
 assert.equal(reports.length,5);
 for(const report of reports){
  assert.equal(report.result,'STATIC_SINGLE_PROPOSAL_REVERSION_PASS');
  assert.equal(report.selected_only_reversed,true);
  assert.equal(report.other_four_unchanged,true);
  assert.equal(Object.keys(report.unchanged_feature_modes).length,6-FEATURE_GROUPS[report.proposal_id].length);
  assert.equal(report.prior_accepted_images_regenerated,0);
  assert.equal(report.original_image_quality_floor_kept,true);
  assert.equal(report.old_reader_html_or_placeholders_republished,false);
 }
 assert.equal(reports.find(r=>r.proposal_id==='I1').dependent_release_admission,'RELEASE_ADMISSION_HOLD');
 assert.equal(reports.find(r=>r.proposal_id==='I2').dependent_release_admission,'RELEASE_ADMISSION_HOLD');
 assert.match(reports.find(r=>r.proposal_id==='I3').next_image_job_policy,/UNPROVEN/);
 assert.equal(reports.find(r=>r.proposal_id==='I4').separate_i4_subswitch_drills.length,2);
 assert.match(reports.find(r=>r.proposal_id==='I5').next_image_job_policy,/FLOOR_RETAINED/);
 assert.equal(ALL_ENABLED.image_starter_contract_version,'rev7');
});
test('real six accepted Oct10 Git binaries and hashes are unchanged in isolated nonpublishing fixture',()=>{
 const fixture=inspectHistoricalRollbackFixture({jobBytes,index,release,manifest});
 assert.equal(fixture.story_count,6);
 assert.equal(fixture.accepted_images.length,6);
 assert.equal(new Set(fixture.accepted_images.map(i=>i.sha256)).size,6);
 assert.equal(fixture.original_source_job_sha256,manifest.job_sha256);
 assert.equal(fixture.old_v6_release_readable,true);
 assert.equal(fixture.oct8_expected_object_count,17);
 assert.equal(fixture.v7_assignment_reader_fixture,'external-compiler-starter-assignment-v7');
 assert.equal(fixture.v7_fixture_is_not_real_owner_authorization,true);
 const tampered=structuredClone(manifest);
 tampered.images[0].sha256='0'.repeat(64);
 assert.throws(()=>inspectHistoricalRollbackFixture({jobBytes,index,release,manifest:tampered}),/image_pair_mismatch|image_postrelease|accepted_local_png_drift/);
});
test('full-package config revert prohibited: I4 subcontrols reversible independently',()=>{
 const original=structuredClone(ALL_ENABLED);
 const i4=simulatePostproductionSingleProposalRollback('I4',original);
 assert.equal(i4.separate_i4_subswitch_drills[0].mode,'baseline');
 assert.equal(i4.separate_i4_subswitch_drills[1].mode,false);
 assert.equal(i4.unchanged_feature_modes.image_release_authority_policy,'bounded_starter_v7');
 assert.equal(i4.unchanged_feature_modes.image_starter_contract_version,'rev7');
 assert.equal(i4.unchanged_feature_modes.image_target_capture_policy,'element24_v1');
 assert.equal(i4.unchanged_feature_modes.image_additional_first_pass_qc,'enriched_v1');
 assert.deepEqual(original,ALL_ENABLED);
 assert.throws(()=>simulatePostproductionSingleProposalRollback('D1'),/unsupported_proposal/);
 assert.equal(Object.keys(OCT8_LIVE_BASELINE).length,17);
});
