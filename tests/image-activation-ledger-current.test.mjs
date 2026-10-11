import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readImageProcessVersions,imageReleaseCompatibility} from '../scripts/image-process-versions.mjs';
import {selectExternalImageAppDocuments} from '../scripts/select-image-app-contracts.mjs';

test('actual protected image flags, active manifest and proposal ledger are byte-equivalent in meaning',()=>{
 const cfg=readImageProcessVersions();
 const versions=JSON.parse(fs.readFileSync('docs/image-process/active_version_manifest.json','utf8'));
 const ledger=JSON.parse(fs.readFileSync('docs/image-process/proposal_change_ledger.json','utf8'));
 const receipt=JSON.parse(fs.readFileSync('docs/image-process/ACTIVATION_QUALIFICATION_2026-10-10.json','utf8'));
 const selections=Object.fromEntries(Object.entries(cfg).filter(([key])=>key!=='schema_version'));
 assert.deepEqual(versions.selected_flags,selections);
 assert.deepEqual(ledger.active_selectors,cfg);
 const isRev8=cfg.image_release_authority_policy==='recurring_work_v8'&&cfg.image_starter_contract_version==='rev8';
 if(isRev8){
   assert.equal(receipt.selected_flags.image_release_authority_policy,'bounded_starter_v7');
   assert.equal(receipt.selected_flags.image_starter_contract_version,'rev7');
   assert.equal(ledger.revision8_recurring_selected,true);
   assert.equal(ledger.rev8_recurring_activation.historic_proposals_i1_through_i5_unchanged,true);
   assert.equal(versions.rev8_first_edition_date,'2026-10-12');
 }else{
   assert.deepEqual(receipt.selected_flags,cfg);
 }
 const current=selectExternalImageAppDocuments(cfg,true);
 assert.equal(current.result,imageReleaseCompatibility(cfg).result==='COMPATIBLE'?
   'SELECTED_EXTERNAL_IMAGE_CONTRACTS_COMPATIBLE':'RELEASE_ADMISSION_HOLD');
 assert.equal(ledger.proposal_records.length,5);
 const byId=new Map(ledger.proposal_records.map(p=>[p.proposal_id,p]));
 assert.equal(byId.get('I1').active_feature_mode,isRev8?'bounded_starter_v7':cfg.image_release_authority_policy);
 assert.equal(byId.get('I2').active_feature_mode,isRev8?'rev7':cfg.image_starter_contract_version);
 assert.equal(byId.get('I3').active_feature_mode,cfg.image_target_capture_policy);
 assert.equal(byId.get('I4').active_feature_mode,cfg.image_status_sync_mode+'|'+cfg.image_verify_only_enabled);
 assert.equal(byId.get('I5').active_feature_mode,cfg.image_additional_first_pass_qc);
 for(const row of ledger.proposal_records){
   assert.ok(/^https:\/\/github.com\/gttome\/Daily-AI-Brief-Compiler\/pull\/\d+$/.test(row.protected_activation_pr_url));
   assert.match(row.activation_main_sha,/^[a-f0-9]{40}$/);
 }
});

test('qualification does not convert 24 real captures to editorial pixel PASS or public status PASS',()=>{
 const status=JSON.parse(fs.readFileSync('docs/image-process/ACTIVATION_QUALIFICATION_2026-10-10.json'));
 assert.equal(status.actual_target_captures.total,24);
 assert.equal(status.actual_target_captures.mobile,12);
 assert.equal(status.actual_target_captures.desktop,12);
 assert.equal(status.six_accepted_pngs.length,6);
 assert.equal(new Set(status.six_accepted_pngs.map(s=>s.sha256)).size,6);
 assert.equal(status.oct8_17_protected_objects_live_hash_checks,17);
 assert.equal(status.saved_visual_review.image_contexts_affected,12);
 assert.equal(status.saved_visual_review.all_24_formal_semantic_approval,'UNPROVEN');
 assert.equal(status.public_status.mirror,'STATUS_SYNC_PENDING');
 assert.equal(status.public_status.actual_metadata_only_dispatch_performed,false);
 assert.equal(status.new_images_generated,0);
 assert.equal(status.external_operator_route_preflight.result,'BLOCKED_INCOMPLETE');
 assert.equal(status.historic_five_independent_rollback_drills.result,'PASS');
 assert.equal(status.result,'FEATURES_ACTIVE_PRODUCTION_QUALIFICATION_BLOCKED');
 assert.equal(status.invariant_guards.initial_editorial_publication_schedules_unchanged,true);
});
