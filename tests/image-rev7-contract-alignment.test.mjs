import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readImageProcessVersions,imageReleaseCompatibility} from '../scripts/image-process-versions.mjs';
import {DOCUMENT_PAIRS,selectExternalImageAppDocuments} from '../scripts/select-image-app-contracts.mjs';
import {REQUIRED_OPERATIONS,evaluateImageAppPreflight} from '../scripts/preflight-image-app-route.mjs';

const baseline=readImageProcessVersions();
const rev6={...baseline,image_release_authority_policy:'legacy_go_v1',image_starter_contract_version:'rev6'};
const rev7={...baseline,image_release_authority_policy:'bounded_starter_v7',image_starter_contract_version:'rev7'};

test('I2 real selected Rev6 historical starter/full/handoff remains readable and unchanged',()=>{
 assert.equal(rev6.image_release_authority_policy,'legacy_go_v1');
 assert.equal(rev6.image_starter_contract_version,'rev6');
 const selected=selectExternalImageAppDocuments(rev6,true);
 assert.equal(selected.result,'SELECTED_EXTERNAL_IMAGE_CONTRACTS_COMPATIBLE');
 assert.equal(selected.selected_version,'rev6');
 const oldHandoff=fs.readFileSync(DOCUMENT_PAIRS.rev6.handoff,'utf8');
 const oldFull=fs.readFileSync(DOCUMENT_PAIRS.rev6.full_prompt,'utf8');
 assert.match(oldHandoff,/External Image App Handoff/);
 assert.match(oldFull,/Revision 6/);
 assert.equal(imageReleaseCompatibility(rev6).result,'COMPATIBLE');
});

test('I2 proposed Rev7 starter + full prompt + handoff are mutually selected, source- and edition-specific',()=>{
 const selected=selectExternalImageAppDocuments(rev7,true);
 assert.equal(selected.result,'SELECTED_EXTERNAL_IMAGE_CONTRACTS_COMPATIBLE');
 assert.equal(selected.selected_version,'rev7');
 assert.equal(selected.files.authority_file,'starter-assignment.json');
 const starter=fs.readFileSync(selected.files.starter,'utf8');
 const full=fs.readFileSync(selected.files.full_prompt,'utf8');
 const handoff=fs.readFileSync(selected.files.handoff,'utf8');
 assert.match(starter,/\*\*Create the six premium images/);
 for(const content of [starter,full,handoff]){
  assert.match(content,/Revision 7/);
  assert.match(content,/BLOCKED_INCOMPLETE/);
  assert.match(content,/1200\s*(?:×|x)\s*630/);
  assert.match(content,/GitHub/);
 }
 assert.ok(starter.includes(selected.files.full_prompt));
 assert.ok(starter.includes(selected.files.handoff));
 assert.ok(handoff.includes(selected.files.full_prompt));
 assert.ok(handoff.includes(selected.files.starter));
 assert.ok(full.includes(selected.files.handoff));
 assert.ok(full.includes(selected.files.starter));
 assert.match(full,/24\s*(?:loaded target|exact image-region|image-region)?/i);
 assert.match(full,/no fixed.*cap/i);
 assert.match(full,/Revision 6 supersedes|Revision 7 supersedes|Revision 7.*supersedes/i);
});

test('I2 one-proposal rollback incompatibility HOLDs future optional image releases, preserves other toggles',()=>{
 const revertOnlyI1={...rev7,image_release_authority_policy:'legacy_go_v1'};
 const revertOnlyI2={...rev7,image_starter_contract_version:'rev6'};
 for(const v of [revertOnlyI1,revertOnlyI2]){
  assert.equal(selectExternalImageAppDocuments(v,true).result,'RELEASE_ADMISSION_HOLD');
  assert.equal(imageReleaseCompatibility(v).result,'RELEASE_ADMISSION_HOLD');
  assert.equal(v.image_target_capture_policy,rev7.image_target_capture_policy);
  assert.equal(v.image_status_sync_mode,rev7.image_status_sync_mode);
  assert.equal(v.image_additional_first_pass_qc,rev7.image_additional_first_pass_qc);
 }
 assert.equal(selectExternalImageAppDocuments(rev7).result,'SELECTED_EXTERNAL_IMAGE_CONTRACTS_COMPATIBLE');
});

test('I2 genuine pre-generation dispatch + desktop/mobile capability must remain proven',()=>{
 const job={schema_version:'external-compiler-image-job-v1',lifecycle:'PUBLISHED_PENDING',edition_date:'2026-10-11',
  stories:Array.from({length:6},(_,i)=>({story_id:'oct11-'+i}))};
 const simulated=Object.fromEntries(REQUIRED_OPERATIONS.map(k=>[k,{available:true,authorized:true,evidence_ref:'simulation-'+k,method:'unit-test-only'}]));
 const fixture=evaluateImageAppPreflight({versions:rev7,job,capabilities:simulated});
 assert.equal(fixture.result,'CAPABILITY_ROUTE_PROVEN');
 assert.equal(fixture.selected_document_version,'rev7');
 assert.equal(fixture.creative_attempts_consumed,0);
 const noDispatch={...simulated,existing_workflow_dispatch:{available:false}};
 assert.equal(evaluateImageAppPreflight({versions:rev7,job,capabilities:noDispatch}).result,'BLOCKED_INCOMPLETE');
 assert.equal(evaluateImageAppPreflight({versions:revertOnlyI1(),job,capabilities:simulated}).result,'BLOCKED_INCOMPLETE');
 function revertOnlyI1(){return {...rev7,image_release_authority_policy:'legacy_go_v1'};}
});

test('existing protected release refuses wrong selected document versions while no schedule or CI bypass was added',()=>{
 const workflow=fs.readFileSync('.github/workflows/external-image-only-replacement.yml','utf8');
 assert.match(workflow,/node scripts\/select-image-app-contracts\.mjs/);
 assert.match(workflow,/rulesets\/24610983/);
 assert.match(workflow,/event=pull_request/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/\n[ \t]+schedule:/);
 assert.match(workflow,/check-external-image-release-gates\.mjs/);
 assert.match(workflow,/verify-external-image-live\.mjs/);
 const cfg=fs.readFileSync('contracts/image-process-versions.json','utf8');
 const actual=JSON.parse(cfg);
 assert.equal(actual.image_starter_contract_version,baseline.image_starter_contract_version);
 assert.equal(actual.image_release_authority_policy,baseline.image_release_authority_policy);
});
