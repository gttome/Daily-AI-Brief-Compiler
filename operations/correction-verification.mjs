import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonicalSha,sha256,gitBlobSha,hex} from '../image-capsules/util.mjs';
import {d1EvidencePath} from '../image-studio/proof-evidence.mjs';
import {verifyFinalizationEvidence} from '../compiler/finalization-evidence.mjs';
import {assertCompleteReleaseEvidence} from '../compiler/release-evidence.mjs';
export {assertCompleteReleaseEvidence as assertCompleteCorrectionReleaseEvidence} from '../compiler/release-evidence.mjs';
import {CORRECTION_REVISION_SCHEMA,validateCorrectionRevision,safeCorrectionAssetPath} from './correction-apply.mjs';

export const CORRECTION_VERIFICATION_SCHEMA='daily-compiler-correction-verification-v1';
export const CORRECTION_PROOF_LAYOUT={
  compiled_revision:'compiled-revision.json',bundle:'bundle.json',base_state:'base-state.json',original_bundle:'original-bundle.json',
  compile:'reader-source/compile-receipt.json',source_verification:'reader-source/verification-receipt.json',source_manifest:'reader-source/build-manifest.json',
  built_verification:'built-verification.json',live_verification:'live-verification.json',history_merge:'history-merge-receipt.json'
};
const need=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>isDeepStrictEqual(a,b);
const record=bytes=>JSON.parse(bytes.toString('utf8'));

// A terminal flag is insufficient proof. Every retained verification document
// is immutable, hashed from its actual bytes, and cross-bound to the exact
// compiled revision, original terminal record, bundle and published reader.
export function validateCorrectionVerificationReceipt({repoRoot,receipt,expected}){
  need(receipt?.schema_version===CORRECTION_VERIFICATION_SCHEMA&&receipt.result==='PASS','correction_verification_receipt_identity');
  for(const key of ['edition_date','revision_id','bundle_sha256','original_bundle_sha256'])need(receipt[key]===expected[key],'correction_verification_receipt_binding:'+key);
  need(typeof receipt.recorded_at==='string'&&Number.isFinite(Date.parse(receipt.recorded_at)),'correction_verification_timestamp');
  need(receipt.preserve_original===true&&receipt.new_execution_created===false,'correction_verification_invariants');
  need(receipt.proofs&&same(Object.keys(receipt.proofs).sort(),Object.keys(CORRECTION_PROOF_LAYOUT).sort()),'correction_proof_records_required');
  const proofBase=path.posix.dirname(receipt.proofs.compiled_revision.path),data={};
  for(const [key,relative] of Object.entries(CORRECTION_PROOF_LAYOUT)){
    const reference=receipt.proofs[key];
    need(reference&&reference.path===proofBase+'/'+relative&&safeCorrectionAssetPath(reference.path)&&hex(reference.sha256,64)&&Number.isInteger(reference.bytes)&&reference.bytes>0,'correction_proof_reference:'+key);
    const bytes=fs.readFileSync(d1EvidencePath(repoRoot,reference.path));
    need(bytes.length===reference.bytes&&sha256(bytes)===reference.sha256,'correction_proof_hash:'+key);
    data[key]={bytes,record:record(bytes)};
  }
  const revision=data.compiled_revision.record,bundle=data.bundle.record;
  need(revision.schema_version===CORRECTION_REVISION_SCHEMA&&['VALIDATED','DEPLOYED'].includes(revision.status),'correction_compiled_revision_identity');
  validateCorrectionRevision({revision,bundle,bundleText:data.bundle.bytes.toString('utf8'),baseState:data.base_state.record,baseBundleText:data.original_bundle.bytes.toString('utf8')});
  need(revision.revision_id===receipt.revision_id&&revision.bundle.digest===receipt.bundle_sha256&&revision.original_bundle_sha256===receipt.original_bundle_sha256&&revision.expected_previous_bundle_sha256===receipt.expected_previous_bundle_sha256&&sha256(data.original_bundle.bytes)===receipt.original_bundle_sha256,'correction_proof_original_binding');
  need(receipt.base_execution_id===revision.base_run.execution_id&&receipt.base_state_sha256===sha256(data.base_state.bytes)&&same(receipt.correction_ids,revision.correction_ids),'correction_proof_base_identity');
  if(expected.revision){
    const finalized={...structuredClone(revision),status:'LIVE_VERIFIED',verification_receipt_path:expected.path,verification_receipt_sha256:expected.sha256};
    need(same(finalized,expected.revision),'correction_live_revision_binding');
  }
  const buildDir=path.join(repoRoot,proofBase);
  const evidence=verifyFinalizationEvidence({date:receipt.edition_date,pageUrl:receipt.page_url,stateSha256:sha256(data.compiled_revision.bytes),bundleSha256:receipt.bundle_sha256,buildDir});
  need(same(evidence.compile.correction_revision,{revision_id:revision.revision_id,original_bundle_sha256:revision.original_bundle_sha256,selected_story_ids:revision.selected_story_ids}),'correction_compile_revision_binding');
  need(evidence.manifestDigest===receipt.source_manifest_sha256&&canonicalSha(evidence.history)===receipt.history_merge_sha256,'correction_proof_release_binding');
  const preservation=assertCompleteReleaseEvidence({evidence,bundle,repoRoot,sourceDir:path.join(buildDir,'reader-source')});
  need(receipt.latest_edition_date===preservation.latest_edition_date&&receipt.historical_correction===preservation.historical_correction&&receipt.current_reader_preserved===true,'correction_proof_reader_preservation');
  return {result:'PASS',revision_id:receipt.revision_id,bundle_sha256:receipt.bundle_sha256,source_manifest_sha256:receipt.source_manifest_sha256,...preservation};
}
