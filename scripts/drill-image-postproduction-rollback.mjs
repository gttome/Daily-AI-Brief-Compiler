// Nonpublishing October 10 historical-six-image single-proposal rollback drills.
// NEVER writes to GitHub Pages, jobs, manifests, accepted PNGs or protected refs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readImageProcessVersions,imageReleaseCompatibility,readHistoricalImageEvidence} from './image-process-versions.mjs';
import {verifyAlreadyLiveImages,publicImageStatusMirror,bindAlreadyReleasedJob} from './verify-external-image-postrelease.mjs';
import {auditOct8Live,OCT8_LIVE_BASELINE} from './audit-oct8-live.mjs';
import {MANDATORY_FLOOR} from './preflight-image-firstpass.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('image_postproduction_rollback:'+s);};
export const FEATURE_GROUPS=Object.freeze({
 I1:['image_release_authority_policy'],
 I2:['image_starter_contract_version'],
 I3:['image_target_capture_policy'],
 I4:['image_status_sync_mode','image_verify_only_enabled'],
 I5:['image_additional_first_pass_qc']
});
export const ALL_ENABLED=Object.freeze({
 schema_version:'external-image-process-versions-v1',
 image_release_authority_policy:'bounded_starter_v7',
 image_starter_contract_version:'rev7',
 image_target_capture_policy:'element24_v1',
 image_status_sync_mode:'public_sync_v2',
 image_verify_only_enabled:true,
 image_additional_first_pass_qc:'enriched_v1'
});
const DISABLED={
 I1:{image_release_authority_policy:'legacy_go_v1'},
 I2:{image_starter_contract_version:'rev6'},
 I3:{image_target_capture_policy:'legacy'},
 I4:{image_status_sync_mode:'baseline',image_verify_only_enabled:false},
 I5:{image_additional_first_pass_qc:'baseline'}
};
export function simulatePostproductionSingleProposalRollback(proposalId,all=ALL_ENABLED){
 if(!Object.hasOwn(FEATURE_GROUPS,proposalId))fail('unsupported_proposal');
 const before=structuredClone(all),after={...before,...DISABLED[proposalId]};
 const unchanged=Object.entries(FEATURE_GROUPS).filter(([id])=>id!==proposalId)
  .every(([,keys])=>keys.every(key=>Object.is(before[key],after[key])));
 if(!unchanged)fail('other_proposal_mutated');
 if(FEATURE_GROUPS[proposalId].some(key=>Object.is(before[key],after[key])))fail('target_not_reversed');
 const compatible=imageReleaseCompatibility(after),subdrills=[];
 if(proposalId==='I4'){
   const first={...before,image_status_sync_mode:'baseline'};
   const second={...before,image_verify_only_enabled:false};
   if(first.image_verify_only_enabled!==true||second.image_status_sync_mode!=='public_sync_v2')fail('i4_controls_not_independent');
   subdrills.push({reversed:'image_status_sync_mode',other_i4_switch_preserved:true,mode:first.image_status_sync_mode},
     {reversed:'image_verify_only_enabled',other_i4_switch_preserved:true,mode:second.image_verify_only_enabled});
 }
 const consequence=compatible.result==='RELEASE_ADMISSION_HOLD'?'RELEASE_ADMISSION_HOLD':
   proposalId==='I3'?'MOBILE_AND_DESKTOP_PIXEL_REVIEW_UNPROVEN':
   proposalId==='I4'?'PUBLIC_STATUS_SYNC_UNPROVEN_VERIFY_ONLY_DISABLED':
   proposalId==='I5'?'ENHANCED_QC_REVERTED_MANDATORY_FLOOR_RETAINED':'FUTURE_RELEASE_ADMISSION_REQUIRES_REAL_LEGACY_AUTHORITY';
 return {drill_id:'RB-'+proposalId,proposal_id:proposalId,result:'STATIC_SINGLE_PROPOSAL_REVERSION_PASS',
   fixture_only_nonpublishing:true,selected_only_reversed:true,other_four_unchanged:unchanged,
   before_feature_modes:Object.fromEntries(FEATURE_GROUPS[proposalId].map(k=>[k,before[k]])),
   after_feature_modes:Object.fromEntries(FEATURE_GROUPS[proposalId].map(k=>[k,after[k]])),
   unchanged_feature_modes:Object.fromEntries(Object.entries(FEATURE_GROUPS).filter(([id])=>id!==proposalId)
     .flatMap(([,keys])=>keys.map(k=>[k,after[k]]))),
   dependent_release_admission:compatible.result,
   next_image_job_policy:consequence,
   separate_i4_subswitch_drills:subdrills,
   prior_accepted_images_regenerated:0,
   old_reader_html_or_placeholders_republished:false,
   original_image_quality_floor_kept:Object.values(MANDATORY_FLOOR).every(Boolean)};
}
function realFileSixSnapshot(manifest,projectRoot='.'){
 if(manifest?.schema_version!=='external-compiler-image-package-v1'||manifest.images?.length!==6)fail('real_immutable_six_png_manifest_missing');
 const unique=new Set(),seen=new Set();
 return manifest.images.map(img=>{
   if(seen.has(img.story_id)||typeof img.path!=='string'||!img.path.startsWith('external-image-packages/2026-10-10/images/'))
     fail('unexpected_or_duplicate_accepted_image');
   seen.add(img.story_id);
   const bytes=fs.readFileSync(path.join(projectRoot,img.path)),actual=sha(bytes);
   if(actual!==img.sha256||bytes.length!==img.bytes||img.accepted_locked!==true)fail('accepted_local_png_drift:'+img.story_id);
   unique.add(actual);
   return {story_id:img.story_id,sha256:actual,bytes:bytes.length,source_path:img.path};
 }).filter((img,_,arr)=>{
   if(unique.size!==6||arr.length!==6)fail('six_distinct_accepted_images_required');
   return true;
 });
}
export function inspectHistoricalRollbackFixture({jobBytes,index,release,manifest,projectRoot='.'}){
 const job=readHistoricalImageEvidence(JSON.parse(jobBytes),'source');
 const packageRecord=readHistoricalImageEvidence(manifest,'package');
 const releaseRecord=readHistoricalImageEvidence(release,'release');
 if(job.edition_date!=='2026-10-10'||release.schema_version!=='external-compiler-image-release-v1'||
   release.original_source_commit_sha!==job.source.commit_sha)fail('wrong_historical_edition');
 const bind=bindAlreadyReleasedJob({jobBytes,index,release,manifest});
 const binaries=realFileSixSnapshot(manifest,projectRoot);
 if(bind.stories.some(s=>binaries.find(x=>x.story_id===s.story_id)?.sha256!==s.image_sha256))
   fail('historical_article_png_hash_mismatch');
 const v7Read=readHistoricalImageEvidence({schema_version:'external-compiler-starter-assignment-v7',
   scope:'fixture_only_nonproduction',source_job_sha256:sha(jobBytes)},'assignment');
 const futureReleaseRead=readHistoricalImageEvidence({schema_version:'external-compiler-image-release-v2',
   kind:'test_schema_only_not_an_actual_release'},'release');
 return {story_count:bind.stories.length,accepted_images:binaries,
   original_source_job_sha256:sha(jobBytes),original_bundle_sha256:packageRecord.original_bundle_sha256,
   history_release_identity:releaseRecord.immutable_job_sha256,
   old_v6_job_and_package_readable:job.schema_version==='external-compiler-image-job-v1',
   old_v6_release_readable:releaseRecord.schema_version==='external-compiler-image-release-v1',
   v7_assignment_reader_fixture:v7Read.schema_version,
   v2_release_reader_fixture:futureReleaseRead.schema_version,
   v7_fixture_is_not_real_owner_authorization:true,
   oct8_expected_object_count:Object.keys(OCT8_LIVE_BASELINE).length};
}
export async function runFivePostproductionRollbackDrills({historyRoot,projectRoot='.',fetchImpl=fetch}){
 if(!historyRoot||!fs.existsSync(path.join(historyRoot,'site/image-jobs/2026-10-10/release.json')))fail('actual_history_checkout_required');
 const base=path.join(historyRoot,'site/image-jobs');
 const jobBytes=fs.readFileSync(path.join(base,'2026-10-10/job.json'));
 const sourceJobBytes=fs.readFileSync(path.join(projectRoot,'external-image-packages/2026-10-10/source/job.json'));
 if(!jobBytes.equals(sourceJobBytes))fail('source_job_immutable_bytes_disagree');
 const indexBytes=fs.readFileSync(path.join(base,'index.json')),releaseBytes=fs.readFileSync(path.join(base,'2026-10-10/release.json'));
 const index=JSON.parse(indexBytes),release=JSON.parse(releaseBytes);
 const manifest=JSON.parse(fs.readFileSync(path.join(projectRoot,'external-image-packages/2026-10-10/manifest.json')));
 const baseline=inspectHistoricalRollbackFixture({jobBytes,index,release,manifest,projectRoot});
 if(!baseline.old_v6_release_readable||!baseline.old_v6_job_and_package_readable||baseline.oct8_expected_object_count!==17)
   fail('historical_schema_or_oct8_readiness_missing');
 const beforeLive=await verifyAlreadyLiveImages({jobBytes,index,release,manifest,fetchImpl});
 const beforeOct8=await auditOct8Live({fetchImpl});
 const drills=Object.keys(FEATURE_GROUPS).map(id=>simulatePostproductionSingleProposalRollback(id));
 const afterLocal=realFileSixSnapshot(manifest,projectRoot);
 const afterLive=await verifyAlreadyLiveImages({jobBytes,index,release,manifest,fetchImpl});
 const afterOct8=await auditOct8Live({fetchImpl});
 const immutableBefore=JSON.stringify(baseline.accepted_images),immutableAfter=JSON.stringify(afterLocal);
 if(immutableBefore!==immutableAfter||JSON.stringify(beforeLive.live_images)!==JSON.stringify(afterLive.live_images)||
   beforeOct8.objects_verified!==17||afterOct8.objects_verified!==17||
   JSON.stringify(beforeOct8.objects)!==JSON.stringify(afterOct8.objects))
   fail('published_live_history_or_png_changed_during_drill');
 const mirror=await publicImageStatusMirror({date:'2026-10-10',indexBytes,releaseBytes,fetchImpl});
 return {
   schema_version:'independent-postproduction-rollback-drill-v2',
   result:'FIVE_NONPUBLISHING_ROLLBACK_DRILLS_PASS',
   execution_type:'NONPUBLISHING_HISTORICAL_FIXTURE',
   live_rollback_performed:false,
   old_new_schema_reads:{
     original_v6_job_and_package:'PASS',historical_v6_release:'PASS',
     future_v7_assignment_reader:'SCHEMA_FIXTURE_ONLY_NO_OWNER_AUTH',
     future_v2_release_reader:'SCHEMA_FIXTURE_ONLY_NOT_PUBLISHED'
   },
   baseline:{edition_date:'2026-10-10',immutable_job_sha256:baseline.original_source_job_sha256,
     immutable_bundle_sha256:baseline.original_bundle_sha256,
     accepted_six_pngs:baseline.accepted_images,
     exact_article_url_pairs:beforeLive.article_contexts,
     six_live_png_http_hash_verified:true,
     before_after_live_pngs_identical:true,
     protected_oct8_17_before_after_http_hash_verified:true,
     protected_oct8_before_after_object_count:17,
     public_index_status:mirror.result,
     public_status_completeness_not_inferred:true},
   independent_proposals:drills.map(d=>({...d,oct8_17_live_byte_identity:'PASS',
     accepted_six_live_hashes_unchanged:'PASS',
     twelve_article_contexts_unchanged:'PASS',
     current_public_html_unchanged:'PASS',
     other_four_feature_modes_unchanged:'PASS',
     proposal_live_rollback_authorized:false})),
   rollback_readiness:'NONPUBLISHING_DRILLS_PASS_LIVE_ROLLBACK_NEEDS_OWNER_AUTHORIZATION',
   current_release_flags_unchanged:readImageProcessVersions(),
   no_image_generation_or_placeholder_replacement_invoked:true
 };
}
async function main(){
 const [historyRoot,outputDir]=process.argv.slice(2);
 if(!outputDir)fail('usage: node scripts/drill-image-postproduction-rollback.mjs <read-only-history-worktree> <output-dir>');
 const result=await runFivePostproductionRollbackDrills({historyRoot});
 fs.mkdirSync(outputDir,{recursive:true});
 fs.writeFileSync(path.join(outputDir,'postproduction_rollback_drills.json'),JSON.stringify(result,null,2)+'\n');
 const i1=result.independent_proposals[0];
 const receipt={
   schema_version:'postproduction-single-proposal-rollback-v2',
   mode:'DRY_RUN_NONPUBLISHING',result:'ROLLBACK_FIXTURE_VERIFIED_ONLY',
   proposal_id:'I1',owner_authorization_evidence:'Development assignment permits nonpublishing drills ONLY',
   edition_date:'2026-10-10',
   actual_published_assets_regenerated:0,
   live_production_rollback_performed:false,
   before:{main_sha:'NOT_MUTATED_BY_DRILL',pages_history_sha:'NOT_MUTATED_BY_DRILL',
     selected_feature_value:i1.before_feature_modes,accepted_images:result.baseline.accepted_six_pngs,
     oct8_protected_objects_verified:17},
   after:{main_sha:'NOT_MUTATED_BY_DRILL',pages_history_sha:'NOT_MUTATED_BY_DRILL',
     selected_feature_value:i1.after_feature_modes,other_four_feature_modes_unchanged:true,
     live_six_images_unchanged:true,article_pairings_unchanged:true,oct8_protected_objects_unchanged:true,
     next_release_state:'RELEASE_ADMISSION_HOLD'},
   safeguards:{no_placeholder_restoration:true,no_image_regeneration:true,no_html_republication:true,
     no_history_mutation:true,other_four_proposals_preserved:true},
   remaining_evidence:['A REAL later rollback requires separate owner direction and a protected inverse PR.',
     '24 genuine image-area visual reviews remain separately UNPROVEN unless reviewed.']
 };
 fs.writeFileSync(path.join(outputDir,'postproduction_rollback_receipt_dryrun.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({result:result.result,drills:result.independent_proposals.length,
   live_pngs:result.baseline.accepted_six_pngs.length,oct8:17,public_status:result.baseline.public_index_status}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
