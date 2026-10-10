import test from 'node:test';
import assert from 'node:assert/strict';
import {readImageProcessVersions,imageReleaseCompatibility,readHistoricalImageEvidence,validateImageProcessVersions} from '../scripts/image-process-versions.mjs';
test('static image feature selection retains history readers and is independent of daily publication',()=>{
 const v=readImageProcessVersions();
 assert.ok(['legacy_go_v1','bounded_starter_v7'].includes(v.image_release_authority_policy));
 assert.ok(['rev6','rev7'].includes(v.image_starter_contract_version));
 assert.ok(['baseline','public_sync_v2'].includes(v.image_status_sync_mode));
 assert.equal(typeof v.image_verify_only_enabled,'boolean');
 const compatible=(v.image_release_authority_policy==='legacy_go_v1'&&v.image_starter_contract_version==='rev6')||
   (v.image_release_authority_policy==='bounded_starter_v7'&&v.image_starter_contract_version==='rev7');
 assert.equal(imageReleaseCompatibility(v).result,compatible?'COMPATIBLE':'RELEASE_ADMISSION_HOLD');
 assert.deepEqual(readHistoricalImageEvidence({schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED'},'release'),{schema_version:'external-compiler-image-release-v1',result:'RELEASED_VERIFIED'});
 assert.deepEqual(readHistoricalImageEvidence({schema_version:'external-compiler-image-release-v2'},'release'),{schema_version:'external-compiler-image-release-v2'});
});
test('independent static selection protects incompatible I1/I2 version rollbacks',()=>{
 const v=readImageProcessVersions();
 const legacy={...v,image_release_authority_policy:'legacy_go_v1',image_starter_contract_version:'rev6'};
 for(const one of [{image_release_authority_policy:'bounded_starter_v7'},{image_starter_contract_version:'rev7'}])
  assert.equal(imageReleaseCompatibility({...legacy,...one}).result,'RELEASE_ADMISSION_HOLD');
 assert.equal(imageReleaseCompatibility({...v,image_release_authority_policy:'bounded_starter_v7',image_starter_contract_version:'rev7'}).result,'COMPATIBLE');
 assert.throws(()=>validateImageProcessVersions({...v,image_target_capture_policy:'fake'}),/invalid_image_process_selector/);
 assert.throws(()=>readHistoricalImageEvidence({schema_version:'invented'},'release'),/unsupported_immutable_image_evidence/);
});
