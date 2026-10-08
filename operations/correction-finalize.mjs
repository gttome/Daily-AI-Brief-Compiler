import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {sha256,canonicalSha} from '../image-capsules/util.mjs';
import {validateEdition} from '../compiler/compile.mjs';
import {verifyFinalizationEvidence} from '../compiler/finalization-evidence.mjs';
import {CORRECTION_REVISION_SCHEMA,safeCorrectionAssetPath} from './correction-apply.mjs';
import {writeCorrectionDirectory} from './correction-files.mjs';
import {CORRECTION_VERIFICATION_SCHEMA,CORRECTION_PROOF_LAYOUT,assertCompleteCorrectionReleaseEvidence,validateCorrectionVerificationReceipt} from './correction-verification.mjs';
import {d1EvidencePath} from '../image-studio/proof-evidence.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(message);};
const json=value=>JSON.stringify(value,null,2)+'\n';
const read=file=>{const bytes=fs.readFileSync(file);return {bytes,record:JSON.parse(bytes.toString('utf8'))};};

export function finalizeCorrection({repoRoot='.',revisionPath,bundlePath,buildDir,pageUrl,outDir,baseStatePath,baseBundlePath,now=()=>new Date().toISOString()}={}){
  need(revisionPath&&bundlePath&&buildDir&&pageUrl&&outDir,'correction_finalization_inputs_required');
  const root=fs.realpathSync(repoRoot),input=read(revisionPath),bundle=read(bundlePath),revision=input.record,date=revision.edition_date;
  need(revision.schema_version===CORRECTION_REVISION_SCHEMA&&['VALIDATED','DEPLOYED'].includes(revision.status),'correction_revision_must_be_pending');
  const baseStateFile=baseStatePath||path.join(root,'shadow-runs',date,'compiler-state.json'),baseBundleFile=baseBundlePath||path.join(root,'shadow-runs',date,'edition-bundle.json');
  const baseState=read(baseStateFile),baseBundle=read(baseBundleFile);
  need(isDeepStrictEqual(baseState.record,revision.base_run)&&baseBundle.bytes.toString('utf8')===revision.original_bundle_text,'correction_original_history_changed');
  const output=path.resolve(outDir),relativeOutput=path.relative(root,output).split(path.sep).join('/');
  need(safeCorrectionAssetPath(relativeOutput)&&!relativeOutput.startsWith('../'),'correction_output_outside_repository');
  const outputParent=fs.realpathSync(path.dirname(output));
  need(outputParent===root||outputParent.startsWith(root+path.sep),'correction_output_outside_repository');
  const evidence=verifyFinalizationEvidence({date,pageUrl,stateSha256:sha256(input.bytes),bundleSha256:sha256(bundle.bytes),buildDir});
  need(evidence.compile.correction_revision?.revision_id===revision.revision_id&&evidence.compile.correction_revision.original_bundle_sha256===revision.original_bundle_sha256,'correction_compile_revision_binding');
  // Reapply every current image/media/bundle gate immediately before creating a
  // terminal revision. An old compile receipt cannot bless changed input bytes.
  const current=validateEdition({repoRoot:root,statePath:revisionPath,bundlePath});
  need(current.stateSha256===sha256(input.bytes)&&current.bundleDigest===sha256(bundle.bytes),'correction_input_changed_during_verification');
  const preservation=assertCompleteCorrectionReleaseEvidence({evidence,bundle:bundle.record,repoRoot:root,sourceDir:path.join(buildDir,'reader-source')});
  const proofBytes={compiled_revision:input.bytes,bundle:bundle.bytes,base_state:baseState.bytes,original_bundle:baseBundle.bytes};
  for(const [key,relative] of Object.entries(CORRECTION_PROOF_LAYOUT))if(!proofBytes[key]){
    const saved=evidence.receipts.find(row=>row.source===relative);
    proofBytes[key]=saved?saved.bytes:fs.readFileSync(path.join(buildDir,relative));
  }
  need(canonicalSha(JSON.parse(proofBytes.source_manifest.toString('utf8')))===evidence.manifestDigest,'correction_manifest_changed_during_verification');
  for(const [file,bytes] of [[revisionPath,input.bytes],[bundlePath,bundle.bytes],[baseStateFile,baseState.bytes],[baseBundleFile,baseBundle.bytes]]) need(fs.readFileSync(file).equals(bytes),'correction_input_changed_during_verification');
  const files={},proofs={};
  for(const [key,bytes] of Object.entries(proofBytes)){
    const relative='proofs/'+CORRECTION_PROOF_LAYOUT[key];files[relative]=bytes;
    proofs[key]={path:relativeOutput+'/'+relative,sha256:sha256(bytes),bytes:bytes.length};
  }
  const receipt={schema_version:CORRECTION_VERIFICATION_SCHEMA,result:'PASS',edition_date:date,revision_id:revision.revision_id,correction_ids:revision.correction_ids,
    base_execution_id:revision.base_run.execution_id,base_state_sha256:sha256(baseState.bytes),original_bundle_sha256:revision.original_bundle_sha256,expected_previous_bundle_sha256:revision.expected_previous_bundle_sha256,
    bundle_sha256:revision.bundle.digest,source_manifest_sha256:evidence.manifestDigest,history_merge_sha256:canonicalSha(evidence.history),page_url:pageUrl,
    ...preservation,preserve_original:true,new_execution_created:false,proofs};
  const receiptPath=relativeOutput+'/verification-receipt.json';
  if(fs.existsSync(output)){
    const storedBytes=fs.readFileSync(d1EvidencePath(root,receiptPath)),stored=JSON.parse(storedBytes.toString('utf8'));
    const {recorded_at,...stable}=stored;need(isDeepStrictEqual(stable,receipt),'correction_finalization_output_conflict');
    const live=JSON.parse(fs.readFileSync(d1EvidencePath(root,relativeOutput+'/revision.json'),'utf8'));
    validateCorrectionVerificationReceipt({repoRoot:root,receipt:stored,expected:{path:receiptPath,sha256:sha256(storedBytes),edition_date:date,revision_id:revision.revision_id,bundle_sha256:revision.bundle.digest,original_bundle_sha256:revision.original_bundle_sha256,revision:live}});
    files['verification-receipt.json']=storedBytes;files['revision.json']=json(live);
    writeCorrectionDirectory({outDir:output,files,protectedPaths:[revisionPath,bundlePath,baseStateFile,baseBundleFile]});
    return {result:'UNCHANGED',edition_date:date,revision_id:revision.revision_id,status:'LIVE_VERIFIED',verification_receipt_path:receiptPath,verification_receipt_sha256:sha256(storedBytes),...preservation};
  }
  receipt.recorded_at=now();need(typeof receipt.recorded_at==='string'&&Number.isFinite(Date.parse(receipt.recorded_at)),'correction_verification_timestamp');
  const receiptText=json(receipt),live={...structuredClone(revision),status:'LIVE_VERIFIED',verification_receipt_path:receiptPath,verification_receipt_sha256:sha256(receiptText)};
  files['verification-receipt.json']=receiptText;files['revision.json']=json(live);
  writeCorrectionDirectory({outDir:output,files,protectedPaths:[revisionPath,bundlePath,baseStateFile,baseBundleFile]});
  return {result:'PASS',edition_date:date,revision_id:revision.revision_id,status:'LIVE_VERIFIED',verification_receipt_path:receiptPath,verification_receipt_sha256:live.verification_receipt_sha256,...preservation};
}
