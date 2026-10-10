import test from 'node:test';
import assert from 'node:assert/strict';
import {positiveImageSourceProvenance} from '../scripts/external-image-jobs.mjs';
import {REQUIRED_OPERATIONS,evaluateImageAppPreflight} from '../scripts/preflight-image-app-route.mjs';
import {readImageProcessVersions} from '../scripts/image-process-versions.mjs';
const job={schema_version:'external-compiler-image-job-v1',lifecycle:'PUBLISHED_PENDING',edition_date:'2026-10-11',stories:Array.from({length:6},(_,i)=>({story_id:'s'+i}))};
const active={...readImageProcessVersions(),image_release_authority_policy:'bounded_starter_v7',image_starter_contract_version:'rev7'};
test('I2 positive immutable receipts preserve actual scheduled false, never inferred from Oct9 exception',()=>{
 const state={execution_id:'run11'};
 const bundle={edition_date:'2026-10-11',producer_receipt:{result:'PASS',execution_id:'run11',edition_date:'2026-10-11',scheduled_execution:false,continuation_mode:'ordinary_chat_saved_checkpoint'}};
 assert.deepEqual(positiveImageSourceProvenance({bundle,state}),{producer_mode:'continued',unattended_schedule_proven:false,provenance_basis:'original_immutable_bundle_producer_receipt',original_continuation_mode:'ordinary_chat_saved_checkpoint'});
 assert.equal(positiveImageSourceProvenance({bundle:{...bundle,producer_receipt:{...bundle.producer_receipt,scheduled_execution:true}},state}).unattended_schedule_proven,true);
 assert.equal(positiveImageSourceProvenance({bundle:{...bundle,producer_receipt:{...bundle.producer_receipt,execution_id:'wrong'}},state}).producer_mode,'unknown');
});
test('I2 requires explicit proven dispatch and both desktop/mobile image-area route before generation',()=>{
 const capabilities=Object.fromEntries(REQUIRED_OPERATIONS.map(k=>[k,{available:true,authorized:true,evidence_ref:'verified-'+k,method:'authenticated_tool'}]));
 assert.equal(evaluateImageAppPreflight({capabilities,versions:active,job}).result,'CAPABILITY_ROUTE_PROVEN');
 const blocked=evaluateImageAppPreflight({capabilities:{...capabilities,existing_workflow_dispatch:{available:false},mobile_image_region_capture:{}},versions:active,job});
 assert.equal(blocked.result,'BLOCKED_INCOMPLETE');
 assert.ok(blocked.blockers.some(x=>x.includes('existing_workflow_dispatch')));
 assert.ok(blocked.blockers.some(x=>x.includes('mobile_image_region_capture')));
 assert.equal(blocked.creative_attempts_consumed,0);
 assert.ok(evaluateImageAppPreflight({capabilities,versions:{...active,image_release_authority_policy:'legacy_go_v1'},job}).blockers.includes('RELEASE_ADMISSION_HOLD:starter_authority_version_incompatible'));
});
