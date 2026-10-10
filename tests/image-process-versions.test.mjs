import test from 'node:test';
import assert from 'node:assert/strict';
import {readImageProcessVersions,imageReleaseCompatibility,readHistoricalImageEvidence,validateImageProcessVersions} from '../scripts/image-process-versions.mjs';
test('image version scaffold defaults to original behavior and is independent of daily publication',()=>{
 const v=readImageProcessVersions();
 assert.equal(v.image_release_authority_policy,'legacy_go_v1');
 assert.equal(v.image_starter_contract_version,'rev6');
 assert.equal(v.image_status_sync_mode,'baseline');
 assert.equal(v.image_verify_only_enabled,false);
 assert.equal(imageReleaseCompatibility(v).result,'COMPATIBLE');
 assert.deepEqual(readHistoricalImageEvidence({schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED'},'release'),{schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED'});
 assert.deepEqual(readHistoricalImageEvidence({schema_version:'external-compiler-image-release-v2'},'release'),{schema_version:'external-compiler-image-release-v2'});
});
test('independent static selection protects incompatible I1/I2 version rollbacks',()=>{
 const v=readImageProcessVersions();
 for(const one of [{image_release_authority_policy:'bounded_starter_v7'},{image_starter_contract_version:'rev7'}])
  assert.equal(imageReleaseCompatibility({...v,...one}).result,'RELEASE_ADMISSION_HOLD');
 assert.equal(imageReleaseCompatibility({...v,image_release_authority_policy:'bounded_starter_v7',image_starter_contract_version:'rev7'}).result,'COMPATIBLE');
 assert.throws(()=>validateImageProcessVersions({...v,image_target_capture_policy:'fake'}),/invalid_image_process_selector/);
 assert.throws(()=>readHistoricalImageEvidence({schema_version:'invented'},'release'),/unsupported_immutable_image_evidence/);
});
